import type { ClaimedWithdrawal } from '@/lib/db/queries/withdrawals'
import type { DepositToken } from '@/lib/deposit-tokens'
import { getQuote, getTokens } from '@lifi/sdk'
import { createPublicClient, createWalletClient, erc20Abi, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { credit } from '@/lib/db/queries/ledger'
import { claimPendingWithdrawals, markWithdrawal } from '@/lib/db/queries/withdrawals'
import { finance_transactions } from '@/lib/db/schema/finance/tables'
import { DEPOSIT_TOKENS } from '@/lib/deposit-tokens'
import { db } from '@/lib/drizzle'
import { ensureLiFiServerConfig } from '@/lib/lifi'
import { DEFAULT_CHAIN_ID } from '@/lib/network'
import { defaultViemNetwork, defaultViemRpcUrl } from '@/lib/viem-network'
import 'server-only'

type HotAccount = ReturnType<typeof privateKeyToAccount>

const NETWORK_CHAIN_IDS: Record<string, number> = {
  polygon: 137,
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  bsc: 56,
  optimism: 10,
}
const MAX_WITHDRAWALS_PER_RUN = 20

export interface WithdrawalProcessingResult {
  disabled: boolean
  processed: number
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim()
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`
}

function tokenForCoin(coin: string): DepositToken | undefined {
  return DEPOSIT_TOKENS.find(token => token.coin === coin)
}

async function payoutViaLiFi(
  withdrawal: ClaimedWithdrawal,
  token: DepositToken,
  amountRaw: bigint,
  account: HotAccount,
): Promise<`0x${string}`> {
  await ensureLiFiServerConfig()

  const toChainId = NETWORK_CHAIN_IDS[withdrawal.dest_network]
  if (!toChainId) {
    throw new Error(`Unsupported network ${withdrawal.dest_network}`)
  }

  const want = withdrawal.dest_coin.toUpperCase()
  const tokensResponse = await getTokens({ extended: true, chains: [toChainId] })
  const list = tokensResponse.tokens[toChainId] ?? []
  const destToken = list.find(item => item.symbol.toUpperCase() === want)
    ?? list.find(item => item.symbol.toUpperCase() === 'USDC')
  if (!destToken) {
    throw new Error('Destination token unavailable.')
  }

  const quote = await getQuote({
    fromChain: DEFAULT_CHAIN_ID,
    toChain: toChainId,
    fromToken: token.address,
    toToken: destToken.address,
    fromAddress: account.address,
    toAddress: withdrawal.to_address,
    fromAmount: amountRaw.toString(),
  })

  const transactionRequest = quote.transactionRequest
  if (!transactionRequest?.to || !transactionRequest.data) {
    throw new Error('No withdrawal route available.')
  }

  const publicClient = createPublicClient({ chain: defaultViemNetwork, transport: http(defaultViemRpcUrl) })
  const wallet = createWalletClient({ account, chain: defaultViemNetwork, transport: http(defaultViemRpcUrl) })

  const approveHash = await wallet.writeContract({
    address: token.address,
    abi: erc20Abi,
    functionName: 'approve',
    args: [transactionRequest.to as `0x${string}`, amountRaw],
  })
  await publicClient.waitForTransactionReceipt({ hash: approveHash })

  return wallet.sendTransaction({
    to: transactionRequest.to as `0x${string}`,
    data: transactionRequest.data as `0x${string}`,
    value: transactionRequest.value ? BigInt(transactionRequest.value) : 0n,
  })
}

export async function runWithdrawalProcessing(): Promise<WithdrawalProcessingResult> {
  const hotKey = process.env.WITHDRAWAL_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!hotKey) {
    return { disabled: true, processed: 0 }
  }

  const account = privateKeyToAccount(normalizePrivateKey(hotKey))
  const publicClient = createPublicClient({ chain: defaultViemNetwork, transport: http(defaultViemRpcUrl) })
  const wallet = createWalletClient({ account, chain: defaultViemNetwork, transport: http(defaultViemRpcUrl) })

  const pending = await claimPendingWithdrawals(MAX_WITHDRAWALS_PER_RUN)
  let processed = 0

  for (const withdrawal of pending) {
    try {
      const token = tokenForCoin(withdrawal.coin)
      if (!token) {
        throw new Error(`Unsupported coin ${withdrawal.coin}`)
      }
      const amountRaw = parseUnits(withdrawal.amount, token.decimals)

      const isSameChainSameCoin = withdrawal.dest_network === 'polygon'
        && withdrawal.dest_coin.toUpperCase() === withdrawal.coin
      const txHash = isSameChainSameCoin
        ? await wallet.writeContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [withdrawal.to_address as `0x${string}`, amountRaw],
          })
        : await payoutViaLiFi(withdrawal, token, amountRaw, account)

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      await markWithdrawal(withdrawal.id, 'completed', { txHash })
      await db.insert(finance_transactions).values({
        user_id: withdrawal.user_id,
        wallet_address: withdrawal.to_address,
        type: 'withdrawal',
        amount: withdrawal.amount,
        currency: withdrawal.coin,
        status: 'completed',
        method: 'Crypto Withdrawal',
        tx_hash: txHash,
      })
      processed += 1
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed.'
      await markWithdrawal(withdrawal.id, 'failed', { error: message })
      await credit({
        userId: withdrawal.user_id,
        currency: withdrawal.coin,
        amount: withdrawal.amount,
        type: 'refund',
        reference: withdrawal.id,
      })
    }
  }

  return { disabled: false, processed }
}
