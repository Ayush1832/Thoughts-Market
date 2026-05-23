'use client'

import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { PlusIcon, SearchIcon, UserIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { routing } from '@/i18n/routing'
import { ADMIN_ROLES } from '@/lib/db/schema/auth/tables'
import { cn } from '@/lib/utils'
import { assignRoleAction } from '../_actions/manage-role'

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  moderator: 'Moderator',
  risk_analyst: 'Risk Analyst',
  market_manager: 'Market Manager',
  support_agent: 'Support Agent',
  content_manager: 'Content Manager',
}

interface UserResult {
  id: string
  username?: string | null
  address: string
  email?: string | null
  avatarUrl?: string
}

function getAdminApiBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) { return '/admin/api' }
  return `/${locale}/admin/api`
}

export function AssignRoleDialog({ onSuccess }: { onSuccess?: () => void }) {
  const t = useExtracted()
  const { locale } = useParams() as { locale?: string }
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [role, setRole] = useState<AdminRole | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!search.trim() || selectedUser) {
      setResults([])
      setShowDropdown(false)
      return
    }
    if (searchTimeout.current) { clearTimeout(searchTimeout.current) }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const base = getAdminApiBasePath(locale)
        const res = await fetch(`${base}/users?limit=8&search=${encodeURIComponent(search)}`, {
          credentials: 'same-origin',
        })
        if (res.ok) {
          const json = await res.json()
          setResults(json.data ?? [])
          setShowDropdown(true)
        }
      }
      finally {
        setIsSearching(false)
      }
    }, 300)
  }, [search, selectedUser, locale])

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function selectUser(user: UserResult) {
    setSelectedUser(user)
    setSearch(user.username ?? user.address)
    setShowDropdown(false)
    setResults([])
  }

  function clearUser() {
    setSelectedUser(null)
    setSearch('')
    setResults([])
  }

  function handleSubmit() {
    if (!selectedUser || !role) {
      setError(t('Please select a user and a role.'))
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await assignRoleAction(selectedUser.id, role as AdminRole)
      if (result.error) {
        setError(result.error)
      }
      else {
        setOpen(false)
        clearUser()
        setRole('')
        onSuccess?.()
      }
    })
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      clearUser()
      setRole('')
      setError(null)
    }
  }

  const displayLabel = selectedUser
    ? (selectedUser.username ?? `${selectedUser.address.slice(0, 12)}...`)
    : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-2 size-4" />
          {t('Assign Role')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Assign Admin Role')}</DialogTitle>
          <DialogDescription>
            {t('Search for a user by username, wallet address, or email, then pick a role.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t('User')}</Label>
            <div ref={wrapperRef} className="relative">
              {selectedUser
                ? (
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">{displayLabel}</span>
                      <span className="max-w-28 truncate text-xs text-muted-foreground">
                        {selectedUser.email ?? `${selectedUser.address.slice(0, 10)}...`}
                      </span>
                      <button
                        type="button"
                        onClick={clearUser}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                        aria-label={t('Clear')}
                      >
                        ×
                      </button>
                    </div>
                  )
                : (
                    <div className="relative">
                      <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder={t('Search by username, address, or email...')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                        autoComplete="off"
                      />
                      {isSearching && (
                        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                          {t('Searching...')}
                        </span>
                      )}
                    </div>
                  )}

              {showDropdown && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {results.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'first:rounded-t-md last:rounded-b-md',
                      )}
                      onMouseDown={() => selectUser(user)}
                    >
                      <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {user.username ?? `${user.address.slice(0, 12)}...`}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {user.email ?? user.address}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && results.length === 0 && !isSearching && search.trim() && (
                <div className="
                  absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground
                  shadow-md
                "
                >
                  {t('No users found.')}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t('Role')}</Label>
            <Select value={role} onValueChange={v => setRole(v as AdminRole)}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select a role')} />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedUser || !role}>
            {isPending ? t('Assigning...') : t('Assign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
