'use client'

import { Loader2Icon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'

interface SessionRow {
  token: string
  device: string
  meta: string
  current: boolean
}

function relativeTime(value: string | Date | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  const diff = Date.now() - d.getTime()
  if (Number.isNaN(diff)) return ''
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function describeUserAgent(ua: string | undefined): string {
  if (!ua) return 'Unknown device'
  let os = 'Unknown'
  if (/iphone/i.test(ua)) os = 'iPhone'
  else if (/ipad/i.test(ua)) os = 'iPad'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/mac os x/i.test(ua)) os = 'Mac'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/linux/i.test(ua)) os = 'Linux'

  let browser = 'Browser'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome'
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'

  return `${os} · ${browser}`
}

export default function SettingsSessionsContent() {
  const t = useExtracted()
  const [rows, setRows] = useState<SessionRow[] | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(async () => {
    try {
      const [listRes, current] = await Promise.all([
        authClient.listSessions(),
        authClient.getSession(),
      ])
      const currentToken = (current as any)?.data?.session?.token ?? ''
      const list = ((listRes as any)?.data ?? []) as any[]
      const mapped: SessionRow[] = list
        .map(s => ({
          token: s.token as string,
          device: describeUserAgent(s.userAgent),
          meta: [s.ipAddress, relativeTime(s.updatedAt ?? s.createdAt)].filter(Boolean).join(' · '),
          current: s.token === currentToken,
        }))
        .sort((a, b) => (a.current === b.current ? 0 : a.current ? -1 : 1))
      setRows(mapped)
    }
    catch {
      setRows([])
      toast.error(t('Could not load sessions.'))
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  function revoke(token: string) {
    setRevoking(token)
    startTransition(async () => {
      try {
        await authClient.revokeSession({ token })
        toast.success(t('Session signed out.'))
        await load()
      }
      catch {
        toast.error(t('Failed to sign out session.'))
      }
      finally {
        setRevoking(null)
      }
    })
  }

  function revokeOthers() {
    startTransition(async () => {
      try {
        await authClient.revokeOtherSessions()
        toast.success(t('Signed out all other sessions.'))
        await load()
      }
      catch {
        toast.error(t('Failed to sign out other sessions.'))
      }
    })
  }

  return (
    <div className="tm-glass p-5">
      <div className="mb-2">
        <h2 className="text-xl font-semibold">{t('Active sessions')}</h2>
        <p className="text-sm text-muted-foreground">{t('Sign out any device you no longer use.')}</p>
      </div>

      <div className="divide-y divide-border/50">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))
          : rows.length === 0
            ? <p className="py-6 text-center text-sm text-muted-foreground">{t('No active sessions found.')}</p>
            : rows.map(row => (
                <div key={row.token} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.device}</p>
                    <p className="truncate text-sm text-muted-foreground">{row.meta}</p>
                  </div>
                  {row.current
                    ? <span className="shrink-0 rounded-md border border-green-500/40 px-3 py-1.5 text-xs font-semibold text-green-400">{t('Current')}</span>
                    : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => revoke(row.token)}
                          disabled={isPending}
                        >
                          {revoking === row.token ? <Loader2Icon className="size-4 animate-spin" /> : t('Revoke')}
                        </Button>
                      )}
                </div>
              ))}
      </div>

      {rows && rows.length > 1 && (
        <button
          type="button"
          onClick={revokeOthers}
          disabled={isPending}
          className="mt-3 w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          {t('Sign out all other sessions')}
        </button>
      )}
    </div>
  )
}
