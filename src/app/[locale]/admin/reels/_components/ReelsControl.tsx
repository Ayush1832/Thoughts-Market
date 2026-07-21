'use client'

import type { ReelStatus, ReelType } from '@/lib/db/schema/content/tables'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilmIcon, PlusIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { routing } from '@/i18n/routing'

interface Reel {
  id: string
  title: string
  url: string
  type: ReelType
  status: ReelStatus
  is_featured: boolean
  created_at: string
}

const REEL_TYPES: ReelType[] = ['campaign', 'creator_clip', 'market_reaction']
const REEL_STATUSES: ReelStatus[] = ['pending', 'approved', 'rejected', 'featured']

const TYPE_LABELS: Record<ReelType, string> = {
  campaign: 'Campaign',
  creator_clip: 'Creator Clip',
  market_reaction: 'Market Reaction',
}

const STATUS_VARIANTS: Record<ReelStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  featured: 'default',
  approved: 'secondary',
  pending: 'outline',
  rejected: 'destructive',
}

function getBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) {
    return '/admin/api'
  }
  return `/${locale}/admin/api`
}

const emptyForm = { title: '', url: '', type: 'campaign' as ReelType }

export default function ReelsControl() {
  const { locale } = useParams() as { locale?: string }
  const basePath = getBasePath(locale)
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<ReelStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ReelType | 'all'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reels', filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (filterStatus !== 'all') {
        params.set('status', filterStatus)
      }
      if (filterType !== 'all') {
        params.set('type', filterType)
      }
      const res = await fetch(`${basePath}/reels?${params}`, { credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error('Failed to fetch')
      }
      return res.json() as Promise<{ data: Reel[], totalCount: number }>
    },
    staleTime: 30_000,
  })

  const handleCreate = useCallback(async () => {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Title and URL are required.')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`${basePath}/reels`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        throw new Error('Failed to create reel')
      }
      toast.success('Reel created.')
      void queryClient.invalidateQueries({ queryKey: ['admin-reels'] })
      setDialogOpen(false)
      setForm(emptyForm)
    }
    catch {
      toast.error('Failed to create reel.')
    }
    finally {
      setIsSaving(false)
    }
  }, [basePath, form, queryClient])

  const updateStatus = useCallback(async (id: string, status: ReelStatus) => {
    try {
      const res = await fetch(`${basePath}/reels/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        throw new Error('Failed to update status')
      }
      toast.success('Status updated.')
      void queryClient.invalidateQueries({ queryKey: ['admin-reels'] })
    }
    catch {
      toast.error('Failed to update status.')
    }
  }, [basePath, queryClient])

  const toggleFeatured = useCallback(async (reel: Reel) => {
    try {
      const res = await fetch(`${basePath}/reels/${reel.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !reel.is_featured }),
      })
      if (!res.ok) {
        throw new Error('Failed to toggle featured')
      }
      toast.success(reel.is_featured ? 'Removed from featured.' : 'Added to featured.')
      void queryClient.invalidateQueries({ queryKey: ['admin-reels'] })
    }
    catch {
      toast.error('Failed to toggle featured.')
    }
  }, [basePath, queryClient])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${basePath}/reels/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error('Failed to delete reel')
      }
      toast.success('Reel deleted.')
      void queryClient.invalidateQueries({ queryKey: ['admin-reels'] })
    }
    catch {
      toast.error('Failed to delete reel.')
    }
  }, [basePath, queryClient])

  const reels = data?.data ?? []

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {REEL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {REEL_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="h-8" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="mr-1 size-4" />
          Add Reel
        </Button>
      </div>

      {isLoading
        ? <p className="text-sm text-muted-foreground">Loading...</p>
        : reels.length === 0
          ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FilmIcon className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No reels found. Add a campaign or clip to get started.</p>
              </div>
            )
          : (
              <div className="divide-y rounded-md border">
                {reels.map(reel => (
                  <div key={reel.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{reel.title}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">{TYPE_LABELS[reel.type]}</Badge>
                        <Badge variant={STATUS_VARIANTS[reel.status]} className="shrink-0 text-xs">{reel.status}</Badge>
                        {reel.is_featured && <Badge className="shrink-0 text-xs">Featured</Badge>}
                      </div>
                      <a
                        href={reel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 truncate text-xs text-muted-foreground hover:underline"
                      >
                        {reel.url}
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {reel.status === 'pending' && (
                        <>
                          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => updateStatus(reel.id, 'approved')}>Approve</Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() => updateStatus(reel.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => toggleFeatured(reel)}>
                        <StarIcon className={`size-4 ${reel.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(reel.id)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Reel</DialogTitle>
            <DialogDescription>Add a campaign, creator clip, or market reaction reel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as ReelType }))} disabled={isSaving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REEL_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reel-title">Title</Label>
              <Input id="reel-title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} disabled={isSaving} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reel-url">URL</Label>
              <Input id="reel-url" type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} disabled={isSaving} placeholder="https://" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="button" onClick={handleCreate} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
