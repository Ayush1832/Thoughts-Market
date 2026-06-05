'use client'

import type { LucideIcon } from 'lucide-react'
import type { Route } from 'next'
import { BadgePercentIcon, BellIcon, CoinsIcon, FingerprintIcon, LaptopIcon, LockIcon, PackageIcon, ShieldIcon, TriangleAlertIcon, UserIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import AppLink from '@/components/AppLink'
import { Button } from '@/components/ui/button'
import { usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface MenuItem {
  id: string
  label: string
  href: Route
  icon: LucideIcon
}

export default function SettingsSidebar() {
  const t = useExtracted()
  const pathname = usePathname()
  const menuItems: MenuItem[] = [
    { id: 'profile', label: t('Profile'), href: '/settings' as Route, icon: UserIcon },
    { id: 'account', label: t('Account'), href: '/settings/account' as Route, icon: FingerprintIcon },
    { id: 'notifications', label: t('Notifications'), href: '/settings/notifications' as Route, icon: BellIcon },
    { id: 'trading', label: t('Trading'), href: '/settings/trading' as Route, icon: CoinsIcon },
    { id: 'privacy', label: t('Privacy'), href: '/settings/privacy' as Route, icon: ShieldIcon },
    { id: 'security', label: t('Security'), href: '/settings/security' as Route, icon: LockIcon },
    { id: 'sessions', label: t('Sessions'), href: '/settings/sessions' as Route, icon: LaptopIcon },
    { id: 'affiliate', label: t('Affiliate'), href: '/settings/affiliate' as Route, icon: BadgePercentIcon },
    { id: 'sdks', label: t('SDKs'), href: '/settings/sdks' as Route, icon: PackageIcon },
    { id: 'danger', label: t('Danger zone'), href: '/settings/danger-zone' as Route, icon: TriangleAlertIcon },
  ]
  const activeItem = menuItems.find(item => pathname === item.href)
  const active = activeItem?.id ?? 'profile'

  return (
    <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
      <nav
        className={`
          flex w-full max-w-full snap-x snap-mandatory gap-2 overflow-x-auto rounded-sm
          lg:grid lg:gap-1 lg:overflow-visible lg:rounded-none lg:bg-transparent
        `}
      >
        {menuItems.map((item) => {
          const isActive = active === item.id
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className={cn(
                `
                  group relative h-auto shrink-0 snap-start flex-col gap-1.5 px-3 py-2 text-foreground
                  lg:h-11 lg:min-w-0 lg:flex-row lg:justify-start lg:gap-2 lg:px-4 lg:py-2
                `,
                isActive
                  ? `
                      bg-white/[0.06] hover:bg-white/[0.08]
                      lg:before:absolute lg:before:left-0 lg:before:inset-y-2 lg:before:w-0.5
                      lg:before:rounded-r-full lg:before:bg-[#7d6cff]
                    `
                  : 'hover:bg-white/[0.04]',
              )}
              asChild
            >
              <AppLink intentPrefetch href={item.href}>
                <item.icon className={cn('size-6 lg:size-5', isActive ? 'text-[#7d6cff]' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </AppLink>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}
