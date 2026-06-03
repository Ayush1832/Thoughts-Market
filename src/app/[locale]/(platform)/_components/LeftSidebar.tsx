'use client'

import { BookmarkIcon, FlameIcon, GlobeIcon, HashIcon, SparklesIcon, TrendingUpIcon, ZapIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import AppLink from '@/components/AppLink'
import HeaderLogo from '@/components/HeaderLogo'
import { cn } from '@/lib/utils'

interface SidebarNavItem {
  icon: React.ReactNode
  label: string
  href: string
  badge?: string
  badgeVariant?: 'live' | 'reels' | 'count' | 'new'
  count?: number
}

const NAV_ITEMS: SidebarNavItem[] = [
  {
    icon: <TrendingUpIcon className="size-4" />,
    label: 'Trending',
    href: '/',
  },
  {
    icon: <ZapIcon className="size-4" />,
    label: 'Breaking News',
    href: '/new',
    badge: 'LIVE',
    badgeVariant: 'live',
  },
  {
    icon: <SparklesIcon className="size-4" />,
    label: 'New Events',
    href: '/new',
    badge: 'NEW',
    badgeVariant: 'new',
  },
  {
    icon: <FlameIcon className="size-4" />,
    label: 'Hot Now',
    href: '/?sort=24h-volume',
    badgeVariant: 'count',
    count: 24,
  },
  {
    icon: <BookmarkIcon className="size-4" />,
    label: 'Watchlist',
    href: '/?bookmarked=true',
    badgeVariant: 'count',
    count: 0,
  },
  {
    icon: <GlobeIcon className="size-4" />,
    label: 'Atlas',
    href: '/geopolitics',
    badge: 'NEW',
    badgeVariant: 'new',
  },
]

const COMMUNITIES = [
  { label: 'Politics', href: '/politics' },
  { label: 'Crypto', href: '/crypto' },
  { label: 'Sports', href: '/sports/live' },
  { label: 'Finance', href: '/finance' },
  { label: 'Tech', href: '/tech' },
]

function NavBadge({ variant, badge, count }: { variant?: string, badge?: string, count?: number }) {
  if (variant === 'live') {
    return (
      <span className={cn(`
        flex items-center gap-1 rounded-sm bg-red-500/20 px-1.5 py-0.5 text-2xs font-bold tracking-wider text-red-400
      `)}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-red-400" />
        {badge}
      </span>
    )
  }
  if (variant === 'reels') {
    return (
      <span className={cn('rounded-sm bg-purple-500/20 px-1.5 py-0.5 text-2xs font-bold tracking-wider text-purple-400')}>
        {badge}
      </span>
    )
  }
  if (variant === 'new') {
    return (
      <span className={cn('rounded-sm bg-primary/20 px-1.5 py-0.5 text-2xs font-bold tracking-wider text-primary')}>
        {badge}
      </span>
    )
  }
  if (variant === 'count' && count !== undefined && count > 0) {
    return (
      <span className={cn(`
        flex size-5 items-center justify-center rounded-full bg-muted text-2xs font-semibold text-muted-foreground
      `)}
      >
        {count}
      </span>
    )
  }
  return null
}

export default function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className={cn(`
      sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border/50 bg-card
      lg:flex
      xl:w-72
    `)}
    >
      {/* Logo — h-14 matches the main header height exactly */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 px-5">
        <HeaderLogo />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/' || pathname === '/en'
            : pathname.startsWith(item.href)

          return (
            <AppLink
              key={item.label}
              href={item.href}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                'transition-all duration-200',
                isActive
                  ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-0.5',
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'transition-all duration-200',
                  isActive ? 'text-primary scale-110' : 'text-muted-foreground/70 group-hover:text-foreground',
                )}
                >
                  {item.icon}
                </span>
                {item.label}
              </div>
              <NavBadge variant={item.badgeVariant} badge={item.badge} count={item.count} />
            </AppLink>
          )
        })}

        {/* Divider */}
        <div className="my-4 border-t border-border/40" />

        {/* Communities */}
        <div className="px-3 py-2">
          <p className="mb-3 text-[11px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
            Communities
          </p>
          <div className="space-y-0.5">
            {COMMUNITIES.map(community => (
              <AppLink
                key={community.label}
                href={community.href}
                className={cn(`
                  flex items-center gap-3 rounded-lg p-2 text-sm text-muted-foreground transition-colors
                  hover:bg-muted/60 hover:text-foreground
                `)}
              >
                <HashIcon className="size-3.5 text-muted-foreground/60" />
                {community.label}
              </AppLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom version tag */}
      <div className="border-t border-border/40 px-5 py-4">
        <p className="text-[11px] text-muted-foreground/40">
          v2 · Polygon Mainnet
        </p>
      </div>
    </aside>
  )
}
