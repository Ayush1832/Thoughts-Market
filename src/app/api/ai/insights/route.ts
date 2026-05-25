import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { generateAiInsights } from '@/lib/ai/ai-insights'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { AiRepository } from '@/lib/db/queries/ai'
import { EventRepository } from '@/lib/db/queries/event'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, locale = 'en', readOnly = false } = body as {
      eventId?: string
      locale?: string
      readOnly?: boolean
    }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required.' }, { status: 400 })
    }

    const settings = await loadMarketContextSettings()
    if (!settings.enabled || !settings.apiKey) {
      return NextResponse.json({ error: 'AI insights are not enabled.' }, { status: 403 })
    }

    const { data: cached } = await AiRepository.getInsights(eventId, locale)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    if (readOnly) {
      return NextResponse.json({ data: null, cached: false })
    }

    const { data: event, error: eventError } = await EventRepository.getEventById(eventId)
    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    const market = event.markets?.[0]
    if (!market) {
      return NextResponse.json({ error: 'No markets found for this event.' }, { status: 404 })
    }

    const insights = await generateAiInsights(event, market, locale)

    await AiRepository.upsertInsights({
      event_id: eventId,
      locale,
      ...insights,
    })

    return NextResponse.json({ data: insights, cached: false })
  }
  catch (error) {
    console.error('AI insights error:', error)
    return NextResponse.json({ error: 'Failed to generate insights.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const locale = searchParams.get('locale') ?? 'en'

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required.' }, { status: 400 })
    }

    const { data } = await AiRepository.getInsights(eventId, locale)
    return NextResponse.json({ data, cached: true })
  }
  catch {
    return NextResponse.json({ error: 'Failed to load insights.' }, { status: 500 })
  }
}
