import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/admin-auth'
import { createAdminSession } from '@/lib/admin-session'
import { RolesRepository } from '@/lib/db/queries/roles'
import { db } from '@/lib/drizzle'

// Hardcoded bootstrap super admin (full access).
const ADMIN_EMAIL = 'admin@thoughtsmarket.com'
const ADMIN_PASSWORD = 'p@ssw0RD'

/**
 * Resolve a login to { email, role } or null.
 *  1. Hardcoded bootstrap super admin.
 *  2. A database user that has an admin role + a credential account password.
 */
async function resolveAdminLogin(
  email: string,
  password: string,
): Promise<{ email: string, roles: string[] } | null> {
  const normalizedEmail = email.trim().toLowerCase()

  // 1) Bootstrap super admin.
  if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return { email: ADMIN_EMAIL, roles: ['super_admin'] }
  }

  // 2) Database admin user.
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalizedEmail),
  })
  if (!user) {
    return null
  }

  // The credential account holds the hashed password.
  const account = await db.query.accounts.findFirst({
    where: (a, { and, eq }) => and(eq(a.user_id, user.id), eq(a.provider_id, 'credential')),
  })
  if (!account?.password || !verifyPassword(password, account.password)) {
    return null
  }

  // Must have at least one assigned admin role; carry ALL of them.
  const { data: roles } = await RolesRepository.getRolesForUser(user.id)
  if (!roles || roles.length === 0) {
    return null
  }

  return { email: normalizedEmail, roles }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }

    const resolved = await resolveAdminLogin(email, password)
    if (!resolved) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    const sessionToken = createAdminSession(resolved.email, resolved.roles)

    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful',
      roles: resolved.roles,
    })

    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    }

    response.cookies.set('admin_session', sessionToken, { ...cookieOptions, httpOnly: true })
    response.cookies.set('admin_email', resolved.email, cookieOptions)
    response.cookies.set('admin_role', resolved.roles.join(','), cookieOptions)

    return response
  }
  catch (error: any) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 },
    )
  }
}
