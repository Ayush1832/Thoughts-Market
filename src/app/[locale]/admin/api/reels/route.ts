import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { ReelsRepository } from '@/lib/db/queries/reels'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const limit = Number(searchParams.get('limit') ?? 50)
    const offset = Number(searchParams.get('offset') ?? 0)
    const search = searchParams.get('search') ?? undefined
    const type = searchParams.get('type') ?? undefined
    const status = searchParams.get('status') ?? undefined

    const { data, error } = await ReelsRepository.listReels({ limit, offset, search, type: type as any, status: status as any })
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: data?.rows ?? [], totalCount: data?.total ?? 0 })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { title, url, type } = body

    if (!title?.trim() || !url?.trim() || !type) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const { data, error } = await ReelsRepository.createReel({ title: title.trim(), url: url.trim(), type })
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
