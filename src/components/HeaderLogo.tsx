'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import AppLink from '@/components/AppLink'
import SiteLogoIcon from '@/components/SiteLogoIcon'
import { useSiteIdentity } from '@/hooks/useSiteIdentity'

interface HeaderLogoProps {
  labelSuffix?: string
  iconOnly?: boolean
}

export default function HeaderLogo({ labelSuffix, iconOnly = false }: HeaderLogoProps) {
  const site = useSiteIdentity()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const theme = mounted ? (resolvedTheme === 'dark' ? 'dark' : 'light') : 'light'
  const label = labelSuffix ? `${site.name} ${labelSuffix}` : site.name

  return (
    <AppLink
      intentPrefetch
      href="/"
      aria-label={label}
      className={`
        flex h-12 shrink-0 items-center gap-3 text-xl font-medium text-foreground transition-opacity
        hover:opacity-80
      `}
    >
      <SiteLogoIcon
        logoSvg={site.logoSvg}
        logoUrl={site.logoUrl}
        logoImageUrl={site.logoImageUrl}
        logoImageUrlDark={site.logoImageUrlDark}
        theme={theme}
        alt={`${site.name} logo`}
        className="
          inline-flex size-10 items-center justify-center text-current
          [&_svg]:size-full
          [&_svg_*]:fill-current [&_svg_*]:stroke-current
        "
        svgClassName="w-full h-full"
        imageClassName="w-full h-full object-contain"
        size={40}
      />
      {!iconOnly && <span>{label}</span>}
    </AppLink>
  )
}
