'use client'

import { useEffect, useRef } from 'react'

const SPOTS: [number, number, number, number, number, number][] = [
  [ 25,  121, 255,  77, 109, 5.5], // Taiwan — red
  [ 26,   50, 255, 190,  61, 4.5], // Middle East — gold
  [ 37, -100, 168,  85, 247, 4.5], // USA/AI — purple
  [ 51,   10,   0, 210, 255, 3.5], // Europe — cyan
  [ 35,  139,   0, 210, 255, 3.5], // Japan — cyan
  [-23,  -46,   0, 210, 255, 3.0], // Brazil — cyan
  [ 55,   37, 255, 190,  61, 3.0], // Russia — gold
]

const ARCS: [number, number][] = [[0, 2], [0, 3], [1, 3], [6, 3]]

const LAND_SEEDS: [number, number, number, number, number][] = [
  [25, 70, -130, -65, 160],
  [-55, 12,  -82, -34,  95],
  [35, 72,  -12,  40,  90],
  [-35, 37,  -18,  52, 120],
  [  0, 77,   38, 148, 220],
  [-45,-10,  112, 154,  55],
  [ 60, 80, -180, 180,  55],
]

function buildLand(seed: number) {
  const pts: [number, number][] = []
  let s = seed
  const rnd = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  const r = (a: number, b: number) => a + rnd() * (b - a)
  for (const [la, lb, loa, lob, n] of LAND_SEEDS)
    for (let i = 0; i < n; i++) pts.push([r(la, lb), r(loa, lob)])
  return pts
}

const LAND = buildLand(42)

