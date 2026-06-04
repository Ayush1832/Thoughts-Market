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

function StatCard({ label, value, accent, index = 0 }: { label: string, value: string, accent?: boolean, index?: number }) {
  return (
    <div
      className={cn(
        'group animate-tm-pop relative min-w-0 flex-1 overflow-hidden rounded-2xl border px-4 py-3',
        'transition-all duration-300 hover:-translate-y-0.5',
        accent
          ? 'border-[#4f8ef7]/30 bg-[#4f8ef7]/[0.06] hover:border-[#4f8ef7]/60 hover:shadow-lg hover:shadow-[#4f8ef7]/15'
          : 'border-tm-border bg-tm-surface hover:border-[#4f8ef7]/40 hover:shadow-lg hover:shadow-[#4f8ef7]/10',
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* hover sheen sweep */}
      <span className="tm-sheen" aria-hidden />
      <p className="text-2xs font-semibold tracking-widest text-tm-secondary/70 uppercase">{label}</p>
      <p className={cn(
        'tabnum mt-1 truncate text-lg font-bold transition-colors',
        accent ? 'text-[#4f8ef7] group-hover:text-[#00d4ff]' : 'text-tm-primary',
      )}
      >
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
              flex items-center gap-1.5 rounded-lg border border-tm-border bg-tm-surface px-3 py-1.5 text-xs font-medium
              text-tm-secondary transition-all duration-200
              hover:-translate-y-px hover:border-[#4f8ef7]/40 hover:bg-tm-elevated hover:text-tm-primary
            "
          >
            <ArrowLeftIcon className="size-3" />
            Back
          </button>

          {categoryLabel && categorySlug && (
            <AppLink
              href={`/${categorySlug}`}
              className="
                rounded-lg border border-tm-border bg-tm-surface px-3 py-1.5 text-xs font-semibold tracking-wider
                text-tm-secondary uppercase transition-all duration-200
                hover:-translate-y-px hover:border-[#4f8ef7]/40 hover:bg-tm-elevated hover:text-tm-primary
              "
            >
              {categoryLabel}
            </AppLink>
          )}

          <span
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
              isActive
                ? 'border border-green-500/30 bg-green-500/15 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                : 'bg-tm-elevated text-tm-secondary',
            )}
          >
            {isActive && (
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-green-400" />
              </span>
            )}
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
          <StatCard label="Probability" value={`${probability}%`} accent index={0} />
        )}
        <StatCard label="24H Volume" value={formatVolume(volume)} index={1} />
        {event.end_date && (
          <StatCard label="Closes" value={formatDate(event.end_date)} index={2} />
        )}
        {market && (
          <StatCard
            label="Markets"
            value={String(event.total_markets_count)}
            index={3}
          />
        )}
      </div>
    </div>
  )
}
