import type { TransactionReceipt } from 'viem'
import type { ClaimedWithdrawal } from '@/lib/db/queries/withdrawals'
import { getQuote } from '@lifi/sdk'
import { createPublicClient, createWalletClient, erc20Abi, http, parseUnits, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { BITCOIN_LIFI_CHAIN_ID, BITCOIN_NETWORK } from '@/lib/bitcoin'
import { bitcoinAmountToSats, getBitcoinHotBalance, sendBitcoinPayout } from '@/lib/bitcoin-withdrawal'
import { markWithdrawalTransactionsProcessing, updateWithdrawalTransaction } from '@/lib/db/queries/finance'
import { creditTx } from '@/lib/db/queries/ledger'
import { claimPendingWithdrawals, flagWithdrawalForReview, markWithdrawal } from '@/lib/db/queries/withdrawals'
import { getDepositChain } from '@/lib/deposit-chains'
import { db } from '@/lib/drizzle'
import { ensureLiFiServerConfig } from '@/lib/lifi'
import { sendOpsAlert } from '@/lib/ops-alert'
import { withRpcRetry } from '@/lib/rpc-retry'
import { getMintForCoin, SOLANA_LIFI_CHAIN_ID, SOLANA_NATIVE_COIN, SOLANA_NATIVE_DECIMALS, SOLANA_NATIVE_LIFI_ADDRESS, SOLANA_NETWORK, SOLANA_TOKEN_DECIMALS } from '@/lib/solana'
import { getSolanaHotBalance, sendSolanaPayout, solanaAmountToRaw } from '@/lib/solana-withdrawal'
import { TRON_LIFI_CHAIN_ID, TRON_NATIVE_COIN, TRON_NATIVE_DECIMALS, TRON_NETWORK, TRON_USDT_CONTRACT, TRON_USDT_DECIMALS } from '@/lib/tron'
import { getTronHotBalance, sendTronPayout, tronAmountToRaw, TronConfirmationUnknownError } from '@/lib/tron-withdrawal'
import 'server-only'

// Thrown whenever a payout may have already left the hot wallet but we can't
// prove it either succeeded or failed (RPC timeout waiting on a receipt, an
// unconfirmed Tron broadcast, or a DB error after a send we already know
// succeeded). Must never be handled the same way as a confirmed failure —
// refunding here risks paying the user twice (once on-chain, once via ledger
// credit) if the payout actually went through.
class UncertainPayoutError extends Error {
  constructor(message: string, readonly cause: unknown) {
    super(message)
  }
}

const MAX_WITHDRAWALS_PER_RUN = 20
const NATIVE_GAS_LIMIT = 21000n
// 4x (was 3x) — free public RPCs (now backing 8 of 12 chains) return gas
// price snapshots that lag real-time basefee more than paid infra does.
const NATIVE_GAS_SAFETY = 4n
const SOLANA_FEE_RESERVE_LAMPORTS = 10_000n
const TRON_NATIVE_FEE_RESERVE_SUN = 1_000_000n
const BITCOIN_FEE_RESERVE_SATS = 10_000n

type HotAccount = ReturnType<typeof privateKeyToAccount>

export interface WithdrawalProcessingResult {
  disabled: boolean
  processed: number
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim()
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`
}

// viem resolves waitForTransactionReceipt on a reverted tx instead of throwing —
// without this check a revert (paused/blacklisted token, failed bridge swap, etc.)
// gets recorded as a completed payout while the funds never leave the wallet.
function assertTransactionSuccess(receipt: TransactionReceipt): void {
  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${receipt.transactionHash} reverted on-chain.`)
  }
}

// A send that already broadcast successfully but whose receipt we failed to
// fetch (RPC timeout/error) is NOT a confirmed failure — the transaction may
// still land. Treat that case as uncertain rather than "reverted" so the
// caller doesn't refund a user who's actually about to receive their payout.
async function waitForReceiptOrUncertain(
  publicClient: ReturnType<typeof createPublicClient>,
  hash: `0x${string}`,
): Promise<void> {
  let receipt: TransactionReceipt
  try {
    // A transient RPC hiccup here must not get flagged as an uncertain payout
    // needing manual review — retry the (idempotent, side-effect-free) lookup
    // before giving up.
    receipt = await withRpcRetry(() => publicClient.waitForTransactionReceipt({ hash }))
  }
  catch (error) {
    throw new UncertainPayoutError(`Could not confirm transaction ${hash}: receipt lookup failed.`, error)
  }
  assertTransactionSuccess(receipt)
}

