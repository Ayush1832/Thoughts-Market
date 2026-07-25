import type { TransactionReceipt } from 'viem'
import { getQuote } from '@lifi/sdk'
import { createPublicClient, createWalletClient, erc20Abi, formatUnits, http, parseUnits, zeroAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { BITCOIN_LIFI_CHAIN_ID, BITCOIN_NATIVE_COIN, BITCOIN_NATIVE_DECIMALS, isBitcoinConfigured } from '@/lib/bitcoin'
import { bitcoinAmountToSats, getBitcoinTreasuryAddress, getBitcoinTreasuryBalance, signAndBroadcastBitcoinPsbt } from '@/lib/bitcoin-withdrawal'
import { getDepositChain, getEnabledDepositChains } from '@/lib/deposit-chains'
import { ensureLiFiServerConfig } from '@/lib/lifi'
import { getUsdPrices } from '@/lib/pricing'
import { getMintForCoin, isSolanaConfigured, SOLANA_LIFI_CHAIN_ID, SOLANA_NATIVE_COIN, SOLANA_NATIVE_DECIMALS, SOLANA_NATIVE_LIFI_ADDRESS, SOLANA_TOKEN_DECIMALS } from '@/lib/solana'
import { getSolanaTreasuryAddress, getSolanaTreasuryBalance, signAndSendSolanaTransaction, solanaAmountToRaw } from '@/lib/solana-withdrawal'
import { isTronConfigured, TRON_LIFI_CHAIN_ID, TRON_NATIVE_COIN, TRON_NATIVE_DECIMALS, TRON_USDT_CONTRACT, TRON_USDT_DECIMALS } from '@/lib/tron'
import { getTronTreasuryBalance, sendTronTreasuryPayout } from '@/lib/tron-withdrawal'
import 'server-only'

const NON_EVM_TREASURY_COINS: Array<{ network: string, coin: string, decimals: number }> = [
  { network: 'bitcoin', coin: BITCOIN_NATIVE_COIN, decimals: BITCOIN_NATIVE_DECIMALS },
  { network: 'solana', coin: SOLANA_NATIVE_COIN, decimals: SOLANA_NATIVE_DECIMALS },
  { network: 'solana', coin: 'USDC', decimals: SOLANA_TOKEN_DECIMALS },
  { network: 'solana', coin: 'USDT', decimals: SOLANA_TOKEN_DECIMALS },
  { network: 'tron', coin: TRON_NATIVE_COIN, decimals: TRON_NATIVE_DECIMALS },
  { network: 'tron', coin: 'USDT', decimals: TRON_USDT_DECIMALS },
]

async function getNonEvmTreasuryBalanceRaw(network: string, coin: string): Promise<bigint> {
  if (network === 'bitcoin') {
    return getBitcoinTreasuryBalance()
  }
  if (network === 'solana') {
    return getSolanaTreasuryBalance(coin)
  }
  if (network === 'tron') {
    return getTronTreasuryBalance(coin)
  }
  throw new Error(`Unsupported network ${network}`)
}

const NATIVE_GAS_LIMIT = 21000n
const NATIVE_GAS_SAFETY = 3n
const MIN_CONSOLIDATION_USD = 2

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim()
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`
}

// viem resolves waitForTransactionReceipt on a reverted tx instead of throwing —
// without this check a revert gets recorded as a completed treasury payout.
function assertTransactionSuccess(receipt: TransactionReceipt): void {
  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${receipt.transactionHash} reverted on-chain.`)
  }
}

function getTreasuryAccount() {
  const key = process.env.TREASURY_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('TREASURY_PRIVATE_KEY is not set.')
  }
  const account = privateKeyToAccount(normalizePrivateKey(key))

  const expectedAddress = process.env.DEPOSIT_TREASURY_ADDRESS?.trim()
  if (expectedAddress && account.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      'TREASURY_PRIVATE_KEY does not match DEPOSIT_TREASURY_ADDRESS. Refusing to read or move funds from an unexpected wallet.',
    )
  }

  return account
}

