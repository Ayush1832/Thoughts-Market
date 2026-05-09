import { cn } from '@/lib/utils'

interface SiteLogoIconProps {
  logoSvg: string
  logoUrl?: string | null
  logoImageUrl?: string | null
  className?: string
  svgClassName?: string
  imageClassName?: string
  alt?: string
  size?: number
}

function isSvgDataUri(value?: string | null) {
  return typeof value === 'string' && value.startsWith('data:image/svg+xml')
}

export default function SiteLogoIcon({
  logoSvg,
  logoUrl,
  logoImageUrl,
  className,
  svgClassName,
  imageClassName,
  alt = '',
  size = 24,
}: SiteLogoIconProps) {
  const imageSrc = logoImageUrl || (!isSvgDataUri(logoUrl) ? logoUrl : null)

  if (imageSrc) {
    return (
      <span className={className}>
        <img
          src={imageSrc}
          alt={alt}
          width={size}
          height={size}
          className={cn('w-full h-full object-contain', imageClassName)}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(className, svgClassName)}
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  )
}
