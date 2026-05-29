import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { listFeeConfigs } from '@/lib/db/queries/finance'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET() {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser?.is_admin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const fees = await listFeeConfigs()
    return NextResponse.json(fees)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
