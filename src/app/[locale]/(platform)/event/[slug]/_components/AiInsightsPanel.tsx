'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { BrainIcon, ChevronDownIcon, ChevronUpIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AiInsights {
  summary: string
  probability_explanation: string
  risk_warning: string
  entry_timing: string
  crowd_psychology: string
}

interface InsightItemProps {
  label: string
  value: string
  accent?: string
}

function InsightItem({ label, value, accent }: InsightItemProps) {
  return (
    <div className="grid gap-1">
      <p className={cn('text-xs font-semibold uppercase tracking-wide', accent ?? 'text-muted-foreground')}>
        {label}
      </p>
      <p className="text-sm text-foreground/90 leading-relaxed">{value}</p>
    </div>
  )
}

interface AiInsightsPanelProps {
  eventId: string
}

export default function AiInsightsPanel({ eventId }: AiInsightsPanelProps) {
  const locale = useLocale()
  const [insights, setInsights] = useState<AiInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCached() {
      try {
        const res = await fetch(`/api/ai/insights?eventId=${encodeURIComponent(eventId)}&locale=${locale}`)
        if (!res.ok) return
        const json = await res.json() as { data: AiInsights | null }
        if (json.data) {
          setInsights(json.data)
          setIsGenerated(true)
        }
      }
      catch { /* silent */ }
    }
    loadCached()
  }, [eventId, locale])

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, locale }),
      })
      const json = await res.json() as { data: AiInsights | null, error?: string }
      if (!res.ok || json.error) {
        setError(json.error ?? 'Failed to generate insights.')
        return
      }
      if (json.data) {
        setInsights(json.data)
        setIsGenerated(true)
        setIsExpanded(true)
      }
    }
    catch {
      setError('Failed to generate insights.')
    }
    finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-background">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
        onClick={() => isGenerated && setIsExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && isGenerated && setIsExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <BrainIcon className="size-4 text-primary" />
          <span className="text-sm font-medium">AI-Generated Insights</span>
        </div>
        <div className="flex items-center gap-2">
          {!isGenerated && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={e => { e.stopPropagation(); handleGenerate() }}
            >
              {isLoading
                ? <><RefreshCwIcon className="mr-1.5 size-3 animate-spin" />Generating...</>
                : 'Generate'}
            </Button>
          )}
          {isGenerated && (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isLoading}
                onClick={e => { e.stopPropagation(); handleGenerate() }}
                title="Refresh insights"
              >
                <RefreshCwIcon className={cn('size-3', isLoading && 'animate-spin')} />
              </Button>
              {isExpanded ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />}
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="px-4 pb-3 text-xs text-destructive">{error}</p>
      )}

      {isGenerated && isExpanded && insights && (
        <div className="grid gap-4 border-t px-4 py-4">
          <InsightItem label="Market Summary" value={insights.summary} />
          <InsightItem label="Probability Explained" value={insights.probability_explanation} />
          <InsightItem label="Risk Warning" value={insights.risk_warning} accent="text-amber-500 dark:text-amber-400" />
          <InsightItem label="Smart Entry Timing" value={insights.entry_timing} accent="text-emerald-500 dark:text-emerald-400" />
          <InsightItem label="Crowd Psychology" value={insights.crowd_psychology} />
        </div>
      )}
    </div>
  )
}
