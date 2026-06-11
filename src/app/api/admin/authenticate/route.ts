import { NextResponse } from 'next/server'
import crypto from 'crypto'

const ADMIN_EMAIL = 'admin@thoughtsmarket.com'
const ADMIN_PASSWORD = 'p@ssw0RD'
const SESSION_SECRET = process.env.SESSION_SECRET || 'admin_session_secret_key_change_in_production'

function createAdminSession(email: string): string {
  const timestamp = Date.now()
  const data = `${email}:${timestamp}`
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
  hmac.update(data)
  return `${Buffer.from(data).toString('base64')}.${hmac.digest('hex')}`
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

    // Verify credentials
    if (email.toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 },
      )
    }

    // Create secure session
    const sessionToken = createAdminSession(ADMIN_EMAIL)

    // Return response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful',
    })

    // Set secure session cookie (7 days)
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Set admin email cookie (for display purposes)
    response.cookies.set('admin_email', ADMIN_EMAIL, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

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
