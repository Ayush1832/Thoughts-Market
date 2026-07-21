import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

// POST /api/rooms/join-by-code { code }
export async function POST(request: NextRequest) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { code } = await request.json() as { code: string }
    if (!code?.trim()) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 })
    }

    const { data: room } = await RoomsRepository.getRoomByCode(code.trim())
    if (!room) {
      return NextResponse.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 })
    }

    const { data, error } = await RoomsRepository.joinRoom(room.id, user.id)
    if (error || !data) {
      return NextResponse.json({ error: error ?? DEFAULT_ERROR_MESSAGE }, { status: 400 })
    }

    return NextResponse.json({ room, participant: data })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
