import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { SocialRepository } from '@/lib/db/queries/social'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { userId } = await params
    const { error } = await SocialRepository.unbanUser(userId)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
