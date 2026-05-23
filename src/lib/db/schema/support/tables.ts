import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const TICKET_CATEGORIES = [
  'deposits',
  'withdrawals',
  'kyc',
  'market_disputes',
  'technical_issues',
] as const

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]
export type TicketStatus = (typeof TICKET_STATUSES)[number]
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const support_tickets = pgTable(
  'support_tickets',
  {
    id: text().primaryKey(),
    user_id: text().references(() => users.id, { onDelete: 'set null' }),
    category: text().$type<TicketCategory>().notNull(),
    subject: text().notNull(),
    description: text().notNull(),
    status: text().$type<TicketStatus>().notNull().default('open'),
    priority: text().$type<TicketPriority>().notNull().default('medium'),
    assigned_to: text().references(() => users.id, { onDelete: 'set null' }),
    resolution_notes: text(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => ({
    categoryIdx: index('idx_support_tickets_category').on(table.category),
    statusIdx: index('idx_support_tickets_status').on(table.status),
    userIdx: index('idx_support_tickets_user_id').on(table.user_id),
  }),
)
