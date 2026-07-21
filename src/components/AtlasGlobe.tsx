'use client'

import { useState } from 'react'
import AppLink from '@/components/AppLink'
import GlobeCanvas from '@/components/GlobeCanvas'

// ── Dashboard data points, anchored to real-world locations ────────────────────
// Each item is rendered as a labeled, tappable hotspot on the globe AND in the
// list below. Tapping a hotspot (or list row) opens its detail popup.

interface AtlasPoint {
  lat: number
  lon: number
  r: number
  g: number
  b: number
  size: number
  name: string
  region: string
  pct: string
  detail: string
}

const POINTS: AtlasPoint[] = [
  { lat: 25, lon: 121, r: 255, g: 77, b: 109, size: 5.5, name: 'Taiwan tension', region: 'East Asia · Taiwan Strait', pct: '↑ 12%', detail: 'Cross-strait military activity elevated; regional risk premium rising.' },
  { lat: 26, lon: 56, r: 255, g: 190, b: 61, size: 4.8, name: 'Oil volatility', region: 'Middle East · Strait of Hormuz', pct: '↑ 8%', detail: 'Shipping-lane tension lifting crude; energy markets watching closely.' },
  { lat: 37, lon: -100, r: 168, g: 85, b: 247, size: 4.8, name: 'AI market surge', region: 'North America', pct: '↑ 18%', detail: 'Tech sentiment +18% on AI momentum; capital rotating into the sector.' },
]

const HOTSPOTS = POINTS.map(p => ({
  lat: p.lat,
  lon: p.lon,
  r: p.r,
  g: p.g,
  b: p.b,
  size: p.size,
  label: p.name,
}))

function rgb(p: AtlasPoint, a = 1) {
  return `rgba(${p.r},${p.g},${p.b},${a})`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AtlasGlobe() {
  const [selected, setSelected] = useState<number | null>(null)
  const active = selected != null ? POINTS[selected] : null

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card dark:border-[rgba(0,210,255,0.14)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <span className="
            size-[7px] shrink-0 animate-atlas-blink rounded-full bg-[#00d4ff]
            shadow-[0_0_8px_#00d4ff,0_0_20px_rgba(0,212,255,0.35)]
          "
          />
          <span className="text-2xs font-bold tracking-[1.8px] text-muted-foreground uppercase">
            Atlas
            <span className="mx-1 text-muted-foreground/50">·</span>
            Global Intel
          </span>
        </div>
        <AppLink
          href="/atlas"
          aria-label="Open Atlas"
          className="cursor-pointer text-xs text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          ↗
        </AppLink>
      </div>

      {/* ── Globe canvas: labeled, tappable hotspots ── */}
      <div className="relative flex justify-center py-1">
        <GlobeCanvas
          size={220}
          className="block"
          showLabels
          hotspots={HOTSPOTS}
          onHotspotClick={i => setSelected(prev => (prev === i ? null : i))}
        />

        {/* Detail popup for the tapped hotspot */}
        {active && (
          <div
            className="
              absolute inset-x-3 bottom-1 z-10 animate-tm-pop rounded-xl border bg-popover/95 p-3 backdrop-blur-md
            "
            style={{ borderColor: rgb(active, 0.4), boxShadow: `0 0 24px ${rgb(active, 0.2)}` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: rgb(active), boxShadow: `0 0 8px ${rgb(active, 0.7)}` }} />
                <div>
                  <p className="text-[13px] leading-tight font-semibold text-foreground">{active.name}</p>
                  <p className="text-2xs text-muted-foreground">{active.region}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold" style={{ color: rgb(active) }}>{active.pct}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="
                    flex size-5 items-center justify-center rounded-md text-muted-foreground
                    hover:bg-muted hover:text-foreground
                  "
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{active.detail}</p>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="
        mx-4 mb-3 grid grid-cols-3 rounded-xl border border-border bg-[rgba(0,195,255,0.04)] px-2 py-[10px] text-center
      "
      >
        <div>
          <p className="text-lg leading-none font-bold text-red-500 dark:text-red-400">
            72
            <span className="text-[11px] font-normal text-muted-foreground/60">/100</span>
          </p>
          <p className="mt-1 text-[8.5px] font-medium tracking-[0.7px] text-muted-foreground/60 uppercase">
            Global Risk
          </p>
        </div>
        <div className="border-x border-border">
          <p className="text-lg leading-none font-bold text-foreground">18</p>
          <p className="mt-1 text-[8.5px] font-medium tracking-[0.7px] text-muted-foreground/60 uppercase">
            Live Events
          </p>
        </div>
        <div>
          <p className="text-lg leading-none font-bold text-foreground">6</p>
          <p className="mt-1 text-[8.5px] font-medium tracking-[0.7px] text-muted-foreground/60 uppercase">
            Hot Regions
          </p>
        </div>
      </div>

      {/* ── Threat list (tap a row to focus its hotspot) ── */}
      <div className="divide-y divide-border px-4 pb-1">
        {POINTS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setSelected(prev => (prev === i ? null : i))}
            className={`flex w-full items-center justify-between rounded-lg py-2 transition-colors ${selected === i
              ? `bg-muted`
              : `hover:bg-muted/60`}`}
          >
            <div className="flex items-center gap-2.5">
              <span className="relative size-2 shrink-0 rounded-full" style={{ background: rgb(p), boxShadow: `0 0 7px ${rgb(p, 0.55)}` }}>
                <span className="absolute inset-[-3px] animate-atlas-ring rounded-full border" style={{ borderColor: rgb(p) }} />
              </span>
              <span className="text-[12px] text-foreground/70">{p.name}</span>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: rgb(p) }}>{p.pct}</span>
          </button>
        ))}
      </div>

      {/* ── Open Atlas button ── */}
      <div className="p-4 pt-3">
        <AppLink
          href="/atlas"
          className="
            flex w-full cursor-pointer items-center justify-center rounded-xl border border-[rgba(0,212,255,0.26)]
            bg-[rgba(0,212,255,0.08)] py-[10px] text-[13px] font-semibold text-[#00d4ff] transition-all duration-200
            hover:-translate-y-px hover:border-[rgba(0,212,255,0.45)] hover:bg-[rgba(0,212,255,0.16)]
            hover:shadow-[0_0_24px_rgba(0,212,255,0.18)]
            active:translate-y-0
          "
        >
          Open Atlas →
        </AppLink>
      </div>

    </div>
  )
}
