import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ADMIN_ROLES } from '@/lib/db/schema/auth/tables'
import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RolesRepository } from '@/lib/db/queries/roles'
import { UserRepository } from '@/lib/db/queries/user'

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
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
    const currentUser = await UserRepository.getCurrentUser({ minimal: true })
    if (!currentUser || !currentUser.is_admin) {
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
