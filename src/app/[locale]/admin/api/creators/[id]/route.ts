import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { CreatorApplicationsRepository } from '@/lib/db/queries/creators'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { id } = await params
    const { data, error } = await CreatorApplicationsRepository.toggleActive(id)

    if (error || !data) {
      return NextResponse.json({ error: error ?? DEFAULT_ERROR_MESSAGE }, { status: 400 })
    }

    return NextResponse.json({ application: data })
  }
  catch {
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
