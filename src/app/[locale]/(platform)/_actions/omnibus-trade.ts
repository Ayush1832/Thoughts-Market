'use server'

import type { BlockchainOrder, Outcome } from '@/types'
import { formatUnits } from 'viem'
import { z } from 'zod'
import { DEFAULT_ERROR_MESSAGE, getExchangeEip712Domain, ORDER_SIDE, ORDER_TYPE } from '@/lib/constants'
import { credit, debit } from '@/lib/db/queries/ledger'
import { getPosition, recordOmnibusOrder } from '@/lib/db/queries/positions'
import { UserRepository } from '@/lib/db/queries/user'
import { buildClobHmacSignature } from '@/lib/hmac'
import {
  getOmnibusDepositWalletAddress,
  isOmnibusConfigured,
  signOmnibusOrder,
} from '@/lib/omnibus'
import { buildOrderPayload } from '@/lib/orders'

const PlaceOrderSchema = z.object({
  conditionId: z.string().min(1),
  tokenId: z.string().min(1),
  outcome: z.string().min(1),
  isNegRisk: z.boolean().optional(),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT']),
  amount: z.string().default('0'),
  limitPrice: z.string().default('0'),
  limitShares: z.string().default('0'),
  marketPriceCents: z.number().optional(),
  clobType: z.enum(['FOK', 'FAK', 'GTC', 'GTD']).optional(),
})

export type PlaceOmnibusOrderInput = z.input<typeof PlaceOrderSchema>

export interface PlaceOmnibusOrderResult {
  error: string | null
  orderId?: string
}

const TRADING_DISABLED_MESSAGE = 'Trading is not available yet. Please try again later.'

async function submitToClob(
  order: BlockchainOrder,
  signature: string,
  conditionId: string,
  clobOrderType: string,
): Promise<{ error: string | null, orderId: string | null }> {
  const owner = process.env.KUEST_API_KEY ?? ''
  const clobPayload = {
    order: {
      salt: order.salt.toString(),
      maker: order.maker,
      signer: order.signer,
      conditionId,
      tokenId: order.token_id.toString(),
      makerAmount: order.maker_amount.toString(),
      takerAmount: order.taker_amount.toString(),
      expiration: order.expiration.toString(),
      side: order.side === ORDER_SIDE.BUY ? 'BUY' : 'SELL',
      signatureType: order.signature_type,
      timestamp: order.timestamp.toString(),
      metadata: order.metadata,
      builder: order.builder,
      signature,
    },
    orderType: clobOrderType,
    owner,
  }

  const path = '/order'
  const body = JSON.stringify(clobPayload)
  const timestamp = Math.floor(Date.now() / 1000)
  const hmac = buildClobHmacSignature(process.env.KUEST_API_SECRET ?? '', timestamp, 'POST', path, body)

  const response = await fetch(`${process.env.CLOB_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'KUEST_ADDRESS': process.env.KUEST_ADDRESS ?? '',
      'KUEST_API_KEY': owner,
      'KUEST_PASSPHRASE': process.env.KUEST_PASSPHRASE ?? '',
      'KUEST_TIMESTAMP': timestamp.toString(),
      'KUEST_SIGNATURE': hmac,
    },
    body,
    signal: AbortSignal.timeout(20_000),
  })

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || payload?.success === false) {
    const message = typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.errorMsg === 'string' ? payload.errorMsg : 'Your order was rejected.'
    return { error: message, orderId: null }
  }

  const orderId = typeof payload?.orderID === 'string'
    ? payload.orderID
    : typeof payload?.orderId === 'string' ? payload.orderId : null
  return { error: orderId ? null : DEFAULT_ERROR_MESSAGE, orderId }
}

export async function placeOmnibusOrderAction(input: PlaceOmnibusOrderInput): Promise<PlaceOmnibusOrderResult> {
  const parsed = PlaceOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid order.' }
  }
  if (!isOmnibusConfigured()) {
    return { error: TRADING_DISABLED_MESSAGE }
  }

  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    return { error: 'Unauthenticated.' }
  }

  const data = parsed.data
  const isBuy = data.side === 'BUY'
  const sideValue = isBuy ? ORDER_SIDE.BUY : ORDER_SIDE.SELL
  const priceCents = data.orderType === ORDER_TYPE.LIMIT
    ? Number(data.limitPrice)
    : (data.marketPriceCents ?? 0)

  try {
    const makerAddress = await getOmnibusDepositWalletAddress()
    const order = buildOrderPayload({
      outcome: { token_id: data.tokenId } as Outcome,
      makerAddress,
      orderType: data.orderType,
      side: sideValue,
      amount: data.amount,
      limitPrice: data.limitPrice,
      limitShares: data.limitShares,
      marketPriceCents: data.marketPriceCents,
    })

    const costUsdc = formatUnits(order.maker_amount, 6)
    const sharesQty = isBuy ? formatUnits(order.taker_amount, 6) : formatUnits(order.maker_amount, 6)
    const reservedAmount = isBuy ? costUsdc : '0'

    if (isBuy) {
      if (Number(costUsdc) <= 0) {
        return { error: 'Order amount is too small.' }
      }
      try {
        await debit({ userId: user.id, currency: 'USDC', amount: costUsdc, type: 'trade', reference: data.conditionId })
      }
      catch {
        return { error: 'Insufficient available balance for this order.' }
      }
    }
    else {
      const position = await getPosition(user.id, data.tokenId)
      if (Number(position?.shares ?? '0') < Number(sharesQty)) {
        return { error: 'You do not have enough shares to sell.' }
      }
    }

    const domain = getExchangeEip712Domain(data.isNegRisk)
    const signature = await signOmnibusOrder(order, domain)

    const clobOrderType = data.clobType ?? (data.orderType === ORDER_TYPE.MARKET ? 'FAK' : 'GTC')
    const result = await submitToClob(order, signature, data.conditionId, clobOrderType)

    if (result.error || !result.orderId) {
      if (isBuy) {
        await credit({ userId: user.id, currency: 'USDC', amount: costUsdc, type: 'refund', reference: data.conditionId })
      }
      return { error: result.error ?? DEFAULT_ERROR_MESSAGE }
    }

    await recordOmnibusOrder({
      user_id: user.id,
      clob_order_id: result.orderId,
      condition_id: data.conditionId,
      token_id: data.tokenId,
      outcome: data.outcome,
      side: data.side,
      order_type: data.orderType,
      shares: sharesQty,
      price_cents: String(priceCents),
      reserved_amount: reservedAmount,
      status: 'open',
    })

    return { error: null, orderId: result.orderId }
  }
  catch (error) {
    console.error('Failed to place omnibus order', error)
    return { error: DEFAULT_ERROR_MESSAGE }
  }
}
