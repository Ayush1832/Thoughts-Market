import { sql } from 'drizzle-orm'
import { numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const positions = pgTable('positions', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  condition_id: text().notNull(),
  token_id: text().notNull(),
  outcome: text().notNull(),
  shares: numeric({ precision: 38, scale: 6 }).notNull().default('0'),
  avg_price_cents: numeric({ precision: 10, scale: 4 }).notNull().default('0'),
  realized_pnl: numeric({ precision: 38, scale: 6 }).notNull().default('0'),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const omnibus_orders = pgTable('omnibus_orders', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  clob_order_id: text().unique(),
  condition_id: text().notNull(),
  token_id: text().notNull(),
  outcome: text().notNull(),
  side: text().notNull(),
  order_type: text().notNull(),
  shares: numeric({ precision: 38, scale: 6 }).notNull().default('0'),
  price_cents: numeric({ precision: 10, scale: 4 }).notNull().default('0'),
  reserved_amount: numeric({ precision: 38, scale: 6 }).notNull().default('0'),
  filled_shares: numeric({ precision: 38, scale: 6 }).notNull().default('0'),
  status: text().notNull().default('open'),
  currency: text().notNull().default('USDC'),
  error: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
