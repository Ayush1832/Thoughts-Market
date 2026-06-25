import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getRequestCountryCode } from '@/lib/geoblock-settings'

// Returns the visitor's country (ISO-2) so the header can show their flag based
// on IP — independent of wallet / selected currency.
//
// Production: read from the CDN geo header (Vercel / Cloudflare) — fast, free.
// Local dev: that header doesn't exist, so we look up the dev machine's public
// IP country via a free service (cached) so the flag matches your real location.

let devCountryCache: { code: string, at: number } | null = null
const DEV_CACHE_MS = 60 * 60 * 1000 // 1 hour

// Free IP→country services (no key). No IP param → geolocates this server's
// outbound IP, i.e. your machine in local dev. Tries a couple for reliability.
async function fetchCountryFrom(url: string, pick: (raw: string) => string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return null
    }
    const code = pick(await res.text()).trim().toUpperCase()
    return /^[A-Z]{2}$/.test(code) ? code : null
  }
  catch {
    return null
  }
}

async function lookupDevCountry(): Promise<string | null> {
  // Only successful lookups are cached, so a transient failure never sticks.
  if (devCountryCache && Date.now() - devCountryCache.at < DEV_CACHE_MS) {
    return devCountryCache.code
  }
  const code
    = (await fetchCountryFrom('https://ipapi.co/country/', raw => raw))
      ?? (await fetchCountryFrom('https://ipwho.is/?fields=country_code', (raw) => {
        try { return (JSON.parse(raw)?.country_code as string) ?? '' }
        catch { return '' }
      }))
      ?? (await fetchCountryFrom('https://ifconfig.co/country-iso', raw => raw))
  if (code) {
    devCountryCache = { code, at: Date.now() }
  }
  return code
}

export async function GET(request: NextRequest) {
  let country = getRequestCountryCode(request.headers)

  if (!country && process.env.NODE_ENV !== 'production') {
    country = (await lookupDevCountry()) ?? 'US' // real country in dev; US if lookup fails
  }

  return NextResponse.json(
    { country: country || null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
