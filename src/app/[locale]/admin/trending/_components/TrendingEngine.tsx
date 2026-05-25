'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { routing } from '@/i18n/routing'

interface TrendingState {
  featured_markets: string[]
  hot_picks: string[]
  viral_topics: string[]
  live_event_mode: boolean
}

function getBasePath(locale?: string) {
  if (!locale || locale === routing.defaultLocale) {
    return '/admin/api'
  }
  return `/${locale}/admin/api`
}

export default function TrendingEngine() {
  const { locale } = useParams() as { locale?: string }
  const basePath = getBasePath(locale)

  const [state, setState] = useState<TrendingState>({
    featured_markets: [],
    hot_picks: [],
    viral_topics: [],
    live_event_mode: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [inputValues, setInputValues] = useState({ featured_markets: '', hot_picks: '', viral_topics: '' })

  useEffect(() => {
    fetch(`${basePath}/trending`, { credentials: 'same-origin' })
      .then(res => res.json())
      .then((data: TrendingState) => setState(data))
      .catch(() => toast.error('Failed to load trending settings'))
      .finally(() => setIsLoading(false))
  }, [basePath])

  const save = useCallback(async (key: keyof TrendingState, value: unknown) => {
    setIsSaving(key)
    try {
      const res = await fetch(`${basePath}/trending`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        throw new Error()
      }
      toast.success('Saved successfully')
    }
    catch {
      toast.error('Failed to save')
    }
    finally {
      setIsSaving(null)
    }
  }, [basePath])

  const addItem = useCallback((field: 'featured_markets' | 'hot_picks' | 'viral_topics') => {
    const val = inputValues[field].trim()
    if (!val) {
      return
    }
    const updated = [...state[field], val]
    setState(prev => ({ ...prev, [field]: updated }))
    setInputValues(prev => ({ ...prev, [field]: '' }))
    void save(field, updated)
  }, [inputValues, state, save])

  const removeItem = useCallback((field: 'featured_markets' | 'hot_picks' | 'viral_topics', item: string) => {
    const updated = state[field].filter(i => i !== item)
    setState(prev => ({ ...prev, [field]: updated }))
    void save(field, updated)
  }, [state, save])

  const toggleLiveMode = useCallback((checked: boolean) => {
    setState(prev => ({ ...prev, live_event_mode: checked }))
    void save('live_event_mode', checked)
  }, [save])

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Event Mode</CardTitle>
          <CardDescription>Enable to activate a full-screen live event experience across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="live-event-mode"
              checked={state.live_event_mode}
              onCheckedChange={toggleLiveMode}
              disabled={isSaving === 'live_event_mode'}
            />
            <Label htmlFor="live-event-mode">{state.live_event_mode ? 'Active' : 'Inactive'}</Label>
          </div>
        </CardContent>
      </Card>

      {(['featured_markets', 'hot_picks', 'viral_topics'] as const).map((field) => {
        const labels: Record<typeof field, { title: string, desc: string, placeholder: string }> = {
          featured_markets: { title: 'Featured Markets', desc: 'Pinned market IDs shown at the top of the feed.', placeholder: 'Enter market ID or slug' },
          hot_picks: { title: 'Hot Picks', desc: 'Admin-curated hot markets highlighted across the platform.', placeholder: 'Enter market ID or slug' },
          viral_topics: { title: 'Viral Topics', desc: 'Topic tags pushed as trending regardless of activity.', placeholder: 'Enter topic tag' },
        }
        const { title, desc, placeholder } = labels[field]

        return (
          <Card key={field}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex gap-2">
                <Input
                  value={inputValues[field]}
                  onChange={e => setInputValues(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem(field)
                    }
                  }}
                  disabled={isSaving === field}
                />
                <Button type="button" onClick={() => addItem(field)} disabled={isSaving === field || !inputValues[field].trim()}>
                  Add
                </Button>
              </div>
              {state[field].length > 0
                ? (
                    <div className="flex flex-wrap gap-2">
                      {state[field].map(item => (
                        <Badge key={item} variant="secondary" className="gap-1.5">
                          {item}
                          <button
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => removeItem(field, item)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )
                : <p className="text-sm text-muted-foreground">No items added yet.</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
