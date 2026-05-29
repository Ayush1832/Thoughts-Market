import type { Event } from '@/types'
import { BrainCircuitIcon, ChevronRightIcon } from 'lucide-react'
import AppLink from '@/components/AppLink'
import { listHomeEventsPage } from '@/lib/home-events-page'

async function getLiveMarkets(): Promise<Event[]> {
  try {
    const result = await listHomeEventsPage({ tag: 'trending', mainTag: 'trending', locale: 'en', bookmarked: false, userId: '' })
    return (result.data ?? []).filter((e: Event) => e.status === 'active').slice(0, 4)
  }
  catch {
    return []
  }
}

function AiConfidenceCard() {
  const percentage = 74
  const insight = 'Crypto markets show 67% directional win rate this week.'

  return (
    <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BrainCircuitIcon className="size-4 text-primary" />
          AI CONFIDENCE
        </div>
        <span className="text-xl font-bold text-foreground">
          {percentage}
          %
        </span>
      </div>

      {/* Gradient progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, oklch(0.55 0.2 255), oklch(0.65 0.2 290))',
          }}
        />
      </div>

      <p className="text-xs/relaxed text-muted-foreground">{insight}</p>

      <AppLink
        href="/"
        className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        Explore takes
        <ChevronRightIcon className="size-3" />
      </AppLink>
    </div>
  )
}

function LiveMarketMini({ event }: { event: any }) {
  const market = event.markets?.[0]
  const chance = market?.outcomes?.[0]
    ? Math.round((Number(market.outcomes[0].token_id || 0) % 100 + 30) % 100)
    : null
  const isUp = chance !== null && chance >= 50
  const slug = event.slug ?? ''
  const initial = (event.title ?? 'M')[0].toUpperCase()

  const colors: Record<string, string> = {
    E: 'bg-blue-500',
    B: 'bg-orange-500',
    S: 'bg-purple-500',
    X: 'bg-slate-500',
    D: 'bg-yellow-500',
    M: 'bg-blue-400',
    H: 'bg-green-500',
  }
  const iconColor = colors[initial] ?? 'bg-primary'

  return (
    <AppLink
      href={`/event/${slug}`}
      className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50"
    >
      <div className={`size-8 shrink-0 rounded-full ${iconColor}
        flex items-center justify-center text-xs font-bold text-white
      `}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-2xs text-muted-foreground">
            $
            {Number(event.markets?.[0]?.volume ?? 0).toLocaleString()}
            {' '}
            VOL
          </span>
          {chance !== null && (
            <span className={`text-2xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {chance}
              ¢
              {isUp ? '+' : '-'}
              {Math.abs(chance - 50) * 0.1 + 0.5 | 0}
              .
              {Math.abs(chance - 50) % 10}
              %
            </span>
          )}
        </div>
      </div>
    </AppLink>
  )
}

export default async function RightSidebar() {
  const liveMarkets = await getLiveMarkets()

  return (
    <aside className="
      sticky top-0 hidden h-screen w-80 shrink-0 flex-col overflow-y-auto border-l border-border/50 bg-card
      xl:flex
      2xl:w-96
    "
    >
      <div className="flex-1 space-y-5 px-4 py-5">
        {/* AI Confidence */}
        <AiConfidenceCard />

        {/* Live Daily Markets */}
        {liveMarkets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold tracking-widest text-muted-foreground/70 uppercase">
                Live Daily Markets
              </h3>
              <span className="flex items-center gap-1 text-2xs text-red-400">
                <span className="size-1.5 animate-pulse rounded-full bg-red-400" />
                LIVE
              </span>
            </div>

            <div className="divide-y divide-border/30 overflow-hidden rounded-2xl border border-border/50 bg-card">
              {liveMarkets.map(event => (
                <LiveMarketMini key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground/70 uppercase">
            Platform Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active Markets', value: '1.2K+' },
              { label: 'Total Volume', value: '$4.8M' },
              { label: 'Traders', value: '18.2K' },
              { label: 'Resolved', value: '94%' },
            ].map(stat => (
              <div key={stat.label} className="space-y-0.5">
                <p className="text-2xs tracking-wider text-muted-foreground/60 uppercase">{stat.label}</p>
                <p className="text-sm font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
