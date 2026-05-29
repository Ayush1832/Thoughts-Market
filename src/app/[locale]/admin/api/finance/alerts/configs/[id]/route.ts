import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { toggleAlertConfig } from '@/lib/db/queries/finance'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser?.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { is_enabled } = body

    if (typeof is_enabled !== 'boolean') {
      return NextResponse.json({ error: 'is_enabled must be a boolean.' }, { status: 400 })
    }

    const updated = await toggleAlertConfig(Number(id), is_enabled, currentUser.address ?? '')
    if (!updated) {
      return NextResponse.json({ error: 'Alert config not found.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
