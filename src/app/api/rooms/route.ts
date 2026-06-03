import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

// GET /api/rooms — list public rooms + user's rooms
export async function GET() {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })

    const [publicResult, userResult] = await Promise.all([
      RoomsRepository.listPublicRooms(),
      user ? RoomsRepository.listUserRooms(user.id) : { data: [], error: null },
    ])

    return NextResponse.json({
      public: publicResult.data ?? [],
      mine: userResult.data ?? [],
    })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

// POST /api/rooms — create a new room
export async function POST(request: NextRequest) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const { name, maxParticipants, isPrivate } = body as {
      name?: string
      maxParticipants?: number
      isPrivate?: boolean
    }

    if (!name?.trim())
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 })

    const { data, error } = await RoomsRepository.createRoom(
      user.id,
      name.trim(),
      maxParticipants ?? 50,
      isPrivate ?? false,
    )

    if (error || !data)
      return NextResponse.json({ error: error ?? DEFAULT_ERROR_MESSAGE }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
