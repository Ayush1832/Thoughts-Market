'use client'

import AppLink from '@/components/AppLink'
import GlobeCanvas from '@/components/GlobeCanvas'

// ── Threat list data ──────────────────────────────────────────────────────────

const THREATS = [
  {
    dot: 'bg-[#ff4d6d] shadow-[0_0_7px_rgba(255,77,109,0.55)]',
    ring: 'border-[#ff4d6d]',
    name: 'Taiwan tension',
    pct: '↑ 12%',
    pctColor: 'text-[#ff6b7a]',
  },
  {
    dot: 'bg-[#ffbe3d] shadow-[0_0_7px_rgba(255,190,61,0.55)]',
    ring: 'border-[#ffbe3d]',
    name: 'Oil volatility',
    pct: '↑ 8%',
    pctColor: 'text-[#ffbe3d]',
  },
  {
    dot: 'bg-[#a855f7] shadow-[0_0_7px_rgba(168,85,247,0.55)]',
    ring: 'border-[#a855f7]',
    name: 'AI market surge',
    pct: '↑ 18%',
    pctColor: 'text-[#c084fc]',
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function AtlasGlobe() {
  return (
    <div className="rounded-2xl border border-[rgba(0,210,255,0.14)] bg-[#0d1117] overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <span className="size-[7px] rounded-full shrink-0 bg-[#00d4ff] shadow-[0_0_8px_#00d4ff,0_0_20px_rgba(0,212,255,0.35)] animate-atlas-blink" />
          <span className="text-[10px] font-bold uppercase tracking-[1.8px] text-white/55">
            Atlas
            <span className="text-white/20 mx-1">·</span>
            Global Intel
          </span>
        </div>
        <AppLink href="/atlas" aria-label="Open Atlas" className="text-xs text-white/30 hover:text-white/70 transition-colors cursor-pointer">
          ↗
        </AppLink>
      </div>

      {/* ── Globe canvas (tap to open full Atlas) ── */}
      <AppLink href="/atlas" aria-label="Open Atlas Global Intelligence" className="block group">
        <div className="flex justify-center py-1 transition-transform duration-200 group-hover:scale-[1.03]">
          <GlobeCanvas size={220} className="block" />
        </div>
      </AppLink>

      {/* ── Stats row ── */}
      <div className="mx-4 mb-3 grid grid-cols-3 rounded-xl border border-[rgba(0,200,255,0.10)] bg-[rgba(0,195,255,0.04)] py-[10px] px-2 text-center">
        <div>
          <p className="text-lg font-bold leading-none text-red-400">
            72
            <span className="text-[11px] font-normal text-white/30">/100</span>
          </p>
          <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.7px] text-white/30">
            Global Risk
          </p>
        </div>
        <div className="border-x border-white/[0.07]">
          <p className="text-lg font-bold leading-none text-white">18</p>
          <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.7px] text-white/30">
            Live Events
          </p>
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-white">6</p>
          <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.7px] text-white/30">
            Hot Regions
          </p>
        </div>
      </div>

      {/* ── Threat list ── */}
      <div className="px-4 pb-1 divide-y divide-white/[0.05]">
        {THREATS.map(t => (
          <div key={t.name} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              {/* Dot + pulsing ring */}
              <span className={`relative size-2 rounded-full shrink-0 ${t.dot}`}>
                <span className={`absolute inset-[-3px] rounded-full border ${t.ring} animate-atlas-ring`} />
              </span>
              <span className="text-[12px] text-white/70">{t.name}</span>
            </div>
            <span className={`text-[12px] font-semibold ${t.pctColor}`}>{t.pct}</span>
          </div>
        ))}
      </div>

      {/* ── Open Atlas button ── */}
      <div className="p-4 pt-3">
        <AppLink
          href="/atlas"
          className="
            flex w-full items-center justify-center rounded-xl py-[10px] text-[13px] font-semibold cursor-pointer
            text-[#00d4ff]
            border border-[rgba(0,212,255,0.26)]
            bg-[rgba(0,212,255,0.08)]
            transition-all duration-200
            hover:bg-[rgba(0,212,255,0.16)]
            hover:border-[rgba(0,212,255,0.45)]
            hover:shadow-[0_0_24px_rgba(0,212,255,0.18)]
            hover:-translate-y-px
            active:translate-y-0
          "
        >
          Open Atlas →
        </AppLink>
      </div>

    </div>
  )
}
