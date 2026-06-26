import { eq, sql } from 'drizzle-orm'
import { withdrawals } from '@/lib/db/schema/ledger/tables'
import { db } from '@/lib/drizzle'
import 'server-only'

export interface ClaimedWithdrawal {
  id: string
  user_id: string
  coin: string
  amount: string
  dest_network: string
  dest_coin: string
  to_address: string
}

export async function claimPendingWithdrawals(limit: number): Promise<ClaimedWithdrawal[]> {
  const rows = (await db.execute(sql`
    UPDATE withdrawals SET status = 'processing', updated_at = NOW()
    WHERE id IN (
      SELECT id FROM withdrawals
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, user_id, coin, amount::text AS amount, dest_network, dest_coin, to_address
  `)) as unknown as ClaimedWithdrawal[]

  return rows
}

export async function markWithdrawal(
  id: string,
  status: 'completed' | 'failed',
  opts?: { txHash?: string, error?: string },
): Promise<void> {
  await db
    .update(withdrawals)
    .set({
      status,
      tx_hash: opts?.txHash ?? null,
      error: opts?.error ?? null,
      updated_at: new Date(),
    })
    .where(eq(withdrawals.id, id))
}
