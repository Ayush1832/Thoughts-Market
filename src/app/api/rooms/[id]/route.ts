import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

// GET /api/rooms/[id] — get room details with participants
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { data, error } = await RoomsRepository.getRoomWithParticipants(id)

    if (error || !data)
      return NextResponse.json({ error: error ?? 'Room not found' }, { status: 404 })

    // Invite-only rooms are viewable only by their participants.
    if (data.is_private) {
      const user = await UserRepository.getCurrentUser({ minimal: true })
      const isParticipant = Boolean(user) && data.participants.some(p => p.user_id === user!.id)
      if (!isParticipant)
        return NextResponse.json({ error: 'This room is invite-only.' }, { status: 403 })
    }

    return NextResponse.json(data)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
