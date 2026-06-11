import type { ReactNode } from 'react'
import { requireAdminSection } from '@/lib/admin-guard'

export default async function FinanceLayout({
  children,
}: {
  children: ReactNode
}) {
  // RBAC: only super_admin / finance_admin may access Finance.
  await requireAdminSection('finance')

  return (
    <div className="space-y-6">
      {children}
    </div>
  )
}
