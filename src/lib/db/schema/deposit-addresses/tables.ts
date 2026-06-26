import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const deposit_addresses = pgTable('deposit_addresses', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  network: text().notNull().default('polygon'),
  coin: text().notNull().default('USDC'),
  rotation_index: integer().notNull().default(0),
  derivation_index: bigint({ mode: 'number' }).notNull().unique(),
  address: text().notNull(),
  is_active: boolean().notNull().default(true),
  swept_at: timestamp({ withTimezone: true }),
  metadata: jsonb().notNull().default(sql`'{}'::jsonb`),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const deposit_events = pgTable('deposit_events', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  deposit_address_id: text().notNull().references(() => deposit_addresses.id, { onDelete: 'cascade' }),
  coin: text().notNull(),
  network: text().notNull().default('polygon'),
  amount: numeric({ precision: 38, scale: 18 }).notNull(),
  tx_hash: text().notNull(),
  log_index: integer().notNull(),
  block_number: bigint({ mode: 'number' }).notNull(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const deposit_scan_state = pgTable('deposit_scan_state', {
  key: text().primaryKey(),
  last_block: bigint({ mode: 'number' }).notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
