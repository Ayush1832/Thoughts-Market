import type { NextRequest } from 'next/server'
import type { AdminRole } from '@/lib/db/schema/auth/tables'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/admin-auth'
import { isAdminAuthorized } from '@/lib/admin-auth-check'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { RolesRepository } from '@/lib/db/queries/roles'
import { ADMIN_ROLES, accounts, users } from '@/lib/db/schema/auth/tables'
import { db } from '@/lib/drizzle'

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password } = body

    // Accept either a single `role` or a `roles` array (multi-select).
    const requestedRoles: string[] = Array.isArray(body.roles)
      ? body.roles
      : (body.role ? [body.role] : [])

    if (!email || !password || requestedRoles.length === 0) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const validRoles = requestedRoles.filter(
      (r): r is AdminRole => (ADMIN_ROLES as readonly string[]).includes(r),
    )
    if (validRoles.length === 0) {
      return NextResponse.json({ error: 'No valid roles selected.' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    // Check if user with this email already exists
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, normalizedEmail),
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists.' }, { status: 409 })
    }

    const username = normalizedEmail.split('@')[0]
    // address has a UNIQUE constraint; make it deterministic-unique per email.
    const address = `admin:${normalizedEmail}`

    // Let the database generate the CHAR(26) ULID id via its default.
    const newUser = await db
      .insert(users)
      .values({
        id: sql`generate_ulid()`,
        email: normalizedEmail,
        username,
        address,
        email_verified: true,
      })
      .returning()

    if (!newUser[0]) {
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 })
    }

    const createdUserId = newUser[0].id

    // Store the hashed password in the accounts table (credential provider).
    await db
      .insert(accounts)
      .values({
        id: sql`generate_ulid()`,
        user_id: createdUserId,
        account_id: normalizedEmail,
        provider_id: 'credential',
        password: hashPassword(password),
      })

    // Assign each selected role.
    for (const role of validRoles) {
      const roleResult = await RolesRepository.assignRole(createdUserId, role)
      if (roleResult.error) {
        return NextResponse.json({ error: roleResult.error }, { status: 500 })
      }
    }

    return NextResponse.json({
      data: {
        userId: createdUserId,
        email: newUser[0].email,
        roles: validRoles,
        message: 'Admin user created successfully.',
      },
    }, { status: 201 })
  }
  catch (error) {
    console.error('Create admin user error:', error)
    return NextResponse.json(
      {
        error: DEFAULT_ERROR_MESSAGE,
        ...(process.env.NODE_ENV !== 'production'
          ? { detail: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { status: 500 },
    )
  }
}
