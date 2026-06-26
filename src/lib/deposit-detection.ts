import { createPublicClient, formatUnits, http, parseAbiItem } from 'viem'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { getScanCursor, recordAndCreditDeposit, setScanCursor } from '@/lib/db/queries/deposit-events'
import { DEPOSIT_TOKENS } from '@/lib/deposit-tokens'
import { defaultViemNetwork, defaultViemRpcUrl } from '@/lib/viem-network'
import 'server-only'

const NETWORK = 'polygon'
const CONFIRMATIONS = 12n
const MAX_RANGE = 2000n

const TRANSFER_EVENT = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

export interface DepositDetectionResult {
  processed: number
  scannedTo: Record<string, number>
}

export async function runDepositDetection(): Promise<DepositDetectionResult> {
  const monitored = await listMonitoredDepositAddresses()
  const addresses = monitored.filter(record => record.network === NETWORK)
  const byAddress = new Map(addresses.map(record => [record.address.toLowerCase(), record]))

  const scannedTo: Record<string, number> = {}
  if (byAddress.size === 0) {
    return { processed: 0, scannedTo }
  }

  const client = createPublicClient({ chain: defaultViemNetwork, transport: http(defaultViemRpcUrl) })
  const currentBlock = await client.getBlockNumber()
  const safeBlock = currentBlock > CONFIRMATIONS ? currentBlock - CONFIRMATIONS : 0n
  const watchedAddresses = addresses.map(record => record.address as `0x${string}`)
  let processed = 0

  for (const token of DEPOSIT_TOKENS) {
    const key = `${NETWORK}:${token.address.toLowerCase()}`
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

    const maxToBlock = fromBlock + MAX_RANGE - 1n
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

      const credited = await recordAndCreditDeposit({
        userId: record.userId,
        depositAddressId: record.id,
        coin: token.coin,
        network: NETWORK,
        amount: formatUnits(value, token.decimals),
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

  return { processed, scannedTo }
}
