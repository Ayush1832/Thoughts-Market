import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { SupportRepository } from '@/lib/db/queries/support'
import { UserRepository } from '@/lib/db/queries/user'
import type { TicketCategory, TicketStatus } from '@/lib/db/schema/support/tables'
import { TICKET_CATEGORIES, TICKET_STATUSES } from '@/lib/db/schema/support/tables'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const limitParam = Number.parseInt(searchParams.get('limit') || '50')
    const limit = Number.isNaN(limitParam) ? 50 : Math.min(limitParam, 100)

    const offsetParam = Number.parseInt(searchParams.get('offset') || '0')
    const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0)

    const search = searchParams.get('search') || undefined
    const statusParam = searchParams.get('status') as TicketStatus | null
    const categoryParam = searchParams.get('category') as TicketCategory | null
    const sortBy = (searchParams.get('sortBy') as 'created_at' | 'updated_at' | 'priority' | 'status') || 'created_at'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    const status = statusParam && (TICKET_STATUSES as readonly string[]).includes(statusParam) ? statusParam : null
    const category = categoryParam && (TICKET_CATEGORIES as readonly string[]).includes(categoryParam) ? categoryParam : null

    const { data, count, error } = await SupportRepository.listTickets({
      limit,
      offset,
      search,
      status,
      category,
      sortBy,
      sortOrder,
    })

    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], totalCount: count ?? 0 })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { category, subject, description, priority, user_id } = body

    if (!category || !(TICKET_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }
    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Subject and description are required.' }, { status: 400 })
    }

    const { data, error } = await SupportRepository.createTicket({
      user_id: user_id || undefined,
      category,
      subject: subject.trim(),
      description: description.trim(),
      priority,
    })

    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
