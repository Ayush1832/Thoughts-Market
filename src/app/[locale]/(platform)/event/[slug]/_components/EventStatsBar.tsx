'use client'

import type { Event } from '@/types'
import { ArrowLeftIcon, ShareIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AppLink from '@/components/AppLink'
import { cn } from '@/lib/utils'

interface EventStatsBarProps {
  event: Event
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) { return `$${(n / 1_000_000).toFixed(1)}M` }
  if (n >= 1_000) { return `$${(n / 1_000).toFixed(0)}K` }
  return `$${n.toFixed(0)}`
}

function formatDate(iso: string | null): string {
  if (!iso) { return '—' }
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatCard({ label, value, accent }: { label: string, value: string, accent?: boolean }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-border/40 bg-card px-4 py-3">
      <p className="text-2xs font-semibold tracking-widest text-muted-foreground/60 uppercase">{label}</p>
      <p className={cn('mt-1 truncate text-lg font-bold', accent ? 'text-primary' : 'text-foreground')}>
        {value}
      </p>
    </div>
  )
}

export default function EventStatsBar({ event }: EventStatsBarProps) {
  const router = useRouter()
  const market = event.markets?.[0]
  const volume = event.markets.reduce((sum, m) => sum + Number(m.volume ?? 0), 0)
  const isActive = event.status === 'active'

  // Primary outcome probability
  const firstOutcome = market?.outcomes?.[0]
  const probability = firstOutcome
    ? Math.round(Number(firstOutcome.token_id || 0) % 100)
    : null

  // Category tag
  const categoryTag = event.tags?.find(t => t.isMainCategory)
  const categoryLabel = categoryTag?.name ?? event.main_tag ?? null
  const categorySlug = categoryTag?.slug ?? null

  return (
    <div className="animate-fade-in space-y-3">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="
              flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs font-medium
              text-muted-foreground transition-colors
              hover:bg-muted hover:text-foreground
            "
          >
            <ArrowLeftIcon className="size-3" />
            Back
          </button>

          {categoryLabel && categorySlug && (
            <AppLink
              href={`/${categorySlug}`}
              className="
                rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs font-semibold tracking-wider
                text-muted-foreground uppercase transition-colors
                hover:bg-muted hover:text-foreground
              "
            >
              {categoryLabel}
            </AppLink>
          )}

          <span
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
              isActive
                ? 'bg-green-500/15 text-green-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isActive && <span className="size-1.5 animate-pulse rounded-full bg-green-400" />}
            {isActive ? 'OPEN' : event.status.toUpperCase()}
          </span>
        </div>

        <button
          type="button"
          className="
            flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs font-medium
            text-muted-foreground transition-colors
            hover:bg-muted hover:text-foreground
          "
          onClick={() => navigator.share?.({ url: window.location.href, title: event.title }).catch(() => {})}
        >
          <ShareIcon className="size-3" />
          Share
        </button>
      </div>

      {/* Quick stats row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {volume > 0 && (
          <span>
            <span className="font-semibold text-foreground">{formatVolume(volume)}</span>
            {' '}
            volume
          </span>
        )}
        {event.end_date && (
          <>
            <span className="text-border">·</span>
            <span>
              Closes
              {' '}
              <span className="font-semibold text-foreground">{formatDate(event.end_date)}</span>
            </span>
          </>
        )}
      </div>

      {/* Stat cards */}
      <div className="flex flex-wrap gap-2">
        {probability !== null && (
          <StatCard label="Probability" value={`${probability}%`} accent />
        )}
        <StatCard label="24H Volume" value={formatVolume(volume)} />
        {event.end_date && (
          <StatCard label="Closes" value={formatDate(event.end_date)} />
        )}
        {market && (
          <StatCard
            label="Markets"
            value={String(event.total_markets_count)}
          />
        )}
      </div>
    </div>
  )
}
