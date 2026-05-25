'use client'

import type { ContentPostStatus, ContentPostType } from '@/lib/db/schema/content/tables'
import { useParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon, EditIcon, CheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { routing } from '@/i18n/routing'

interface ContentPost {
  id: string
  title: string
  body: string
  type: ContentPostType
  status: ContentPostStatus
  created_at: string
  published_at: string | null
}

const POST_TYPES: ContentPostType[] = ['article', 'announcement', 'tutorial', 'ai_insights', 'market_analysis', 'settlement']
const POST_STATUSES: ContentPostStatus[] = ['draft', 'published', 'archived']

const TYPE_LABELS: Record<ContentPostType, string> = {
  article: 'Article',
  announcement: 'Announcement',
  tutorial: 'Tutorial',
  ai_insights: 'AI Insights',
  market_analysis: 'Market Analysis',
  settlement: 'Settlement',
}

const STATUS_VARIANTS: Record<ContentPostStatus, 'default' | 'secondary' | 'outline'> = {
  published: 'default',
  draft: 'secondary',
  archived: 'outline',
}

function getBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) {
    return '/admin/api'
  }
  return `/${locale}/admin/api`
}

const emptyForm = { title: '', body: '', type: 'article' as ContentPostType, status: 'draft' as ContentPostStatus }

export default function ContentCMS() {
  const { locale } = useParams() as { locale?: string }
  const basePath = getBasePath(locale)
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ContentPost | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<ContentPostStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<ContentPostType | 'all'>('all')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-content', filterStatus, filterType, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterType !== 'all') params.set('type', filterType)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`${basePath}/content?${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<{ data: ContentPost[], totalCount: number }>
    },
    staleTime: 30_000,
  })

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((post: ContentPost) => {
    setEditing(post)
    setForm({ title: post.title, body: post.body, type: post.type, status: post.status })
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required.')
      return
    }
    setIsSaving(true)
    try {
      const url = editing ? `${basePath}/content/${editing.id}` : `${basePath}/content`
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success(editing ? 'Post updated.' : 'Post created.')
      void queryClient.invalidateQueries({ queryKey: ['admin-content'] })
      setDialogOpen(false)
    }
    catch {
      toast.error('Failed to save post.')
    }
    finally {
      setIsSaving(false)
    }
  }, [basePath, editing, form, queryClient])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${basePath}/content/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      if (!res.ok) throw new Error()
      toast.success('Post deleted.')
      void queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    }
    catch {
      toast.error('Failed to delete post.')
    }
  }, [basePath, queryClient])

  const handlePublish = useCallback(async (post: ContentPost) => {
    try {
      const res = await fetch(`${basePath}/content/${post.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Post published.')
      void queryClient.invalidateQueries({ queryKey: ['admin-content'] })
    }
    catch {
      toast.error('Failed to publish post.')
    }
  }, [basePath, queryClient])

  const posts = data?.data ?? []

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-full sm:max-w-xs"
          />
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {POST_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {POST_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="h-8" onClick={openCreate}>
          <PlusIcon className="mr-1 size-4" />
          New Post
        </Button>
      </div>

      {isLoading
        ? <p className="text-sm text-muted-foreground">Loading...</p>
        : posts.length === 0
          ? <p className="text-sm text-muted-foreground">No posts found.</p>
          : (
              <div className="divide-y rounded-md border">
                {posts.map(post => (
                  <div key={post.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{post.title}</span>
                        <Badge variant="outline" className="shrink-0 text-xs">{TYPE_LABELS[post.type]}</Badge>
                        <Badge variant={STATUS_VARIANTS[post.status]} className="shrink-0 text-xs">{post.status}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.body}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {post.status === 'draft' && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => handlePublish(post)}>
                          <CheckIcon className="size-4" />
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(post)}>
                        <EditIcon className="size-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(post.id)}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Post' : 'New Post'}</DialogTitle>
            <DialogDescription>Fill in the content details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="post-title">Title</Label>
              <Input id="post-title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} disabled={isSaving} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as ContentPostType }))} disabled={isSaving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as ContentPostStatus }))} disabled={isSaving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="post-body">Body</Label>
              <Textarea id="post-body" value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} disabled={isSaving} className="min-h-40" placeholder="Write your content here..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
