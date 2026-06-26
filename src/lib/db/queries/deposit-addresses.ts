import { and, eq, sql } from 'drizzle-orm'
import { deposit_addresses } from '@/lib/db/schema/deposit-addresses/tables'
import { assertValidDerivationIndex, deriveDepositAddress } from '@/lib/deposit-hd'
import { db } from '@/lib/drizzle'
import 'server-only'

export interface DepositAddressRecord {
  id: string
  userId: string
  network: string
  coin: string
  rotationIndex: number
  derivationIndex: number
  address: string
  isActive: boolean
  createdAt: Date
}

function toRecord(row: typeof deposit_addresses.$inferSelect): DepositAddressRecord {
  return {
    id: row.id,
    userId: row.user_id,
    network: row.network,
    coin: row.coin,
    rotationIndex: row.rotation_index,
    derivationIndex: row.derivation_index,
    address: row.address,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

async function nextDerivationIndex(): Promise<number> {
  const rows = (await db.execute(
    sql`SELECT nextval('deposit_address_index_seq') AS idx`,
  )) as unknown as Array<{ idx: string | number | bigint }>
  const raw = rows?.[0]?.idx
  const index = typeof raw === 'bigint' ? Number(raw) : Number(raw)
  assertValidDerivationIndex(index)
  return index
}

export async function getActiveDepositAddress(
  userId: string,
  coin: string,
  network: string,
): Promise<DepositAddressRecord | null> {
  const [row] = await db
    .select()
    .from(deposit_addresses)
    .where(and(
      eq(deposit_addresses.user_id, userId),
      eq(deposit_addresses.coin, coin),
      eq(deposit_addresses.network, network),
      eq(deposit_addresses.is_active, true),
    ))
    .limit(1)

  return row ? toRecord(row) : null
}

async function createDepositAddress(
  userId: string,
  coin: string,
  network: string,
  rotationIndex: number,
): Promise<DepositAddressRecord> {
  const derivationIndex = await nextDerivationIndex()
  const address = deriveDepositAddress(derivationIndex)

  const [row] = await db
    .insert(deposit_addresses)
    .values({
      user_id: userId,
      coin,
      network,
      rotation_index: rotationIndex,
      derivation_index: derivationIndex,
      address,
      is_active: true,
    })
    .returning()

  return toRecord(row!)
}

export async function getOrCreateActiveDepositAddress(
  userId: string,
  coin: string,
  network: string,
): Promise<DepositAddressRecord> {
  const existing = await getActiveDepositAddress(userId, coin, network)
  if (existing) {
    return existing
  }

  try {
    return await createDepositAddress(userId, coin, network, 0)
  }
  catch (error) {
    const winner = await getActiveDepositAddress(userId, coin, network)
    if (winner) {
      return winner
    }
    throw error
  }
}

export async function refreshDepositAddress(
  userId: string,
  coin: string,
  network: string,
): Promise<DepositAddressRecord> {
  const current = await getActiveDepositAddress(userId, coin, network)
  const nextRotation = current ? current.rotationIndex + 1 : 0

  if (current) {
    await db
      .update(deposit_addresses)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(deposit_addresses.id, current.id))
  }

  return createDepositAddress(userId, coin, network, nextRotation)
}

export async function listMonitoredDepositAddresses(): Promise<DepositAddressRecord[]> {
  const rows = await db.select().from(deposit_addresses)
  return rows.map(toRecord)
}
