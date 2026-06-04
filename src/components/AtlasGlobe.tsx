'use client'

import { useEffect, useRef } from 'react'

// ── Globe data ────────────────────────────────────────────────────────────────

// [lat, lon, r, g, b, dotSize]
const SPOTS: [number, number, number, number, number, number][] = [
  [ 25,  121, 255,  77, 109, 5.5], // Taiwan      — red
  [ 26,   50, 255, 190,  61, 4.5], // Middle East — gold
  [ 37, -100, 168,  85, 247, 4.5], // USA/AI      — purple
  [ 51,   10,   0, 210, 255, 3.5], // Europe      — cyan
  [ 35,  139,   0, 210, 255, 3.5], // Japan       — cyan
  [-23,  -46,   0, 210, 255, 3.0], // Brazil      — cyan
  [ 55,   37, 255, 190,  61, 3.0], // Russia      — gold
]

// Arc connections [spotIndexA, spotIndexB]
const ARCS: [number, number][] = [[0, 2], [0, 3], [1, 3], [6, 3]]

// Deterministic seeded night-earth city-light cloud (lat, lon, brightness)
// (no Math.random — identical every render, so no hydration mismatch)
function buildLand(): [number, number, number][] {
  const pts: [number, number, number][] = []
  const continents: [number, number, number, number, number][] = [
    [ 25,  70, -130,  -65, 320], // North America
    [-55,  12,  -82,  -34, 190], // South America
    [ 35,  72,  -12,   40, 230], // Europe
    [-35,  37,  -18,   52, 240], // Africa
    [  0,  77,   38,  148, 440], // Asia
    [-45, -10,  112,  154, 110], // Australia
    [ 60,  80, -180,  180, 120], // Arctic
  ]
  let s = 42
  const next = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  const rnd  = (a: number, b: number) => a + next() * (b - a)
  for (const [la, lb, loa, lob, n] of continents) {
    for (let i = 0; i < n; i++) {
      // Mostly faint glow with occasional bright "metropolis" sparks
      const roll = next()
      const brightness = roll > 0.9 ? 0.85 + next() * 0.15 : 0.22 + next() * 0.42
      pts.push([rnd(la, lb), rnd(loa, lob), brightness])
    }
  }
  return pts
}

const LAND = buildLand()

// ── Threat list data ──────────────────────────────────────────────────────────

const THREATS = [
  {
    dot:  'bg-[#ff4d6d] shadow-[0_0_7px_rgba(255,77,109,0.55)]',
    ring: 'border-[#ff4d6d]',
    name: 'Taiwan tension',
    pct:  '↑ 12%',
    pctColor: 'text-[#ff6b7a]',
  },
  {
    dot:  'bg-[#ffbe3d] shadow-[0_0_7px_rgba(255,190,61,0.55)]',
    ring: 'border-[#ffbe3d]',
    name: 'Oil volatility',
    pct:  '↑ 8%',
    pctColor: 'text-[#ffbe3d]',
  },
  {
    dot:  'bg-[#a855f7] shadow-[0_0_7px_rgba(168,85,247,0.55)]',
    ring: 'border-[#a855f7]',
    name: 'AI market surge',
    pct:  '↑ 18%',
    pctColor: 'text-[#c084fc]',
  },
] as const

// ── Canvas drawing helpers ────────────────────────────────────────────────────

function project(lat: number, lon: number, rot: number, R: number, cx: number, cy: number) {
  const la = (lat * Math.PI) / 180
  const lo = ((lon + rot) * Math.PI) / 180
  return {
    x: cx + R * Math.cos(la) * Math.sin(lo),
    y: cy - R * Math.sin(la),
    z:      R * Math.cos(la) * Math.cos(lo),
  }
}

