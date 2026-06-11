import { isAdminAuthorized } from '@/lib/admin-auth-check'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { SettingsRepository } from '@/lib/db/queries/settings'
import { UserRepository } from '@/lib/db/queries/user'

const TRENDING_KEYS = ['featured_markets', 'hot_picks', 'viral_topics', 'live_event_mode'] as const
type TrendingKey = (typeof TRENDING_KEYS)[number]

export async function GET() {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { data: allSettings } = await SettingsRepository.getSettings()
    const trending = allSettings?.trending ?? {}

    return NextResponse.json({
      featured_markets: JSON.parse((trending.featured_markets?.value) || '[]'),
      hot_picks: JSON.parse((trending.hot_picks?.value) || '[]'),
      viral_topics: JSON.parse((trending.viral_topics?.value) || '[]'),
      live_event_mode: (trending.live_event_mode?.value) === 'true',
    })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json() as { key: TrendingKey, value: unknown }
    const { key, value } = body

    if (!TRENDING_KEYS.includes(key)) {
      return NextResponse.json({ error: 'Invalid key.' }, { status: 400 })
    }

    const serialized = typeof value === 'boolean' ? String(value) : JSON.stringify(value)
    await SettingsRepository.updateSettings([{ group: 'trending', key, value: serialized }])

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
