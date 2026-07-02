import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { CreatorApplicationsRepository } from '@/lib/db/queries/creators'
import { UserRepository } from '@/lib/db/queries/user'

// GET /api/creators/follows — creator IDs the signed-in user follows.
export async function GET() {
  const user = await UserRepository.getCurrentUser({ minimal: true })
  if (!user) {
    return NextResponse.json({ data: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { data, error } = await CreatorApplicationsRepository.listFollowedCreatorIds(user.id)
  if (error) {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}

// POST /api/creators/follows { creatorId } — follow/unfollow (toggle).
export async function POST(request: NextRequest) {
  try {
    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { creatorId } = await request.json() as { creatorId?: string }
    if (!creatorId || typeof creatorId !== 'string') {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 })
    }

    const { data, error } = await CreatorApplicationsRepository.toggleFollow(user.id, creatorId)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ following: data?.following ?? false })
  }
  catch (e) {
    console.error('Creator follow error:', e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
