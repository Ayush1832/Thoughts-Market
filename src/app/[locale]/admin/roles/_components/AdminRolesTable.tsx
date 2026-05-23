'use client'

import type { AdminRoleRow } from './columns'
import { useQuery } from '@tanstack/react-query'
import { useExtracted } from 'next-intl'
import { useParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { DataTable } from '@/app/[locale]/admin/_components/DataTable'
import { routing } from '@/i18n/routing'
import { AssignRoleDialog } from './AssignRoleDialog'
import { useAdminRolesColumns } from './columns'

function getAdminApiBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) { return '/admin/api' }
  return `/${locale}/admin/api`
}

async function fetchRoles(locale?: string): Promise<{ data: AdminRoleRow[], totalCount: number }> {
  const basePath = getAdminApiBasePath(locale)
  const res = await fetch(`${basePath}/roles`, { credentials: 'same-origin' })
  if (!res.ok) { throw new Error('Failed to fetch roles') }
  return res.json()
}

export default function AdminRolesTable() {
  const t = useExtracted()
  const { locale } = useParams() as { locale?: string }
  const columns = useAdminRolesColumns()
  const [search, setSearch] = useState('')

  const queryKey = useMemo(() => ['admin-roles', { locale }], [locale])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchRoles(locale),
    staleTime: 30_000,
  })

  const retry = useCallback(() => { void refetch() }, [refetch])

  const filtered = useMemo(() => {
    const rows = data?.data ?? []
    if (!search.trim()) { return rows }
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.username?.toLowerCase().includes(q)
      || r.address.toLowerCase().includes(q)
      || r.email?.toLowerCase().includes(q)
      || r.role.toLowerCase().includes(q),
    )
  }, [data, search])

  return (
    <DataTable
      columns={columns}
      data={filtered}
      totalCount={filtered.length}
      searchPlaceholder={t('Search by user or role...')}
      enablePagination={false}
      enableColumnVisibility={false}
      isLoading={isLoading}
      error={error?.message ?? null}
      onRetry={retry}
      emptyMessage={t('No roles assigned')}
      emptyDescription={t('Use the Assign Role button to give admin roles to users.')}
      search={search}
      onSearchChange={setSearch}
      sortBy={null}
      sortOrder={null}
      onSortChange={() => {}}
      pageIndex={0}
      pageSize={100}
      onPageChange={() => {}}
      onPageSizeChange={() => {}}
      toolbarRightContent={<AssignRoleDialog onSuccess={() => { void refetch() }} />}
    />
  )
}