export function isTreasuryPayoutConfigured(): boolean {
  return Boolean(process.env.TREASURY_PRIVATE_KEY?.trim())
}

export interface TreasuryBalance {
  network: string
  coin: string
  raw: string
  formatted: string
  decimals: number
}

export async function getTreasuryBalances(): Promise<TreasuryBalance[]> {
  const account = getTreasuryAccount()
  const balances: TreasuryBalance[] = []

  for (const chainConfig of getEnabledDepositChains()) {
    const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })

    const nativeBalance = await publicClient.getBalance({ address: account.address })
    balances.push({
      network: chainConfig.network,
      coin: chainConfig.native.coin,
      raw: nativeBalance.toString(),
      formatted: (Number(nativeBalance) / 10 ** chainConfig.native.decimals).toFixed(6),
      decimals: chainConfig.native.decimals,
    })

    for (const token of chainConfig.tokens) {
      const tokenBalance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      })
      balances.push({
        network: chainConfig.network,
        coin: token.coin,
        raw: tokenBalance.toString(),
        formatted: (Number(tokenBalance) / 10 ** token.decimals).toFixed(6),
        decimals: token.decimals,
      })
    }
  }

  for (const entry of NON_EVM_TREASURY_COINS) {
    if (entry.network === 'bitcoin' && !isBitcoinConfigured()) {
      continue
    }
    if (entry.network === 'solana' && !isSolanaConfigured()) {
      continue
    }
    if (entry.network === 'tron' && !isTronConfigured()) {
      continue
    }
    try {
      const raw = await getNonEvmTreasuryBalanceRaw(entry.network, entry.coin)
      balances.push({
        network: entry.network,
        coin: entry.coin,
        raw: raw.toString(),
        formatted: (Number(raw) / 10 ** entry.decimals).toFixed(6),
        decimals: entry.decimals,
      })
    }
    catch {
      // Treasury address for this chain isn't configured (e.g. no BITCOIN_TREASURY_ADDRESS) — omit rather than fail the whole balances call.
    }
  }

  return balances
}

export interface TreasuryPayoutResult {
  txHash: string
  fromNetwork: string
  fromCoin: string
  amount: string
}

