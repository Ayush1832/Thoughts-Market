import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { generateAiMarketAlerts } from '@/lib/ai/ai-market-assistant'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { AiRepository } from '@/lib/db/queries/ai'
import { EventRepository } from '@/lib/db/queries/event'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId } = body as { eventId?: string }

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required.' }, { status: 400 })
    }

    const settings = await loadMarketContextSettings()
    if (!settings.enabled || !settings.apiKey) {
      return NextResponse.json({ error: 'AI market assistant is not enabled.' }, { status: 403 })
    }

    const { data: cached } = await AiRepository.getAlerts(eventId)
    if (cached.length > 0) {
      return NextResponse.json({ data: cached, cached: true })
    }

    const { data: event, error: eventError } = await EventRepository.getEventById(eventId)
    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    const alerts = await generateAiMarketAlerts(event, event.markets ?? [])

    await AiRepository.upsertAlerts(eventId, alerts)

    return NextResponse.json({ data: alerts, cached: false })
  }
  catch (error) {
    console.error('AI alerts error:', error)
    return NextResponse.json({ error: 'Failed to generate alerts.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required.' }, { status: 400 })
    }

    const { data } = await AiRepository.getAlerts(eventId)
    return NextResponse.json({ data })
  }
  catch {
    return NextResponse.json({ error: 'Failed to load alerts.' }, { status: 500 })
  }
}
