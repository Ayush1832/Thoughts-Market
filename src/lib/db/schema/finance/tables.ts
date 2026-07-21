import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { withdrawals } from '@/lib/db/schema/ledger/tables'

export const finance_transactions = pgTable('finance_transactions', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().references(() => users.id, { onDelete: 'set null' }),
  withdrawal_id: text().references(() => withdrawals.id, { onDelete: 'set null' }),
  wallet_address: text().notNull().default(''),
  type: text().notNull(),
  amount: numeric({ precision: 20, scale: 6 }).notNull().default('0'),
  currency: text().notNull().default('USDC'),
  status: text().notNull().default('pending'),
  method: text().notNull().default('Crypto Wallet'),
  tx_hash: text(),
  notes: text(),
  metadata: jsonb().notNull().default(sql`'{}'::jsonb`),
  reviewed_by: text(),
  reviewed_at: timestamp({ withTimezone: true }),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const finance_fee_configs = pgTable('finance_fee_configs', {
  id: serial().primaryKey(),
  fee_key: text().unique().notNull(),
  name: text().notNull(),
  description: text().notNull().default(''),
  category: text().notNull(),
  rate_percent: numeric({ precision: 10, scale: 4 }).notNull().default('0'),
  previous_rate_percent: numeric({ precision: 10, scale: 4 }).notNull().default('0'),
  status: text().notNull().default('active'),
  updated_by: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const finance_alert_configs = pgTable('finance_alert_configs', {
  id: serial().primaryKey(),
  alert_key: text().unique().notNull(),
  name: text().notNull(),
  description: text().notNull().default(''),
  threshold: text().notNull().default('0'),
  severity: text().notNull().default('medium'),
  is_enabled: boolean().notNull().default(true),
  recipients: text().array().notNull().default(sql`'{}'::text[]`),
  updated_by: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const finance_alert_events = pgTable('finance_alert_events', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  config_id: integer().references(() => finance_alert_configs.id, { onDelete: 'set null' }),
  alert_key: text().notNull(),
  type: text().notNull(),
  title: text().notNull(),
  message: text().notNull(),
  threshold: text(),
  current_value: text(),
  status: text().notNull().default('active'),
  metadata: jsonb().notNull().default(sql`'{}'::jsonb`),
  triggered_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  resolved_at: timestamp({ withTimezone: true }),
  resolved_by: text(),
})
