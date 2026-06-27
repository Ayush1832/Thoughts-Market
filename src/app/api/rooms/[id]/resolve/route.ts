import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

// POST /api/rooms/[id]/resolve { outcome: 'yes'|'no' } — host resolves the market.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user) { return NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }

    const { id } = await params
    const { outcome } = await request.json() as { outcome?: string }
    if (outcome !== 'yes' && outcome !== 'no') { return NextResponse.json({ error: 'Pick the winning outcome' }, { status: 400 }) }

    // resolveRoom verifies the caller is the room host.
    const { data, error } = await RoomsRepository.resolveRoom(id, user.id, outcome)
    if (error) { return NextResponse.json({ error }, { status: 400 }) }
    return NextResponse.json({ success: true, data })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
