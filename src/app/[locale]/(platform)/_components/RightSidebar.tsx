import type { Event } from '@/types'
import AppLink from '@/components/AppLink'
import AtlasGlobe from '@/components/AtlasGlobe'
import Sparkline from '@/components/Sparkline'
import { listHomeEventsPage } from '@/lib/home-events-page'
import RightSidebarClient from './RightSidebarClient'

async function getLiveMarkets(): Promise<Event[]> {
  try {
    const result = await listHomeEventsPage({ tag: 'trending', mainTag: 'trending', locale: 'en', bookmarked: false, userId: '' })
    return (result.data ?? []).filter((e: Event) => e.status === 'active').slice(0, 4)
  }
  catch {
    return []
  }
}

function LiveMarketMini({ event }: { event: any }) {
  const market = event.markets?.[0]
  const seedNum = market?.outcomes?.[0]
    ? Number(market.outcomes[0].token_id || 0) % 100
    : (event.title ?? '').length * 7 % 100
  const chance = Math.round((seedNum + 30) % 100)
  const isUp = chance >= 50
  const slug = event.slug ?? ''
  const initial = (event.title ?? 'M')[0].toUpperCase()
  const volume = Number(market?.volume ?? 0)
  const pctChange = (((seedNum % 60) - 30) / 10).toFixed(1)

  const colors: Record<string, string> = {
    E: 'from-blue-500 to-indigo-500',
    B: 'from-orange-500 to-amber-500',
    S: 'from-purple-500 to-fuchsia-500',
    X: 'from-slate-500 to-slate-600',
    D: 'from-yellow-400 to-orange-400',
    M: 'from-blue-400 to-cyan-400',
    H: 'from-green-500 to-emerald-500',
  }
  const iconColor = colors[initial] ?? 'from-primary to-primary/70'

  return (
    <AppLink
      href={`/event/${slug}`}
      className="
        group block rounded-2xl border border-border/40 bg-card p-3 transition-all duration-200
        hover:border-primary/30 hover:bg-secondary/40
      "
    >
      {/* header: icon + title */}
      <div className="flex items-center gap-2.5">
        <div className={`
          flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-2xs font-bold text-white
          ${iconColor}
        `}
        >
          {initial}
        </div>
        <p className="truncate text-xs font-medium text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </p>
      </div>

      {/* sparkline chart */}
      <div className="mt-2 h-10 w-full">
        <Sparkline seed={slug || event.title || 'm'} trend={isUp ? 'up' : 'down'} className="size-full" />
      </div>

      {/* footer: volume + price */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-2xs text-muted-foreground">
          $
          {volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : volume.toFixed(0)}
          {' '}
          VOL
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground">
            {chance}
            ¢
          </span>
          <span className={`rounded-sm px-1.5 py-0.5 text-2xs font-semibold ${isUp
            ? 'bg-green-500/15 text-green-400'
            : `bg-red-500/15 text-red-400`}`}
          >
            {isUp ? '+' : ''}
            {pctChange}
            %
          </span>
        </div>
      </div>
    </AppLink>
  )
}

export default async function RightSidebar() {
  const liveMarkets = await getLiveMarkets()

  return (
    <RightSidebarClient>
      <div className="space-y-5 p-4">
        {/* Globe widget pinned to the top */}
        <AtlasGlobe />

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
            <div className="space-y-2.5">
              {liveMarkets.map(event => (
                <LiveMarketMini key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}

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

        <div className="h-4" />
      </div>
    </RightSidebarClient>
  )
}