export async function runTreasuryPayout(network: string, coin: string, amount: string, clientTronAddress: string): Promise<TreasuryPayoutResult> {
  if (network === 'tron') {
    if (coin !== 'USDT') {
      throw new Error(
        `Automated payout for TRX on Tron is not supported: there is no swap integration to convert it to USDT. `
        + `Convert it to USDT manually (or via the sweeper into an EVM chain) before paying out.`,
      )
    }
    const decimals = TRON_USDT_DECIMALS
    const amountRaw = BigInt(Math.round(Number(amount) * 10 ** decimals))
    const txHash = await sendTronTreasuryPayout(coin, amountRaw, clientTronAddress)
    return { txHash, fromNetwork: network, fromCoin: coin, amount }
  }

  if (network === 'bitcoin') {
    const treasuryAddress = getBitcoinTreasuryAddress()
    const amountSats = bitcoinAmountToSats(amount)

    await ensureLiFiServerConfig()
    const quote = await getQuote({
      fromChain: BITCOIN_LIFI_CHAIN_ID,
      toChain: TRON_LIFI_CHAIN_ID,
      fromToken: zeroAddress,
      toToken: TRON_USDT_CONTRACT,
      fromAddress: treasuryAddress,
      toAddress: clientTronAddress,
      fromAmount: amountSats.toString(),
    })

    const psbtHex = quote.transactionRequest?.data
    if (!psbtHex || typeof psbtHex !== 'string') {
      throw new Error('No Bitcoin payout route available.')
    }
    const txHash = await signAndBroadcastBitcoinPsbt(psbtHex)
    return { txHash, fromNetwork: network, fromCoin: coin, amount }
  }

  if (network === 'solana') {
    const treasuryAddress = getSolanaTreasuryAddress()
    const amountRaw = solanaAmountToRaw(coin, amount)
    const isNative = coin === SOLANA_NATIVE_COIN
    const fromToken = isNative ? SOLANA_NATIVE_LIFI_ADDRESS : getMintForCoin(coin)?.toBase58()
    if (!fromToken) {
      throw new Error(`Unsupported Solana coin ${coin}`)
    }

    await ensureLiFiServerConfig()
    const quote = await getQuote({
      fromChain: SOLANA_LIFI_CHAIN_ID,
      toChain: TRON_LIFI_CHAIN_ID,
      fromToken,
      toToken: TRON_USDT_CONTRACT,
      fromAddress: treasuryAddress,
      toAddress: clientTronAddress,
      fromAmount: amountRaw.toString(),
    })

    const txData = quote.transactionRequest?.data
    if (!txData || typeof txData !== 'string') {
      throw new Error('No Solana payout route available.')
    }
    const txHash = await signAndSendSolanaTransaction(txData)
    return { txHash, fromNetwork: network, fromCoin: coin, amount }
  }

  const account = getTreasuryAccount()
  const chainConfig = getDepositChain(network)
  if (!chainConfig) {
    throw new Error(`Unsupported network ${network}`)
  }

  const isNative = chainConfig.native.coin === coin
  const token = chainConfig.tokens.find(item => item.coin === coin)
  if (!isNative && !token) {
    throw new Error(`Unsupported coin ${coin} on ${network}`)
  }
  const decimals = isNative ? chainConfig.native.decimals : token!.decimals
  const fromAmount = parseUnits(amount, decimals)

  await ensureLiFiServerConfig()

  const quote = await getQuote({
    fromChain: chainConfig.chain.id,
    toChain: TRON_LIFI_CHAIN_ID,
    fromToken: isNative ? zeroAddress : token!.address,
    toToken: TRON_USDT_CONTRACT,
    fromAddress: account.address,
    toAddress: clientTronAddress,
    fromAmount: fromAmount.toString(),
  })

  const transactionRequest = quote.transactionRequest
  if (!transactionRequest?.to || !transactionRequest.data) {
    throw new Error('No payout route available.')
  }

  const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
  const wallet = createWalletClient({ account, chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })

  if (!isNative) {
    const approveHash = await wallet.writeContract({
      address: token!.address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [transactionRequest.to as `0x${string}`, fromAmount],
    })
    assertTransactionSuccess(await publicClient.waitForTransactionReceipt({ hash: approveHash }))
  }

  const hash = await wallet.sendTransaction({
    to: transactionRequest.to as `0x${string}`,
    data: transactionRequest.data as `0x${string}`,
    value: transactionRequest.value ? BigInt(transactionRequest.value) : 0n,
  })
  assertTransactionSuccess(await publicClient.waitForTransactionReceipt({ hash }))

  return { txHash: hash, fromNetwork: network, fromCoin: coin, amount }
}

export interface TreasuryConsolidationPlanItem {
  network: string
  coin: string
  amount: string
}

export interface TreasuryConsolidationSkip {
  network: string
  coin: string
  reason: string
}

