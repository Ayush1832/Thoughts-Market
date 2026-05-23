'use client'

import type { TicketRow } from './TicketDetailDialog'
import type { TicketCategory, TicketStatus } from '@/lib/db/schema/support/tables'
import { useQuery } from '@tanstack/react-query'
import { useExtracted } from 'next-intl'
import { useParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { DataTable } from '@/app/[locale]/admin/_components/DataTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { routing } from '@/i18n/routing'
import { TICKET_CATEGORIES, TICKET_STATUSES } from '@/lib/db/schema/support/tables'
import { useAdminSupportColumns } from './columns'
import { CreateTicketDialog } from './CreateTicketDialog'

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  kyc: 'KYC',
  market_disputes: 'Market Disputes',
  technical_issues: 'Technical Issues',
}

function getAdminApiBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) { return '/admin/api' }
  return `/${locale}/admin/api`
}

async function fetchTickets(params: {
  locale?: string
  limit: number
  offset: number
  search?: string
  status?: TicketStatus | null
  category?: TicketCategory | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
}): Promise<{ data: TicketRow[], totalCount: number }> {
  const { locale, ...rest } = params
  const basePath = getAdminApiBasePath(locale)
  const qs = new URLSearchParams({
    limit: String(rest.limit),
    offset: String(rest.offset),
    sortBy: rest.sortBy,
    sortOrder: rest.sortOrder,
  })
  if (rest.search) { qs.set('search', rest.search) }
  if (rest.status) { qs.set('status', rest.status) }
  if (rest.category) { qs.set('category', rest.category) }

  const res = await fetch(`${basePath}/support?${qs}`, { credentials: 'same-origin' })
  if (!res.ok) { throw new Error('Failed to fetch tickets') }
  return res.json()
}

export default function AdminSupportTable() {
  const t = useExtracted()
  const { locale } = useParams() as { locale?: string }

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all')

  const queryKey = useMemo(() => [
    'admin-support',
    { locale, pageIndex, pageSize, search, sortBy, sortOrder, statusFilter, categoryFilter },
  ], [locale, pageIndex, pageSize, search, sortBy, sortOrder, statusFilter, categoryFilter])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchTickets({
      locale,
      limit: pageSize,
      offset: pageIndex * pageSize,
      search: search || undefined,
      status: statusFilter === 'all' ? null : statusFilter,
      category: categoryFilter === 'all' ? null : categoryFilter,
      sortBy,
      sortOrder,
    }),
    staleTime: 30_000,
  })

  const retry = useCallback(() => { void refetch() }, [refetch])

  const columns = useAdminSupportColumns(() => { void refetch() })

  function handleSortChange(column: string | null, order: 'asc' | 'desc' | null) {
    setSortBy(column ?? 'created_at')
    setSortOrder(order ?? 'desc')
    setPageIndex(0)
  }

  const filterBar = (
    <div className="flex flex-wrap gap-2">
      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPageIndex(0) }}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder={t('Status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('All statuses')}</SelectItem>
          {TICKET_STATUSES.map(s => (
            <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v as any); setPageIndex(0) }}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder={t('Category')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('All categories')}</SelectItem>
          {TICKET_CATEGORIES.map(c => (
            <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      totalCount={data?.totalCount ?? 0}
      searchPlaceholder={t('Search tickets...')}
      enablePagination={true}
      enableColumnVisibility={true}
      isLoading={isLoading}
      error={error?.message ?? null}
      onRetry={retry}
      emptyMessage={t('No tickets found')}
      emptyDescription={t('No support tickets match your filters.')}
      search={search}
      onSearchChange={(s) => { setSearch(s); setPageIndex(0) }}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPageChange={setPageIndex}
      onPageSizeChange={(s) => { setPageSize(s); setPageIndex(0) }}
      toolbarLeftContent={filterBar}
      toolbarRightContent={<CreateTicketDialog onSuccess={() => { void refetch() }} />}
    />
  )
}
