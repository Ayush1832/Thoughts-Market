import { sql } from 'drizzle-orm'
import { boolean, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const CREATOR_APP_STATUSES = ['pending', 'approved', 'rejected', 'verified'] as const
export type CreatorApplicationStatus = (typeof CREATOR_APP_STATUSES)[number]

// Flexible bag for the full multi-section application form (personal info,
// social media verification, community data, Thought So activity, etc.).
export type CreatorApplicationDetails = Record<string, unknown>

export const creator_applications = pgTable('creator_applications', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  user_id: text().references(() => users.id, { onDelete: 'set null' }),
  display_name: text().notNull(),
  username: text().notNull(),
  niche: text().notNull(),
  social_link: text(),
  reason: text().notNull(),
  details: jsonb().$type<CreatorApplicationDetails>().notNull().default({}),
  status: text().$type<CreatorApplicationStatus>().notNull().default('pending'),
  is_active: boolean().notNull().default(true),
  reviewed_by: text().references(() => users.id, { onDelete: 'set null' }),
  review_notes: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export type CreatorApplication = typeof creator_applications.$inferSelect
export type NewCreatorApplication = typeof creator_applications.$inferInsert

// Which creators a user follows (persists the Creators Corner "Follow" state).
export const creator_follows = pgTable('creator_follows', {
  follower_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  creator_id: text().notNull().references(() => creator_applications.id, { onDelete: 'cascade' }),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, table => [
  primaryKey({ columns: [table.follower_id, table.creator_id] }),
])
