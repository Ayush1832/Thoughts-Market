import { and, eq, gt } from 'drizzle-orm'
import { creditTx } from '@/lib/db/queries/ledger'
import { markets, outcomes } from '@/lib/db/schema/events/tables'
import { omnibus_orders, positions } from '@/lib/db/schema/trading/tables'
import { db } from '@/lib/drizzle'
import 'server-only'

export async function listPositions(userId: string) {
  return db.select().from(positions).where(eq(positions.user_id, userId))
}

export async function getPosition(userId: string, tokenId: string) {
  const [row] = await db
    .select()
    .from(positions)
    .where(and(eq(positions.user_id, userId), eq(positions.token_id, tokenId)))
    .limit(1)

  return row ?? null
}

export async function listPositionsByCondition(userId: string, conditionId: string) {
  return db
    .select({ token_id: positions.token_id, shares: positions.shares })
    .from(positions)
    .where(and(eq(positions.user_id, userId), eq(positions.condition_id, conditionId)))
}

export async function recordOmnibusOrder(data: typeof omnibus_orders.$inferInsert) {
  const [row] = await db.insert(omnibus_orders).values(data).returning()
  return row!
}

export async function updateOmnibusOrder(
  id: string,
  patch: Partial<typeof omnibus_orders.$inferInsert>,
) {
  const [row] = await db
    .update(omnibus_orders)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(omnibus_orders.id, id))
    .returning()

  return row ?? null
}

export async function listOpenOmnibusOrders() {
  return db.select().from(omnibus_orders).where(eq(omnibus_orders.status, 'open'))
}

export interface OmnibusFillSettlement {
  orderId: string
  userId: string
  conditionId: string
  tokenId: string
  outcome: string
  side: 'BUY' | 'SELL'
  newFillShares: number
  priceCents: number
  totalFilledShares: number
  totalShares: number
  reservedAmount: number
  closed: boolean
}

export async function applyOmnibusFillAndSettle(fill: OmnibusFillSettlement): Promise<void> {
  await db.transaction(async (tx) => {
    if (fill.newFillShares > 0) {
      const [pos] = await tx
        .select()
        .from(positions)
        .where(and(eq(positions.user_id, fill.userId), eq(positions.token_id, fill.tokenId)))
        .limit(1)

      const oldShares = Number(pos?.shares ?? '0')
      const oldAvg = Number(pos?.avg_price_cents ?? '0')

      if (fill.side === 'BUY') {
        const newShares = oldShares + fill.newFillShares
        const newAvg = newShares > 0 ? (oldShares * oldAvg + fill.newFillShares * fill.priceCents) / newShares : 0
        if (pos) {
          await tx.update(positions)
            .set({ shares: newShares.toFixed(6), avg_price_cents: newAvg.toFixed(4), updated_at: new Date() })
            .where(eq(positions.id, pos.id))
        }
        else {
          await tx.insert(positions).values({
            user_id: fill.userId,
            condition_id: fill.conditionId,
            token_id: fill.tokenId,
            outcome: fill.outcome,
            shares: newShares.toFixed(6),
            avg_price_cents: newAvg.toFixed(4),
          })
        }
      }
      else {
        const newShares = Math.max(0, oldShares - fill.newFillShares)
        const realized = Number(pos?.realized_pnl ?? '0') + (fill.newFillShares * (fill.priceCents - oldAvg)) / 100
        const proceeds = (fill.newFillShares * fill.priceCents) / 100
        if (pos) {
          await tx.update(positions)
            .set({ shares: newShares.toFixed(6), realized_pnl: realized.toFixed(6), updated_at: new Date() })
            .where(eq(positions.id, pos.id))
        }
        if (proceeds > 0) {
          await creditTx(tx, { userId: fill.userId, currency: 'USDC', amount: proceeds.toFixed(6), type: 'trade', reference: fill.conditionId })
        }
      }
    }

    await tx.update(omnibus_orders)
      .set({
        filled_shares: fill.totalFilledShares.toFixed(6),
        status: fill.closed
          ? (fill.totalFilledShares >= fill.totalShares ? 'filled' : 'closed')
          : 'open',
        updated_at: new Date(),
      })
      .where(eq(omnibus_orders.id, fill.orderId))

    if (fill.closed && fill.side === 'BUY') {
      const spent = (fill.totalFilledShares * fill.priceCents) / 100
      const refund = fill.reservedAmount - spent
      if (refund > 0.000001) {
        await creditTx(tx, { userId: fill.userId, currency: 'USDC', amount: refund.toFixed(6), type: 'refund', reference: fill.conditionId })
      }
    }
  })
}

export async function listSettleablePositions() {
  return db
    .select({
      id: positions.id,
      user_id: positions.user_id,
      condition_id: positions.condition_id,
      shares: positions.shares,
      avg_price_cents: positions.avg_price_cents,
      realized_pnl: positions.realized_pnl,
      is_winning: outcomes.is_winning_outcome,
      payout_value: outcomes.payout_value,
    })
    .from(positions)
    .innerJoin(markets, eq(markets.condition_id, positions.condition_id))
    .innerJoin(outcomes, eq(outcomes.token_id, positions.token_id))
    .where(and(gt(positions.shares, '0'), eq(markets.is_resolved, true)))
}

export interface PositionSettlement {
  positionId: string
  userId: string
  conditionId: string
  shares: number
  avgPriceCents: number
  currentRealized: number
  isWinning: boolean
  payoutPerShare: number
}

export async function settlePosition(settlement: PositionSettlement): Promise<void> {
  await db.transaction(async (tx) => {
    const settlementPnl = settlement.isWinning
      ? (settlement.shares * (settlement.payoutPerShare * 100 - settlement.avgPriceCents)) / 100
      : -(settlement.shares * settlement.avgPriceCents) / 100

    if (settlement.isWinning) {
      const payout = settlement.shares * settlement.payoutPerShare
      if (payout > 0) {
        await creditTx(tx, { userId: settlement.userId, currency: 'USDC', amount: payout.toFixed(6), type: 'payout', reference: settlement.conditionId })
      }
    }

    await tx.update(positions)
      .set({
        shares: '0',
        realized_pnl: (settlement.currentRealized + settlementPnl).toFixed(6),
        updated_at: new Date(),
      })
      .where(eq(positions.id, settlement.positionId))
  })
}