async function planTreasuryConsolidation(): Promise<{
  items: TreasuryConsolidationPlanItem[]
  skipped: TreasuryConsolidationSkip[]
}> {
  const account = getTreasuryAccount()
  const items: TreasuryConsolidationPlanItem[] = []
  const skipped: TreasuryConsolidationSkip[] = []

  const coins = new Set<string>()
  for (const chainConfig of getEnabledDepositChains()) {
    coins.add(chainConfig.native.coin)
    for (const token of chainConfig.tokens) {
      coins.add(token.coin)
    }
  }
  for (const entry of NON_EVM_TREASURY_COINS) {
    coins.add(entry.coin)
  }
  const prices = await getUsdPrices([...coins])

  for (const chainConfig of getEnabledDepositChains()) {
    const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })

    let nativeRaw = await publicClient.getBalance({ address: account.address })
    if (nativeRaw > 0n) {
      const gasPrice = await publicClient.getGasPrice()
      const gasReserve = gasPrice * NATIVE_GAS_LIMIT * NATIVE_GAS_SAFETY
      nativeRaw = nativeRaw > gasReserve ? nativeRaw - gasReserve : 0n

      if (nativeRaw === 0n) {
        skipped.push({ network: chainConfig.network, coin: chainConfig.native.coin, reason: 'Balance reserved for gas.' })
      }
      else {
        const formatted = formatUnits(nativeRaw, chainConfig.native.decimals)
        const usdValue = Number(formatted) * (prices[chainConfig.native.coin.toUpperCase()] ?? 0)
        if (usdValue < MIN_CONSOLIDATION_USD) {
          skipped.push({ network: chainConfig.network, coin: chainConfig.native.coin, reason: 'Below dust threshold.' })
        }
        else {
          items.push({ network: chainConfig.network, coin: chainConfig.native.coin, amount: formatted })
        }
      }
    }

    for (const token of chainConfig.tokens) {
      const tokenRaw = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [account.address],
      })
      if (tokenRaw === 0n) {
        continue
      }

      const formatted = formatUnits(tokenRaw, token.decimals)
      const usdValue = Number(formatted) * (prices[token.coin.toUpperCase()] ?? 0)
      if (usdValue < MIN_CONSOLIDATION_USD) {
        skipped.push({ network: chainConfig.network, coin: token.coin, reason: 'Below dust threshold.' })
        continue
      }

      items.push({ network: chainConfig.network, coin: token.coin, amount: formatted })
    }
  }

  for (const entry of NON_EVM_TREASURY_COINS) {
    if (entry.network === 'bitcoin' && !isBitcoinConfigured()) {
      continue
    }
    if (entry.network === 'solana' && !isSolanaConfigured()) {
      continue
    }
    if (entry.network === 'tron' && !isTronConfigured()) {
      continue
    }

    let raw: bigint
    try {
      raw = await getNonEvmTreasuryBalanceRaw(entry.network, entry.coin)
    }
    catch {
      continue
    }
    if (raw === 0n) {
      continue
    }

    const formatted = (Number(raw) / 10 ** entry.decimals).toFixed(6)
    const usdValue = Number(formatted) * (prices[entry.coin.toUpperCase()] ?? (entry.coin === 'USDT' || entry.coin === 'USDC' ? 1 : 0))
    if (usdValue < MIN_CONSOLIDATION_USD) {
      skipped.push({ network: entry.network, coin: entry.coin, reason: 'Below dust threshold.' })
      continue
    }

    const isAutomatable = entry.network === 'bitcoin' || entry.network === 'solana' || (entry.network === 'tron' && entry.coin === 'USDT')
    if (!isAutomatable) {
      skipped.push({
        network: entry.network,
        coin: entry.coin,
        reason: 'TRX requires manual conversion to USDT — no swap integration.',
      })
      continue
    }

    items.push({ network: entry.network, coin: entry.coin, amount: formatted })
  }

  return { items, skipped }
}

export interface TreasuryConsolidationResult {
  succeeded: TreasuryPayoutResult[]
  failed: Array<{ network: string, coin: string, amount: string, error: string }>
  skipped: TreasuryConsolidationSkip[]
}

export async function runTreasuryConsolidation(clientTronAddress: string): Promise<TreasuryConsolidationResult> {
  const { items, skipped } = await planTreasuryConsolidation()
  const succeeded: TreasuryPayoutResult[] = []
  const failed: Array<{ network: string, coin: string, amount: string, error: string }> = []

  for (const item of items) {
    try {
      const result = await runTreasuryPayout(item.network, item.coin, item.amount, clientTronAddress)
      succeeded.push(result)
    }
    catch (error) {
      failed.push({
        network: item.network,
        coin: item.coin,
        amount: item.amount,
        error: error instanceof Error ? error.message : 'Payout failed.',
      })
    }
  }

  return { succeeded, failed, skipped }
}
