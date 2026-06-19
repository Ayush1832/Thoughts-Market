import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { CreatorApplicationsRepository } from '@/lib/db/queries/creators'

// Public directory of approved/verified creators for Creators Corner (User Mode).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const niche = searchParams.get('niche') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const limit = Number(searchParams.get('limit') ?? 60)
    const offset = Number(searchParams.get('offset') ?? 0)

    const [creatorsRes, nichesRes] = await Promise.all([
      CreatorApplicationsRepository.listPublicCreators({ niche, search, limit, offset }),
      CreatorApplicationsRepository.nicheCounts(),
    ])

    if (creatorsRes.error || nichesRes.error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        creators: creatorsRes.data ?? [],
        niches: nichesRes.data?.niches ?? [],
        total: nichesRes.data?.total ?? 0,
      },
    })
  }
  catch (error) {
    console.error('Public creators API error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
