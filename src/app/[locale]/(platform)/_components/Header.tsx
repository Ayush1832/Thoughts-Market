import HeaderMenu from '@/app/[locale]/(platform)/_components/HeaderMenu'
import HeaderSearch from '@/app/[locale]/(platform)/_components/HeaderSearch'
import HowItWorksDeferred from '@/app/[locale]/(platform)/_components/HowItWorksDeferred'
import HeaderLogo from '@/components/HeaderLogo'

export default async function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-tm-border bg-tm-surface/95 backdrop-blur-sm">
      <div className="flex h-14 w-full items-center gap-3 px-3 lg:px-5">
        {/* Left slot: brand logo (icon + name), in the top bar in line with the profile */}
        <div className="flex min-w-0 flex-1 items-center">
          <HeaderLogo />
        </div>

        {/* Center: search — truly centered across the full-width top bar */}
        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex lg:max-w-md xl:max-w-lg">
          <HeaderSearch />
        </div>

        {/* Right slot: How it works + Portfolio / Cash / Deposit / avatar — pinned to the far right, above the globe */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden shrink-0 lg:flex">
            <HowItWorksDeferred />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HeaderMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
