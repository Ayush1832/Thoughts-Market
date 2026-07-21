'use client'

import type { Route } from 'next'
import { ArrowLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import AppLink from '@/components/AppLink'
import GlobeCanvas from '@/components/GlobeCanvas'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

// Platform market categories, anchored to globe locations. These ARE the
// "cards" — the feed and the globe both render from this single source.
interface AtlasCategory {
  id: string
  label: string
  href: string
  color: string
  lat: number
  lon: number
  region: string
}

const CATEGORIES: AtlasCategory[] = [
  { id: 'geopolitics', label: 'Geopolitics', href: '/geopolitics', color: '#54e3ff', lat: 25, lon: 121, region: 'East Asia' },
  { id: 'politics', label: 'Politics', href: '/politics', color: '#ff6b8a', lat: 38, lon: -77, region: 'Washington' },
  { id: 'crypto', label: 'Crypto', href: '/crypto', color: '#ffbe3d', lat: 1, lon: 103, region: 'Singapore' },
  { id: 'finance', label: 'Finance', href: '/finance', color: '#22c55e', lat: 40, lon: -74, region: 'New York' },
  { id: 'tech', label: 'Tech', href: '/tech', color: '#7d6cff', lat: 37, lon: -122, region: 'San Francisco' },
  { id: 'sports', label: 'Sports', href: '/sports/live', color: '#4ade8a', lat: 51, lon: -0.1, region: 'London' },
  { id: 'esports', label: 'Esports', href: '/esports/live', color: '#a855f7', lat: 37, lon: 127, region: 'Seoul' },
  { id: 'culture', label: 'Culture', href: '/culture', color: '#ff7ad9', lat: 34, lon: -118, region: 'Los Angeles' },
  { id: 'world', label: 'World', href: '/world', color: '#54e3ff', lat: 48, lon: 2, region: 'Europe' },
  { id: 'economy', label: 'Economy', href: '/economy', color: '#ffd66c', lat: 50, lon: 8, region: 'Frankfurt' },
  { id: 'weather', label: 'Weather', href: '/weather', color: '#a8d8ff', lat: -23, lon: -46, region: 'São Paulo' },
  { id: 'elections', label: 'Elections', href: '/elections', color: '#ff6b8a', lat: 28, lon: 77, region: 'New Delhi' },
  { id: 'mentions', label: 'Mentions', href: '/mentions', color: '#c084fc', lat: 35, lon: 139, region: 'Tokyo' },
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

const HOTSPOTS = CATEGORIES.map((c) => {
  const [r, g, b] = hexToRgb(c.color)
  return { lat: c.lat, lon: c.lon, r, g, b, size: 4.6, label: c.label }
})

function StatPill({ label, value, sub, color }: { label: string, value: string, sub?: string, color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-semibold tracking-[1.4px] text-white/35 uppercase">{label}</p>
      <p className="mt-0.5 flex items-baseline justify-center gap-1 text-xl leading-none font-bold" style={{ color: color ?? '#fff' }}>
        {value}
        {sub && <span className="text-[11px] font-medium text-white/40">{sub}</span>}
      </p>
    </div>
  )
}

export default function AtlasClient() {
  const router = useRouter()
  const [layers, setLayers] = useState({ heatmap: false, hotspots: true, flow: true, grid: true })

  return (
    <div className="min-h-screen text-white">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 p-4 lg:px-6">
        <AppLink
          href="/"
          className="
            flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium
            text-white/70 transition-colors
            hover:bg-white/10 hover:text-white
          "
        >
          <ArrowLeftIcon className="size-3.5" />
          Home
        </AppLink>
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-[#00d4ff] shadow-[0_0_10px_#00d4ff]" />
          <span className="text-sm font-bold tracking-wider">ATLAS</span>
          <span className="text-xs font-medium tracking-[1.5px] text-white/40 uppercase">Global Intelligence · Live</span>
        </div>
        <div className="ml-auto flex items-center gap-5 lg:gap-7">
          <StatPill label="Global Risk" value="72" sub="+4" color="#facc15" />
          <StatPill label="Fear & Greed" value="38" sub="-6" color="#f472b6" />
          <StatPill label="Active" value="14.2K" sub="now" />
          <StatPill label="Events" value="18" sub="live" color="#00d4ff" />
          <StatPill label="Heat" value="↑18%" sub="24h" color="#22c55e" />
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[240px_1fr_360px] lg:p-6">
        {/* ── Left: categories + layers ── */}
        <aside className="space-y-6">
          <div>
            <p className="mb-2 text-2xs font-semibold tracking-[1.6px] text-white/35 uppercase">
              Categories ·
              {CATEGORIES.length}
            </p>
            <div className="space-y-1.5">
              {CATEGORIES.map(c => (
                <AppLink
                  key={c.id}
                  href={c.href as Route}
                  className="
                    flex items-center justify-between rounded-lg border border-white/8 bg-white/3 px-3 py-2
                    transition-colors
                    hover:bg-white/6
                  "
                >
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 7px ${c.color}` }} />
                    <span className="text-[13px] text-white/80">{c.label}</span>
                  </div>
                  <span className="text-[11px] text-white/30">{c.region}</span>
                </AppLink>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-2xs font-semibold tracking-[1.6px] text-white/35 uppercase">Globe Layers</p>
            <div className="space-y-1">
              {([['heatmap', 'Heatmap'], ['hotspots', 'Hotspots'], ['flow', 'Flow lines'], ['grid', 'Grid']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayers(l => ({ ...l, [key]: !l[key] }))}
                  className="
                    flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[13px] text-white/75
                    transition-colors
                    hover:bg-white/5
                  "
                >
                  <span>{label}</span>
                  <span className={cn('relative h-5 w-9 rounded-full transition-colors', layers[key]
                    ? 'bg-[#00d4ff]'
                    : `bg-white/15`)}
                  >
                    <span className={cn('absolute top-0.5 size-4 rounded-full bg-white transition-all', layers[key]
                      ? `left-[18px]`
                      : `left-0.5`)}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Center: globe (categories appear at their locations) ── */}
        <div className="relative flex flex-col rounded-2xl border border-white/8 bg-[#0a0f1e]/60 p-4">
          <div className="flex flex-1 items-center justify-center py-6">
            <GlobeCanvas
              size={420}
              showGrid={layers.grid}
              showHotspots={layers.hotspots}
              showArcs={layers.flow}
              showLabels
              interactive
              hotspots={HOTSPOTS}
              onHotspotClick={i => router.push(CATEGORIES[i].href as Route)}
              className="block max-w-full"
            />
          </div>
        </div>

        {/* ── Right: intelligence feed — the category cards ── */}
        <aside className="rounded-2xl border border-white/8 bg-[#0a0f1e]/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              <h2 className="text-sm font-bold tracking-wide">INTELLIGENCE FEED</h2>
            </div>
            <span className="text-[11px] text-white/35">
              {CATEGORIES.length}
              {' '}
              categories
            </span>
          </div>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {CATEGORIES.map(c => (
              <AppLink
                key={c.id}
                href={c.href as Route}
                className="
                  group block rounded-xl border border-l-2 border-white/8 bg-white/3 p-3 transition-colors
                  hover:bg-white/6
                "
                style={{ borderLeftColor: c.color }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold tracking-[1.2px] uppercase" style={{ color: c.color }}>
                    {c.label}
                  </span>
                  <span className="text-[11px] text-white/30">{c.region}</span>
                </div>
                <p className="
                  mt-1 flex items-center justify-between text-[13.5px] leading-snug font-semibold text-white/90
                  group-hover:text-white
                "
                >
                  Explore
                  {' '}
                  {c.label}
                  {' '}
                  markets
                  <ChevronRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-60" />
                </p>
              </AppLink>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
