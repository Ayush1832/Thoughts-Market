import type { NextRequest } from 'next/server'
import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { NextResponse } from 'next/server'
import { getAdminAccess } from '@/lib/admin-guard'
import { canAccessSection } from '@/lib/admin-permissions'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RolesRepository } from '@/lib/db/queries/roles'
import { ADMIN_ROLES } from '@/lib/db/schema/auth/tables'

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const allowed = await getAdminAccess()
    if (!canAccessSection(allowed, 'roles')) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { role } = body as { role: AdminRole }

    if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    const { data, error } = await RolesRepository.assignRole(userId, role)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const allowed = await getAdminAccess()
    if (!canAccessSection(allowed, 'roles')) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { role } = body as { role: AdminRole }

    if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    const { error } = await RolesRepository.removeRole(userId, role)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
