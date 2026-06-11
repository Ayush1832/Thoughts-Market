import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAdminAccess } from '@/lib/admin-guard'
import { canAccessSection } from '@/lib/admin-permissions'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RolesRepository } from '@/lib/db/queries/roles'

export async function GET(_request: NextRequest) {
  try {
    // Accept either auth method (username/password cookie OR wallet admin)
    // and require access to the Roles section.
    const allowed = await getAdminAccess()
    if (!canAccessSection(allowed, 'roles')) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { data, error } = await RolesRepository.listRoles()
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], totalCount: data?.length ?? 0 })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
