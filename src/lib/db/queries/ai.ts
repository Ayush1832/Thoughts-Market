import { and, eq, gt } from 'drizzle-orm'
import { ai_event_insights, ai_market_alerts, ai_risk_scores } from '@/lib/db/schema/ai/tables'
import { db } from '@/lib/drizzle'

const INSIGHTS_TTL_MS = 60 * 60 * 1000 // 1 hour
const RISK_SCORE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const ALERTS_TTL_MS = 30 * 60 * 1000 // 30 minutes

export const AiRepository = {
  // ─── Insights ─────────────────────────────────────────────────────────────

  async getInsights(eventId: string, locale = 'en') {
    try {
      const rows = await db
        .select()
        .from(ai_event_insights)
        .where(
          and(
            eq(ai_event_insights.event_id, eventId),
            eq(ai_event_insights.locale, locale),
            gt(ai_event_insights.expires_at, new Date()),
          ),
        )
        .limit(1)
      return { data: rows[0] ?? null, error: null }
    }
    catch {
      return { data: null, error: 'Failed to load insights.' }
    }
  },

  async upsertInsights(data: {
    event_id: string
    locale: string
    summary: string
    probability_explanation: string
    risk_warning: string
    entry_timing: string
    crowd_psychology: string
  }) {
    try {
      const expires_at = new Date(Date.now() + INSIGHTS_TTL_MS)
      const now = new Date()
      await db
        .insert(ai_event_insights)
        .values({ ...data, expires_at, created_at: now, updated_at: now })
        .onConflictDoNothing()

      await db
        .update(ai_event_insights)
        .set({ ...data, expires_at, updated_at: now })
        .where(
          and(
            eq(ai_event_insights.event_id, data.event_id),
            eq(ai_event_insights.locale, data.locale),
          ),
        )
      return { error: null }
    }
    catch {
      return { error: 'Failed to save insights.' }
    }
  },

  // ─── Risk Scores ──────────────────────────────────────────────────────────

  async getRiskScore(conditionId: string) {
    try {
      const rows = await db
        .select()
        .from(ai_risk_scores)
        .where(
          and(
            eq(ai_risk_scores.condition_id, conditionId),
            gt(ai_risk_scores.expires_at, new Date()),
          ),
        )
        .limit(1)
      return { data: rows[0] ?? null, error: null }
    }
    catch {
      return { data: null, error: 'Failed to load risk score.' }
    }
  },

  async upsertRiskScore(data: {
    condition_id: string
    manipulation_risk: number
    resolution_clarity: number
    liquidity_quality: number
    volatility: number
    credibility: number
    overall_score: number
    summary: string
  }) {
    try {
      const expires_at = new Date(Date.now() + RISK_SCORE_TTL_MS)
      const now = new Date()
      await db
        .insert(ai_risk_scores)
        .values({ ...data, expires_at, created_at: now, updated_at: now })
        .onConflictDoUpdate({
          target: ai_risk_scores.condition_id,
          set: { ...data, expires_at, updated_at: now },
        })
      return { error: null }
    }
    catch {
      return { error: 'Failed to save risk score.' }
    }
  },

  // ─── Alerts ───────────────────────────────────────────────────────────────

  async getAlerts(eventId: string) {
    try {
      const rows = await db
        .select()
        .from(ai_market_alerts)
        .where(
          and(
            eq(ai_market_alerts.event_id, eventId),
            gt(ai_market_alerts.expires_at, new Date()),
          ),
        )
      return { data: rows, error: null }
    }
    catch {
      return { data: [], error: 'Failed to load alerts.' }
    }
  },

  async upsertAlerts(eventId: string, alerts: Array<{
    id: string
    alert_type: string
    severity: string
    title: string
    description: string
    metadata?: Record<string, unknown>
  }>) {
    try {
      const expires_at = new Date(Date.now() + ALERTS_TTL_MS)
      const now = new Date()
      await db.delete(ai_market_alerts).where(eq(ai_market_alerts.event_id, eventId))
      if (alerts.length > 0) {
        await db.insert(ai_market_alerts).values(
          alerts.map(a => ({
            ...a,
            event_id: eventId,
            metadata: a.metadata ?? {},
            expires_at,
            created_at: now,
          })),
        )
      }
      return { error: null }
    }
    catch {
      return { error: 'Failed to save alerts.' }
    }
  },
}
