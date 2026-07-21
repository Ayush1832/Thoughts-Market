import { eq, sql } from 'drizzle-orm'
import { withdrawals } from '@/lib/db/schema/ledger/tables'
import { db } from '@/lib/drizzle'
import 'server-only'

type DbExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db

export interface ClaimedWithdrawal {
  id: string
  user_id: string
  coin: string
  amount: string
  usd_amount: string
  fee_usd: string
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
    RETURNING id, user_id, coin, amount::text AS amount, usd_amount::text AS usd_amount,
      fee_usd::text AS fee_usd, dest_network, dest_coin, to_address
  `)) as unknown as ClaimedWithdrawal[]

  return rows
}

// For cases where a payout may have already succeeded on-chain but we can't
// confirm it (RPC timeout, unindexed tx, a DB error after a confirmed send).
// Deliberately does not touch `status` — it stays 'processing' (set by
// claimPendingWithdrawals), so it can never be re-claimed as pending and
// never gets auto-refunded. An admin must reconcile it manually.
export async function flagWithdrawalForReview(
  id: string,
  note: string,
  executor: DbExecutor = db,
): Promise<void> {
  await executor
    .update(withdrawals)
    .set({ error: note, updated_at: new Date() })
    .where(eq(withdrawals.id, id))
}

export async function markWithdrawal(
  id: string,
  status: 'completed' | 'failed',
  opts?: { txHash?: string, error?: string, executor?: DbExecutor },
): Promise<void> {
  const executor = opts?.executor ?? db
  await executor
    .update(withdrawals)
    .set({
      status,
      tx_hash: opts?.txHash ?? null,
      error: opts?.error ?? null,
      updated_at: new Date(),
    })
    .where(eq(withdrawals.id, id))
}
