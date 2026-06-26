'use client'

import { useEffect, useState } from 'react'

/**
 * Small country-flag indicator shown next to the site logo. The flag is based on
 * the visitor's IP/country (from CDN geo headers via /api/geo) — NOT their wallet
 * or selected currency. Shows the flag only (no currency code).
 */
export default function CurrencyChip() {
  const [country, setCountry] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/geo')
      .then(res => (res.ok ? res.json() : null))
      .then((data) => {
        const code = typeof data?.country === 'string' ? data.country.trim().toLowerCase() : ''
        if (active && /^[a-z]{2}$/.test(code)) {
          setCountry(code)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [])

  if (!country) {
    return null
  }

  return (
    <span
      title={country.toUpperCase()}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted/60 p-0.5"
    >
      {/* flagcdn serves flag images by lowercase ISO country code (renders on
          Windows, unlike flag emojis). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/h20/${country}.png`}
        srcSet={`https://flagcdn.com/h40/${country}.png 2x`}
        alt={country.toUpperCase()}
        width={20}
        height={15}
        loading="lazy"
        className="h-[15px] w-5 rounded-[3px] object-cover"
      />
    </span>
  )
}
