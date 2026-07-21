'use client'

import type { Market } from '@/types'
import { ShieldIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AiRiskScore {
  manipulation_risk: number
  resolution_clarity: number
  liquidity_quality: number
  volatility: number
  credibility: number
  overall_score: number
  summary: string
}

function scoreColor(score: number) {
  if (score >= 70) {
    return 'text-emerald-500'
  }
  if (score >= 40) {
    return 'text-amber-500'
  }
  return 'text-red-500'
}

function ScoreBar({ label, score }: { label: string, score: number }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-semibold', scoreColor(score))}>{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', score >= 70
            ? 'bg-emerald-500'
            : score >= 40
              ? `bg-amber-500`
              : `bg-red-500`)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

interface AiRiskScorePanelProps {
  market: Market
  eventId: string
}

export default function AiRiskScorePanel({ market, eventId }: AiRiskScorePanelProps) {
  const [score, setScore] = useState<AiRiskScore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ai/risk-score?conditionId=${encodeURIComponent(market.condition_id)}`)
        if (!res.ok) {
          const postRes = await fetch('/api/ai/risk-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditionId: market.condition_id, eventId }),
          })
          if (postRes.ok) {
            const json = await postRes.json() as { data: AiRiskScore }
            setScore(json.data)
          }
          return
        }
        const json = await res.json() as { data: AiRiskScore | null }
        if (json.data) {
          setScore(json.data)
        }
        else {
          const postRes = await fetch('/api/ai/risk-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditionId: market.condition_id, eventId }),
          })
          if (postRes.ok) {
            const postJson = await postRes.json() as { data: AiRiskScore }
            setScore(postJson.data)
          }
        }
      }
      catch { /* silent */ }
      finally {
        setIsLoading(false)
      }
    }
    load()
  }, [market.condition_id, eventId])

  if (isLoading || !score) {
    return null
  }

  return (
    <div className="rounded-xl border bg-background">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setIsExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ShieldIcon className="size-4 text-primary" />
          <span className="text-sm font-medium">AI Risk Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-bold', scoreColor(score.overall_score))}>
            {score.overall_score}
            /100
          </span>
          <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="grid gap-3 border-t p-4">
          <ScoreBar label="Manipulation Resistance" score={score.manipulation_risk} />
          <ScoreBar label="Resolution Clarity" score={score.resolution_clarity} />
          <ScoreBar label="Liquidity Quality" score={score.liquidity_quality} />
          <ScoreBar label="Price Stability" score={score.volatility} />
          <ScoreBar label="Credibility" score={score.credibility} />
          {score.summary && (
            <p className="mt-1 text-xs text-muted-foreground">{score.summary}</p>
          )}
        </div>
      )}
    </div>
  )
}
