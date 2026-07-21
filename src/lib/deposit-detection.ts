import { createPublicClient, formatUnits, http, parseAbiItem } from 'viem'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { getScanCursor, recordAndCreditDeposit, setScanCursor } from '@/lib/db/queries/deposit-events'
import { getEnabledDepositChains } from '@/lib/deposit-chains'
import { getUsdPrices, isStable } from '@/lib/pricing'
import 'server-only'

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')
const NATIVE_LOG_INDEX = 2_147_000_000

export interface DepositDetectionResult {
  processed: number
  scannedTo: Record<string, number>
}

function toUsdcAmount(coinAmount: string, price: number): string | null {
  const value = Number(coinAmount) * price
  if (!Number.isFinite(value) || value <= 0) {
    return null
  }
  const usdc = value.toFixed(6)
  return Number(usdc) > 0 ? usdc : null
}

export async function runDepositDetection(): Promise<DepositDetectionResult> {
  const chains = getEnabledDepositChains()
  const monitored = await listMonitoredDepositAddresses()

  const coinSet = new Set<string>()
  for (const chainConfig of chains) {
    coinSet.add(chainConfig.native.coin)
    for (const token of chainConfig.tokens) {
      coinSet.add(token.coin)
    }
  }

  let priceMap: Record<string, number> = {}
  try {
    priceMap = await getUsdPrices([...coinSet])
  }
  catch {
    for (const coin of coinSet) {
      if (isStable(coin)) {
        priceMap[coin.toUpperCase()] = 1
      }
    }
  }

  const scannedTo: Record<string, number> = {}
  let processed = 0

  for (const chainConfig of chains) {
    const addresses = monitored.filter(record => record.network === chainConfig.network)
    if (addresses.length === 0) {
      continue
    }

    const byAddress = new Map(addresses.map(record => [record.address.toLowerCase(), record]))
    const watchedAddresses = addresses.map(record => record.address as `0x${string}`)

    const client = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
    const currentBlock = await client.getBlockNumber()
    const safeBlock = currentBlock > chainConfig.confirmations ? currentBlock - chainConfig.confirmations : 0n

    for (const token of chainConfig.tokens) {
      const price = priceMap[token.coin.toUpperCase()]
      if (price === undefined) {
        continue
      }

      const key = `${chainConfig.network}:${token.address.toLowerCase()}`
      const cursor = await getScanCursor(key)

      if (cursor === null) {
        await setScanCursor(key, Number(safeBlock))
        scannedTo[key] = Number(safeBlock)
        continue
      }

      const fromBlock = BigInt(cursor) + 1n
      if (fromBlock > safeBlock) {
        continue
      }

      const maxToBlock = fromBlock + chainConfig.maxRange - 1n
      const toBlock = maxToBlock > safeBlock ? safeBlock : maxToBlock

      const logs = await client.getLogs({
        address: token.address,
        event: TRANSFER_EVENT,
        args: { to: watchedAddresses },
        fromBlock,
        toBlock,
      })

      for (const log of logs) {
        const to = log.args.to?.toLowerCase()
        const value = log.args.value
        if (!to || value === undefined || log.transactionHash === null || log.logIndex === null || log.blockNumber === null) {
          continue
        }
        const record = byAddress.get(to)
        if (!record) {
          continue
        }

        const coinAmount = formatUnits(value, token.decimals)
        const usdcAmount = toUsdcAmount(coinAmount, price)
        if (usdcAmount === null) {
          continue
        }

        const credited = await recordAndCreditDeposit({
          userId: record.userId,
          depositAddressId: record.id,
          coin: token.coin,
          network: chainConfig.network,
          amount: coinAmount,
          usdcAmount,
          address: record.address,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          blockNumber: Number(log.blockNumber),
        })

        if (credited) {
          processed += 1
        }
      }

      await setScanCursor(key, Number(toBlock))
      scannedTo[key] = Number(toBlock)
    }

    const nativePrice = priceMap[chainConfig.native.coin.toUpperCase()]
    if (nativePrice === undefined) {
      continue
    }

    const nativeKey = `${chainConfig.network}:native`
    const nativeCursor = await getScanCursor(nativeKey)

    if (nativeCursor === null) {
      await setScanCursor(nativeKey, Number(safeBlock))
      scannedTo[nativeKey] = Number(safeBlock)
      continue
    }

    const nativeFrom = BigInt(nativeCursor) + 1n
    if (nativeFrom > safeBlock) {
      continue
    }

    const nativeMaxTo = nativeFrom + chainConfig.maxNativeBlocks - 1n
    const nativeTo = nativeMaxTo > safeBlock ? safeBlock : nativeMaxTo

    for (let blockNumber = nativeFrom; blockNumber <= nativeTo; blockNumber += 1n) {
      const block = await client.getBlock({ blockNumber, includeTransactions: true })

      for (const tx of block.transactions) {
        const to = tx.to?.toLowerCase()
        if (!to || tx.value <= 0n) {
          continue
        }
        const record = byAddress.get(to)
        if (!record) {
          continue
        }

        const coinAmount = formatUnits(tx.value, chainConfig.native.decimals)
        const usdcAmount = toUsdcAmount(coinAmount, nativePrice)
        if (usdcAmount === null) {
          continue
        }

        const credited = await recordAndCreditDeposit({
          userId: record.userId,
          depositAddressId: record.id,
          coin: chainConfig.native.coin,
          network: chainConfig.network,
          amount: coinAmount,
          usdcAmount,
          address: record.address,
          txHash: tx.hash,
          logIndex: NATIVE_LOG_INDEX,
          blockNumber: Number(blockNumber),
        })

        if (credited) {
          processed += 1
        }
      }
    }

    await setScanCursor(nativeKey, Number(nativeTo))
    scannedTo[nativeKey] = Number(nativeTo)
  }

  return { processed, scannedTo }
}
