import HeaderMenu from '@/app/[locale]/(platform)/_components/HeaderMenu'
import HeaderSearch from '@/app/[locale]/(platform)/_components/HeaderSearch'
import HowItWorksDeferred from '@/app/[locale]/(platform)/_components/HowItWorksDeferred'
import HeaderLogo from '@/components/HeaderLogo'

export default async function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="flex min-h-14 w-full items-center gap-4 px-4 lg:px-6">
        {/* Logo: only on mobile (hidden on lg+ where sidebar shows it) */}
        <div className="shrink-0 lg:hidden">
          <HeaderLogo />
        </div>

        {/* Search: full width on desktop */}
        <div className="flex flex-1 items-center gap-2">
          <div className="hidden w-full max-w-xl items-center gap-2 lg:flex">
            <HeaderSearch />
            <HowItWorksDeferred />
          </div>
        </div>

        {/* Right: menu / wallet */}
        <div className="flex shrink-0 items-center gap-2">
          <HeaderMenu />
        </div>
      </div>
    </header>
  )
}
