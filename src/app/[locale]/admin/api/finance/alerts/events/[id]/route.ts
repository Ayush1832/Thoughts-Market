import { isAdminAuthorized } from '@/lib/admin-auth-check'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { updateAlertEventStatus } from '@/lib/db/queries/finance'
import { UserRepository } from '@/lib/db/queries/user'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body as { status: 'dismissed' | 'resolved' }

    if (status !== 'dismissed' && status !== 'resolved') {
      return NextResponse.json({ error: 'status must be dismissed or resolved.' }, { status: 400 })
    }

    const updated = await updateAlertEventStatus(Number(id), status, currentUser.address ?? '')
    if (!updated) {
      return NextResponse.json({ error: 'Alert event not found.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
