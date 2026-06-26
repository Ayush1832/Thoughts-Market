import { and, eq, sql } from 'drizzle-orm'
import { ledger_entries, user_balances } from '@/lib/db/schema/ledger/tables'
import { db } from '@/lib/drizzle'
import 'server-only'

export type LedgerEntryType
  = | 'deposit'
    | 'withdrawal'
    | 'trade'
    | 'payout'
    | 'adjustment'
    | 'refund'

export interface LedgerMutation {
  userId: string
  currency: string
  amount: string
  type: LedgerEntryType
  reference?: string | null
  metadata?: Record<string, unknown>
}

type LedgerExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0]

const POSITIVE_DECIMAL = /^\d+(?:\.\d+)?$/

function assertPositiveAmount(amount: string): void {
  if (!POSITIVE_DECIMAL.test(amount) || Number(amount) <= 0) {
    throw new Error(`Invalid ledger amount: ${amount}`)
  }
}

export async function getBalance(userId: string, currency: string): Promise<string> {
  const [row] = await db
    .select({ available: user_balances.available })
    .from(user_balances)
    .where(and(eq(user_balances.user_id, userId), eq(user_balances.currency, currency)))
    .limit(1)

  return row?.available ?? '0'
}

export async function listBalances(userId: string): Promise<Array<{ currency: string, available: string }>> {
  return db
    .select({ currency: user_balances.currency, available: user_balances.available })
    .from(user_balances)
    .where(eq(user_balances.user_id, userId))
}

export async function creditTx(executor: LedgerExecutor, mutation: LedgerMutation): Promise<string> {
  assertPositiveAmount(mutation.amount)

  const rows = (await executor.execute(sql`
    INSERT INTO user_balances (user_id, currency, available)
    VALUES (${mutation.userId}, ${mutation.currency}, ${mutation.amount}::numeric)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET available = user_balances.available + EXCLUDED.available, updated_at = NOW()
    RETURNING available
  `)) as unknown as Array<{ available: string }>

  const balanceAfter = String(rows[0]!.available)
  await executor.insert(ledger_entries).values({
    user_id: mutation.userId,
    currency: mutation.currency,
    amount: mutation.amount,
    balance_after: balanceAfter,
    type: mutation.type,
    reference: mutation.reference ?? null,
    metadata: mutation.metadata ?? {},
  })

  return balanceAfter
}

export async function credit(mutation: LedgerMutation): Promise<string> {
  return db.transaction(executor => creditTx(executor, mutation))
}

export async function debitTx(executor: LedgerExecutor, mutation: LedgerMutation): Promise<string> {
  assertPositiveAmount(mutation.amount)

  const rows = (await executor.execute(sql`
    UPDATE user_balances
    SET available = available - ${mutation.amount}::numeric, updated_at = NOW()
    WHERE user_id = ${mutation.userId}
      AND currency = ${mutation.currency}
      AND available >= ${mutation.amount}::numeric
    RETURNING available
  `)) as unknown as Array<{ available: string }>

  if (rows.length === 0) {
    throw new Error('INSUFFICIENT_BALANCE')
  }

  const balanceAfter = String(rows[0]!.available)
  await executor.insert(ledger_entries).values({
    user_id: mutation.userId,
    currency: mutation.currency,
    amount: `-${mutation.amount}`,
    balance_after: balanceAfter,
    type: mutation.type,
    reference: mutation.reference ?? null,
    metadata: mutation.metadata ?? {},
  })

  return balanceAfter
}

export async function debit(mutation: LedgerMutation): Promise<string> {
  return db.transaction(executor => debitTx(executor, mutation))
}
