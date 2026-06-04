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

// Equirectangular Earth night-lights texture. Tries your own /earth.jpg first
// (drop a file in /public to override), then falls back to a CORS-enabled
// NASA "Black Marble" night map so it works out of the box.
const EARTH_TEXTURE_SRCS = [
  '/earth.jpg',
  'https://unpkg.com/three-globe/example/img/earth-night.jpg',
]
const TEX_W = 1024
const TEX_H = 512

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

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// Load the first texture that succeeds, downscaled into a readable pixel buffer.
function loadEarthTexture(): Promise<Uint8ClampedArray | null> {
  return new Promise((resolve) => {
    let i = 0
    const tryNext = () => {
      if (i >= EARTH_TEXTURE_SRCS.length) {
        resolve(null)
        return
      }
      const src = EARTH_TEXTURE_SRCS[i++]
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const off = document.createElement('canvas')
          off.width = TEX_W
          off.height = TEX_H
          const octx = off.getContext('2d', { willReadFrequently: true })!
          octx.drawImage(img, 0, 0, TEX_W, TEX_H)
          resolve(octx.getImageData(0, 0, TEX_W, TEX_H).data)
        }
        catch {
          tryNext() // tainted/CORS — try the next source
        }
      }
      img.onerror = tryNext
      img.src = src
    }
    tryNext()
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AtlasGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const W = 220, H = 220, cx = 110, cy = 110, R = 98
    const INV_2PI = 1 / (2 * Math.PI)
    const INV_PI = 1 / Math.PI

    // Fixed "sun" direction in view space (x right, y up, z toward viewer).
    // Behind-left → the disk is mostly night (city lights) with a lit left limb.
    let sx = -0.82, sy = 0.18, sz = -0.54
    {
      const l = Math.hypot(sx, sy, sz)
      sx /= l; sy /= l; sz /= l
    }

    // ── Precompute per-disk-pixel geometry (independent of rotation) ──
    const pxOff: number[] = []
    const latArr: number[] = []
    const baseLon: number[] = []
    const limbArr: number[] = []
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const nx = (px + 0.5 - cx) / R
        const ny = (py + 0.5 - cy) / R
        const d2 = nx * nx + ny * ny
        if (d2 > 1) continue
        const nz = Math.sqrt(1 - d2)
        const vy = -ny
        pxOff.push((py * W + px) * 4)
        latArr.push(Math.asin(Math.max(-1, Math.min(1, vy))))
        baseLon.push(Math.atan2(nx, nz))
        limbArr.push(0.42 + 0.58 * smoothstep(0, 0.42, nz))
      }
    }
    const N = pxOff.length

    const image = ctx.createImageData(W, H)
    const data = image.data

    let tex: Uint8ClampedArray | null = null
    let rot = 0, phase = 0, raf = 0, alive = true

    void loadEarthTexture().then((t) => {
      if (alive) tex = t
    })

    // Geographic → screen, consistent with the texture's longitude mapping.
    function projectGeo(latDeg: number, lonDeg: number) {
      const lat = (latDeg * Math.PI) / 180
      const theta = (lonDeg * Math.PI) / 180 - rot
      const cosLat = Math.cos(lat)
      const nx = cosLat * Math.sin(theta)
      const nz = cosLat * Math.cos(theta)
      const vy = Math.sin(lat)
      return { x: cx + R * nx, y: cy - R * vy, z: nz }
    }

    function drawEarthPixels() {
      for (let i = 0; i < N; i++) {
        const off = pxOff[i]
        const lat = latArr[i]
        let u = (baseLon[i] + rot) * INV_2PI + 0.5
        u -= Math.floor(u)
        let tx = (u * TEX_W) | 0
        if (tx >= TEX_W) tx = TEX_W - 1
        let v = 0.5 - lat * INV_PI
        if (v < 0) v = 0
        else if (v >= 1) v = 0.999999
        const ty = (v * TEX_H) | 0
        const ti = (ty * TEX_W + tx) * 4

        let r = tex![ti], g = tex![ti + 1], b = tex![ti + 2]
        // tint the dark oceans deep blue (night maps render them near-black)
        const lum = (r + g + b) / 3
        if (lum < 30) {
          r = r * 0.5 + 4
          g = g * 0.6 + 11
          b = b * 0.7 + 30
        }
        const limb = limbArr[i]
        data[off] = r * limb
        data[off + 1] = g * limb
        data[off + 2] = b * limb
        data[off + 3] = 255
      }
    }

    function drawFallbackSphere() {
      // shaded dark-blue sphere shown until the texture finishes loading
      const grad = ctx.createRadialGradient(cx - 26, cy - 30, R * 0.05, cx, cy, R)
      grad.addColorStop(0, '#13284a')
      grad.addColorStop(0.6, '#08152b')
      grad.addColorStop(1, '#030a18')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    function drawAtmosphere() {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      // outer bloom radiating beyond the disk
      const bloom = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.4)
      bloom.addColorStop(0, 'rgba(30,150,230,0.20)')
      bloom.addColorStop(0.5, 'rgba(0,120,210,0.10)')
      bloom.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2)
      ctx.fillStyle = bloom
      ctx.fill()

      // glowing limb ring (atmosphere scattering at the edge)
      const ring = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R)
      ring.addColorStop(0, 'rgba(0,0,0,0)')
      ring.addColorStop(0.82, 'rgba(40,180,255,0.05)')
      ring.addColorStop(1, 'rgba(120,225,255,0.45)')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = ring
      ctx.fill()

      // brighter "dawn" crescent on the sun-facing (left) limb
      const dawn = ctx.createRadialGradient(
        cx + sx * R * 0.9, cy - sy * R * 0.9, 0,
        cx + sx * R * 0.9, cy - sy * R * 0.9, R * 0.95,
      )
      dawn.addColorStop(0, 'rgba(150,225,255,0.30)')
      dawn.addColorStop(0.6, 'rgba(60,160,255,0.08)')
      dawn.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = dawn
      ctx.fill()

      ctx.restore()
    }

    function drawArcsAndHotspots() {
      // clip arcs to the globe so they hug the surface
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.setLineDash([3, 4])
      for (const [ia, ib] of ARCS) {
        const a = SPOTS[ia], b = SPOTS[ib]
        let started = false
        ctx.beginPath()
        for (let t = 0; t <= 40; t++) {
          const f = t / 40
          const p = projectGeo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
          if (p.z < -0.15) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true }
          else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = 'rgba(0,210,255,0.16)'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()

      // hotspots (glow + pulsing ring) — drawn over everything
      for (let i = 0; i < SPOTS.length; i++) {
        const [lat, lon, r, g, b, sz2] = SPOTS[i]
        const p = projectGeo(lat, lon)
        const vis = Math.max(0, p.z)
        if (vis < 0.05) continue
        const pp = 0.5 + 0.5 * Math.sin(phase + i * 0.9)

        const gr = sz2 + 7 * pp
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr + 5)
        glow.addColorStop(0, `rgba(${r},${g},${b},${vis * 0.32})`)
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, gr + 5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, sz2 + 10 * pp, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r},${g},${b},${vis * (1 - pp) * 0.5})`
        ctx.lineWidth = 0.8
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(p.x, p.y, sz2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${vis})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, sz2 * 0.36, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${vis * 0.9})`
        ctx.fill()
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H)

      if (tex) {
        drawEarthPixels()
        ctx.putImageData(image, 0, 0)
      }
      else {
        drawFallbackSphere()
      }

      drawAtmosphere()
      drawArcsAndHotspots()

      rot += 0.0017
      phase += 0.032
      raf = requestAnimationFrame(frame)
    }

    frame()
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
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
        <canvas ref={canvasRef} width={220} height={220} className="block" />
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
