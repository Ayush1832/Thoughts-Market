import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import PlatformViewerState from '@/app/[locale]/(platform)/_components/PlatformViewerState'
import AdminHeader from '@/app/[locale]/admin/_components/AdminHeader'
import AdminSidebar from '@/app/[locale]/admin/_components/AdminSidebar'
import { getAllowedSections, serializeAllowedSections } from '@/lib/admin-permissions'
import { RolesRepository } from '@/lib/db/queries/roles'
import { UserRepository } from '@/lib/db/queries/user'
import AppKitProvider from '@/providers/AppKitProvider'

export const metadata: Metadata = {
  title: 'Admin',
}

export default async function AdminLayout({ params, children }: LayoutProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  // RBAC gate: full-access owners (is_admin / super_admin) OR users with an
  // assigned admin role may enter. Everyone else gets a 404.
  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    notFound()
  }

  const hasFullAccess = Boolean(user.is_admin || user.is_super_admin)
  const { data: roles } = await RolesRepository.getRolesForUser(user.id)
  const allowed = getAllowedSections(roles ?? [], hasFullAccess)

  // No full access and no role-granted sections → not an admin at all.
  if (allowed !== '*' && allowed.size === 0) {
    notFound()
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
