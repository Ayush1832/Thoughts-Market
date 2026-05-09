'use client'

import AppLink from '@/components/AppLink'
import SiteLogoIcon from '@/components/SiteLogoIcon'
import { useSiteIdentity } from '@/hooks/useSiteIdentity'

interface HeaderLogoProps {
  labelSuffix?: string
}

export default function HeaderLogo({ labelSuffix }: HeaderLogoProps) {
  const site = useSiteIdentity()
  const label = labelSuffix ? `${site.name} ${labelSuffix}` : site.name

  return (
    <AppLink
      intentPrefetch
      href="/"
      className={`
        flex h-14 shrink-0 items-center gap-3 text-2xl font-medium text-foreground transition-opacity
        hover:opacity-80
      `}
    >
      <SiteLogoIcon
        logoSvg={site.logoSvg}
        logoUrl={site.logoUrl}
        logoImageUrl={site.logoImageUrl}
        alt={`${site.name} logo`}
        className="inline-flex w-20 h-20 items-center justify-center text-current [&_svg]:w-full [&_svg]:h-full [&_svg_*]:fill-current [&_svg_*]:stroke-current"
        svgClassName="w-full h-full"
        imageClassName="w-full h-full object-contain"
        size={80}
      />
      <span>{label}</span>
    </AppLink>
  )
}
