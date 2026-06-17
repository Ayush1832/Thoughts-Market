import type { NextRequest } from 'next/server'
import type { CreatorApplicationStatus } from '@/lib/db/schema/creators/tables'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { CreatorApplicationsRepository } from '@/lib/db/queries/creators'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const status = (searchParams.get('status') ?? 'all') as CreatorApplicationStatus | 'all'
    const limit = Number(searchParams.get('limit') ?? 50)
    const offset = Number(searchParams.get('offset') ?? 0)

    const { data, error } = await CreatorApplicationsRepository.list({ status, limit, offset })
    if (error || !data) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: data.rows, totalCount: data.total })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const user = await UserRepository.getCurrentUser({ minimal: true })
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json() as { id: string, status: CreatorApplicationStatus, notes?: string }
    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'id and status are required.' }, { status: 400 })
    }

    const { data, error } = await CreatorApplicationsRepository.review(body.id, user.id, body.status, body.notes)
    if (error || !data) {
      return NextResponse.json({ error: error ?? DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ application: data })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
