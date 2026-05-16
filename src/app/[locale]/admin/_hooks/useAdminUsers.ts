import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { routing } from '@/i18n/routing'

interface AdminUserRow {
  id: string
  username?: string | null
  email?: string | null
  address: string
  created_label: string
  affiliate_code?: string | null
  referred_by_display?: string | null
  referred_by_profile_url?: string | null
  is_admin: boolean
  avatarUrl: string
  profileUrl: string
  created_at: string
  search_text: string
}

interface UseAdminUsersParams {
  limit?: number
  search?: string
  sortBy?: 'username' | 'email' | 'address' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  pageIndex?: number
  locale?: string
}

interface AdminUsersResponse {
  data: AdminUserRow[]
  count: number
  totalCount: number
}

function getAdminApiBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) {
    return '/admin/api'
  }

  return `/${locale}/admin/api`
}

async function fetchAdminUsers(params: UseAdminUsersParams): Promise<AdminUsersResponse> {
  const {
    limit = 50,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    pageIndex = 0,
    locale,
  } = params
  const offset = pageIndex * limit

  const basePath = getAdminApiBasePath(locale)
  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    sortBy,
    sortOrder,
  })

  if (search && search.trim()) {
    searchParams.set('search', search.trim())
  }

  const url = `${basePath}/users?${searchParams.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }

  return response.json()
}

export function useAdminUsers(params: UseAdminUsersParams = {}) {
  const { locale } = useParams() as { locale?: string }
  const { limit = 50, search, sortBy = 'created_at', sortOrder = 'desc', pageIndex = 0 } = params

  const queryKey = useMemo(() => [
    'admin-users',
    { limit, search, sortBy, sortOrder, pageIndex, locale },
  ], [limit, search, sortBy, sortOrder, pageIndex, locale])

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAdminUsers({
      limit,
      search,
      sortBy,
      sortOrder,
      pageIndex,
      locale,
    }),
    staleTime: 30_000,
    gcTime: 300_000,
  })

  const retry = useCallback(() => {
    void query.refetch()
  }, [query])

  return {
    ...query,
    retry,
  }
}

export function useAdminUsersTable() {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'username' | 'email' | 'address' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error, retry } = useAdminUsers({
    limit: pageSize,
    search,
    sortBy,
    sortOrder,
    pageIndex,
  })

  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch)
    setPageIndex(0)
  }, [])

  const handleSortChange = useCallback((column: string | null, order: 'asc' | 'desc' | null) => {
    if (column === null || order === null) {
      setSortBy('created_at')
      setSortOrder('desc')
    }
    else {
      setSortBy(column as 'username' | 'email' | 'address' | 'created_at')
      setSortOrder(order)
    }
    setPageIndex(0)
  }, [])

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex)
  }, [])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPageIndex(0)
  }, [])

  return {
    // Data
    users: data?.data || [],
    totalCount: data?.totalCount || 0,

    // Loading states
    isLoading,
    error: error?.message || null,
    retry,

    // Table state
    pageIndex,
    pageSize,
    search,
    sortBy,
    sortOrder,

    // State setters
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
  }
}
