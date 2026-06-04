import HeaderMenu from '@/app/[locale]/(platform)/_components/HeaderMenu'
import HeaderSearch from '@/app/[locale]/(platform)/_components/HeaderSearch'
import HowItWorksDeferred from '@/app/[locale]/(platform)/_components/HowItWorksDeferred'
import HeaderLogo from '@/components/HeaderLogo'

export default async function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-tm-border bg-tm-surface/95 backdrop-blur-sm">
      <div className="flex h-14 w-full items-center gap-3 px-3 lg:px-5">
        {/* Logo: mobile only */}
        <div className="shrink-0 lg:hidden">
          <HeaderLogo />
        </div>

        {/* Search: flexible, grows to fill but capped, can shrink */}
        <div className="hidden min-w-0 flex-1 items-center lg:flex lg:max-w-md xl:max-w-lg">
          <HeaderSearch />
        </div>

        {/* "How it works": its own slot, never overlaps search or menu */}
        <div className="hidden shrink-0 lg:flex">
          <HowItWorksDeferred />
        </div>

        {/* Spacer on mobile only (desktop search already grows) */}
        <div className="flex-1 lg:hidden" />

        {/* Portfolio / wallet / avatar — always visible, never shrinks */}
        <div className="flex shrink-0 items-center gap-1">
          <HeaderMenu />
        </div>
      </div>
    </header>
  )
}
