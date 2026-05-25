'use client'

import { useEffect, useState } from 'react'
import { AlertTriangleIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiAlert {
  id: string
  alert_type: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  anomaly: 'Anomaly',
  fake_hype: 'Fake Hype',
  news_spike: 'News Spike',
  sentiment_shift: 'Sentiment Shift',
  risk_exposure: 'Risk Exposure',
  manipulation: 'Manipulation Signal',
}

function severityStyles(severity: AiAlert['severity']) {
  if (severity === 'high') return 'border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400'
  if (severity === 'medium') return 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400'
  return 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400'
}

interface AiMarketAlertsProps {
  eventId: string
}

export default function AiMarketAlerts({ eventId }: AiMarketAlertsProps) {
  const [alerts, setAlerts] = useState<AiAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/ai/alerts?eventId=${encodeURIComponent(eventId)}`)
        if (res.ok) {
          const json = await res.json() as { data: AiAlert[] }
          if (json.data?.length > 0) {
            setAlerts(json.data)
            return
          }
        }
        const postRes = await fetch('/api/ai/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        })
        if (postRes.ok) {
          const json = await postRes.json() as { data: AiAlert[] }
          setAlerts(json.data ?? [])
        }
      }
      catch { /* silent */ }
    }
    load()
  }, [eventId])

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="grid gap-2">
      {visible.map(alert => (
        <div
          key={alert.id}
          className={cn('flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5', severityStyles(alert.severity))}
        >
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
            <div className="grid gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{alert.title}</span>
                <span className="rounded px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide opacity-70 bg-current/10">
                  {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                </span>
              </div>
              <p className="text-xs opacity-80">{alert.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
            className="mt-0.5 shrink-0 opacity-50 hover:opacity-100"
            aria-label="Dismiss alert"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
