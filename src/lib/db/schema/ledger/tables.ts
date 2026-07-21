import { sql } from 'drizzle-orm'
import { jsonb, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const user_balances = pgTable('user_balances', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  currency: text().notNull().default('USDC'),
  available: numeric({ precision: 38, scale: 18 }).notNull().default('0'),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const ledger_entries = pgTable('ledger_entries', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  currency: text().notNull().default('USDC'),
  amount: numeric({ precision: 38, scale: 18 }).notNull(),
  balance_after: numeric({ precision: 38, scale: 18 }).notNull(),
  type: text().notNull(),
  reference: text(),
  metadata: jsonb().notNull().default(sql`'{}'::jsonb`),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const withdrawals = pgTable('withdrawals', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  coin: text().notNull(),
  amount: numeric({ precision: 38, scale: 18 }).notNull(),
  usd_amount: numeric({ precision: 38, scale: 18 }).notNull().default('0'),
  fee_usd: numeric({ precision: 38, scale: 18 }).notNull().default('0'),
  dest_network: text().notNull().default('polygon'),
  dest_coin: text().notNull(),
  to_address: text().notNull(),
  status: text().notNull().default('pending'),
  tx_hash: text(),
  error: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
