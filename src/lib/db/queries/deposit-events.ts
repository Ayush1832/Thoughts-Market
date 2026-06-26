import { eq, sql } from 'drizzle-orm'
import { creditTx } from '@/lib/db/queries/ledger'
import { deposit_scan_state } from '@/lib/db/schema/deposit-addresses/tables'
import { finance_transactions } from '@/lib/db/schema/finance/tables'
import { db } from '@/lib/drizzle'
import 'server-only'

export async function getScanCursor(key: string): Promise<number | null> {
  const [row] = await db
    .select({ last_block: deposit_scan_state.last_block })
    .from(deposit_scan_state)
    .where(eq(deposit_scan_state.key, key))
    .limit(1)

  return row ? row.last_block : null
}

export async function setScanCursor(key: string, lastBlock: number): Promise<void> {
  await db.execute(sql`
    INSERT INTO deposit_scan_state (key, last_block)
    VALUES (${key}, ${lastBlock})
    ON CONFLICT (key) DO UPDATE SET last_block = EXCLUDED.last_block, updated_at = NOW()
  `)
}

export interface DetectedDeposit {
  userId: string
  depositAddressId: string
  coin: string
  network: string
  amount: string
  address: string
  txHash: string
  logIndex: number
  blockNumber: number
}

export async function recordAndCreditDeposit(deposit: DetectedDeposit): Promise<boolean> {
  return db.transaction(async (tx) => {
    const inserted = (await tx.execute(sql`
      INSERT INTO deposit_events (user_id, deposit_address_id, coin, network, amount, tx_hash, log_index, block_number)
      VALUES (
        ${deposit.userId}, ${deposit.depositAddressId}, ${deposit.coin}, ${deposit.network},
        ${deposit.amount}::numeric, ${deposit.txHash}, ${deposit.logIndex}, ${deposit.blockNumber}
      )
      ON CONFLICT (tx_hash, log_index) DO NOTHING
      RETURNING id
    `)) as unknown as Array<{ id: string }>

    if (inserted.length === 0) {
      return false
    }

    await creditTx(tx, {
      userId: deposit.userId,
      currency: deposit.coin,
      amount: deposit.amount,
      type: 'deposit',
      reference: deposit.txHash,
    })

    await tx.insert(finance_transactions).values({
      user_id: deposit.userId,
      wallet_address: deposit.address,
      type: 'deposit',
      amount: deposit.amount,
      currency: deposit.coin,
      status: 'completed',
      method: 'Crypto Deposit',
      tx_hash: deposit.txHash,
    })

    return true
  })
}
