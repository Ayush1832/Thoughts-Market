import type { ReportContentType, ReportStatus } from '@/lib/db/schema/content/tables'
import { randomUUID } from 'node:crypto'
import { and, count, desc, eq } from 'drizzle-orm'
import { community_bans, content_reports } from '@/lib/db/schema/content/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const SocialRepository = {
  async listReports(params: {
    limit?: number
    offset?: number
    status?: ReportStatus
    content_type?: ReportContentType
  } = {}) {
    return runQuery(async () => {
      const { limit = 50, offset = 0, status, content_type } = params

      const conditions = []
      if (status) {
        conditions.push(eq(content_reports.status, status))
      }
      if (content_type) {
        conditions.push(eq(content_reports.content_type, content_type))
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const [rows, [{ value: total }]] = await Promise.all([
        db.select().from(content_reports).where(where).orderBy(desc(content_reports.created_at)).limit(limit).offset(offset),
        db.select({ value: count() }).from(content_reports).where(where),
      ])

      return { data: { rows, total: Number(total) }, error: null }
    })
  },

  async updateReportStatus(id: string, status: ReportStatus, notes: string | null, reviewed_by: string) {
    return runQuery(async () => {
      const [row] = await db
        .update(content_reports)
        .set({ status, notes, reviewed_by, updated_at: new Date() })
        .where(eq(content_reports.id, id))
        .returning()
      return { data: row, error: null }
    })
  },

  async listBans(params: { limit?: number, offset?: number } = {}) {
    return runQuery(async () => {
      const { limit = 50, offset = 0 } = params
      const [rows, [{ value: total }]] = await Promise.all([
        db.select().from(community_bans).orderBy(desc(community_bans.created_at)).limit(limit).offset(offset),
        db.select({ value: count() }).from(community_bans),
      ])
      return { data: { rows, total: Number(total) }, error: null }
    })
  },

  async banUser(input: {
    user_id: string
    reason: string
    banned_by: string
    expires_at?: Date | null
    is_permanent?: boolean
  }) {
    return runQuery(async () => {
      const [row] = await db
        .insert(community_bans)
        .values({
          id: randomUUID(),
          user_id: input.user_id,
          reason: input.reason,
          banned_by: input.banned_by,
          expires_at: input.expires_at ?? null,
          is_permanent: input.is_permanent ?? false,
        })
        .returning()
      return { data: row, error: null }
    })
  },

  async unbanUser(userId: string) {
    return runQuery(async () => {
      await db.delete(community_bans).where(eq(community_bans.user_id, userId))
      return { data: true, error: null }
    })
  },

  async isUserBanned(userId: string) {
    return runQuery(async () => {
      const now = new Date()
      const rows = await db
        .select()
        .from(community_bans)
        .where(eq(community_bans.user_id, userId))
        .limit(1)

      const ban = rows[0]
      if (!ban) {
        return { data: false, error: null }
      }
      if (ban.is_permanent) {
        return { data: true, error: null }
      }
      if (ban.expires_at && ban.expires_at > now) {
        return { data: true, error: null }
      }
      return { data: false, error: null }
    })
  },
}
