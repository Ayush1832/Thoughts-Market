import { index, jsonb, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core'

export const ai_event_insights = pgTable(
  'ai_event_insights',
  {
    event_id: text().notNull(),
    locale: text().notNull().default('en'),
    summary: text().notNull().default(''),
    probability_explanation: text().notNull().default(''),
    risk_warning: text().notNull().default(''),
    entry_timing: text().notNull().default(''),
    crowd_psychology: text().notNull().default(''),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    pk: index('idx_ai_event_insights_event_locale').on(table.event_id, table.locale),
    eventIdx: index('idx_ai_event_insights_event_id').on(table.event_id),
  }),
)

export const ai_risk_scores = pgTable(
  'ai_risk_scores',
  {
    condition_id: text().primaryKey(),
    manipulation_risk: real().notNull().default(0),
    resolution_clarity: real().notNull().default(0),
    liquidity_quality: real().notNull().default(0),
    volatility: real().notNull().default(0),
    credibility: real().notNull().default(0),
    overall_score: real().notNull().default(0),
    summary: text().notNull().default(''),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
)

export const ai_market_alerts = pgTable(
  'ai_market_alerts',
  {
    id: text().primaryKey(),
    event_id: text().notNull(),
    alert_type: text().notNull(),
    severity: text().notNull().default('low'),
    title: text().notNull(),
    description: text().notNull(),
    metadata: jsonb().default({}),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    eventIdx: index('idx_ai_market_alerts_event_id').on(table.event_id),
    typeIdx: index('idx_ai_market_alerts_type').on(table.alert_type),
  }),
)
