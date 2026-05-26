'use client'

import { useCallback } from 'react'
import { useExtracted } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, ArrowLeft, BadgeCheck, Globe2, Lock, ShieldAlert, ShieldCheck, Smartphone, Star, UserCheck, UserMinus, UserPlus } from 'lucide-react'
import AppLink from '@/components/AppLink'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { routing } from '@/i18n/routing'

interface UserDetail {
  id: string
  username?: string | null
  email?: string | null
  address: string
  deposit_wallet_address?: string | null
  image?: string | null
  created_at: string
  profileUrl?: string | null
  kyc_status: string
  trust_score: number | null
  reputation_level: string
  total_volume: string
  win_rate: string
  pnl: string
  referral_count: number
  badge_verified_trader: boolean
  badge_influencer: boolean
  badge_market_creator: boolean
  badge_whale: boolean
  admin_controls: {
    is_banned: boolean
    is_shadow_banned: boolean
    is_frozen: boolean
    limit_trading: boolean
    limit_withdrawals: boolean
  }
  wallets: Array<{ address: string; chain_id: number; is_primary: boolean; created_at: string }>
  sessions: Array<{ ip_address: string | null; user_agent: string | null; created_at: string }>
  referrals: Array<{ id: string; username?: string | null; deposit_wallet_address?: string | null; created_at: string }>
  risk_flags: Array<{ key: string; label: string; status: 'clear' | 'warning' | 'critical'; description: string }>
  suspicious_patterns: Array<{ key: string; label: string; description: string }>
}

const getAdminApiBasePath = (locale?: string) => {
  if (!locale || locale === routing.defaultLocale) {
    return '/admin/api'
  }

  return `/${locale}/admin/api`
}

async function fetchAdminUserDetail(userId: string, locale?: string) {
  const basePath = getAdminApiBasePath(locale)
  const response = await fetch(`${basePath}/users/${userId}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load user data.')
  }

  return response.json() as Promise<{ data: UserDetail }>
}

async function patchAdminUserDetail(userId: string, locale: string | undefined, payload: any) {
  const basePath = getAdminApiBasePath(locale)
  const response = await fetch(`${basePath}/users/${userId}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to update user settings.')
  }

  return response.json() as Promise<{ data: UserDetail }>
}

