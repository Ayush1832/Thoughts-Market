import { desc, eq } from 'drizzle-orm'
import { treasury_payouts } from '@/lib/db/schema/treasury/tables'
import { db } from '@/lib/drizzle'
import 'server-only'

export interface TreasuryPayoutRecord {
  id: string
  fromNetwork: string
  fromCoin: string
  amount: string
  toAddress: string
  txHash: string | null
  status: string
  error: string | null
  createdAt: Date
}

function toRecord(row: typeof treasury_payouts.$inferSelect): TreasuryPayoutRecord {
  return {
    id: row.id,
    fromNetwork: row.from_network,
    fromCoin: row.from_coin,
    amount: row.amount,
    toAddress: row.to_address,
    txHash: row.tx_hash,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
  }
}

export async function createTreasuryPayoutRecord(input: {
  fromNetwork: string
  fromCoin: string
  amount: string
  toAddress: string
  triggeredBy: string
}): Promise<string> {
  const [row] = await db
    .insert(treasury_payouts)
    .values({
      from_network: input.fromNetwork,
      from_coin: input.fromCoin,
      amount: input.amount,
      to_address: input.toAddress,
      triggered_by: input.triggeredBy,
      status: 'pending',
    })
    .returning({ id: treasury_payouts.id })

  return row!.id
}

export async function markTreasuryPayout(
  id: string,
  status: 'completed' | 'failed',
  opts?: { txHash?: string, error?: string },
): Promise<void> {
  await db
    .update(treasury_payouts)
    .set({
      status,
      tx_hash: opts?.txHash ?? null,
      error: opts?.error ?? null,
      updated_at: new Date(),
    })
    .where(eq(treasury_payouts.id, id))
}

export async function listRecentTreasuryPayouts(limit: number): Promise<TreasuryPayoutRecord[]> {
  const rows = await db
    .select()
    .from(treasury_payouts)
    .orderBy(desc(treasury_payouts.created_at))
    .limit(limit)

  return rows.map(toRecord)
}
