import { listSettleablePositions, settlePosition } from '@/lib/db/queries/positions'
import 'server-only'

export async function runResolutionSettlement(): Promise<{ settled: number }> {
  const rows = await listSettleablePositions()
  let settled = 0

  for (const row of rows) {
    await settlePosition({
      positionId: row.id,
      userId: row.user_id,
      conditionId: row.condition_id,
      shares: Number(row.shares),
      avgPriceCents: Number(row.avg_price_cents),
      currentRealized: Number(row.realized_pnl),
      isWinning: Boolean(row.is_winning),
      payoutPerShare: row.payout_value != null ? Number(row.payout_value) : 1,
    })
    settled += 1
  }

  return { settled }
}
