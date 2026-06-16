import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

// POST /api/rooms/[id]/kick { userId } — host removes a player from the room.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { id } = await params
    const { userId } = await request.json() as { userId?: string }
    if (!userId)
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    // kickParticipant verifies the caller is the room host.
    const { error } = await RoomsRepository.kickParticipant(id, user.id, userId)
    if (error)
      return NextResponse.json({ error }, { status: 400 })

    return NextResponse.json({ success: true })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
