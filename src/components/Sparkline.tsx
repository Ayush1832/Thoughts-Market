interface SparklineProps {
  /** Deterministic seed so server & client render identically (no hydration mismatch) */
  seed: string
  trend: 'up' | 'down'
  className?: string
  width?: number
  height?: number
}

// Deterministic pseudo-random based on a string seed — stable across server/client
function seededValues(seed: string, count: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) & 0x7FFFFFFF
  }
  const values: number[] = []
  let prev = 50
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) & 0x7FFFFFFF
    const delta = ((h % 100) / 100 - 0.5) * 22
    prev = Math.max(10, Math.min(90, prev + delta))
    values.push(prev)
  }
  return values
}

export default function Sparkline({ seed, trend, className, width = 120, height = 40 }: SparklineProps) {
  const points = seededValues(seed, 24)
  // Bias the overall slope to match trend
  const biased = points.map((v, i) => {
    const slope = (i / points.length) * (trend === 'up' ? 18 : -18)
    return Math.max(8, Math.min(92, v + slope - (trend === 'up' ? 9 : -9)))
  })

  const max = Math.max(...biased)
  const min = Math.min(...biased)
  const range = max - min || 1
  const stepX = width / (biased.length - 1)

  const linePoints = biased
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const areaPath = `M0,${height} L${linePoints.split(' ').join(' L')} L${width},${height} Z`

  const color = trend === 'up' ? 'oklch(0.72 0.18 155)' : 'oklch(0.65 0.21 18)'
  const gradId = `spark-${trend}-${seed.slice(0, 6).replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
