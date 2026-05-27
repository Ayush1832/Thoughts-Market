'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { ArrowUpDownIcon, MailIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import ProfileLink from '@/components/ProfileLink'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface AdminUserRow {
  id: string
  username?: string | null
  email?: string | null
  address: string
  deposit_wallet_address?: string | null
  created_label: string
  affiliate_code?: string | null
  referred_by_display?: string | null
  referred_by_profile_url?: string | null
  is_admin: boolean
  avatarUrl: string
  profileUrl: string
  created_at: string
  search_text: string
  kyc_status?: string | null
  trust_score?: number | null
  is_banned?: boolean
  last_active?: string | null
  trade_count?: number
  trade_volume?: string
}

export function useAdminUsersColumns(): ColumnDef<AdminUserRow>[] {
  const t = useExtracted()

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
            || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('Select all')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label={t('Select row')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'username',
      id: 'user',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
          >
            {t('User')}
            <ArrowUpDownIcon className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const user = row.original
        const profileSlug = user.username || user.deposit_wallet_address || user.address
        return (
          <div className="min-w-44">
            <ProfileLink
              user={{
                address: user.address,
                deposit_wallet_address: user.deposit_wallet_address,
                image: user.avatarUrl,
                username: user.username,
              }}
              profileSlug={profileSlug}
              layout="inline"
              usernameAddon={user.is_admin ? <Badge variant="outline" className="text-xs">{t('Admin')}</Badge> : null}
            />
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
          >
            {t('Email')}
            <ArrowUpDownIcon className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="min-w-0 text-xs text-muted-foreground">
            {user.email
              ? (
                  <a
                    href={`mailto:${user.email}`}
                    className={`
                      inline-flex touch-manipulation items-center gap-1 text-muted-foreground
                      hover:text-primary
                    `}
                  >
                    <MailIcon className="size-4 shrink-0" />
                    <span className="sr-only">
                      {t('Email')}
                      {user.email}
                    </span>
                  </a>
                )
              : (
                  <span className="italic">{t('hidden')}</span>
                )}
          </div>
        )
      },
    },
    {
      accessorKey: 'kyc_status',
      id: 'kyc',
      header: () => (
        <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
          {t('KYC')}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.original.kyc_status ?? 'unverified'
        const variant = status === 'verified' ? 'secondary' : 'outline'
        return (
          <Badge variant={variant as any} className="text-xs">
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'trust_score',
      id: 'trust',
      header: () => (
        <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
          {t('Trust')}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const score = row.original.trust_score
        return (
          <span className="min-w-0 text-xs text-muted-foreground">
            {typeof score === 'number' ? score.toFixed(0) : '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'is_banned',
      id: 'status',
      header: () => (
        <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
          {t('Status')}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const banned = row.original.is_banned
        return (
          <Badge variant={banned ? 'destructive' : 'secondary'} className="text-xs">
            {banned ? t('Banned') : t('Active')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'last_active',
      id: 'last_active',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
        >
          {t('Last active')}
          <ArrowUpDownIcon className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const val = row.original.last_active
        return (
          <div className="min-w-0 text-xs text-muted-foreground">
            {val ? new Date(val).toLocaleString() : '—'}
          </div>
        )
      },
    },
    {
      accessorKey: 'trade_count',
      id: 'trade_count',
      header: () => (
        <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
          {t('Trades')}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0 text-xs text-muted-foreground">{row.original.trade_count ?? 0}</div>
      ),
    },
    {
      accessorKey: 'trade_volume',
      id: 'trade_volume',
      header: () => (
        <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
          {t('Volume')}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-0 text-xs text-muted-foreground">{row.original.trade_volume ?? '0'}</div>
      ),
    },
    {
      accessorKey: 'referred_by_display',
      id: 'referral',
      header: () => {
        return (
          <div className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase">
            {t('Referral')}
          </div>
        )
      },
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="min-w-0">
            {user.referred_by_display
              ? (
                  <a
                    href={user.referred_by_profile_url ?? '#'}
                    target={user.referred_by_profile_url ? '_blank' : undefined}
                    rel={user.referred_by_profile_url ? 'noreferrer' : undefined}
                    className={`
                      block max-w-15 touch-manipulation truncate text-xs font-medium text-foreground
                      hover:text-primary
                      sm:max-w-25
                    `}
                  >
                    {user.referred_by_display}
                  </a>
                )
              : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => (
        <div className="text-xs font-medium text-muted-foreground uppercase">
          {t('Actions')}
        </div>
      ),
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="text-right">
            <Link href={{ pathname: String(user.id) }} className="text-xs font-medium text-primary hover:underline">
              {t('Manage')}
            </Link>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'created_at',
      id: 'created',
      header: ({ column }) => {
        return (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-auto p-0 text-xs font-medium text-muted-foreground uppercase hover:text-foreground"
            >
              {t('Created')}
              <ArrowUpDownIcon className="ml-2 size-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="text-right text-xs whitespace-nowrap text-muted-foreground">
            {user.created_label}
          </div>
        )
      },
    },
  ]
}
