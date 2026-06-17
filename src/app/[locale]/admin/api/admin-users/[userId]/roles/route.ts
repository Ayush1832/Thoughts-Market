import type { NextRequest } from 'next/server'
import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { NextResponse } from 'next/server'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RolesRepository } from '@/lib/db/queries/roles'
import { ADMIN_ROLES } from '@/lib/db/schema/auth/tables'

interface RouteProps {
  params: Promise<{ userId: string, locale: string }>
}

// Return the admin roles currently assigned to a user.
export async function GET(_request: NextRequest, { params }: RouteProps) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { userId } = await params
    const { data, error } = await RolesRepository.getRolesForUser(userId)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: { roles: data ?? [] } })
  }
  catch (error) {
    console.error('Get user roles error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

// Remove a single role from a user. Role is passed as a `?role=` query param.
export async function DELETE(request: NextRequest, { params }: RouteProps) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { userId } = await params
    const role = request.nextUrl.searchParams.get('role')

    if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }

    const { error } = await RolesRepository.removeRole(userId, role as AdminRole)
    if (error) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    return NextResponse.json({ data: { removed: role } })
  }
  catch (error) {
    console.error('Remove user role error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}

// Set a user's admin roles to exactly the provided set (add missing, remove extras).
export async function PUT(request: NextRequest, { params }: RouteProps) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const requested: string[] = Array.isArray(body.roles) ? body.roles : []

    const nextRoles = requested.filter(
      (r): r is AdminRole => (ADMIN_ROLES as readonly string[]).includes(r),
    )
    if (nextRoles.length === 0) {
      return NextResponse.json({ error: 'At least one valid role is required.' }, { status: 400 })
    }

    const { data: currentRoles, error: currentError } = await RolesRepository.getRolesForUser(userId)
    if (currentError) {
      return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
    }

    const current = new Set(currentRoles ?? [])
    const next = new Set(nextRoles)

    // Add roles that are newly selected.
    for (const role of next) {
      if (!current.has(role)) {
        const { error } = await RolesRepository.assignRole(userId, role)
        if (error) {
          return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
        }
      }
    }

    // Remove roles that were unchecked.
    for (const role of current) {
      if (!next.has(role)) {
        const { error } = await RolesRepository.removeRole(userId, role as AdminRole)
        if (error) {
          return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ data: { roles: nextRoles } })
  }
  catch (error) {
    console.error('Update user roles error:', error)
    return NextResponse.json({ error: DEFAULT_ERROR_MESSAGE }, { status: 500 })
  }
}
