import { TronWeb } from 'tronweb'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { getScanCursor, recordAndCreditDeposit, setScanCursor } from '@/lib/db/queries/deposit-events'
import { getUsdPrices } from '@/lib/pricing'
import { isTronConfigured, TRON_NATIVE_COIN, TRON_NATIVE_DECIMALS, TRON_NETWORK, TRON_USDT_CONTRACT, TRON_USDT_DECIMALS } from '@/lib/tron'
import 'server-only'

const MAX_ADDRESSES_PER_RUN = 50
const PAGE_LIMIT = 50
const NATIVE_LOG_INDEX = 2_147_100_000
const TRC20_LOG_INDEX = 2_147_100_001

interface Trc20TransferItem {
  transaction_id: string
  block_timestamp: number
  to: string
  value: string
}

interface NativeTransferItem {
  txID: string
  block_timestamp: number
  ret?: Array<{ contractRet?: string }>
  raw_data?: {
    contract?: Array<{
      type?: string
      parameter?: { value?: { amount?: number, to_address?: string } }
    }>
  }
}

function tronGridHeaders(): Record<string, string> {
  const apiKey = process.env.TRONGRID_API_KEY?.trim()
  return apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}
}

function tronGridBase(): string {
  return process.env.TRON_RPC_URL?.trim() || 'https://api.trongrid.io'
}

async function fetchTrc20Transfers(address: string, minTimestamp: number): Promise<Trc20TransferItem[]> {
  const query = new URLSearchParams({
    only_to: 'true',
    contract_address: TRON_USDT_CONTRACT,
    min_timestamp: String(minTimestamp),
    order_by: 'block_timestamp,asc',
    limit: String(PAGE_LIMIT),
  })
  const response = await fetch(`${tronGridBase()}/v1/accounts/${address}/transactions/trc20?${query}`, {
    headers: tronGridHeaders(),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    return []
  }
  const payload = await response.json() as { data?: Trc20TransferItem[] }
  return payload.data ?? []
}

async function fetchNativeTransfers(address: string, minTimestamp: number): Promise<NativeTransferItem[]> {
  const query = new URLSearchParams({
    only_confirmed: 'true',
    min_timestamp: String(minTimestamp),
    order_by: 'block_timestamp,asc',
    limit: String(PAGE_LIMIT),
  })
  const response = await fetch(`${tronGridBase()}/v1/accounts/${address}/transactions?${query}`, {
    headers: tronGridHeaders(),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    return []
  }
  const payload = await response.json() as { data?: NativeTransferItem[] }
  return payload.data ?? []
}

export interface TronDetectionResult {
  processed: number
  scannedAddresses: number
}

export async function runTronDepositDetection(): Promise<TronDetectionResult> {
  if (!isTronConfigured()) {
    return { processed: 0, scannedAddresses: 0 }
  }

  const monitored = (await listMonitoredDepositAddresses())
    .filter(record => record.network === TRON_NETWORK)
    .slice(0, MAX_ADDRESSES_PER_RUN)

  if (monitored.length === 0) {
    return { processed: 0, scannedAddresses: 0 }
  }

  let priceMap: Record<string, number> = {}
  try {
    priceMap = await getUsdPrices([TRON_NATIVE_COIN, 'USDT'])
  }
  catch {
    priceMap.USDT = 1
  }

  let processed = 0

  for (const record of monitored) {
    const trc20Key = `tron:trc20:${record.address}`
    const nativeKey = `tron:native:${record.address}`

    const trc20Cursor = await getScanCursor(trc20Key)
    const trc20From = trc20Cursor === null ? Date.now() : trc20Cursor + 1
    if (trc20Cursor !== null) {
      const transfers = await fetchTrc20Transfers(record.address, trc20From)
      const usdtPrice = priceMap.USDT ?? 1
      for (const [transferIndex, item] of transfers.entries()) {
        const coinAmount = (Number(item.value) / 10 ** TRON_USDT_DECIMALS).toFixed(TRON_USDT_DECIMALS)
        const usdcAmount = (Number(coinAmount) * usdtPrice).toFixed(6)
        if (Number(usdcAmount) <= 0) {
          continue
        }
        const credited = await recordAndCreditDeposit({
          userId: record.userId,
          depositAddressId: record.id,
          coin: 'USDT',
          network: TRON_NETWORK,
          amount: coinAmount,
          usdcAmount,
          address: record.address,
          txHash: item.transaction_id,
          logIndex: TRC20_LOG_INDEX + transferIndex,
          blockNumber: Math.floor(item.block_timestamp / 1000),
        })
        if (credited) {
          processed += 1
        }
      }
      const maxTimestamp = transfers.length > 0 ? Math.max(...transfers.map(item => item.block_timestamp)) : trc20From - 1
      await setScanCursor(trc20Key, Math.max(maxTimestamp, trc20From - 1))
    }
    else {
      await setScanCursor(trc20Key, Date.now())
    }

    const nativeCursor = await getScanCursor(nativeKey)
    const nativeFrom = nativeCursor === null ? Date.now() : nativeCursor + 1
    if (nativeCursor !== null) {
      const transfers = await fetchNativeTransfers(record.address, nativeFrom)
      const trxPrice = priceMap[TRON_NATIVE_COIN] ?? 0
      for (const item of transfers) {
        const contracts = item.raw_data?.contract ?? []
        for (const [contractIndex, contract] of contracts.entries()) {
          if (contract.type !== 'TransferContract' || item.ret?.[0]?.contractRet !== 'SUCCESS') {
            continue
          }
          const value = contract.parameter?.value
          const amountSun = value?.amount
          if (!amountSun || !value?.to_address) {
            continue
          }
          const toBase58 = TronWeb.address.fromHex(value.to_address)
          if (toBase58 !== record.address || trxPrice <= 0) {
            continue
          }
          const coinAmount = (amountSun / 10 ** TRON_NATIVE_DECIMALS).toFixed(TRON_NATIVE_DECIMALS)
          const usdcAmount = (Number(coinAmount) * trxPrice).toFixed(6)
          if (Number(usdcAmount) <= 0) {
            continue
          }
          const credited = await recordAndCreditDeposit({
            userId: record.userId,
            depositAddressId: record.id,
            coin: TRON_NATIVE_COIN,
            network: TRON_NETWORK,
            amount: coinAmount,
            usdcAmount,
            address: record.address,
            txHash: item.txID,
            logIndex: NATIVE_LOG_INDEX + contractIndex,
            blockNumber: Math.floor(item.block_timestamp / 1000),
          })
          if (credited) {
            processed += 1
          }
        }
      }
      const maxTimestamp = transfers.length > 0 ? Math.max(...transfers.map(item => item.block_timestamp)) : nativeFrom - 1
      await setScanCursor(nativeKey, Math.max(maxTimestamp, nativeFrom - 1))
    }
    else {
      await setScanCursor(nativeKey, Date.now())
    }
  }

  return { processed, scannedAddresses: monitored.length }
}
