import { sql } from 'drizzle-orm'
import { numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const treasury_payouts = pgTable('treasury_payouts', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  from_network: text().notNull(),
  from_coin: text().notNull(),
  amount: numeric({ precision: 38, scale: 18 }).notNull(),
  to_address: text().notNull(),
  tx_hash: text(),
  status: text().notNull().default('pending'),
  error: text(),
  triggered_by: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
