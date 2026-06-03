import { sql } from 'drizzle-orm'
import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'
import { events } from '@/lib/db/schema/events/tables'

export const ROOM_STATUSES = ['open', 'playing', 'resolved', 'cancelled'] as const
export type RoomStatus = (typeof ROOM_STATUSES)[number]

export const PARTICIPANT_ROLES = ['host', 'player'] as const
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number]

export const rooms = pgTable('rooms', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  code: text().notNull().unique(),
  name: text().notNull(),
  host_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  event_id: text().references(() => events.id, { onDelete: 'set null' }),
  status: text().$type<RoomStatus>().notNull().default('open'),
  max_participants: integer().notNull().default(50),
  pot_amount: text().notNull().default('0'),
  is_private: boolean().notNull().default(false),
  metadata: jsonb().notNull().default(sql`'{}'::jsonb`),
  started_at: timestamp({ withTimezone: true }),
  resolved_at: timestamp({ withTimezone: true }),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
})

export const room_participants = pgTable('room_participants', {
  id: text().primaryKey().default(sql`generate_ulid()`),
  room_id: text().notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text().$type<ParticipantRole>().notNull().default('player'),
  outcome_choice: text(),
  stake_amount: text().notNull().default('0'),
  pnl: text().notNull().default('0'),
  joined_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  left_at: timestamp({ withTimezone: true }),
})
