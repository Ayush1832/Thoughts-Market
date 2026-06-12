import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { SocialRepository } from '@/lib/db/queries/social'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const limit = Number(searchParams.get('limit') ?? 50)
    const offset = Number(searchParams.get('offset') ?? 0)
    const status = searchParams.get('status') ?? undefined
    const content_type = searchParams.get('content_type') ?? undefined

    const { data, error } = await SocialRepository.listReports({ limit, offset, status: status as any, content_type: content_type as any })
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: data?.rows ?? [], totalCount: data?.total ?? 0 })
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

    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, notes } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const { data, error } = await SocialRepository.updateReportStatus(id, status, notes ?? null, currentUser.id)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
