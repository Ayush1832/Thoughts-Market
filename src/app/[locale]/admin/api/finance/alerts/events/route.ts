import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { createAlertEvent, getAlertEventCounts, listAlertEvents } from '@/lib/db/queries/finance'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser?.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500)

    const [events, counts] = await Promise.all([
      listAlertEvents({ status, limit }),
      getAlertEventCounts(),
    ])

    return NextResponse.json({ events, counts })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser?.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { alert_key, type, title, message, threshold, current_value, config_id } = body

    if (!alert_key || !type || !title || !message) {
      return NextResponse.json({ error: 'alert_key, type, title and message are required.' }, { status: 400 })
    }

    const event = await createAlertEvent({ alert_key, type, title, message, threshold, current_value, config_id })
    return NextResponse.json(event, { status: 201 })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
