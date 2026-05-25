import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { generateAiRiskScore } from '@/lib/ai/ai-risk-engine'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { AiRepository } from '@/lib/db/queries/ai'
import { EventRepository } from '@/lib/db/queries/event'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conditionId, eventId } = body as { conditionId?: string, eventId?: string }

    if (!conditionId || !eventId) {
      return NextResponse.json({ error: 'conditionId and eventId are required.' }, { status: 400 })
    }

    const settings = await loadMarketContextSettings()
    if (!settings.enabled || !settings.apiKey) {
      return NextResponse.json({ error: 'AI risk engine is not enabled.' }, { status: 403 })
    }

    const { data: cached } = await AiRepository.getRiskScore(conditionId)
    if (cached) {
      return NextResponse.json({ data: cached, cached: true })
    }

    const { data: event, error: eventError } = await EventRepository.getEventById(eventId)
    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    }

    const market = event.markets?.find(m => m.condition_id === conditionId)
    if (!market) {
      return NextResponse.json({ error: 'Market not found.' }, { status: 404 })
    }

    const score = await generateAiRiskScore(event, market)

    await AiRepository.upsertRiskScore({ condition_id: conditionId, ...score })

    return NextResponse.json({ data: score, cached: false })
  }
  catch (error) {
    console.error('AI risk score error:', error)
    return NextResponse.json({ error: 'Failed to generate risk score.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conditionId = searchParams.get('conditionId')

    if (!conditionId) {
      return NextResponse.json({ error: 'conditionId is required.' }, { status: 400 })
    }

    const { data } = await AiRepository.getRiskScore(conditionId)
    return NextResponse.json({ data })
  }
  catch {
    return NextResponse.json({ error: 'Failed to load risk score.' }, { status: 500 })
  }
}
