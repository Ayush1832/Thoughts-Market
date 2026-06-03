import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RoomsRepository } from '@/lib/db/queries/rooms'
import { UserRepository } from '@/lib/db/queries/user'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const { id } = await params
    await RoomsRepository.leaveRoom(id, user.id)

    return NextResponse.json({ success: true })
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
