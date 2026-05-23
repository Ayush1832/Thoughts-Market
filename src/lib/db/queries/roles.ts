import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { admin_roles, users } from '@/lib/db/schema/auth/tables'
import { runQuery } from '@/lib/db/utils/run-query'
import { db } from '@/lib/drizzle'

export const RolesRepository = {
  async listRoles(params: { limit?: number, offset?: number, search?: string } = {}) {
    return runQuery(async () => {
      const { limit = 100, offset = 0 } = params

      const rows = await db
        .select({
          id: admin_roles.id,
          role: admin_roles.role,
          created_at: admin_roles.created_at,
          user_id: users.id,
          username: users.username,
          address: users.address,
          email: users.email,
          image: users.image,
          deposit_wallet_address: users.deposit_wallet_address,
        })
        .from(admin_roles)
        .innerJoin(users, eq(admin_roles.user_id, users.id))
        .limit(limit)
        .offset(offset)

      return { data: rows, count: rows.length, error: null }
    })
  },

  async assignRole(userId: string, role: AdminRole) {
    return runQuery(async () => {
      const existing = await db
        .select()
        .from(admin_roles)
        .where(and(eq(admin_roles.user_id, userId), eq(admin_roles.role, role)))
        .limit(1)

      if (existing.length > 0) {
        return { data: existing[0], error: null }
      }

      const result = await db
        .insert(admin_roles)
        .values({ id: randomUUID(), user_id: userId, role })
        .returning()

      return { data: result[0], error: null }
    })
  },

  async removeRole(userId: string, role: AdminRole) {
    return runQuery(async () => {
      await db
        .delete(admin_roles)
        .where(and(eq(admin_roles.user_id, userId), eq(admin_roles.role, role)))

      return { data: true, error: null }
    })
  },

  async getRolesForUser(userId: string) {
    return runQuery(async () => {
      const rows = await db
        .select()
        .from(admin_roles)
        .where(eq(admin_roles.user_id, userId))

      return { data: rows.map(r => r.role), error: null }
    })
  },
}
