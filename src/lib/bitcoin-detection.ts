import { BITCOIN_MIN_CONFIRMATIONS, BITCOIN_NATIVE_COIN, BITCOIN_NATIVE_DECIMALS, BITCOIN_NETWORK, bitcoinApiBase, isBitcoinConfigured } from '@/lib/bitcoin'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { getScanCursor, recordAndCreditDeposit, setScanCursor } from '@/lib/db/queries/deposit-events'
import { getUsdPrice } from '@/lib/pricing'
import 'server-only'

const MAX_ADDRESSES_PER_RUN = 50
const MAX_PAGES_PER_ADDRESS = 3

interface EsploraVout {
  scriptpubkey_address?: string
  value: number
}

interface EsploraTx {
  txid: string
  status: { confirmed: boolean, block_height?: number }
  vout: EsploraVout[]
}

export interface BitcoinDetectionResult {
  processed: number
  scannedAddresses: number
}

async function fetchTipHeight(): Promise<number> {
  const response = await fetch(`${bitcoinApiBase()}/blocks/tip/height`, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    throw new Error(`Bitcoin API error ${response.status}`)
  }
  const text = await response.text()
  return Number(text)
}

async function fetchAddressTxs(address: string, lastSeenTxid?: string): Promise<EsploraTx[]> {
  const url = lastSeenTxid
    ? `${bitcoinApiBase()}/address/${address}/txs/chain/${lastSeenTxid}`
    : `${bitcoinApiBase()}/address/${address}/txs`
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    return []
  }
  return await response.json() as EsploraTx[]
}

export async function runBitcoinDepositDetection(): Promise<BitcoinDetectionResult> {
  if (!isBitcoinConfigured()) {
    return { processed: 0, scannedAddresses: 0 }
  }

  const monitored = (await listMonitoredDepositAddresses())
    .filter(record => record.network === BITCOIN_NETWORK)
    .slice(0, MAX_ADDRESSES_PER_RUN)

  if (monitored.length === 0) {
    return { processed: 0, scannedAddresses: 0 }
  }

  let tipHeight: number
  let price: number
  try {
    tipHeight = await fetchTipHeight()
    price = await getUsdPrice(BITCOIN_NATIVE_COIN)
  }
  catch {
    return { processed: 0, scannedAddresses: 0 }
  }
  if (price <= 0) {
    return { processed: 0, scannedAddresses: 0 }
  }

  let processed = 0

  for (const record of monitored) {
    const cursorKey = `bitcoin:${record.address}`
    const cursor = await getScanCursor(cursorKey)

    if (cursor === null) {
      await setScanCursor(cursorKey, tipHeight)
      continue
    }

    const collected: EsploraTx[] = []
    let lastSeenTxid: string | undefined
    for (let page = 0; page < MAX_PAGES_PER_ADDRESS; page += 1) {
      const batch = await fetchAddressTxs(record.address, lastSeenTxid)
      if (batch.length === 0) {
        break
      }
      let reachedCursor = false
      for (const tx of batch) {
        const height = tx.status.block_height
        if (!tx.status.confirmed || height === undefined || height <= cursor) {
          reachedCursor = true
          continue
        }
        if (tipHeight - height + 1 < BITCOIN_MIN_CONFIRMATIONS) {
          continue
        }
        collected.push(tx)
      }
      lastSeenTxid = batch[batch.length - 1]!.txid
      if (reachedCursor) {
        break
      }
    }

    let maxHeight = cursor
    for (const tx of collected) {
      const height = tx.status.block_height!
      maxHeight = Math.max(maxHeight, height)

      for (let voutIndex = 0; voutIndex < tx.vout.length; voutIndex += 1) {
        const output = tx.vout[voutIndex]!
        if (output.scriptpubkey_address !== record.address || output.value <= 0) {
          continue
        }

        const coinAmount = (output.value / 10 ** BITCOIN_NATIVE_DECIMALS).toFixed(BITCOIN_NATIVE_DECIMALS)
        const usdcAmount = (Number(coinAmount) * price).toFixed(6)
        if (Number(usdcAmount) <= 0) {
          continue
        }

        const credited = await recordAndCreditDeposit({
          userId: record.userId,
          depositAddressId: record.id,
          coin: BITCOIN_NATIVE_COIN,
          network: BITCOIN_NETWORK,
          amount: coinAmount,
          usdcAmount,
          address: record.address,
          txHash: tx.txid,
          logIndex: voutIndex,
          blockNumber: height,
        })

        if (credited) {
          processed += 1
        }
      }
    }

    if (maxHeight > cursor) {
      await setScanCursor(cursorKey, maxHeight)
    }
  }

  return { processed, scannedAddresses: monitored.length }
}
