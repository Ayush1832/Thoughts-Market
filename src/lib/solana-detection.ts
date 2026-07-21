import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { getScanCursor, recordAndCreditDeposit, setScanCursor } from '@/lib/db/queries/deposit-events'
import { getUsdPrices } from '@/lib/pricing'
import {
  getMintForCoin,
  getSolanaConnection,
  isSolanaConfigured,
  SOLANA_NATIVE_COIN,
  SOLANA_NATIVE_DECIMALS,
  SOLANA_NETWORK,
  SOLANA_TOKEN_DECIMALS,
} from '@/lib/solana'
import 'server-only'

const MAX_ADDRESSES_PER_RUN = 50
const MAX_PAGES_PER_ADDRESS = 3
const PAGE_LIMIT = 50

export interface SolanaDetectionResult {
  processed: number
  scannedAddresses: number
}

export async function runSolanaDepositDetection(): Promise<SolanaDetectionResult> {
  if (!isSolanaConfigured()) {
    return { processed: 0, scannedAddresses: 0 }
  }

  const monitored = (await listMonitoredDepositAddresses())
    .filter(record => record.network === SOLANA_NETWORK)
    .slice(0, MAX_ADDRESSES_PER_RUN)

  if (monitored.length === 0) {
    return { processed: 0, scannedAddresses: 0 }
  }

  let priceMap: Record<string, number> = {}
  try {
    priceMap = await getUsdPrices([SOLANA_NATIVE_COIN, 'USDC', 'USDT'])
  }
  catch {
    priceMap.USDC = 1
    priceMap.USDT = 1
  }

  const connection = getSolanaConnection()
  let processed = 0

  for (const record of monitored) {
    const isNative = record.coin === SOLANA_NATIVE_COIN
    const mint = isNative ? null : getMintForCoin(record.coin)
    if (!isNative && !mint) {
      continue
    }

    const ownerPubkey = new PublicKey(record.address)
    const watchPubkey = isNative ? ownerPubkey : getAssociatedTokenAddressSync(mint!, ownerPubkey)
    const cursorKey = `solana:${record.coin}:${record.address}`
    const cursor = await getScanCursor(cursorKey)

    if (cursor === null) {
      await setScanCursor(cursorKey, 0)
      continue
    }

    const signatures: Array<{ signature: string, slot: number }> = []
    let before: string | undefined
    for (let page = 0; page < MAX_PAGES_PER_ADDRESS; page += 1) {
      const batch = await connection.getSignaturesForAddress(watchPubkey, { before, limit: PAGE_LIMIT })
      if (batch.length === 0) {
        break
      }
      let reachedCursor = false
      for (const item of batch) {
        if (item.slot <= cursor) {
          reachedCursor = true
          continue
        }
        signatures.push({ signature: item.signature, slot: item.slot })
      }
      before = batch[batch.length - 1]!.signature
      if (reachedCursor) {
        break
      }
    }

    let maxSlot = cursor
    const price = isNative ? (priceMap[SOLANA_NATIVE_COIN] ?? 0) : (priceMap[record.coin] ?? 0)
    if (price <= 0) {
      continue
    }

    for (const { signature, slot } of signatures) {
      maxSlot = Math.max(maxSlot, slot)

      const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 })
      if (!tx?.meta || tx.meta.err) {
        continue
      }

      let rawIncrease = 0n
      let creditAccountIndex = -1

      if (isNative) {
        const accountIndex = tx.transaction.message.accountKeys.findIndex(entry => entry.pubkey.equals(ownerPubkey))
        if (accountIndex === -1) {
          continue
        }
        creditAccountIndex = accountIndex
        const pre = BigInt(tx.meta.preBalances[accountIndex] ?? 0)
        const post = BigInt(tx.meta.postBalances[accountIndex] ?? 0)
        if (post > pre) {
          rawIncrease = post - pre
        }
      }
      else {
        const preEntry = tx.meta.preTokenBalances?.find(entry => entry.owner === record.address && entry.mint === mint!.toBase58())
        const postEntry = tx.meta.postTokenBalances?.find(entry => entry.owner === record.address && entry.mint === mint!.toBase58())
        if (postEntry) {
          creditAccountIndex = postEntry.accountIndex
        }
        else if (preEntry) {
          creditAccountIndex = preEntry.accountIndex
        }
        const pre = BigInt(preEntry?.uiTokenAmount.amount ?? '0')
        const post = BigInt(postEntry?.uiTokenAmount.amount ?? '0')
        if (post > pre) {
          rawIncrease = post - pre
        }
      }

      if (rawIncrease <= 0n || creditAccountIndex === -1) {
        continue
      }

      const decimals = isNative ? SOLANA_NATIVE_DECIMALS : SOLANA_TOKEN_DECIMALS
      const coinAmount = (Number(rawIncrease) / 10 ** decimals).toFixed(decimals)
      const usdcAmount = (Number(coinAmount) * price).toFixed(6)
      if (Number(usdcAmount) <= 0) {
        continue
      }

      const credited = await recordAndCreditDeposit({
        userId: record.userId,
        depositAddressId: record.id,
        coin: record.coin,
        network: SOLANA_NETWORK,
        amount: coinAmount,
        usdcAmount,
        address: record.address,
        txHash: signature,
        logIndex: creditAccountIndex,
        blockNumber: slot,
      })

      if (credited) {
        processed += 1
      }
    }

    if (maxSlot > cursor) {
      await setScanCursor(cursorKey, maxSlot)
    }
  }

  return { processed, scannedAddresses: monitored.length }
}
