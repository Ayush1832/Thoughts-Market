import { desc, eq } from 'drizzle-orm'
import { p2p_ledger, p2p_wallets } from '@/lib/db/schema/rooms/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

// Play-money credited to each user's P2P wallet the first time they use it.
// This is NOT real money — it only exists inside the peer-to-peer game.
export const P2P_STARTING_BALANCE = 1000

export type P2pLedgerType = 'starting' | 'bet' | 'win' | 'refund'

// A drizzle transaction handle (what db.transaction hands to its callback).
export type P2pTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Ensure a wallet row exists (seeded with the starting balance) and return its
// current balance. Must run inside a transaction so callers stay atomic.
export async function ensureP2pWallet(tx: P2pTx, userId: string): Promise<number> {
  const [existing] = await tx.select().from(p2p_wallets).where(eq(p2p_wallets.user_id, userId)).limit(1)
  if (existing) {
    return Number(existing.balance)
  }

  const [created] = await tx
    .insert(p2p_wallets)
    .values({ user_id: userId, balance: String(P2P_STARTING_BALANCE) })
    .onConflictDoNothing()
    .returning()

  if (created) {
    await tx.insert(p2p_ledger).values({
      user_id: userId,
      room_id: null,
      type: 'starting',
      amount: String(P2P_STARTING_BALANCE),
      balance_after: String(P2P_STARTING_BALANCE),
    })
    return P2P_STARTING_BALANCE
  }

  // Lost an insert race — read the row the other writer created.
  const [row] = await tx.select().from(p2p_wallets).where(eq(p2p_wallets.user_id, userId)).limit(1)
  return row ? Number(row.balance) : 0
}

// Apply a signed delta to the wallet and append a ledger entry. Returns the new
// balance. Negative delta = money out (bet); positive = money in (win/refund).
export async function applyP2pDelta(
  tx: P2pTx,
  userId: string,
  delta: number,
  type: P2pLedgerType,
  roomId: string | null,
): Promise<number> {
  const current = await ensureP2pWallet(tx, userId)
  const next = current + delta

  await tx
    .update(p2p_wallets)
    .set({ balance: String(next), updated_at: new Date() })
    .where(eq(p2p_wallets.user_id, userId))

  await tx.insert(p2p_ledger).values({
    user_id: userId,
    room_id: roomId,
    type,
    amount: String(delta),
    balance_after: String(next),
  })

  return next
}

// Read (and lazily create) the current user's P2P balance.
export async function getP2pBalance(userId: string) {
  return runQuery(async () => {
    const balance = await db.transaction(tx => ensureP2pWallet(tx, userId))
    return { data: { balance }, error: null }
  })
}

// Recent P2P transactions for a user (newest first).
export async function listP2pLedger(userId: string, limit = 50) {
  return runQuery(async () => {
    const rows = await db
      .select()
      .from(p2p_ledger)
      .where(eq(p2p_ledger.user_id, userId))
      .orderBy(desc(p2p_ledger.created_at))
      .limit(limit)
    return { data: rows, error: null }
  })
}
