'use client'

import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
  GlobeIcon,
  HashIcon,
  SparklesIcon,
  TrendingUpIcon,
  ZapIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
  { icon: <TrendingUpIcon className="size-4" />, label: 'Trending',      href: '/' },
  { icon: <ZapIcon       className="size-4" />, label: 'Breaking News',  href: '/new',             badge: 'LIVE', badgeVariant: 'live' },
  { icon: <SparklesIcon  className="size-4" />, label: 'New Events',     href: '/new',             badge: 'NEW',  badgeVariant: 'new' },
  { icon: <FlameIcon     className="size-4" />, label: 'Hot Now',        href: '/?sort=24h-volume', badgeVariant: 'count', count: 24 },
  { icon: <BookmarkIcon  className="size-4" />, label: 'Watchlist',      href: '/?bookmarked=true', badgeVariant: 'count', count: 0 },
  { icon: <GlobeIcon     className="size-4" />, label: 'Atlas',          href: '/geopolitics',     badge: 'NEW',  badgeVariant: 'new' },
]

const COMMUNITIES = [
  { label: 'Politics', href: '/politics' },
  { label: 'Crypto',   href: '/crypto' },
  { label: 'Sports',   href: '/sports/live' },
  { label: 'Finance',  href: '/finance' },
  { label: 'Tech',     href: '/tech' },
]

function NavBadge({ variant, badge, count }: { variant?: string, badge?: string, count?: number }) {
  if (variant === 'live') {
    return (
      <span className="flex items-center gap-1 rounded-sm bg-red-500/20 px-1.5 py-0.5 text-2xs font-bold tracking-wider text-red-400">
        <span className="size-1.5 animate-pulse rounded-full bg-red-400" />
        {badge}
      </span>
    )
  }
  if (variant === 'new') {
    return (
      <span className="rounded-sm bg-primary/20 px-1.5 py-0.5 text-2xs font-bold tracking-wider text-primary">
        {badge}
      </span>
    )
  }
  if (variant === 'count' && count !== undefined && count > 0) {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-tm-elevated text-2xs font-semibold text-tm-secondary">
        {count}
      </span>
    )
  }
  return null
}

// Tooltip that appears to the right when sidebar is collapsed
function CollapseTooltip({ label }: { label: string }) {
  return (
    <span className="
      pointer-events-none absolute left-full z-50 ml-3
      hidden group-hover:flex
      whitespace-nowrap rounded-lg border border-tm-border
      bg-tm-elevated px-2.5 py-1.5 text-xs font-medium
      text-tm-primary shadow-xl
    ">
      {label}
    </span>
  )
}

export default function LeftSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Restore preference from localStorage (runs only on client)
  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true)
    }
    catch {}
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  return (
    <aside
      className={cn(
        'sticky top-0 z-40 hidden h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden',
        'border-r border-tm-border bg-tm-surface',
        'transition-[width] duration-300 ease-in-out',
        'lg:flex',
        collapsed ? 'w-[60px]' : 'w-52 xl:w-56',
      )}
    >
      {/* ── Logo row + collapse toggle ── */}
      <div className="flex h-14 shrink-0 items-center border-b border-tm-border px-3">
        {/* Logo fades out when collapsed */}
        <div className={cn(
          'flex-1 min-w-0 overflow-hidden transition-all duration-300',
          collapsed ? 'w-0 opacity-0' : 'opacity-100',
        )}
        >
          <HeaderLogo />
        </div>

        {/* Toggle button — always visible */}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            'text-tm-secondary transition-all duration-200',
            'hover:bg-tm-elevated hover:text-tm-primary',
            collapsed && 'mx-auto',
          )}
        >
          {collapsed
            ? <ChevronRightIcon className="size-4" />
            : <ChevronLeftIcon  className="size-4" />}
        </button>
      </div>

      {/* ── Main Navigation ── */}
      <nav className={cn('flex-1 space-y-0.5 py-4', collapsed ? 'px-2' : 'px-3')}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/' || pathname === '/en'
            : pathname.startsWith(item.href)

          return (
            <AppLink
              key={item.label}
              href={item.href}
              className={cn(
                'group relative flex items-center rounded-xl py-2.5 text-sm font-medium',
                'transition-all duration-200',
                collapsed ? 'justify-center px-2' : 'justify-between gap-3 px-3',
                isActive
                  ? 'bg-tm-elevated text-[#4f8ef7] before:absolute before:left-0 before:inset-y-2 before:w-0.5 before:rounded-r-full before:bg-[#4f8ef7]'
                  : 'text-tm-secondary hover:bg-tm-elevated hover:text-tm-primary',
              )}
            >
              {/* Icon */}
              <span className={cn(
                'shrink-0 transition-all duration-200',
                isActive ? 'text-[#4f8ef7] scale-110' : 'text-tm-secondary/70 group-hover:text-tm-primary',
              )}
              >
                {item.icon}
              </span>

              {/* Label + badge — hidden when collapsed */}
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  <NavBadge variant={item.badgeVariant} badge={item.badge} count={item.count} />
                </>
              )}

              {/* Floating tooltip when collapsed */}
              {collapsed && <CollapseTooltip label={item.label} />}
            </AppLink>
          )
        })}

        {/* Divider */}
        <div className="my-3 border-t border-tm-border" />

        {/* Communities — full list when expanded */}
        {!collapsed && (
          <div className="px-1 py-1">
            <p className="mb-2 px-2 text-[10px] font-bold tracking-[1.8px] text-tm-secondary/50 uppercase">
              Communities
            </p>
            <div className="space-y-0.5">
              {COMMUNITIES.map(c => (
                <AppLink
                  key={c.label}
                  href={c.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-tm-secondary transition-all duration-200 hover:bg-tm-elevated hover:text-tm-primary"
                >
                  <HashIcon className="size-3.5 shrink-0 text-tm-secondary/50" />
                  {c.label}
                </AppLink>
              ))}
            </div>
          </div>
        )}

        {/* Communities — icon-only when collapsed */}
        {collapsed && (
          <div className="space-y-0.5">
            {COMMUNITIES.map(c => (
              <AppLink
                key={c.label}
                href={c.href}
                className="group relative flex items-center justify-center rounded-xl py-2 text-tm-secondary transition-all duration-200 hover:bg-tm-elevated hover:text-tm-primary"
              >
                <HashIcon className="size-3.5" />
                <CollapseTooltip label={c.label} />
              </AppLink>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
