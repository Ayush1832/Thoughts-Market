import type { ContentPostStatus, ContentPostType } from '@/lib/db/schema/content/tables'
import { randomUUID } from 'node:crypto'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { content_posts } from '@/lib/db/schema/content/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const ContentRepository = {
  async listPosts(params: {
    limit?: number
    offset?: number
    search?: string
    type?: ContentPostType
    status?: ContentPostStatus
  } = {}) {
    return runQuery(async () => {
      const { limit = 50, offset = 0, search, type, status } = params

      const conditions = []
      if (search?.trim()) {
        conditions.push(or(
          ilike(content_posts.title, `%${search.trim()}%`),
          ilike(content_posts.body, `%${search.trim()}%`),
        ))
      }
      if (type) {
        conditions.push(eq(content_posts.type, type))
      }
      if (status) {
        conditions.push(eq(content_posts.status, status))
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const [rows, [{ value: total }]] = await Promise.all([
        db.select().from(content_posts).where(where).orderBy(desc(content_posts.created_at)).limit(limit).offset(offset),
        db.select({ value: count() }).from(content_posts).where(where),
      ])

      return { data: { rows, total: Number(total) }, error: null }
    })
  },

  async getPost(id: string) {
    return runQuery(async () => {
      const [row] = await db.select().from(content_posts).where(eq(content_posts.id, id)).limit(1)
      return { data: row ?? null, error: null }
    })
  },

  async createPost(input: {
    title: string
    body: string
    type: ContentPostType
    status: ContentPostStatus
    author_id?: string | null
  }) {
    return runQuery(async () => {
      const now = new Date()
      const [row] = await db
        .insert(content_posts)
        .values({
          id: randomUUID(),
          title: input.title,
          body: input.body,
          type: input.type,
          status: input.status,
          author_id: input.author_id ?? null,
          published_at: input.status === 'published' ? now : null,
          created_at: now,
          updated_at: now,
        })
        .returning()
      return { data: row, error: null }
    })
  },

  async updatePost(id: string, input: Partial<{
    title: string
    body: string
    type: ContentPostType
    status: ContentPostStatus
  }>) {
    return runQuery(async () => {
      const existing = await db.select().from(content_posts).where(eq(content_posts.id, id)).limit(1)
      const wasPublished = existing[0]?.status === 'published'
      const nowPublished = input.status === 'published'

      const [row] = await db
        .update(content_posts)
        .set({
          ...input,
          published_at: !wasPublished && nowPublished ? new Date() : undefined,
          updated_at: new Date(),
        })
        .where(eq(content_posts.id, id))
        .returning()
      return { data: row, error: null }
    })
  },

  async deletePost(id: string) {
    return runQuery(async () => {
      await db.delete(content_posts).where(eq(content_posts.id, id))
      return { data: true, error: null }
    })
  },
}
