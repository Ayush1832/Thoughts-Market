'use client'

import type { CreatorApplicationStatus } from '@/lib/db/schema/creators/tables'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  PowerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XCircleIcon,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreatorApplication {
  id: string
  user_id: string | null
  display_name: string
  username: string
  niche: string
  social_link: string | null
  reason: string
  status: CreatorApplicationStatus
  is_active: boolean
  review_notes: string | null
  reviewer_username: string | null
  created_at: string
  updated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) {
    return '/admin/api'
  }
  return `/${locale}/admin/api`
}

function statusBadge(status: CreatorApplicationStatus) {
  if (status === 'approved') {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
        <CheckCircle2Icon className="size-3" />
        {' '}
        Approved
      </Badge>
    )
  }
  if (status === 'verified') {
    return (
      <Badge className="gap-1 bg-blue-500/15 text-blue-400 hover:bg-blue-500/20">
        <ShieldCheckIcon className="size-3" />
        {' '}
        Verified
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge className="gap-1 bg-red-500/15 text-red-400 hover:bg-red-500/20">
        <XCircleIcon className="size-3" />
        {' '}
        Rejected
      </Badge>
    )
  }
  return <Badge variant="secondary">Pending</Badge>
}

function nicheColor(niche: string): string {
  if (niche === 'Crypto') {
    return 'bg-amber-500/15 text-amber-400'
  }
  if (niche === 'Sports') {
    return 'bg-green-500/15 text-green-400'
  }
  if (niche === 'Politics') {
    return 'bg-red-500/15 text-red-400'
  }
  if (niche === 'Finance') {
    return 'bg-blue-500/15 text-blue-400'
  }
  if (niche === 'Technology') {
    return 'bg-violet-500/15 text-violet-400'
  }
  return 'bg-muted text-muted-foreground'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Application Detail Dialog ────────────────────────────────────────────────
function ApplicationDetailDialog({
  app,
  onClose,
  onReview,
  isReviewing,
}: {
  app: CreatorApplication | null
  onClose: () => void
  onReview: (status: CreatorApplicationStatus, notes: string) => void
  isReviewing: boolean
}) {
  const [notes, setNotes] = useState('')

  if (!app) {
    return null
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" />
            Creator Application
          </DialogTitle>
        </DialogHeader>

        {/* Profile row */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
          <div className="
            flex size-12 items-center justify-center rounded-xl bg-primary/15 text-xl font-bold text-primary
          "
          >
            {app.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{app.display_name}</span>
              {statusBadge(app.status)}
            </div>
            <div className="text-sm text-muted-foreground">
              @
              {app.username}
            </div>
          </div>
          <span className={cn('rounded-lg px-2 py-1 text-xs font-semibold', nicheColor(app.niche))}>
            {app.niche}
          </span>
        </div>

        {/* Details */}
        <div className="grid gap-3 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Applied</div>
            <div>{formatDate(app.created_at)}</div>
          </div>

          {app.social_link && (
            <div>
              <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Social / Portfolio</div>
              <a
                href={app.social_link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary hover:underline"
              >
                {app.social_link}
              </a>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Why they want to create</div>
            <p className="rounded-lg border bg-muted/20 p-3 leading-relaxed">{app.reason}</p>
          </div>

          {app.review_notes && (
            <div>
              <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Review notes</div>
              <p className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">{app.review_notes}</p>
            </div>
          )}

          {app.reviewer_username && (
            <div className="text-xs text-muted-foreground">
              Reviewed by
              {' '}
              <span className="font-medium">
                @
                {app.reviewer_username}
              </span>
            </div>
          )}
        </div>

        {/* Review action */}
        {app.status === 'pending' && (
          <div className="grid gap-2">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notes (optional)</div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add review notes..."
              rows={3}
              disabled={isReviewing}
            />
          </div>
        )}

        {app.status === 'approved' && (
          <div className="grid gap-2">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Verify creator (adds verified badge)</div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Verification notes..."
              rows={2}
              disabled={isReviewing}
            />
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isReviewing}>
            Close
          </Button>

          {app.status === 'pending' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => onReview('rejected', notes)}
                disabled={isReviewing}
              >
                <XCircleIcon className="mr-1 size-4" />
                {isReviewing ? 'Saving...' : 'Reject'}
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onReview('approved', notes)}
                disabled={isReviewing}
              >
                <CheckCircle2Icon className="mr-1 size-4" />
                {isReviewing ? 'Saving...' : 'Approve'}
              </Button>
            </>
          )}

          {app.status === 'approved' && (
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => onReview('verified', notes)}
              disabled={isReviewing}
            >
              <ShieldCheckIcon className="mr-1 size-4" />
              {isReviewing ? 'Saving...' : 'Verify Creator'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Creator Card (Creators tab) ──────────────────────────────────────────────
function CreatorCard({
  app,
  onToggleActive,
  onViewDetail,
}: {
  app: CreatorApplication
  onToggleActive: (id: string) => void
  onViewDetail: (app: CreatorApplication) => void
}) {
  return (
    <div className="
      group relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-all
      hover:border-primary/30 hover:shadow-sm
    "
    >
      {/* Avatar */}
      <div className="
        flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-xl font-bold text-primary
      "
      >
        {app.display_name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{app.display_name}</span>
          {statusBadge(app.status)}
          {!app.is_active && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            @
            {app.username}
          </span>
          <span className={cn('rounded-sm px-1.5 py-0.5 font-medium', nicheColor(app.niche))}>
            {app.niche}
          </span>
          <span>
            Applied
            {formatDate(app.created_at)}
          </span>
        </div>
      </div>

      {/* Status indicator */}
      <div className={cn(
        'size-2.5 shrink-0 rounded-full',
        app.is_active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-muted-foreground/30',
      )}
      />

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-7 gap-1 px-2 text-xs',
            app.is_active
              ? 'hover:border-red-500/30 hover:text-red-400'
              : 'hover:border-emerald-500/30 hover:text-emerald-400',
          )}
          onClick={() => onToggleActive(app.id)}
        >
          <PowerIcon className="size-3" />
          {app.is_active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => onViewDetail(app)}
        >
          View
          <ChevronRightIcon className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreatorsCornerManagement() {
  const { locale } = useParams() as { locale?: string }
  const basePath = getBasePath(locale)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'applications' | 'creators'>('applications')
  const [filterStatus, setFilterStatus] = useState<CreatorApplicationStatus | 'all'>('all')
  const [detailApp, setDetailApp] = useState<CreatorApplication | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────────
  const applicationsQuery = useQuery({
    queryKey: ['admin-creator-apps', filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (filterStatus !== 'all') {
        params.set('status', filterStatus)
      }
      const res = await fetch(`${basePath}/creators?${params}`, { credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error('Request failed')
      }
      return res.json() as Promise<{ data: CreatorApplication[], totalCount: number }>
    },
    staleTime: 30_000,
    enabled: tab === 'applications',
  })

  const creatorsQuery = useQuery({
    queryKey: ['admin-creator-list'],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      const res = await fetch(`${basePath}/creators?${params}`, { credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error('Request failed')
      }
      const result = await res.json() as { data: CreatorApplication[], totalCount: number }
      return { ...result, data: result.data.filter(a => a.status === 'approved' || a.status === 'verified') }
    },
    staleTime: 30_000,
    enabled: tab === 'creators',
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleReview = useCallback(async (status: CreatorApplicationStatus, notes: string) => {
    if (!detailApp) {
      return
    }
    setIsReviewing(true)
    try {
      const res = await fetch(`${basePath}/creators`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailApp.id, status, notes }),
      })
      if (!res.ok) {
        throw new Error('Request failed')
      }
      toast.success(`Application ${status}.`)
      void queryClient.invalidateQueries({ queryKey: ['admin-creator-apps'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-creator-list'] })
      setDetailApp(null)
    }
    catch {
      toast.error('Failed to update application.')
    }
    finally {
      setIsReviewing(false)
    }
  }, [basePath, detailApp, queryClient])

  const handleToggleActive = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${basePath}/creators/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        throw new Error('Request failed')
      }
      toast.success('Creator status updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin-creator-list'] })
    }
    catch {
      toast.error('Failed to update creator.')
    }
  }, [basePath, queryClient])

  const applications = applicationsQuery.data?.data ?? []
  const creators = creatorsQuery.data?.data ?? []

  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <>
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="applications" className="gap-2">
            Applications
            {pendingCount > 0 && tab === 'applications' && (
              <span className="
                flex size-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white
              "
              >
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
        </TabsList>

        {/* ── Applications tab ──────────────────────────────────────────────── */}
        <TabsContent value="applications" className="mt-4 grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {applicationsQuery.data?.totalCount ?? 0}
              {' '}
              total
            </span>
          </div>

          {applicationsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading applications...</p>
          )}

          {!applicationsQuery.isLoading && applications.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <SparklesIcon className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No applications found.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Applications from creator sign-ups will appear here.</p>
            </div>
          )}

          {applications.length > 0 && (
            <div className="grid gap-2">
              {applications.map(app => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setDetailApp(app)}
                  className="
                    group flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all
                    hover:border-primary/30 hover:shadow-sm
                  "
                >
                  {/* Avatar */}
                  <div className="
                    flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-lg font-bold
                    text-primary
                  "
                  >
                    {app.display_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{app.display_name}</span>
                      {statusBadge(app.status)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        @
                        {app.username}
                      </span>
                      <span className={cn('rounded-sm px-1.5 py-0.5 font-medium', nicheColor(app.niche))}>
                        {app.niche}
                      </span>
                      <span>{formatDate(app.created_at)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground/70">{app.reason}</p>
                  </div>

                  <ChevronRightIcon className="
                    size-4 shrink-0 text-muted-foreground/40 transition-transform
                    group-hover:translate-x-0.5
                  "
                  />
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Creators tab ──────────────────────────────────────────────────── */}
        <TabsContent value="creators" className="mt-4 grid gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{creatorsQuery.data?.totalCount ?? creators.length}</span>
              {' '}
              approved creators
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-400" />
                Active
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-muted-foreground/30" />
                Inactive
              </span>
            </div>
          </div>

          {creatorsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading creators...</p>
          )}

          {!creatorsQuery.isLoading && creators.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <SparklesIcon className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No approved creators yet.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Approve applications from the Applications tab to see creators here.</p>
            </div>
          )}

          {creators.length > 0 && (
            <div className="grid gap-2">
              {creators.map(app => (
                <CreatorCard
                  key={app.id}
                  app={app}
                  onToggleActive={handleToggleActive}
                  onViewDetail={setDetailApp}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Application detail dialog */}
      <ApplicationDetailDialog
        app={detailApp}
        onClose={() => setDetailApp(null)}
        onReview={handleReview}
        isReviewing={isReviewing}
      />
    </>
  )
}
