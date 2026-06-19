import type { CreatorApplicationStatus } from '@/lib/db/schema/creators/tables'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { users } from '@/lib/db/schema/auth/tables'
import { creator_applications } from '@/lib/db/schema/creators/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

// Statuses that make a creator publicly visible in Creators Corner.
const PUBLIC_CREATOR_STATUSES: CreatorApplicationStatus[] = ['approved', 'verified']

export const CreatorApplicationsRepository = {
  async submit(data: {
    userId: string | null
    displayName: string
    username: string
    niche: string
    socialLink?: string
    reason: string
  }) {
    return runQuery(async () => {
      const [row] = await db
        .insert(creator_applications)
        .values({
          user_id: data.userId ?? undefined,
          display_name: data.displayName,
          username: data.username.toLowerCase(),
          niche: data.niche,
          social_link: data.socialLink ?? null,
          reason: data.reason,
        })
        .onConflictDoUpdate({
          target: creator_applications.username,
          set: {
            display_name: data.displayName,
            niche: data.niche,
            social_link: data.socialLink ?? null,
            reason: data.reason,
            status: 'pending',
            updated_at: new Date(),
          },
        })
        .returning()

      return { data: row ?? null, error: null }
    })
  },

  async list(opts: { status?: CreatorApplicationStatus | 'all', limit?: number, offset?: number }) {
    return runQuery(async () => {
      const limit = opts.limit ?? 50
      const offset = opts.offset ?? 0

      const query = db
        .select({
          id: creator_applications.id,
          user_id: creator_applications.user_id,
          display_name: creator_applications.display_name,
          username: creator_applications.username,
          niche: creator_applications.niche,
          social_link: creator_applications.social_link,
          reason: creator_applications.reason,
          status: creator_applications.status,
          is_active: creator_applications.is_active,
          review_notes: creator_applications.review_notes,
          created_at: creator_applications.created_at,
          updated_at: creator_applications.updated_at,
          reviewer_username: users.username,
        })
        .from(creator_applications)
        .leftJoin(users, eq(creator_applications.reviewed_by, users.id))
        .orderBy(desc(creator_applications.created_at))
        .limit(limit)
        .offset(offset)

      const rows = opts.status && opts.status !== 'all'
        ? await query.where(eq(creator_applications.status, opts.status))
        : await query

      const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(creator_applications)

      return { data: { rows, total }, error: null }
    })
  },

  async review(id: string, reviewedBy: string, status: CreatorApplicationStatus, notes?: string) {
    return runQuery(async () => {
      const [row] = await db
        .update(creator_applications)
        .set({
          status,
          reviewed_by: reviewedBy,
          review_notes: notes ?? null,
          updated_at: new Date(),
        })
        .where(eq(creator_applications.id, id))
        .returning()

      return { data: row ?? null, error: null }
    })
  },

  async toggleActive(id: string) {
    return runQuery(async () => {
      const [current] = await db
        .select({ is_active: creator_applications.is_active })
        .from(creator_applications)
        .where(eq(creator_applications.id, id))
        .limit(1)

      if (!current) {
        return { data: null, error: 'Not found' }
      }

      const [row] = await db
        .update(creator_applications)
        .set({ is_active: !current.is_active, updated_at: new Date() })
        .where(eq(creator_applications.id, id))
        .returning()

      return { data: row ?? null, error: null }
    })
  },

  // Public, approved/verified creators for the Creators Corner directory.
  async listPublicCreators(opts: { niche?: string, search?: string, limit?: number, offset?: number } = {}) {
    return runQuery(async () => {
      const limit = opts.limit ?? 60
      const offset = opts.offset ?? 0

      const conditions = [
        inArray(creator_applications.status, PUBLIC_CREATOR_STATUSES),
        eq(creator_applications.is_active, true),
      ]

      const niche = opts.niche?.trim()
      if (niche && niche !== 'All niches' && niche !== 'All') {
        conditions.push(eq(creator_applications.niche, niche))
      }

      const search = opts.search?.trim().toLowerCase()
      if (search) {
        const term = `%${search}%`
        conditions.push(sql`(
          LOWER(${creator_applications.display_name}) LIKE ${term}
          OR LOWER(${creator_applications.username}) LIKE ${term}
          OR LOWER(${creator_applications.niche}) LIKE ${term}
        )`)
      }

      const rows = await db
        .select({
          id: creator_applications.id,
          display_name: creator_applications.display_name,
          username: creator_applications.username,
          niche: creator_applications.niche,
          reason: creator_applications.reason,
          status: creator_applications.status,
          social_link: creator_applications.social_link,
          created_at: creator_applications.created_at,
          image: users.image,
          address: users.address,
        })
        .from(creator_applications)
        .leftJoin(users, eq(creator_applications.user_id, users.id))
        .where(and(...conditions))
        // verified before approved, then newest first
        .orderBy(desc(creator_applications.status), desc(creator_applications.created_at))
        .limit(limit)
        .offset(offset)

      return { data: rows, error: null }
    })
  },

  // Niche → count of public creators, for the filter pills.
  async nicheCounts() {
    return runQuery(async () => {
      const rows = await db
        .select({
          niche: creator_applications.niche,
          count: sql<number>`count(*)::int`,
        })
        .from(creator_applications)
        .where(and(
          inArray(creator_applications.status, PUBLIC_CREATOR_STATUSES),
          eq(creator_applications.is_active, true),
        ))
        .groupBy(creator_applications.niche)
        .orderBy(desc(sql`count(*)`))

      const total = rows.reduce((sum, row) => sum + Number(row.count), 0)
      return { data: { niches: rows, total }, error: null }
    })
  },

  async getByUserId(userId: string) {
    return runQuery(async () => {
      const [row] = await db
        .select()
        .from(creator_applications)
        .where(eq(creator_applications.user_id, userId))
        .orderBy(desc(creator_applications.created_at))
        .limit(1)

      return { data: row ?? null, error: null }
    })
  },
}
