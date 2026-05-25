'use client'

import type { ReportContentType, ReportStatus } from '@/lib/db/schema/content/tables'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BanIcon, CheckIcon, EyeIcon, ShieldOffIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { routing } from '@/i18n/routing'

interface ContentReport {
  id: string
  reporter_id: string | null
  content_type: ReportContentType
  content_id: string
  reason: string
  status: ReportStatus
  notes: string | null
  created_at: string
}

interface CommunityBan {
  id: string
  user_id: string
  reason: string
  banned_by: string | null
  expires_at: string | null
  is_permanent: boolean
  created_at: string
}

const REPORT_CONTENT_TYPES: ReportContentType[] = ['comment', 'market', 'user', 'reel']
const REPORT_STATUSES: ReportStatus[] = ['pending', 'reviewed', 'resolved', 'dismissed']

const STATUS_VARIANTS: Record<ReportStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'destructive',
  reviewed: 'secondary',
  resolved: 'default',
  dismissed: 'outline',
}

function getBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) return '/admin/api'
  return `/${locale}/admin/api`
}

export default function SocialManagement() {
  const { locale } = useParams() as { locale?: string }
  const basePath = getBasePath(locale)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<'reports' | 'bans'>('reports')
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ReportContentType | 'all'>('all')

  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banForm, setBanForm] = useState({ user_id: '', reason: '', expires_at: '', is_permanent: false })
  const [isBanning, setIsBanning] = useState(false)

  const [reviewDialog, setReviewDialog] = useState<ContentReport | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)

  const reportsQuery = useQuery({
    queryKey: ['admin-reports', filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType !== 'all') params.set('content_type', filterType)
      const res = await fetch(`${basePath}/social/reports?${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error()
      return res.json() as Promise<{ data: ContentReport[], totalCount: number }>
    },
    staleTime: 30_000,
    enabled: tab === 'reports',
  })

  const bansQuery = useQuery({
    queryKey: ['admin-bans'],
    queryFn: async () => {
      const res = await fetch(`${basePath}/social/bans`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error()
      return res.json() as Promise<{ data: CommunityBan[], totalCount: number }>
    },
    staleTime: 30_000,
    enabled: tab === 'bans',
  })

  const handleReview = useCallback(async (status: ReportStatus) => {
    if (!reviewDialog) return
    setIsReviewing(true)
    try {
      const res = await fetch(`${basePath}/social/reports`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewDialog.id, status, notes: reviewNotes }),
      })
      if (!res.ok) throw new Error()
      toast.success('Report updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      setReviewDialog(null)
      setReviewNotes('')
    }
    catch {
      toast.error('Failed to update report.')
    }
    finally {
      setIsReviewing(false)
    }
  }, [basePath, queryClient, reviewDialog, reviewNotes])

  const handleBan = useCallback(async () => {
    if (!banForm.user_id.trim() || !banForm.reason.trim()) {
      toast.error('User ID and reason are required.')
      return
    }
    setIsBanning(true)
    try {
      const res = await fetch(`${basePath}/social/bans`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: banForm.user_id.trim(),
          reason: banForm.reason.trim(),
          expires_at: banForm.expires_at || null,
          is_permanent: banForm.is_permanent,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('User banned.')
      void queryClient.invalidateQueries({ queryKey: ['admin-bans'] })
      setBanDialogOpen(false)
      setBanForm({ user_id: '', reason: '', expires_at: '', is_permanent: false })
    }
    catch {
      toast.error('Failed to ban user.')
    }
    finally {
      setIsBanning(false)
    }
  }, [basePath, banForm, queryClient])

  const handleUnban = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${basePath}/social/bans/${userId}`, { method: 'DELETE', credentials: 'same-origin' })
      if (!res.ok) throw new Error()
      toast.success('User unbanned.')
      void queryClient.invalidateQueries({ queryKey: ['admin-bans'] })
    }
    catch {
      toast.error('Failed to unban user.')
    }
  }, [basePath, queryClient])

  const reports = reportsQuery.data?.data ?? []
  const bans = bansQuery.data?.data ?? []

  return (
    <>
      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="bans">Community Bans</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4 grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
              <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REPORT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Content type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {REPORT_CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {reportsQuery.isLoading
            ? <p className="text-sm text-muted-foreground">Loading reports...</p>
            : reports.length === 0
              ? <p className="text-sm text-muted-foreground">No reports found.</p>
              : (
                  <div className="divide-y rounded-md border">
                    {reports.map(report => (
                      <div key={report.id} className="flex items-start justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">{report.content_type}</Badge>
                            <Badge variant={STATUS_VARIANTS[report.status]} className="text-xs">{report.status}</Badge>
                            <span className="text-xs text-muted-foreground">ID: {report.content_id}</span>
                          </div>
                          <p className="mt-1 text-sm">{report.reason}</p>
                          {report.notes && <p className="mt-1 text-xs text-muted-foreground">Notes: {report.notes}</p>}
                        </div>
                        {report.status === 'pending' && (
                          <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => { setReviewDialog(report); setReviewNotes('') }}>
                            <EyeIcon className="size-3" />
                            Review
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
        </TabsContent>

        <TabsContent value="bans" className="mt-4 grid gap-4">
          <div className="flex justify-end">
            <Button type="button" className="h-8" onClick={() => setBanDialogOpen(true)}>
              <BanIcon className="mr-1 size-4" />
              Ban User
            </Button>
          </div>

          {bansQuery.isLoading
            ? <p className="text-sm text-muted-foreground">Loading bans...</p>
            : bans.length === 0
              ? <p className="text-sm text-muted-foreground">No active bans.</p>
              : (
                  <div className="divide-y rounded-md border">
                    {bans.map(ban => (
                      <div key={ban.id} className="flex items-start justify-between gap-4 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm">{ban.user_id}</span>
                            {ban.is_permanent
                              ? <Badge variant="destructive" className="text-xs">Permanent</Badge>
                              : ban.expires_at && <Badge variant="secondary" className="text-xs">Expires {new Date(ban.expires_at).toLocaleDateString()}</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{ban.reason}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => handleUnban(ban.user_id)}>
                          <ShieldOffIcon className="size-3" />
                          Unban
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(reviewDialog)} onOpenChange={open => { if (!open) setReviewDialog(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              {reviewDialog?.content_type} — {reviewDialog?.reason}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="review-notes">Notes (optional)</Label>
              <Textarea id="review-notes" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} disabled={isReviewing} placeholder="Add moderation notes..." />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setReviewDialog(null)} disabled={isReviewing}>Cancel</Button>
            <Button type="button" variant="outline" className="text-muted-foreground" onClick={() => handleReview('dismissed')} disabled={isReviewing}>Dismiss</Button>
            <Button type="button" onClick={() => handleReview('resolved')} disabled={isReviewing}>
              <CheckIcon className="mr-1 size-4" />
              {isReviewing ? 'Saving...' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>Ban a user from the community. This can be undone from the Bans tab.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ban-user">User ID</Label>
              <Input id="ban-user" value={banForm.user_id} onChange={e => setBanForm(p => ({ ...p, user_id: e.target.value }))} disabled={isBanning} placeholder="User ID" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ban-reason">Reason</Label>
              <Textarea id="ban-reason" value={banForm.reason} onChange={e => setBanForm(p => ({ ...p, reason: e.target.value }))} disabled={isBanning} placeholder="Reason for ban..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ban-expires">Expires (leave blank for permanent)</Label>
              <Input id="ban-expires" type="datetime-local" value={banForm.expires_at} onChange={e => setBanForm(p => ({ ...p, expires_at: e.target.value }))} disabled={isBanning} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBanDialogOpen(false)} disabled={isBanning}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleBan} disabled={isBanning}>{isBanning ? 'Banning...' : 'Ban User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