export default function AtlasGlobeCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = 200, H = 200, cx = 100, cy = 100, R = 82

    let rot = 0, phase = 0, raf = 0

    function proj(lat: number, lon: number) {
      const la = (lat * Math.PI) / 180
      const lo = ((lon + rot) * Math.PI) / 180
      return {
        x: cx + R * Math.cos(la) * Math.sin(lo),
        y: cy - R * Math.sin(la),
        z:      R * Math.cos(la) * Math.cos(lo),
      }
    }

    function arcPoints(p1: [number, number], p2: [number, number], steps: number) {
      return Array.from({ length: steps + 1 }, (_, t) => {
        const f = t / steps
        return proj(p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f)
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Atmosphere
      const halo = ctx.createRadialGradient(cx, cy, R * 0.88, cx, cy, R * 1.24)
      halo.addColorStop(0, 'rgba(0,180,255,0.08)')
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2)
      ctx.fillStyle = halo; ctx.fill()

      // Globe base
      const base = ctx.createRadialGradient(cx - 24, cy - 24, 0, cx + 8, cy + 8, R * 1.1)
      base.addColorStop(0,   '#11264a')
      base.addColorStop(0.4, '#070f1e')
      base.addColorStop(1,   '#020810')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = base; ctx.fill()

      // Clip
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2); ctx.clip()

      // Latitude lines
      for (let lat = -75; lat <= 75; lat += 15) {
        const la = (lat * Math.PI) / 180
        const ey = cy - R * Math.sin(la)
        const erx = R * Math.cos(la)
        if (erx < 1) continue
        ctx.beginPath()
        ctx.ellipse(cx, ey, erx, erx * 0.055, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0,200,255,0.09)'; ctx.lineWidth = 0.55; ctx.stroke()
      }

      // Longitude lines
      for (let lon = 0; lon < 180; lon += 15) {
        const lo = ((lon + rot) * Math.PI) / 180
        const erx = Math.abs(R * Math.sin(lo))
        if (erx < 1) continue
        ctx.beginPath()
        ctx.ellipse(cx, cy, erx, R, 0, 0, Math.PI * 2)
        ctx.strokeStyle = Math.cos(lo) >= 0 ? 'rgba(0,200,255,0.08)' : 'rgba(0,200,255,0.02)'
        ctx.lineWidth = 0.55; ctx.stroke()
      }

      // Continent dots
      for (const [lat, lon] of LAND) {
        const p = proj(lat, lon)
        if (p.z < 0) continue
        const a = (p.z / R) * 0.5
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.05, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(30,190,255,${a * 0.52})`; ctx.fill()
      }

      // Arc connections
      ctx.setLineDash([3, 4])
      for (const [ia, ib] of ARCS) {
        const pts = arcPoints([SPOTS[ia][0], SPOTS[ia][1]], [SPOTS[ib][0], SPOTS[ib][1]], 40)
        let started = false
        ctx.beginPath()
        for (const p of pts) {
          if (p.z < -R * 0.15) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true } else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = 'rgba(0,210,255,0.13)'; ctx.lineWidth = 0.8; ctx.stroke()
      }
      ctx.setLineDash([])

      ctx.restore()

      // Rim
      const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
      rim.addColorStop(0,   'rgba(0,230,255,0.55)')
      rim.addColorStop(0.4, 'rgba(0,150,255,0.2)')
      rim.addColorStop(1,   'rgba(0,50,160,0.06)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = rim; ctx.lineWidth = 1.4; ctx.stroke()

      // Specular
      const spec = ctx.createRadialGradient(cx - 30, cy - 30, 0, cx - 6, cy - 6, R * 0.7)
      spec.addColorStop(0,    'rgba(180,235,255,0.13)')
      spec.addColorStop(0.45, 'rgba(80,170,255,0.04)')
      spec.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = spec; ctx.fill()

      // Hotspots
      for (let i = 0; i < SPOTS.length; i++) {
        const [lat, lon, r, g, b, sz] = SPOTS[i]
        const p = proj(lat, lon)
        const vis = Math.max(0, p.z / R)
        if (vis < 0.04) continue
        const pp = 0.5 + 0.5 * Math.sin(phase + i * 0.9)

        const gr = sz + 7 * pp
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr + 5)
        glow.addColorStop(0, `rgba(${r},${g},${b},${vis * 0.3})`)
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath(); ctx.arc(p.x, p.y, gr + 5, 0, Math.PI * 2)
        ctx.fillStyle = glow; ctx.fill()

        ctx.beginPath(); ctx.arc(p.x, p.y, sz + 10 * pp, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r},${g},${b},${vis * (1 - pp) * 0.5})`
        ctx.lineWidth = 0.8; ctx.stroke()

        ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${vis})`; ctx.fill()

        ctx.beginPath(); ctx.arc(p.x, p.y, sz * 0.36, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${vis * 0.92})`; ctx.fill()
      }

      rot   += 0.16
      phase += 0.032
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="rounded-2xl border border-border/50 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0d1628 0%, #080d1a 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <span
            className="size-[7px] rounded-full shrink-0"
            style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff, 0 0 20px rgba(0,212,255,.3)', animation: 'pulse 2s ease-in-out infinite' }}
          />
          <span className="text-[10px] font-bold tracking-[1.8px] uppercase text-muted-foreground/70">
            Atlas <span className="opacity-40">·</span> Global Intel
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/40">↗</span>
      </div>

      {/* Globe */}
      <div className="flex justify-center py-1">
        <canvas ref={canvasRef} width={200} height={200} />
      </div>

      {/* Stats row */}
      <div
        className="mx-4 mb-3 grid grid-cols-3 rounded-xl border text-center"
        style={{ borderColor: 'rgba(0,200,255,0.1)', background: 'rgba(0,195,255,0.04)', padding: '10px 6px' }}
      >
        {[
          { val: '72', sub: '/100', label: 'Global Risk', danger: true },
          { val: '18', sub: '',     label: 'Live Events', danger: false },
          { val: '6',  sub: '',     label: 'Hot Regions', danger: false },
        ].map((s, i) => (
          <div key={s.label} className="relative">
            {i > 0 && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8"
                style={{ background: 'rgba(255,255,255,0.07)' }} />
            )}
            <p className={`text-lg font-bold leading-none ${s.danger ? 'text-red-400' : 'text-foreground'}`}>
              {s.val}
              {s.sub && <span className="text-[11px] font-normal text-muted-foreground/50">{s.sub}</span>}
            </p>
            <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.7px] text-muted-foreground/35">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Threat list */}
      <div className="px-4 pb-1 space-y-0">
        {[
          { dot: '#ff4d6d', name: 'Taiwan tension',  pct: '↑ 12%', color: '#ff6b7a' },
          { dot: '#ffbe3d', name: 'Oil volatility',   pct: '↑ 8%',  color: '#ffbe3d' },
          { dot: '#a855f7', name: 'AI market surge',  pct: '↑ 18%', color: '#c084fc' },
        ].map(t => (
          <div key={t.name} className="flex items-center justify-between py-[7px] border-b border-white/[0.05] last:border-0">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full shrink-0" style={{ background: t.dot, boxShadow: `0 0 6px ${t.dot}88` }} />
              <span className="text-[12px] text-foreground/70">{t.name}</span>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: t.color }}>{t.pct}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      <div className="p-4 pt-3">
        <button
          className="w-full rounded-xl py-[10px] text-[13px] font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0"
          style={{
            background: 'linear-gradient(135deg,rgba(0,212,255,.11),rgba(0,100,255,.07))',
            border: '1px solid rgba(0,212,255,.26)',
            color: '#00d4ff',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(0,212,255,.18)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          Open Atlas →
        </button>
      </div>
    </div>
  )
}
