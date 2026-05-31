import AppLink from '@/components/AppLink'
import { cn } from '@/lib/utils'

interface CategoryChild {
  name: string
  slug: string
}

interface CategoryHeroBannerProps {
  slug: string
  name: string
  activeMarketsCount?: number
  eventPageNote?: string | null
  childs?: CategoryChild[]
  activeSubcategory?: string | null
}

const CATEGORY_META: Record<string, {
  description: string
  gradient: string
  iconBg: string
  iconText: string
}> = {
  politics: {
    description: 'Real-time geopolitical & election forecasting',
    gradient: 'from-red-950/60 via-card to-card',
    iconBg: 'from-red-500 to-purple-600',
    iconText: 'P',
  },
  crypto: {
    description: 'Crypto prices, DeFi protocols, and on-chain events',
    gradient: 'from-orange-950/60 via-card to-card',
    iconBg: 'from-orange-400 to-yellow-500',
    iconText: '₿',
  },
  sports: {
    description: 'Live sports predictions across all major leagues',
    gradient: 'from-green-950/60 via-card to-card',
    iconBg: 'from-green-500 to-teal-500',
    iconText: '⚽',
  },
  finance: {
    description: 'Stock markets, earnings, economic indicators',
    gradient: 'from-blue-950/60 via-card to-card',
    iconBg: 'from-blue-500 to-cyan-500',
    iconText: '$',
  },
  tech: {
    description: 'AI breakthroughs, product launches, and tech trends',
    gradient: 'from-indigo-950/60 via-card to-card',
    iconBg: 'from-indigo-500 to-violet-500',
    iconText: '⚡',
  },
  geopolitics: {
    description: 'Global affairs, conflicts, and international relations',
    gradient: 'from-slate-900/80 via-card to-card',
    iconBg: 'from-slate-500 to-gray-600',
    iconText: '🌐',
  },
  culture: {
    description: 'Entertainment, awards, celebrities, and pop culture',
    gradient: 'from-pink-950/60 via-card to-card',
    iconBg: 'from-pink-500 to-rose-500',
    iconText: '🎬',
  },
  economy: {
    description: 'GDP, inflation, employment, and macroeconomics',
    gradient: 'from-emerald-950/60 via-card to-card',
    iconBg: 'from-emerald-500 to-green-600',
    iconText: '📈',
  },
  weather: {
    description: 'Temperature forecasts and climate events',
    gradient: 'from-sky-950/60 via-card to-card',
    iconBg: 'from-sky-400 to-blue-500',
    iconText: '☁️',
  },
  elections: {
    description: 'Upcoming elections and polling predictions worldwide',
    gradient: 'from-red-950/50 via-card to-card',
    iconBg: 'from-red-600 to-red-800',
    iconText: '🗳️',
  },
}

const DEFAULT_META = {
  description: 'Prediction markets on real-world events',
  gradient: 'from-primary/10 via-card to-card',
  iconBg: 'from-primary to-primary/70',
  iconText: '◆',
}

export default function CategoryHeroBanner({
  slug,
  name,
  activeMarketsCount,
  eventPageNote,
  childs = [],
  activeSubcategory,
}: CategoryHeroBannerProps) {
  const meta = CATEGORY_META[slug.toLowerCase()] ?? DEFAULT_META
  const description = eventPageNote?.trim() || meta.description

  return (
    <div className="mb-5 space-y-4">
      {/* Hero card */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-r p-6',
        meta.gradient,
      )}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Left: icon + name + description */}
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg',
              meta.iconBg,
            )}
            >
              {meta.iconText}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Right: stats */}
          <div className="flex items-center gap-6 text-center">
            {activeMarketsCount !== undefined && (
              <>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Markets</p>
                  <p className="mt-0.5 text-lg font-bold text-foreground">{activeMarketsCount}</p>
                </div>
                <div className="h-8 w-px bg-border/40" />
              </>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">24H Vol</p>
              <p className="mt-0.5 text-lg font-bold text-red-400">—</p>
            </div>
            <div className="h-8 w-px bg-border/40" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Traders</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">—</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory tabs */}
      {childs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AppLink
            href={`/${slug}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              !activeSubcategory
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            All
            {' '}
            {name}
          </AppLink>
          {childs.map(child => (
            <AppLink
              key={child.slug}
              href={`/${slug}/${child.slug}`}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeSubcategory === child.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {child.name}
            </AppLink>
          ))}
        </div>
      )}
    </div>
  )
}