export default function UserDetailPage({ userId, locale }: { userId: string; locale?: string }) {
  const t = useExtracted()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-detail', locale, userId],
    queryFn: () => fetchAdminUserDetail(userId, locale),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (payload: any) => patchAdminUserDetail(userId, locale, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-user-detail', locale, userId])
      queryClient.invalidateQueries(['admin-users', { locale }])
    },
  })

  const toggleControl = useCallback((field: keyof UserDetail['admin_controls']) => {
    if (!data?.data) return

    const updatedControls = {
      ...data.data.admin_controls,
      [field]: !data.data.admin_controls[field],
    }

    mutation.mutate({ settings: { admin_controls: updatedControls } })
  }, [data, mutation])

  const toggleBadge = useCallback((field: 'badge_verified_trader' | 'badge_influencer' | 'badge_market_creator' | 'badge_whale') => {
    if (!data?.data) return

    const updatedBadge = !data.data[field]
    mutation.mutate({ settings: { badges: { [field.replace('badge_', '')]: updatedBadge } } })
  }, [data, mutation])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded-full bg-slate-800/70" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-lg bg-slate-800/70" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2" />
            {t('Back')}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('Unable to load user')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : t('This user could not be loaded.')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const user = data.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2" />
              {t('Back to users')}
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{user.username || user.deposit_wallet_address || user.address}</h1>
            <p className="text-sm text-muted-foreground">{t('User trust profile and account controls')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => router.refresh()}>
            {t('Refresh')}
          </Button>
          {user.profileUrl && (
            <AppLink href={user.profileUrl} className="inline-flex items-center gap-2 rounded-md border border-input bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
              <Globe2 className="size-4" />
              {t('View public profile')}
            </AppLink>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t('Account overview')}</CardTitle>
            <CardDescription>{t('User profile, KYC status, trust score, and risk summary.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('KYC status')}</p>
                    <p className="text-lg font-semibold capitalize">{user.kyc_status}</p>
                  </div>
                  <Badge className={user.kyc_status === 'verified' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}>
                    {user.kyc_status === 'verified' ? t('Verified') : t('Unverified')}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('Trust score')}</p>
                    <p className="text-lg font-semibold">{user.trust_score !== null ? `${user.trust_score}/100` : t('Unknown')}</p>
                  </div>
                </div>
                <Progress value={user.trust_score ?? 0} className="h-3" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('Reputation')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{user.reputation_level}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total volume')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{user.total_volume}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('Win rate')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{user.win_rate}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('PnL')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{user.pnl}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('Referral history')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{user.referral_count}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('Badges')}</CardTitle>
              <CardDescription>{t('Trusted account labels assigned by admin or automated review.')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                { label: t('Verified trader'), active: user.badge_verified_trader, icon: UserCheck },
                { label: t('Influencer'), active: user.badge_influencer, icon: Star },
                { label: t('Market creator'), active: user.badge_market_creator, icon: BadgeCheck },
                { label: t('Whale'), active: user.badge_whale, icon: ShieldAlert },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                  <div className="flex items-center gap-3">
                    <item.icon className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.active ? t('Assigned') : t('Not assigned')}</p>
                    </div>
                  </div>
                  <Switch checked={item.active} onCheckedChange={() => toggleBadge(item.label === t('Verified trader') ? 'badge_verified_trader' : item.label === t('Influencer') ? 'badge_influencer' : item.label === t('Market creator') ? 'badge_market_creator' : 'badge_whale')} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('Account controls')}</CardTitle>
              <CardDescription>{t('Enable or disable access and limits for this user.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: t('Ban user'), description: t('Block this user from logging in or trading.'), value: user.admin_controls.is_banned, field: 'is_banned', icon: UserMinus },
                { label: t('Shadow ban'), description: t('Limit visibility while preserving normal behavior for the user.'), value: user.admin_controls.is_shadow_banned, field: 'is_shadow_banned', icon: ShieldAlert },
                { label: t('Freeze account'), description: t('Prevent new orders and withdrawals immediately.'), value: user.admin_controls.is_frozen, field: 'is_frozen', icon: Lock },
                { label: t('Limit trading'), description: t('Restrict this user from placing new trades.'), value: user.admin_controls.limit_trading, field: 'limit_trading', icon: Activity },
                { label: t('Limit withdrawals'), description: t('Temporarily restrict withdrawal activity.'), value: user.admin_controls.limit_withdrawals, field: 'limit_withdrawals', icon: AlertTriangle },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-start gap-3">
                    <item.icon className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <Switch checked={item.value} onCheckedChange={() => toggleControl(item.field as keyof UserDetail['admin_controls'])} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Trust & risk analysis')}</CardTitle>
          <CardDescription>{t('AI-driven risk signals and suspicious activity patterns.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('Risk flags')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.risk_flags.length > 0 ? user.risk_flags.map((flag) => (
                    <div key={flag.key} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{flag.label}</p>
                          <p className="text-xs text-muted-foreground">{flag.description}</p>
                        </div>
                        <Badge variant={flag.status === 'critical' ? 'destructive' : flag.status === 'warning' ? 'secondary' : 'outline'}>
                          {flag.status}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">{t('No active risk flags')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('Suspicious patterns')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {user.suspicious_patterns.length > 0 ? user.suspicious_patterns.map((pattern) => (
                    <div key={pattern.key} className="rounded-lg border border-border p-4">
                      <p className="font-medium">{pattern.label}</p>
                      <p className="text-xs text-muted-foreground mt-2">{pattern.description}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">{t('No suspicious patterns detected')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('Wallets')}</CardTitle>
            <CardDescription>{t('Connected wallets and deposit addresses.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Wallet')}</TableHead>
                  <TableHead>{t('Chain')}</TableHead>
                  <TableHead>{t('Primary')}</TableHead>
                  <TableHead>{t('Connected')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.wallets.map((wallet) => (
                  <TableRow key={wallet.address}>
                    <TableCell className="font-mono text-sm">{wallet.address}</TableCell>
                    <TableCell>{wallet.chain_id}</TableCell>
                    <TableCell>{wallet.is_primary ? t('Yes') : t('No')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(wallet.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('Device & IP logs')}</CardTitle>
            <CardDescription>{t('Recent session history and device access records.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('IP')}</TableHead>
                  <TableHead>{t('Device')}</TableHead>
                  <TableHead>{t('Time')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.sessions.map((session, index) => (
                  <TableRow key={`${session.ip_address}-${index}`}>
                    <TableCell>{session.ip_address || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{session.user_agent || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(session.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Referral details')}</CardTitle>
          <CardDescription>{t('Recent users referred by this account.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {user.referrals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('User')}</TableHead>
                  <TableHead>{t('Wallet')}</TableHead>
                  <TableHead>{t('Joined')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>{referral.username || referral.deposit_wallet_address || t('Unknown')}</TableCell>
                    <TableCell className="font-mono text-sm">{referral.deposit_wallet_address || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('No referral history found.')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
