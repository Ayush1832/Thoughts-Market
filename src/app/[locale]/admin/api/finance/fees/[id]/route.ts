import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { updateFeeConfig } from '@/lib/db/queries/finance'
import { UserRepository } from '@/lib/db/queries/user'

export async function PUT(
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
    const { rate_percent } = body

    const rate = Number(rate_percent)
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json({ error: 'Invalid rate_percent (0–100).' }, { status: 400 })
    }

    const updated = await updateFeeConfig(Number(id), rate, currentUser.address ?? '')
    if (!updated) {
      return NextResponse.json({ error: 'Fee config not found.' }, { status: 404 })
    }

    return NextResponse.json(updated)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
