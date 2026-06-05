'use client'

import type { Event } from '@/types'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import AppLink from '@/components/AppLink'
import { useHasHydrated } from '@/hooks/useHasHydrated'
import { cn } from '@/lib/utils'

interface HeroEventCardProps {
  event: Event
  currentTimestamp?: number | null
}

function formatVolume(n: number): string {
  if (n >= 1_000_000)
    return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)
    return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function formatCloses(endDate: string | null): string {
  if (!endDate)
    return '—'
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0)
    return 'Closed'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0)
    return `${days}d · ${hours}h`
  return `${hours}h`
}

export default function HeroEventCard({ event }: HeroEventCardProps) {
  const market = event.markets?.[0]
  const [hovering, setHovering] = useState<'up' | 'down' | null>(null)
  // useHasHydrated prevents hydration mismatch for Date.now()-dependent values
  const hydrated = useHasHydrated()
  const closesLabel = hydrated ? formatCloses(event.end_date) : '—'
  const yesOutcome = market?.outcomes?.find(o => o.outcome_index === 0)
  const noOutcome = market?.outcomes?.find(o => o.outcome_index === 1)
  const yesLabel = yesOutcome?.outcome_text ?? 'Up'
  const noLabel = noOutcome?.outcome_text ?? 'Down'
  const upChance = 58
  const downChance = 42
  const volume = Number(market?.volume ?? 0)
  const traders = Math.floor(volume / 80) + 120
  const handleMouseEnter = useCallback((side: 'up' | 'down') => setHovering(side), [])
  const handleMouseLeave = useCallback(() => setHovering(null), [])

  return (
    <div className="animate-slide-up">
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border border-white/[0.08]',
          'bg-white/[0.04] backdrop-blur-2xl',
          'shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_30px_80px_-24px_rgba(0,0,0,0.7)]',
          'transition-all duration-300',
          'hover:border-[#7d6cff]/40 hover:-translate-y-0.5',
        )}
      >
        {/* Iridescent nebula glow background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: 'radial-gradient(120% 80% at 0% 0%, rgba(125,108,255,0.12), transparent 55%), radial-gradient(120% 80% at 100% 100%, rgba(84,227,255,0.08), transparent 55%)',
          }}
        />

        <div className="relative p-5 md:p-7">
          {/* top row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* icon + badges */}
            <div className="flex items-center gap-3">
              {event.icon_url && (
                <div className="
                  relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted/40
                "
                >
                  <Image src={event.icon_url} alt={event.title} fill className="object-cover" sizes="44px" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="
                  flex items-center gap-1.5 rounded-full border border-[#00d4ff]/30
                  bg-[#00d4ff]/10 px-2.5 py-1 text-xs font-semibold text-[#00d4ff]
                  shadow-[0_0_10px_rgba(0,212,255,0.15)]
                "
                >
                  <span className="size-1.5 animate-pulse rounded-full bg-[#00d4ff]" />
                  LIVE
                </span>
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary capitalize">
                  {event.series_recurrence ?? 'Daily Market'}
                </span>
              </div>
            </div>

            {/* stats */}
            <div className="flex flex-wrap items-center gap-5 text-center">
              <div>
                <p className="text-2xs font-semibold tracking-widest text-muted-foreground/60 uppercase">24H Vol</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{formatVolume(volume)}</p>
              </div>
              <div className="h-7 w-px bg-border/40" />
              <div>
                <p className="text-2xs font-semibold tracking-widest text-muted-foreground/60 uppercase">Traders</p>
                <p className="mt-0.5 text-sm font-bold text-foreground">{traders.toLocaleString()}</p>
              </div>
              <div className="h-7 w-px bg-border/40" />
              <div>
                <p className="text-2xs font-semibold tracking-widest text-muted-foreground/60 uppercase">Closes</p>
                <p className="mt-0.5 text-sm font-bold text-yellow-400">{closesLabel}</p>
              </div>
            </div>
          </div>

          {/* clickable title */}
          <AppLink href={`/event/${event.slug}`} className="group mt-5 block">
            <h2 className="
              font-display text-3xl/tight tracking-tight text-foreground transition-colors
              group-hover:text-[#54e3ff]
              md:text-4xl
            "
            >
              {event.title}
            </h2>
          </AppLink>

          {/* probability bar */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-[#5ee5ff]">
                UP
                {' '}
                {upChance}
                %
              </span>
              <span className="text-[#ff6b8a]">
                {downChance}
                % DOWN
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${upChance}%`, background: 'linear-gradient(90deg, #5ee5ff, #54e3ff)' }}
              />
            </div>
          </div>

          {/* predict buttons — cyan (up) / pink (down) */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter('up')}
              onMouseLeave={handleMouseLeave}
              className={cn(
                'tabnum flex items-center justify-between rounded-2xl px-5 py-3.5 text-base font-semibold',
                'border border-[#5ee5ff]/35 text-[#5ee5ff]',
                'bg-[linear-gradient(180deg,rgba(94,229,255,0.22),rgba(94,229,255,0.08))]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_-10px_rgba(94,229,255,0.35)]',
                'transition-all duration-150 hover:-translate-y-px',
                hovering === 'up' ? '-translate-y-px' : 'active:translate-y-0',
              )}
            >
              <span className="flex items-center gap-2 text-sm">↑ PREDICT {yesLabel.toUpperCase()}</span>
              <span className="text-lg font-bold">{upChance}¢</span>
            </button>
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter('down')}
              onMouseLeave={handleMouseLeave}
              className={cn(
                'tabnum flex items-center justify-between rounded-2xl px-5 py-3.5 text-base font-semibold',
                'border border-[#ff6b8a]/35 text-[#ff6b8a]',
                'bg-[linear-gradient(180deg,rgba(255,107,138,0.22),rgba(255,107,138,0.08))]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_-10px_rgba(255,107,138,0.35)]',
                'transition-all duration-150 hover:-translate-y-px',
                hovering === 'down' ? '-translate-y-px' : 'active:translate-y-0',
              )}
            >
              <span className="flex items-center gap-2 text-sm">↓ PREDICT {noLabel.toUpperCase()}</span>
              <span className="text-lg font-bold">{downChance}¢</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
