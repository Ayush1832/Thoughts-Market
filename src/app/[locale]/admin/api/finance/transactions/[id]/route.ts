import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { UserRepository } from '@/lib/db/queries/user'
import { updateTransactionStatus } from '@/lib/db/queries/finance'
import type { TxStatus } from '@/lib/db/queries/finance'

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
    const { status } = body as { status: TxStatus }

    const validStatuses: TxStatus[] = ['pending', 'completed', 'failed', 'chargeback']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const tx = await updateTransactionStatus(id, status, currentUser.address ?? '')
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
    }

    return NextResponse.json(tx)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
