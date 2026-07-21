'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { stripLocalePrefix } from '@/lib/locale-path'
import { cn } from '@/lib/utils'

interface RightSidebarClientProps {
  children: React.ReactNode
}

function useAutoCollapse() {
  const pathname = usePathname()
  // Expanded only on the home feed; auto-collapse on every other page.
  const path = stripLocalePrefix(pathname)
  const isHome = path === '/' || path === ''
  const shouldCollapse = !isHome
  const [collapsed, setCollapsed] = useState(shouldCollapse)
  const [manualOverride, setManualOverride] = useState(false)

  useEffect(() => {
    if (!manualOverride) {
      setCollapsed(shouldCollapse)
    }
  }, [shouldCollapse, manualOverride])

  function toggle() {
    setManualOverride(true)
    setCollapsed(prev => !prev)
  }

  // Reset manual override when route changes
  useEffect(() => {
    setManualOverride(false)
  }, [pathname])

  return { collapsed, toggle }
}

export default function RightSidebarClient({ children }: RightSidebarClientProps) {
  const { collapsed, toggle } = useAutoCollapse()

  return (
    <aside
      className={cn(
        `
          sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-l border-border/50 bg-card transition-all
          duration-300
        `,
        'xl:flex',
        collapsed ? 'w-10' : 'w-80 2xl:w-96',
      )}
    >
      {/* floating collapse toggle — reserves no row, so no empty band */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'absolute top-1 right-1 z-20 flex size-6 items-center justify-center rounded-lg transition-colors',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronLeftIcon className="size-4" />
          : <ChevronRightIcon className="size-4" />}
      </button>

      {/* scrollable content — hidden when collapsed */}
      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      )}

      {/* collapsed state: show only icons as indicators */}
      {collapsed && (
        <div className="flex flex-1 flex-col items-center gap-4 pt-10">
          <div className="size-2 rounded-full bg-primary/60" />
          <div className="size-2 rounded-full bg-green-400/60" />
          <div className="size-2 rounded-full bg-muted-foreground/30" />
        </div>
      )}
    </aside>
  )
}
