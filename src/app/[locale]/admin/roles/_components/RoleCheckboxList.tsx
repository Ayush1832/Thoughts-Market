'use client'

import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { Checkbox } from '@/components/ui/checkbox'
import { ADMIN_ROLES } from '@/lib/db/schema/auth/tables'

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  moderator: 'Moderator',
  risk_analyst: 'Risk Analyst',
  market_manager: 'Market Manager',
  support_agent: 'Support Agent',
  content_manager: 'Content Manager',
}

// Roles a user can be granted in the UI (super_admin is reserved/bootstrap).
export const ASSIGNABLE_ROLES = ADMIN_ROLES.filter(r => r !== 'super_admin')

export function RoleCheckboxList({
  selected,
  onToggle,
  disabled,
}: {
  selected: Set<AdminRole>
  onToggle: (role: AdminRole, checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-1.5 rounded-md border p-2">
      {ASSIGNABLE_ROLES.map(role => (
        <label
          key={role}
          className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          <Checkbox
            checked={selected.has(role)}
            onCheckedChange={checked => onToggle(role, checked === true)}
            disabled={disabled}
          />
          <span>{ROLE_LABELS[role]}</span>
        </label>
      ))}
    </div>
  )
}
