import type { ReelStatus, ReelType } from '@/lib/db/schema/content/tables'
import { randomUUID } from 'node:crypto'
import { and, count, desc, eq, ilike } from 'drizzle-orm'
import { reels } from '@/lib/db/schema/content/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const ReelsRepository = {
  async listReels(params: {
    limit?: number
    offset?: number
    search?: string
    type?: ReelType
    status?: ReelStatus
  } = {}) {
    return runQuery(async () => {
      const { limit = 50, offset = 0, search, type, status } = params

      const conditions = []
      if (search?.trim()) {
        conditions.push(ilike(reels.title, `%${search.trim()}%`))
      }
      if (type) {
        conditions.push(eq(reels.type, type))
      }
      if (status) {
        conditions.push(eq(reels.status, status))
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const [rows, [{ value: total }]] = await Promise.all([
        db.select().from(reels).where(where).orderBy(desc(reels.created_at)).limit(limit).offset(offset),
        db.select({ value: count() }).from(reels).where(where),
      ])

      return { data: { rows, total: Number(total) }, error: null }
    })
  },

  async createReel(input: {
    title: string
    url: string
    type: ReelType
    creator_id?: string | null
  }) {
    return runQuery(async () => {
      const [row] = await db
        .insert(reels)
        .values({
          id: randomUUID(),
          title: input.title,
          url: input.url,
          type: input.type,
          status: 'pending',
          creator_id: input.creator_id ?? null,
          is_featured: false,
        })
        .returning()
      return { data: row, error: null }
    })
  },

  async updateReelStatus(id: string, status: ReelStatus) {
    return runQuery(async () => {
      const [row] = await db
        .update(reels)
        .set({ status, updated_at: new Date() })
        .where(eq(reels.id, id))
        .returning()
      return { data: row, error: null }
    })
  },

  async toggleFeatured(id: string, is_featured: boolean) {
    return runQuery(async () => {
      const [row] = await db
        .update(reels)
        .set({ is_featured, updated_at: new Date() })
        .where(eq(reels.id, id))
        .returning()
      return { data: row, error: null }
    })
  },

  async deleteReel(id: string) {
    return runQuery(async () => {
      await db.delete(reels).where(eq(reels.id, id))
      return { data: true, error: null }
    })
  },
}
