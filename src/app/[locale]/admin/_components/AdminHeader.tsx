import AdminProfileMenu from '@/app/[locale]/admin/_components/AdminProfileMenu'
import HeaderLogo from '@/components/HeaderLogo'
import { getAdminSession } from '@/lib/admin-session'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  moderator: 'Moderator',
  risk_analyst: 'Risk Analyst',
  market_manager: 'Market Manager',
  support_agent: 'Support Agent',
  content_manager: 'Content Manager',
}

export default async function AdminHeader() {
  const session = await getAdminSession()
  const email = session?.email ?? 'admin'
  const roleLabel = session?.roles?.length
    ? session.roles.map(r => ROLE_LABELS[r] ?? r).join(', ')
    : 'Administrator'

  return (
    <header className="sticky top-0 z-30 bg-background">
      <div
        className={`
          relative z-50 container mx-auto flex min-h-15 w-full items-center gap-4 py-3 pb-1
          md:min-h-17 md:pb-2
        `}
      >
        <HeaderLogo labelSuffix="Admin" />
        <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
          <AdminProfileMenu email={email} roleLabel={roleLabel} />
        </div>
      </div>
    </header>
  )
}
