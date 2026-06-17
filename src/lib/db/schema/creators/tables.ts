import { sql } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const CREATOR_APP_STATUSES = ['pending', 'approved', 'rejected', 'verified'] as const
export type CreatorApplicationStatus = (typeof CREATOR_APP_STATUSES)[number]

export const creator_applications = pgTable('creator_applications', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().references(() => users.id, { onDelete: 'set null' }),
  display_name: text().notNull(),
  username: text().notNull(),
  niche: text().notNull(),
  social_link: text(),
  reason: text().notNull(),
  status: text().$type<CreatorApplicationStatus>().notNull().default('pending'),
  is_active: boolean().notNull().default(true),
  reviewed_by: text().references(() => users.id, { onDelete: 'set null' }),
  review_notes: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export type CreatorApplication = typeof creator_applications.$inferSelect
export type NewCreatorApplication = typeof creator_applications.$inferInsert