function arcPoints(
  a: [number, number],
  b: [number, number],
  steps: number,
  rot: number,
  R: number,
  cx: number,
  cy: number,
) {
  return Array.from({ length: steps + 1 }, (_, t) => {
    const f = t / steps
    return project(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, rot, R, cx, cy)
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AtlasGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const W = 200, H = 200, cx = 100, cy = 100, R = 82
    let rot = 0, phase = 0, raf = 0

    function frame() {
      ctx.clearRect(0, 0, W, H)

      // Atmosphere bloom — teal glow radiating beyond the disk
      const halo = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.38)
      halo.addColorStop(0,    'rgba(22,165,235,0.16)')
      halo.addColorStop(0.45, 'rgba(0,150,220,0.10)')
      halo.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.38, 0, Math.PI * 2)
      ctx.fillStyle = halo
      ctx.fill()

      // Night-earth ocean disk — near-black centre, faint blue scattering at the limb
      const base = ctx.createRadialGradient(cx - 16, cy - 20, R * 0.08, cx, cy, R)
      base.addColorStop(0,    '#0a1a33')
      base.addColorStop(0.55, '#06101f')
      base.addColorStop(0.85, '#05132b')
      base.addColorStop(1,    '#0c3461')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = base
      ctx.fill()

      // Clip everything below to the globe circle
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.clip()

      // Latitude grid lines (tiny-height ellipses for depth feel)
      for (let lat = -75; lat <= 75; lat += 15) {
        const la  = (lat * Math.PI) / 180
        const ey  = cy - R * Math.sin(la)
        const erx = R * Math.cos(la)
        if (erx < 1) continue
        ctx.beginPath()
        ctx.ellipse(cx, ey, erx, erx * 0.055, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0,200,255,0.06)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Longitude grid lines (full ellipses; back half dimmed)
      for (let lon = 0; lon < 180; lon += 15) {
        const lo  = ((lon + rot) * Math.PI) / 180
        const erx = Math.abs(R * Math.sin(lo))
        if (erx < 1) continue
        ctx.beginPath()
        ctx.ellipse(cx, cy, erx, R, 0, 0, Math.PI * 2)
        ctx.strokeStyle = Math.cos(lo) >= 0
          ? 'rgba(0,200,255,0.055)'
          : 'rgba(0,200,255,0.015)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // City-light clusters — teal points, bright metropolises bloom
      for (const [lat, lon, brightness] of LAND) {
        const p = project(lat, lon, rot, R, cx, cy)
        if (p.z < 0) continue
        const edgeFade = Math.min(1, (p.z / R) * 1.5) // fade toward the limb for sphere depth
        const a = edgeFade * brightness
        if (a < 0.04) continue
        const isCity = brightness > 0.82

        // soft bloom around the brightest cities
        if (isCity) {
          const bloom = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 3.4)
          bloom.addColorStop(0, `rgba(150,240,255,${a * 0.55})`)
          bloom.addColorStop(1, 'rgba(150,240,255,0)')
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2)
          ctx.fillStyle = bloom
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, isCity ? 1.2 : 0.8, 0, Math.PI * 2)
        ctx.fillStyle = isCity
          ? `rgba(195,247,255,${a})`
          : `rgba(40,200,235,${a * 0.85})`
        ctx.fill()
      }

      // Dashed arc connections between hotspots
      ctx.setLineDash([3, 4])
      for (const [ia, ib] of ARCS) {
        const pts = arcPoints(
          [SPOTS[ia][0], SPOTS[ia][1]],
          [SPOTS[ib][0], SPOTS[ib][1]],
          40, rot, R, cx, cy,
        )
        let started = false
        ctx.beginPath()
        for (const p of pts) {
          if (p.z < -R * 0.15) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true }
          else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = 'rgba(0,210,255,0.13)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
      ctx.setLineDash([])

      ctx.restore() // end clip

      // Faint full atmosphere ring all around the limb
      ctx.beginPath()
      ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(40,190,255,0.18)'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Globe rim gradient — bright teal edge, directional for 3D feel
      const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
      rim.addColorStop(0,   'rgba(80,235,255,0.7)')
      rim.addColorStop(0.4, 'rgba(0,160,255,0.28)')
      rim.addColorStop(1,   'rgba(0,60,170,0.08)')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = rim
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Specular highlight (top-left)
      const spec = ctx.createRadialGradient(cx - 30, cy - 30, 0, cx - 6, cy - 6, R * 0.7)
      spec.addColorStop(0,    'rgba(180,235,255,0.13)')
      spec.addColorStop(0.45, 'rgba(80,170,255,0.04)')
      spec.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = spec
      ctx.fill()

      // Hotspot dots with glow + pulsing ring
      for (let i = 0; i < SPOTS.length; i++) {
        const [lat, lon, r, g, b, sz] = SPOTS[i]
        const p   = project(lat, lon, rot, R, cx, cy)
        const vis = Math.max(0, p.z / R)
        if (vis < 0.04) continue

        // Each spot gets a staggered pulse phase
        const pp = 0.5 + 0.5 * Math.sin(phase + i * 0.9)

        // Soft glow halo
        const gr   = sz + 7 * pp
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr + 5)
        glow.addColorStop(0, `rgba(${r},${g},${b},${vis * 0.30})`)
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, gr + 5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Expanding ring
        ctx.beginPath()
        ctx.arc(p.x, p.y, sz + 10 * pp, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r},${g},${b},${vis * (1 - pp) * 0.50})`
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Solid core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${vis})`
        ctx.fill()

        // Bright white centre spark
        ctx.beginPath()
        ctx.arc(p.x, p.y, sz * 0.36, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${vis * 0.90})`
        ctx.fill()
      }

      rot   += 0.16
      phase += 0.032
      raf = requestAnimationFrame(frame)
    }

    frame()
    return () => cancelAnimationFrame(raf)
  }, [])

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
        <button className="text-xs text-white/30 hover:text-white/70 transition-colors cursor-pointer">
          ↗
        </button>
      </div>

      {/* ── Globe canvas ── */}
      <div className="flex justify-center py-1">
        <canvas ref={canvasRef} width={200} height={200} className="block" />
      </div>

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
        <button className="
          w-full rounded-xl py-[10px] text-[13px] font-semibold cursor-pointer
          text-[#00d4ff]
          border border-[rgba(0,212,255,0.26)]
          bg-[rgba(0,212,255,0.08)]
          transition-all duration-200
          hover:bg-[rgba(0,212,255,0.16)]
          hover:border-[rgba(0,212,255,0.45)]
          hover:shadow-[0_0_24px_rgba(0,212,255,0.18)]
          hover:-translate-y-px
          active:translate-y-0
        ">
          Open Atlas →
        </button>
      </div>

    </div>
  )
}