export interface BridgePayoutResult {
  hash: `0x${string}`
  // Guaranteed-minimum amount the user actually receives at the destination
  // (destination-chain human units), after LI.FI's bridge/swap fee is taken
  // out of netUsd. The user bears this fee, not the treasury — so callers
  // must record this delivered amount, not the pre-bridge requested amount.
  deliveredAmount: string
}

async function payoutViaBridge(
  withdrawal: ClaimedWithdrawal,
  account: HotAccount,
  netUsd: number,
  toChainId: number,
  toTokenAddress: string,
  toTokenDecimals: number,
): Promise<BridgePayoutResult> {
  await ensureLiFiServerConfig()

  const polygonChain = getDepositChain('polygon')
  const usdcToken = polygonChain?.tokens.find(item => item.coin === 'USDC')
  if (!polygonChain || !usdcToken) {
    throw new Error('Polygon settlement hub is not configured.')
  }

  const fromAmount = parseUnits(netUsd.toFixed(6), 6)
  const quote = await getQuote({
    fromChain: polygonChain.chain.id,
    toChain: toChainId,
    fromToken: usdcToken.address,
    toToken: toTokenAddress,
    fromAddress: account.address,
    toAddress: withdrawal.to_address,
    fromAmount: fromAmount.toString(),
  })

  const transactionRequest = quote.transactionRequest
  if (!transactionRequest?.to || !transactionRequest.data) {
    throw new Error('No withdrawal route available.')
  }

  const toAmountMinRaw = quote.estimate?.toAmountMin
  if (!toAmountMinRaw) {
    throw new Error('Bridge quote did not return a guaranteed minimum output amount.')
  }

  const publicClient = createPublicClient({ chain: polygonChain.chain, transport: http(polygonChain.rpcUrl) })
  const wallet = createWalletClient({ account, chain: polygonChain.chain, transport: http(polygonChain.rpcUrl) })

  const approveHash = await wallet.writeContract({
    address: usdcToken.address,
    abi: erc20Abi,
    functionName: 'approve',
    args: [transactionRequest.to as `0x${string}`, fromAmount],
  })
  await waitForReceiptOrUncertain(publicClient, approveHash)

  const hash = await wallet.sendTransaction({
    to: transactionRequest.to as `0x${string}`,
    data: transactionRequest.data as `0x${string}`,
    value: transactionRequest.value ? BigInt(transactionRequest.value) : 0n,
  })
  await waitForReceiptOrUncertain(publicClient, hash)

  const deliveredAmount = (Number(toAmountMinRaw) / 10 ** toTokenDecimals).toFixed(toTokenDecimals)
  return { hash, deliveredAmount }
}

interface PayoutOutcome {
  txHash: string
  // Set only when a bridge fallback was used; the actual (fee-adjusted)
  // amount delivered to the user, which differs from withdrawal.amount.
  deliveredAmount?: string
}

async function processTronWithdrawal(withdrawal: ClaimedWithdrawal, account: HotAccount): Promise<PayoutOutcome> {
  const amountRaw = tronAmountToRaw(withdrawal.coin, withdrawal.amount)
  const balance = await getTronHotBalance(withdrawal.coin)
  const isNative = withdrawal.coin === TRON_NATIVE_COIN
  const required = isNative ? amountRaw + TRON_NATIVE_FEE_RESERVE_SUN : amountRaw
  const gasBalance = isNative ? balance : await getTronHotBalance(TRON_NATIVE_COIN)
  const hasGasReserve = gasBalance >= TRON_NATIVE_FEE_RESERVE_SUN

  if (balance >= required && hasGasReserve) {
    return { txHash: await sendTronPayout(withdrawal.coin, amountRaw, withdrawal.to_address) }
  }

  const netUsd = Number(withdrawal.usd_amount) - Number(withdrawal.fee_usd)
  const decimals = isNative ? TRON_NATIVE_DECIMALS : TRON_USDT_DECIMALS
  const { hash, deliveredAmount } = await payoutViaBridge(withdrawal, account, netUsd, TRON_LIFI_CHAIN_ID, isNative ? zeroAddress : TRON_USDT_CONTRACT, decimals)
  return { txHash: hash, deliveredAmount }
}

