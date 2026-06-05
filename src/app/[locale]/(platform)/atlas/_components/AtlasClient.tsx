'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react'
import { useState } from 'react'
import AppLink from '@/components/AppLink'
import GlobeCanvas from '@/components/GlobeCanvas'
import { cn } from '@/lib/utils'

interface FeedItem {
  id: string
  category: string
  title: string
  source: string
  url: string
  image: string | null
  ago: string
}

const CATEGORIES = [
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'elections', label: 'Elections' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'markets', label: 'Markets' },
  { id: 'tech', label: 'AI & Tech' },
  { id: 'conflict', label: 'Conflict' },
] as const

const HOTSPOTS = [
  { name: 'Taiwan tension', pct: '+12%', color: '#ff4d6d' },
  { name: 'Strait of Hormuz', pct: '+8%', color: '#ffbe3d' },
  { name: 'NATO posture', pct: '-2%', color: '#22c55e' },
  { name: 'Korean DMZ', pct: '+4%', color: '#a855f7' },
  { name: 'Red Sea routes', pct: '+9%', color: '#ff4d6d' },
]

const CATEGORY_ACCENT: Record<string, string> = {
  GEOPOLITICS: 'text-[#ff6b7a] border-l-[#ff4d6d]',
  COMMODITY: 'text-[#ffbe3d] border-l-[#ffbe3d]',
  FINANCE: 'text-[#22c55e] border-l-[#22c55e]',
  ELECTION: 'text-[#4f8ef7] border-l-[#4f8ef7]',
  TECH: 'text-[#c084fc] border-l-[#a855f7]',
  CONFLICT: 'text-[#ff6b7a] border-l-[#ff4d6d]',
  GLOBAL: 'text-[#00d4ff] border-l-[#00d4ff]',
}

function StatPill({ label, value, sub, color }: { label: string, value: string, sub?: string, color?: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-semibold tracking-[1.4px] text-white/35 uppercase">{label}</p>
      <p className="mt-0.5 flex items-baseline justify-center gap-1 text-xl font-bold leading-none" style={{ color: color ?? '#fff' }}>
        {value}
        {sub && <span className="text-[11px] font-medium text-white/40">{sub}</span>}
      </p>
    </div>
  )
}

export default function AtlasClient() {
  const [category, setCategory] = useState<string>('geopolitics')
  const [layers, setLayers] = useState({ heatmap: false, hotspots: true, flow: true, grid: true })

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['atlas-news', category],
    queryFn: async (): Promise<FeedItem[]> => {
      const res = await fetch(`/api/atlas/news?category=${category}`)
      if (!res.ok) throw new Error('Failed to load feed')
      const json = await res.json()
      return json.items as FeedItem[]
    },
    refetchInterval: 120_000,
    staleTime: 60_000,
  })

  const updatedAgo = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000) : 0

  return (
    <div className="min-h-screen text-white">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-4 py-4 lg:px-6">
        <AppLink
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
        {/* ── Left: hotspots + layers ── */}
        <aside className="space-y-6">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[1.6px] text-white/35 uppercase">Hotspots · {HOTSPOTS.length}</p>
            <div className="space-y-1.5">
              {HOTSPOTS.map(h => (
                <div key={h.name} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2 rounded-full" style={{ background: h.color, boxShadow: `0 0 7px ${h.color}` }} />
                    <span className="text-[13px] text-white/80">{h.name}</span>
                  </div>
                  <span className={cn('text-[13px] font-semibold', h.pct.startsWith('-') ? 'text-[#22c55e]' : 'text-[#ff6b7a]')}>{h.pct}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[1.6px] text-white/35 uppercase">Globe Layers</p>
            <div className="space-y-1">
              {([['heatmap', 'Heatmap'], ['hotspots', 'Hotspots'], ['flow', 'Flow lines'], ['grid', 'Grid']] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayers(l => ({ ...l, [key]: !l[key] }))}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[13px] text-white/75 transition-colors hover:bg-white/5"
                >
                  <span>{label}</span>
                  <span className={cn('relative h-5 w-9 rounded-full transition-colors', layers[key] ? 'bg-[#00d4ff]' : 'bg-white/15')}>
                    <span className={cn('absolute top-0.5 size-4 rounded-full bg-white transition-all', layers[key] ? 'left-[18px]' : 'left-0.5')} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Center: globe + category tabs ── */}
        <div className="relative flex flex-col rounded-2xl border border-white/8 bg-[#0a0f1e]/60 p-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  category === c.id ? 'bg-[#1c3a66] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center justify-center py-6">
            <GlobeCanvas
              size={420}
              showGrid={layers.grid}
              showHotspots={layers.hotspots}
              showArcs={layers.flow}
              className="block max-w-full"
            />
          </div>
        </div>

        {/* ── Right: intelligence feed ── */}
        <aside className="rounded-2xl border border-white/8 bg-[#0a0f1e]/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]" />
              <h2 className="text-sm font-bold tracking-wide">INTELLIGENCE FEED</h2>
            </div>
            <span className="text-[11px] text-white/35">
              {isLoading ? 'loading…' : `updated ${updatedAgo < 60 ? `${updatedAgo}s` : `${Math.round(updatedAgo / 60)}m`} ago`}
            </span>
          </div>

          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-shimmer h-20 rounded-xl" />
            ))}

            {isError && (
              <p className="px-1 py-4 text-sm text-white/50">Couldn’t load the feed. Retrying shortly…</p>
            )}

            {!isLoading && data?.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'group block rounded-xl border border-white/8 border-l-2 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]',
                  CATEGORY_ACCENT[item.category] ?? CATEGORY_ACCENT.GLOBAL,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-[10px] font-bold tracking-[1.2px]', (CATEGORY_ACCENT[item.category] ?? CATEGORY_ACCENT.GLOBAL).split(' ')[0])}>
                    {item.category}
                  </span>
                  <span className="text-[11px] text-white/30">{item.ago}</span>
                </div>
                <p className="mt-1 text-[13.5px] leading-snug font-semibold text-white/90 group-hover:text-white">
                  {item.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-white/40">
                  {item.source}
                  <ExternalLinkIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                </p>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
