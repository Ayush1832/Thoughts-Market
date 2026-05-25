import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema/auth/tables'

export const CONTENT_POST_TYPES = ['article', 'announcement', 'tutorial', 'ai_insights', 'market_analysis', 'settlement'] as const
export const CONTENT_POST_STATUSES = ['draft', 'published', 'archived'] as const

export type ContentPostType = (typeof CONTENT_POST_TYPES)[number]
export type ContentPostStatus = (typeof CONTENT_POST_STATUSES)[number]

export const content_posts = pgTable(
  'content_posts',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    body: text().notNull(),
    type: text().$type<ContentPostType>().notNull().default('article'),
    status: text().$type<ContentPostStatus>().notNull().default('draft'),
    author_id: text().references(() => users.id, { onDelete: 'set null' }),
    published_at: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => ({
    statusIdx: index('idx_content_posts_status').on(table.status),
    typeIdx: index('idx_content_posts_type').on(table.type),
    authorIdx: index('idx_content_posts_author_id').on(table.author_id),
  }),
)

export const REEL_TYPES = ['campaign', 'creator_clip', 'market_reaction'] as const
export const REEL_STATUSES = ['pending', 'approved', 'rejected', 'featured'] as const

export type ReelType = (typeof REEL_TYPES)[number]
export type ReelStatus = (typeof REEL_STATUSES)[number]

export const reels = pgTable(
  'reels',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    url: text().notNull(),
    type: text().$type<ReelType>().notNull(),
    status: text().$type<ReelStatus>().notNull().default('pending'),
    creator_id: text().references(() => users.id, { onDelete: 'set null' }),
    is_featured: boolean().default(false).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => ({
    statusIdx: index('idx_reels_status').on(table.status),
    typeIdx: index('idx_reels_type').on(table.type),
    creatorIdx: index('idx_reels_creator_id').on(table.creator_id),
  }),
)

export const REPORT_CONTENT_TYPES = ['comment', 'market', 'user', 'reel'] as const
export const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const

export type ReportContentType = (typeof REPORT_CONTENT_TYPES)[number]
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const content_reports = pgTable(
  'content_reports',
  {
    id: text().primaryKey(),
    reporter_id: text().references(() => users.id, { onDelete: 'set null' }),
    content_type: text().$type<ReportContentType>().notNull(),
    content_id: text().notNull(),
    reason: text().notNull(),
    status: text().$type<ReportStatus>().notNull().default('pending'),
    notes: text(),
    reviewed_by: text().references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => ({
    statusIdx: index('idx_content_reports_status').on(table.status),
    contentTypeIdx: index('idx_content_reports_content_type').on(table.content_type),
    reporterIdx: index('idx_content_reports_reporter_id').on(table.reporter_id),
  }),
)

export const community_bans = pgTable(
  'community_bans',
  {
    id: text().primaryKey(),
    user_id: text().notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text().notNull(),
    banned_by: text().references(() => users.id, { onDelete: 'set null' }),
    expires_at: timestamp({ withTimezone: true }),
    is_permanent: boolean().default(false).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    userIdx: index('idx_community_bans_user_id').on(table.user_id),
  }),
)
