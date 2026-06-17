import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import PlatformViewerState from '@/app/[locale]/(platform)/_components/PlatformViewerState'
import AdminHeader from '@/app/[locale]/admin/_components/AdminHeader'
import AdminSidebar from '@/app/[locale]/admin/_components/AdminSidebar'
import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { getAllowedSections, serializeAllowedSections } from '@/lib/admin-permissions'
import { getAdminSession } from '@/lib/admin-session'
import { RolesRepository } from '@/lib/db/queries/roles'
import { UserRepository } from '@/lib/db/queries/user'
import AppKitProvider from '@/providers/AppKitProvider'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ params, children }: LayoutProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  // Check for valid admin session (email/password login)
  const adminSession = await getAdminSession()

  if (adminSession) {
    // Email/password admin: super_admin gets full access, otherwise the visible
    // sections are the union of everything their assigned roles permit.
    const hasSuperAdmin = adminSession.roles.includes('super_admin')
    const allowed = hasSuperAdmin
      ? '*'
      : getAllowedSections(adminSession.roles as AdminRole[], false)
    const allowedSections = serializeAllowedSections(allowed)

    return (
      <AppKitProvider>
        <PlatformViewerState />
        <AdminHeader />
        <main className="container py-4 lg:py-8">
          <div className="grid gap-8 lg:grid-cols-[200px_1fr] lg:gap-16">
            <AdminSidebar allowedSections={allowedSections} />
            <div className="space-y-4">
              {children}
            </div>
          </div>
        </main>
      </AppKitProvider>
    )
  }

  // Fall back to wallet-based RBAC
  // RBAC gate: full-access owners (is_admin / super_admin) OR users with an
  // assigned admin role may enter. Everyone else gets a 404.
  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    redirect(`/${locale}/admin-login`)
  }

  const hasFullAccess = Boolean(user.is_admin || user.is_super_admin)
  const { data: roles } = await RolesRepository.getRolesForUser(user.id)
  const allowed = getAllowedSections(roles ?? [], hasFullAccess)

  // No full access and no role-granted sections → not an admin at all.
  if (allowed !== '*' && allowed.size === 0) {
    redirect(`/${locale}/admin-login`)
  }

  const allowedSections = serializeAllowedSections(allowed)

  return (
    <AppKitProvider>
      <PlatformViewerState />
      <AdminHeader />
      <main className="container py-4 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-[200px_1fr] lg:gap-16">
          <AdminSidebar allowedSections={allowedSections} />
          <div className="space-y-8">
            {children}
          </div>
        </div>
      </main>
    </AppKitProvider>
  )
}
