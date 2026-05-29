import type { SupportedLocale } from '@/i18n/locales'
import { getExtracted, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import AffiliateQueryHandler from '@/app/[locale]/(platform)/_components/AffiliateQueryHandler'
import Header from '@/app/[locale]/(platform)/_components/Header'
import LeftSidebar from '@/app/[locale]/(platform)/_components/LeftSidebar'
import MobileBottomNav from '@/app/[locale]/(platform)/_components/MobileBottomNav'
import NavigationTabs from '@/app/[locale]/(platform)/_components/NavigationTabs'
import PlatformViewerState from '@/app/[locale]/(platform)/_components/PlatformViewerState'
import RightSidebar from '@/app/[locale]/(platform)/_components/RightSidebar'
import { FilterProvider } from '@/app/[locale]/(platform)/_providers/FilterProvider'
import PlatformNavigationProvider from '@/app/[locale]/(platform)/_providers/PlatformNavigationProvider'
import { TradingOnboardingProvider } from '@/app/[locale]/(platform)/_providers/TradingOnboardingProvider'
import { loadPlatformMainTags } from '@/lib/platform-main-tags'
import { buildChildParentMap, buildPlatformNavigationTags } from '@/lib/platform-navigation'
import AppKitProvider from '@/providers/AppKitProvider'

export default async function PlatformLayout({ params, children }: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  const resolvedLocale = locale as SupportedLocale
  setRequestLocale(resolvedLocale)
  const t = await getExtracted()
  const { data: mainTags, globalChilds = [] } = await loadPlatformMainTags(resolvedLocale)
  const tags = buildPlatformNavigationTags({
    mainTags: mainTags ?? [],
    globalChilds,
    trendingLabel: t('Trending'),
    newLabel: t('New'),
  })
  const childParentMap = buildChildParentMap(mainTags ?? [])

  return (
    <AppKitProvider>
      <TradingOnboardingProvider>
        <PlatformViewerState />
        <FilterProvider>
          <PlatformNavigationProvider tags={tags} childParentMap={childParentMap}>
            {/* 3-column layout on desktop, single column on mobile */}
            <div className="flex min-h-screen w-full">
              {/* Left Sidebar */}
              <LeftSidebar />

              {/* Main Content */}
              <div className="flex min-w-0 flex-1 flex-col">
                <Header />
                <NavigationTabs />
                <main className="flex-1 p-4 lg:px-6 lg:py-5">
                  {children}
                </main>
              </div>

              {/* Right Sidebar */}
              <Suspense fallback={<div className="hidden w-80 shrink-0 xl:block 2xl:w-96" />}>
                <RightSidebar />
              </Suspense>
            </div>

            <MobileBottomNav />
            <AffiliateQueryHandler />
          </PlatformNavigationProvider>
        </FilterProvider>
      </TradingOnboardingProvider>
    </AppKitProvider>
  )
}
