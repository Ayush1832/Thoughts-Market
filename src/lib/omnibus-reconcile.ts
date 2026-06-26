import { applyOmnibusFillAndSettle, listOpenOmnibusOrders } from '@/lib/db/queries/positions'
import { buildClobHmacSignature } from '@/lib/hmac'
import { getOmnibusDepositWalletAddress, isOmnibusConfigured } from '@/lib/omnibus'
import 'server-only'

const OPEN_STATUSES = new Set(['live', 'open', 'delayed'])

interface ClobOrderStatus {
  found: boolean
  sizeMatched: number
  status: string
}

async function fetchOmnibusOrderStatus(makerAddress: string, clobOrderId: string): Promise<ClobOrderStatus | null> {
  const path = `/data/orders?maker=${encodeURIComponent(makerAddress)}&id=${encodeURIComponent(clobOrderId)}`
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = buildClobHmacSignature(process.env.KUEST_API_SECRET ?? '', timestamp, 'GET', path)

  const response = await fetch(`${process.env.CLOB_URL}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      KUEST_ADDRESS: process.env.KUEST_ADDRESS ?? '',
      KUEST_API_KEY: process.env.KUEST_API_KEY ?? '',
      KUEST_PASSPHRASE: process.env.KUEST_PASSPHRASE ?? '',
      KUEST_TIMESTAMP: timestamp.toString(),
      KUEST_SIGNATURE: signature,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    return null
  }

  const payload = await response.json().catch(() => null) as unknown
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : []

  const match = (list as Array<Record<string, unknown>>).find(item => item.id === clobOrderId) ?? list[0] as Record<string, unknown> | undefined
  if (!match) {
    return { found: false, sizeMatched: 0, status: 'closed' }
  }

  return {
    found: true,
    sizeMatched: Number(match.size_matched ?? 0),
    status: String(match.status ?? 'live'),
  }
}

export async function runOmnibusReconciliation(): Promise<{ processed: number }> {
  if (!isOmnibusConfigured()) {
    return { processed: 0 }
  }

  const orders = await listOpenOmnibusOrders()
  if (orders.length === 0) {
    return { processed: 0 }
  }

  const makerAddress = await getOmnibusDepositWalletAddress()
  let processed = 0

  for (const order of orders) {
    if (!order.clob_order_id) {
      continue
    }

    const status = await fetchOmnibusOrderStatus(makerAddress, order.clob_order_id)
    if (!status) {
      continue
    }

    const prevFilled = Number(order.filled_shares)
    const totalShares = Number(order.shares)
    const totalFilled = status.found ? status.sizeMatched : prevFilled
    const newFill = Math.max(0, totalFilled - prevFilled)
    const fullyFilled = totalFilled >= totalShares
    const closed = !status.found || fullyFilled || !OPEN_STATUSES.has(status.status.toLowerCase())

    if (newFill <= 0 && !closed) {
      continue
    }

    await applyOmnibusFillAndSettle({
      orderId: order.id,
      userId: order.user_id,
      conditionId: order.condition_id,
      tokenId: order.token_id,
      outcome: order.outcome,
      side: order.side === 'SELL' ? 'SELL' : 'BUY',
      newFillShares: newFill,
      priceCents: Number(order.price_cents),
      totalFilledShares: totalFilled,
      totalShares,
      reservedAmount: Number(order.reserved_amount),
      closed,
    })

    processed += 1
  }

  return { processed }
}