async function processSolanaWithdrawal(withdrawal: ClaimedWithdrawal, account: HotAccount): Promise<PayoutOutcome> {
  const amountRaw = solanaAmountToRaw(withdrawal.coin, withdrawal.amount)
  const balance = await getSolanaHotBalance(withdrawal.coin)
  const isNative = withdrawal.coin === SOLANA_NATIVE_COIN
  const required = isNative ? amountRaw + SOLANA_FEE_RESERVE_LAMPORTS : amountRaw

  if (balance >= required) {
    return { txHash: await sendSolanaPayout(withdrawal.coin, amountRaw, withdrawal.to_address) }
  }

  const netUsd = Number(withdrawal.usd_amount) - Number(withdrawal.fee_usd)
  const toTokenAddress = isNative ? SOLANA_NATIVE_LIFI_ADDRESS : getMintForCoin(withdrawal.coin)?.toBase58()
  if (!toTokenAddress) {
    throw new Error(`Unsupported Solana coin ${withdrawal.coin}`)
  }
  const decimals = isNative ? SOLANA_NATIVE_DECIMALS : SOLANA_TOKEN_DECIMALS
  const { hash, deliveredAmount } = await payoutViaBridge(withdrawal, account, netUsd, SOLANA_LIFI_CHAIN_ID, toTokenAddress, decimals)
  return { txHash: hash, deliveredAmount }
}

async function processBitcoinWithdrawal(withdrawal: ClaimedWithdrawal, account: HotAccount): Promise<PayoutOutcome> {
  const amountSats = bitcoinAmountToSats(withdrawal.amount)
  const balance = await getBitcoinHotBalance()

  if (balance >= amountSats + BITCOIN_FEE_RESERVE_SATS) {
    return { txHash: await sendBitcoinPayout(amountSats, withdrawal.to_address) }
  }

  const netUsd = Number(withdrawal.usd_amount) - Number(withdrawal.fee_usd)
  const { hash, deliveredAmount } = await payoutViaBridge(withdrawal, account, netUsd, BITCOIN_LIFI_CHAIN_ID, zeroAddress, 8)
  return { txHash: hash, deliveredAmount }
}

