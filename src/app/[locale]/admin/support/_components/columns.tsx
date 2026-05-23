'use client'

import type { ColumnDef } from '@tanstack/react-table'
import type { TicketRow } from './TicketDetailDialog'
import type { TicketPriority, TicketStatus } from '@/lib/db/schema/support/tables'
import { ArrowUpDownIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketDetailDialog } from './TicketDetailDialog'

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  in_progress: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  resolved: 'bg-green-500/15 text-green-600 border-green-500/30',
  closed: 'bg-muted text-muted-foreground',
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  urgent: 'bg-red-500/15 text-red-600 border-red-500/30',
}

const CATEGORY_LABELS: Record<string, string> = {
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  kyc: 'KYC',
  market_disputes: 'Market Disputes',
  technical_issues: 'Technical Issues',
}

function TicketCell({ row, onUpdated }: { row: TicketRow, onUpdated?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="text-left transition-colors hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <span className="line-clamp-1 text-sm font-medium">{row.subject}</span>
        <span className="line-clamp-1 block text-xs text-muted-foreground">{row.description}</span>
      </button>
      <TicketDetailDialog
        ticket={row}
        open={open}
        onOpenChange={setOpen}
        onUpdated={onUpdated}
      />
    </>
  )
}

export function useAdminSupportColumns(onUpdated?: () => void): ColumnDef<TicketRow>[] {
  const t = useExtracted()

  return [
    {
      id: 'subject',
      header: () => <div className="text-xs font-medium text-muted-foreground uppercase">{t('Ticket')}</div>,
      cell: ({ row }) => <TicketCell row={row.original} onUpdated={onUpdated} />,
      enableHiding: false,
    },
    {
      accessorKey: 'category',
      header: () => <div className="text-xs font-medium text-muted-foreground uppercase">{t('Category')}</div>,
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {CATEGORY_LABELS[row.original.category] ?? row.original.category}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          {t('Status')}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const s = row.original.status
        return (
          <Badge variant="outline" className={`text-xs whitespace-nowrap ${STATUS_COLORS[s]}`}>
            {s.replace('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          {t('Priority')}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const p = row.original.priority
        return (
          <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_COLORS[p]}`}>
            {p}
          </Badge>
        )
      },
    },
    {
      id: 'reporter',
      header: () => <div className="text-xs font-medium text-muted-foreground uppercase">{t('Reporter')}</div>,
      cell: ({ row }) => {
        const { reporter_username, reporter_address, user_id } = row.original
        const display = reporter_username ?? reporter_address?.slice(0, 10) ?? user_id?.slice(0, 10) ?? '—'
        return <span className="text-xs text-muted-foreground">{display}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: () => <div className="text-right text-xs font-medium text-muted-foreground uppercase">{t('Created')}</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs whitespace-nowrap text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })}
        </div>
      ),
    },
  ]
}
