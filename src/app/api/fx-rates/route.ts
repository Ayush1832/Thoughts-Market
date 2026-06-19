import { NextResponse } from 'next/server'

// Live USD exchange rates for the wallet "Display Crypto in Fiat" setting.
// Source: open.er-api.com — free, no API key, ~160 currencies. The upstream
// fetch is cached for an hour (via the fetch `next.revalidate` option below) so
// we don't hammer it and the page stays fast.
export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ rates: null, error: 'upstream_unavailable' }, { status: 200 })
    }

    const json = await res.json() as {
      result?: string
      rates?: Record<string, number>
      time_last_update_utc?: string
    }

    if (json.result !== 'success' || !json.rates) {
      return NextResponse.json({ rates: null, error: 'invalid_response' }, { status: 200 })
    }

    return NextResponse.json({
      base: 'USD',
      rates: json.rates,
      updatedAt: json.time_last_update_utc ?? null,
    })
  }
  catch {
    // Never fail the UI — the client falls back to static rates.
    return NextResponse.json({ rates: null, error: 'fetch_failed' }, { status: 200 })
  }
}
