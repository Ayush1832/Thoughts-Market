'use client'

import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react'

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
const ARCS: [number, number][] = [[0, 2], [0, 3], [1, 3], [6, 3]]

const EARTH_TEXTURE_SRCS = [
  '/earth.jpg',
  'https://unpkg.com/three-globe/example/img/earth-night.jpg',
]
const TEX_W = 1024
const TEX_H = 512

// Shared texture load across every globe instance (load once).
let texCache: Uint8ClampedArray | null = null
let texPromise: Promise<Uint8ClampedArray | null> | null = null

function loadEarthTexture(): Promise<Uint8ClampedArray | null> {
  if (texCache) return Promise.resolve(texCache)
  if (texPromise) return texPromise
  texPromise = new Promise((resolve) => {
    let i = 0
    const tryNext = () => {
      if (i >= EARTH_TEXTURE_SRCS.length) { resolve(null); return }
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
          texCache = octx.getImageData(0, 0, TEX_W, TEX_H).data
          resolve(texCache)
        }
        catch { tryNext() }
      }
      img.onerror = tryNext
      img.src = src
    }
    tryNext()
  })
  return texPromise
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export interface GlobeHotspot {
  lat: number
  lon: number
  r: number
  g: number
  b: number
  size: number
  label?: string
}

interface GlobeCanvasProps {
  size?: number
  showGrid?: boolean
  showHotspots?: boolean
  showArcs?: boolean
  showLabels?: boolean
  /** Override the default decorative hotspots with labeled, clickable data points. */
  hotspots?: GlobeHotspot[]
  /** Called with the hotspot index when a hotspot dot/label is tapped. */
  onHotspotClick?: (index: number) => void
  className?: string
}

