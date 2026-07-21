import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { ReelsRepository } from '@/lib/db/queries/reels'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, is_featured } = body

    if (status !== undefined) {
      const { data, error } = await ReelsRepository.updateReelStatus(id, status)
      if (error) {
        return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    if (is_featured !== undefined) {
      const { data, error } = await ReelsRepository.toggleFeatured(id, is_featured)
      if (error) {
        return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
      }
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { id } = await params
    const { error } = await ReelsRepository.deleteReel(id)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
