import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { listFeeConfigs } from '@/lib/db/queries/finance'

export async function GET() {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
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