export default function GlobeCanvas({
  size = 220,
  showGrid = true,
  showHotspots = true,
  showArcs = true,
  showLabels = false,
  hotspots,
  onHotspotClick,
  className,
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // live values read inside the animation loop without restarting it
  const flags = useRef({ showGrid, showHotspots, showArcs, showLabels })
  flags.current = { showGrid, showHotspots, showArcs, showLabels }
  const hotspotsRef = useRef(hotspots)
  hotspotsRef.current = hotspots
  const onClickRef = useRef(onHotspotClick)
  onClickRef.current = onHotspotClick
  // current on-screen hotspot positions for hit-testing taps
  const positionsRef = useRef<{ x: number, y: number, i: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const W = size, H = size, cx = size / 2, cy = size / 2, R = size * 0.445
    const INV_2PI = 1 / (2 * Math.PI)
    const INV_PI = 1 / Math.PI

    let sx = -0.82, sy = 0.18, sz = -0.54
    { const l = Math.hypot(sx, sy, sz); sx /= l; sy /= l; sz /= l }

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

    let tex: Uint8ClampedArray | null = texCache
    let rot = 0, phase = 0, raf = 0, alive = true

    if (!tex) void loadEarthTexture().then((t) => { if (alive) tex = t })

    function projectGeo(latDeg: number, lonDeg: number) {
      const lat = (latDeg * Math.PI) / 180
      const theta = (lonDeg * Math.PI) / 180 - rot
      const cosLat = Math.cos(lat)
      return {
        x: cx + R * cosLat * Math.sin(theta),
        y: cy - R * Math.sin(lat),
        z: cosLat * Math.cos(theta),
      }
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
        const lum = (r + g + b) / 3
        if (lum < 28) {
          // dark land/ocean — deep navy night side
          r = r * 0.45 + 3; g = g * 0.55 + 9; b = b * 0.7 + 26
        }
        else {
          // city lights — boost & warm them so they pop like the reference
          const boost = 1.35 + smoothstep(28, 130, lum) * 0.7
          r = Math.min(255, r * boost + 22)
          g = Math.min(255, g * boost * 0.9 + 12)
          b = Math.min(255, b * boost * 0.55 + 4)
        }
        const limb = limbArr[i]
        data[off] = r * limb
        data[off + 1] = g * limb
        data[off + 2] = b * limb
        data[off + 3] = 255
      }
    }

    function drawFallbackSphere() {
      const grad = ctx.createRadialGradient(cx - R * 0.27, cy - R * 0.3, R * 0.05, cx, cy, R)
      grad.addColorStop(0, '#13284a')
      grad.addColorStop(0.6, '#08152b')
      grad.addColorStop(1, '#030a18')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    function drawGrid() {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2)
      ctx.clip()
      for (let lat = -75; lat <= 75; lat += 15) {
        const la = (lat * Math.PI) / 180
        const ey = cy - R * Math.sin(la)
        const erx = R * Math.cos(la)
        if (erx < 1) continue
        ctx.beginPath()
        ctx.ellipse(cx, ey, erx, erx * 0.055, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0,200,255,0.10)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      for (let lon = 0; lon < 180; lon += 15) {
        const lo = ((lon + rot) * Math.PI) / 180
        const erx = Math.abs(R * Math.sin(lo))
        if (erx < 1) continue
        ctx.beginPath()
        ctx.ellipse(cx, cy, erx, R, 0, 0, Math.PI * 2)
        ctx.strokeStyle = Math.cos(lo) >= 0 ? 'rgba(0,200,255,0.10)' : 'rgba(0,200,255,0.03)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      ctx.restore()
    }

    function drawAtmosphere() {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const bloom = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.4)
      bloom.addColorStop(0, 'rgba(30,150,230,0.20)')
      bloom.addColorStop(0.5, 'rgba(0,120,210,0.10)')
      bloom.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2); ctx.fillStyle = bloom; ctx.fill()

      const ring = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R)
      ring.addColorStop(0, 'rgba(0,0,0,0)')
      ring.addColorStop(0.8, 'rgba(40,180,255,0.06)')
      ring.addColorStop(0.94, 'rgba(90,210,255,0.28)')
      ring.addColorStop(1, 'rgba(150,235,255,0.6)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = ring; ctx.fill()

      const dawn = ctx.createRadialGradient(
        cx + sx * R * 0.9, cy - sy * R * 0.9, 0,
        cx + sx * R * 0.9, cy - sy * R * 0.9, R * 0.95,
      )
      dawn.addColorStop(0, 'rgba(150,225,255,0.30)')
      dawn.addColorStop(0.6, 'rgba(60,160,255,0.08)')
      dawn.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = dawn; ctx.fill()
      ctx.restore()
    }

    // Flowing topographic-style contour lines wrapping the globe (the signature
    // look of the reference). Cheap: a handful of sine-perturbed latitude bands.
    function drawContours() {
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, R - 0.5, 0, Math.PI * 2); ctx.clip()
      ctx.globalCompositeOperation = 'lighter'
      const lines = 11
      for (let k = 0; k < lines; k++) {
        const baseLat = -72 + (k * 144) / (lines - 1)
        const amp = 5 + (k % 3) * 4
        const freq = 2 + (k % 3)
        const off = phase * 0.18 + k * 1.3
        let started = false
        ctx.beginPath()
        for (let lon = -180; lon <= 180; lon += 4) {
          const lat = baseLat + amp * Math.sin((lon * Math.PI) / 180 * freq + off)
          const p = projectGeo(lat, lon)
          if (p.z < 0.04) { started = false; continue }
          if (!started) { ctx.moveTo(p.x, p.y); started = true }
          else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = `rgba(94,210,255,${0.045 + 0.03 * (k % 2)})`
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
      ctx.restore()
    }

    // Bright focal "spotlight" glow over the lead hotspot, like the reference.
    function drawFocalGlow() {
      const custom = hotspotsRef.current
      const lead = custom && custom.length ? [custom[0].lat, custom[0].lon] : [SPOTS[0][0], SPOTS[0][1]]
      const p = projectGeo(lead[0], lead[1])
      if (p.z < 0.1) return
      const v = Math.min(1, p.z)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 0.55)
      halo.addColorStop(0, `rgba(190,238,255,${0.42 * v})`)
      halo.addColorStop(0.22, `rgba(110,195,255,${0.16 * v})`)
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.55, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill()
      const core = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 0.07)
      core.addColorStop(0, `rgba(255,255,255,${0.95 * v})`)
      core.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.07, 0, Math.PI * 2); ctx.fillStyle = core; ctx.fill()
      const ringR = R * (0.12 + 0.03 * (0.5 + 0.5 * Math.sin(phase)))
      ctx.beginPath(); ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(180,232,255,${0.4 * v})`; ctx.lineWidth = 1; ctx.stroke()
      ctx.restore()
    }

    function drawArcsAndHotspots() {
      // active hotspots: caller-provided (labeled, clickable) or the default decorative set
      const custom = hotspotsRef.current
      const spots: ReadonlyArray<readonly [number, number, number, number, number, number]>
        = custom && custom.length
          ? custom.map(h => [h.lat, h.lon, h.r, h.g, h.b, h.size] as const)
          : SPOTS
      const labels = custom && custom.length ? custom.map(h => h.label) : []
      const arcs = custom && custom.length
        ? ARCS.filter(([a, b]) => a < spots.length && b < spots.length)
        : ARCS

      if (flags.current.showArcs) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (const [ia, ib] of arcs) {
          const a = spots[ia], b = spots[ib]
          // build the bowed (lifted) arc path once, reuse for glow + core passes
          const pts: { x: number, y: number }[] = []
          for (let t = 0; t <= 48; t++) {
            const f = t / 48
            const p = projectGeo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
            if (p.z < -0.1) continue
            // push the midpoint outward from the globe center → arc bows off the surface
            const dx = p.x - cx, dy = p.y - cy
            const dist = Math.hypot(dx, dy) || 1
            const lift = Math.sin(f * Math.PI) * R * 0.22
            pts.push({ x: p.x + (dx / dist) * lift, y: p.y + (dy / dist) * lift })
          }
          if (pts.length < 2) continue
          const trace = () => {
            ctx.beginPath()
            ctx.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
          }
          // soft glow
          trace(); ctx.strokeStyle = 'rgba(0,210,255,0.10)'; ctx.lineWidth = 3; ctx.stroke()
          // bright core
          trace(); ctx.strokeStyle = 'rgba(120,235,255,0.55)'; ctx.lineWidth = 1; ctx.stroke()
          // travelling pulse along the arc
          const head = pts[Math.floor((0.5 + 0.5 * Math.sin(phase * 0.9)) * (pts.length - 1))]
          const pg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 4)
          pg.addColorStop(0, 'rgba(220,250,255,0.9)')
          pg.addColorStop(1, 'rgba(220,250,255,0)')
          ctx.beginPath(); ctx.arc(head.x, head.y, 4, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill()
        }
        ctx.restore()
      }

      positionsRef.current = []
      if (!flags.current.showHotspots) return
      const scale = R / 98
      for (let i = 0; i < spots.length; i++) {
        const [lat, lon, r, g, b, baseSz] = spots[i]
        const sz2 = baseSz * scale
        const p = projectGeo(lat, lon)
        const vis = Math.max(0, p.z)
        if (vis < 0.05) continue
        // record front-facing position for tap hit-testing
        if (vis > 0.12) positionsRef.current.push({ x: p.x, y: p.y, i })
        const pp = 0.5 + 0.5 * Math.sin(phase + i * 0.9)

        const gr = sz2 + 7 * pp * scale
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr + 5)
        glow.addColorStop(0, `rgba(${r},${g},${b},${vis * 0.32})`)
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath(); ctx.arc(p.x, p.y, gr + 5, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill()

        ctx.beginPath(); ctx.arc(p.x, p.y, sz2 + 10 * pp * scale, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${r},${g},${b},${vis * (1 - pp) * 0.5})`
        ctx.lineWidth = 0.9; ctx.stroke()

        ctx.beginPath(); ctx.arc(p.x, p.y, sz2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${vis})`; ctx.fill()

        ctx.beginPath(); ctx.arc(p.x, p.y, sz2 * 0.36, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${vis * 0.9})`; ctx.fill()

        // ── label / heading next to the hotspot ──
        const label = labels[i]
        if (flags.current.showLabels && label && vis > 0.32) {
          const fontPx = Math.max(9, Math.round(R * 0.072))
          ctx.font = `600 ${fontPx}px Inter, system-ui, sans-serif`
          ctx.textBaseline = 'middle'
          const tw = ctx.measureText(label).width
          const padX = fontPx * 0.5
          const lh = fontPx + 8
          const gap = sz2 + 8
          const onRightHalf = p.x > cx
          const boxW = tw + padX * 2
          const lx = onRightHalf ? p.x - gap - boxW : p.x + gap
          const ly = p.y - lh / 2
          const a = Math.min(1, (vis - 0.32) / 0.25)
          // connector
          ctx.beginPath()
          ctx.moveTo(onRightHalf ? p.x - sz2 : p.x + sz2, p.y)
          ctx.lineTo(onRightHalf ? lx + boxW : lx, p.y)
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.5 * a})`
          ctx.lineWidth = 1
          ctx.stroke()
          // pill
          ctx.beginPath()
          ctx.roundRect(lx, ly, boxW, lh, 7)
          ctx.fillStyle = `rgba(8,10,18,${0.72 * a})`
          ctx.fill()
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.45 * a})`
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.fillStyle = `rgba(255,255,255,${a})`
          ctx.fillText(label, lx + padX, p.y + 0.5)
        }
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H)
      if (tex) { drawEarthPixels(); ctx.putImageData(image, 0, 0) }
      else { drawFallbackSphere() }
      if (flags.current.showGrid) drawGrid()
      drawContours()
      drawAtmosphere()
      drawFocalGlow()
      drawArcsAndHotspots()
      rot += 0.0017
      phase += 0.032
      raf = requestAnimationFrame(frame)
    }

    frame()
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [size])

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const cb = onClickRef.current
    if (!cb) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const hitR2 = (canvas.width * 0.09) ** 2 // generous tap radius
    let best = -1
    let bestD = hitR2
    for (const p of positionsRef.current) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < bestD) { bestD = d; best = p.i }
    }
    if (best >= 0) {
      e.preventDefault()
      e.stopPropagation()
      cb(best)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      onPointerDown={onHotspotClick ? handlePointerDown : undefined}
      style={onHotspotClick ? { cursor: 'pointer' } : undefined}
    />
  )
}
