import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

// POST /api/rooms/[id]/bet { choice: 'yes'|'no', amount: number }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user) { return NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

    const { id } = await params
    const { choice, amount } = await request.json() as { choice?: string, amount?: number }
    if (choice !== 'yes' && choice !== 'no') { return NextResponse.json({ error: 'Pick Yes or No' }, { status: 400 }) }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) { return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 }) }

    const { data, error } = await RoomsRepository.placeBet(id, user.id, choice, amt)
    if (error) { return NextResponse.json({ error }, { status: 400 }) }
    return NextResponse.json({ success: true, data })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
