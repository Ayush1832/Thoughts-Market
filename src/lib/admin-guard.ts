import type { AdminRole } from '@/lib/db/schema/auth/tables'
import type { AllowedSections } from '@/lib/admin-permissions'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-auth'
import { canAccessSection, getAllowedSections } from '@/lib/admin-permissions'
import { RolesRepository } from '@/lib/db/queries/roles'
import { UserRepository } from '@/lib/db/queries/user'

/**
 * Resolve the current admin's allowed sections from EITHER auth method:
 *  1. The admin-session cookie (username/password login), or
 *  2. The wallet session (is_admin / assigned admin roles).
 * Returns an empty set if the visitor has no admin access at all.
 */
export async function getAdminAccess(): Promise<AllowedSections> {
  // 1) Username/password admin session (cookie).
  const cookieStore = await cookies()
  const session = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
  if (session) {
    return getAllowedSections([session.role as AdminRole], session.role === 'super_admin')
  }

  // 2) Wallet-based admin.
  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    return new Set<string>()
  }
  const hasFullAccess = Boolean(user.is_admin || user.is_super_admin)
  const { data: roles } = await RolesRepository.getRolesForUser(user.id)
  return getAllowedSections(roles ?? [], hasFullAccess)
}

/**
 * Server guard for admin pages. Call at the top of a page/layout:
 *   await requireAdminSection('finance')
 * 404s if the current admin (cookie OR wallet) can't access that section.
 */
export async function requireAdminSection(sectionId: string) {
  const allowed = await getAdminAccess()
  if (!canAccessSection(allowed, sectionId)) {
    notFound()
  }
}
