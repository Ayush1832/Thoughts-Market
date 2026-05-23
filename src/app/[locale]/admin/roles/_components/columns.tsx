'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { useTransition } from 'react'
import { Trash2Icon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { removeRoleAction } from '../_actions/manage-role'

export interface AdminRoleRow {
  id: string
  user_id: string
  username: string | null
  address: string
  email: string
  role: AdminRole
  created_at: Date
}

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-red-500/15 text-red-600 border-red-500/30',
  finance_admin: 'bg-green-500/15 text-green-600 border-green-500/30',
  moderator: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  risk_analyst: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  market_manager: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  support_agent: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  content_manager: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  moderator: 'Moderator',
  risk_analyst: 'Risk Analyst',
  market_manager: 'Market Manager',
  support_agent: 'Support Agent',
  content_manager: 'Content Manager',
}

function RemoveRoleButton({ userId, role }: { userId: string, role: AdminRole }) {
  const t = useExtracted()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await removeRoleAction(userId, role)
        })
      }}
      aria-label={t('Remove role')}
    >
      <Trash2Icon className="size-4" />
    </Button>
  )
}

export function useAdminRolesColumns(): ColumnDef<AdminRoleRow>[] {
  const t = useExtracted()

  return [
    {
      id: 'user',
      header: () => <div className="text-xs font-medium text-muted-foreground uppercase">{t('User')}</div>,
      cell: ({ row }) => {
        const { username, address, email } = row.original
        return (
          <div className="flex flex-col gap-0.5 min-w-40">
            <span className="text-sm font-medium">{username ?? address.slice(0, 10) + '...'}</span>
            <span className="text-xs text-muted-foreground">{email || address}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: () => <div className="text-xs font-medium text-muted-foreground uppercase">{t('Role')}</div>,
      cell: ({ row }) => {
        const role = row.original.role
        return (
          <Badge variant="outline" className={`text-xs ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </Badge>
        )
      },
    },
    {
      id: 'assigned',
      header: () => <div className="text-xs font-medium text-muted-foreground uppercase">{t('Assigned')}</div>,
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RemoveRoleButton userId={row.original.user_id} role={row.original.role} />
        </div>
      ),
    },
  ]
}
