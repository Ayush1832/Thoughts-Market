import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { SupportRepository } from '@/lib/db/queries/support'
import { UserRepository } from '@/lib/db/queries/user'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/db/schema/support/tables'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, priority, assigned_to, resolution_notes } = body

    if (status && !(TICKET_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }
    if (priority && !(TICKET_PRIORITIES as readonly string[]).includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority.' }, { status: 400 })
    }

    const { data, error } = await SupportRepository.updateTicket(id, {
      status,
      priority,
      assigned_to: assigned_to ?? undefined,
      resolution_notes: resolution_notes ?? undefined,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 404 })
    }

    return NextResponse.json({ data })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
