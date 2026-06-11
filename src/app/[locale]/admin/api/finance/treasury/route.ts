import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { NextResponse } from 'next/server'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { getTreasuryStats } from '@/lib/db/queries/finance'
import { UserRepository } from '@/lib/db/queries/user'

export async function GET() {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const stats = await getTreasuryStats()
    return NextResponse.json(stats)
  }
  catch (e) {
    console.error(e)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