export async function runWithdrawalProcessing(): Promise<WithdrawalProcessingResult> {
  const hotKey = process.env.WITHDRAWAL_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!hotKey) {
    return { disabled: true, processed: 0 }
  }

  const account = privateKeyToAccount(normalizePrivateKey(hotKey))
  const pending = await claimPendingWithdrawals(MAX_WITHDRAWALS_PER_RUN)
  await markWithdrawalTransactionsProcessing(pending.map(w => w.id))
  let processed = 0

  for (const withdrawal of pending) {
    try {
      let txHash: string
      let deliveredAmount: string | undefined

      if (withdrawal.dest_network === TRON_NETWORK) {
        ({ txHash, deliveredAmount } = await processTronWithdrawal(withdrawal, account))
      }
      else if (withdrawal.dest_network === SOLANA_NETWORK) {
        ({ txHash, deliveredAmount } = await processSolanaWithdrawal(withdrawal, account))
      }
      else if (withdrawal.dest_network === BITCOIN_NETWORK) {
        ({ txHash, deliveredAmount } = await processBitcoinWithdrawal(withdrawal, account))
      }
      else {
        const chainConfig = getDepositChain(withdrawal.dest_network)
        if (!chainConfig) {
          throw new Error(`Unsupported network ${withdrawal.dest_network}`)
        }

        const isNative = chainConfig.native.coin === withdrawal.coin
        const token = chainConfig.tokens.find(item => item.coin === withdrawal.coin)
        if (!isNative && !token) {
          throw new Error(`Unsupported coin ${withdrawal.coin} on ${withdrawal.dest_network}`)
        }

        const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
        const wallet = createWalletClient({ account, chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
        const recipient = withdrawal.to_address as `0x${string}`
        const decimals = isNative ? chainConfig.native.decimals : token!.decimals
        const neededAmount = parseUnits(withdrawal.amount, decimals)

        if (isNative) {
          const gasPrice = await withRpcRetry(() => publicClient.getGasPrice())
          const gasReserve = gasPrice * NATIVE_GAS_LIMIT * NATIVE_GAS_SAFETY
          const balance = await withRpcRetry(() => publicClient.getBalance({ address: account.address }))

          if (balance >= neededAmount + gasReserve) {
            txHash = await wallet.sendTransaction({ to: recipient, value: neededAmount })
            await waitForReceiptOrUncertain(publicClient, txHash as `0x${string}`)
          }
          else {
            const netUsd = Number(withdrawal.usd_amount) - Number(withdrawal.fee_usd)
            const bridgeResult = await payoutViaBridge(withdrawal, account, netUsd, chainConfig.chain.id, zeroAddress, decimals)
            txHash = bridgeResult.hash
            deliveredAmount = bridgeResult.deliveredAmount
          }
        }
        else {
          const balance = await withRpcRetry(() => publicClient.readContract({
            address: token!.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [account.address],
          }))

          if (balance >= neededAmount) {
            txHash = await wallet.writeContract({
              address: token!.address,
              abi: erc20Abi,
              functionName: 'transfer',
              args: [recipient, neededAmount],
            })
            await waitForReceiptOrUncertain(publicClient, txHash as `0x${string}`)
          }
          else {
            const netUsd = Number(withdrawal.usd_amount) - Number(withdrawal.fee_usd)
            const bridgeResult = await payoutViaBridge(withdrawal, account, netUsd, chainConfig.chain.id, token!.address, decimals)
            txHash = bridgeResult.hash
            deliveredAmount = bridgeResult.deliveredAmount
          }
        }
      }

      // The payout is confirmed successful on-chain by this point (every
      // path above either threw or returned a confirmed txHash). If
      // recording that fails, the on-chain send already happened — refunding
      // would double-pay the user, so this must be treated as uncertain
      // (flagged for manual reconciliation), never as a failed payout.
      try {
        await db.transaction(async (tx) => {
          await markWithdrawal(withdrawal.id, 'completed', { txHash, executor: tx })
          await updateWithdrawalTransaction(withdrawal.id, {
            status: 'completed',
            amount: deliveredAmount ?? withdrawal.amount,
            txHash,
          }, tx)
        })
      }
      catch (error) {
        throw new UncertainPayoutError(
          `Payout for withdrawal ${withdrawal.id} confirmed on-chain (tx ${txHash}) but recording completion failed.`,
          error,
        )
      }
      processed += 1
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed.'

      if (error instanceof UncertainPayoutError || error instanceof TronConfirmationUnknownError) {
        // Funds may have already left the wallet — do not touch the ledger.
        // Leave status at 'processing' (set by claimPendingWithdrawals) so it
        // can't be re-claimed or silently refunded; an admin must reconcile.
        await flagWithdrawalForReview(withdrawal.id, `NEEDS MANUAL REVIEW: ${message}`)
        await updateWithdrawalTransaction(withdrawal.id, { status: 'processing', notes: `NEEDS MANUAL REVIEW: ${message}` })
        await sendOpsAlert(`withdrawal-processing NEEDS MANUAL REVIEW (withdrawal ${withdrawal.id})`, error)
        continue
      }

      // Refund and status updates must land together — if the process dies
      // mid-write, a partial update must not leave the debit unrefunded.
      await db.transaction(async (tx) => {
        await markWithdrawal(withdrawal.id, 'failed', { error: message, executor: tx })
        await updateWithdrawalTransaction(withdrawal.id, { status: 'failed', notes: message }, tx)
        await creditTx(tx, {
          userId: withdrawal.user_id,
          currency: 'USDC',
          amount: withdrawal.usd_amount,
          type: 'refund',
          reference: withdrawal.id,
        })
      })
      await sendOpsAlert(`withdrawal-processing (withdrawal ${withdrawal.id})`, error)
    }
  }

  return { disabled: false, processed }
}
