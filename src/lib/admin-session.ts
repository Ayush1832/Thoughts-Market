import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'

const SESSION_SECRET = process.env.SESSION_SECRET || 'admin_session_secret_key_change_in_production'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface AdminSessionData {
  email: string
  roles: string[]
}

/**
 * Create a signed admin session token. The signed payload is
 * `email:timestamp:role1,role2` so the roles cannot be tampered with
 * client-side. Multiple roles are comma-separated.
 */
export function createAdminSession(email: string, roles: string[]): string {
  const timestamp = Date.now()
  const data = `${email}:${timestamp}:${roles.join(',')}`
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
  hmac.update(data)
  return `${Buffer.from(data).toString('base64')}.${hmac.digest('hex')}`
}

/**
 * Verify the admin_session cookie and return its payload (email + role),
 * or null if missing / tampered / expired.
 */
export async function getAdminSession(): Promise<AdminSessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('admin_session')?.value

    if (!sessionToken) {
      return null
    }

    const parts = sessionToken.split('.')
    if (parts.length !== 2) {
      return null
    }

    const [encodedData, signature] = parts

    let data: string
    try {
      data = Buffer.from(encodedData, 'base64').toString()
    }
    catch {
      return null
    }

    // Verify HMAC signature (signs the decoded data, not the base64).
    const hmac = crypto.createHmac('sha256', SESSION_SECRET)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex')

    if (signature !== expectedSignature) {
      return null
    }

    const [email, timestamp, roleSegment] = data.split(':')
    if (!email || !timestamp) {
      return null
    }

    const age = Date.now() - Number.parseInt(timestamp, 10)
    if (Number.isNaN(age) || age >= MAX_AGE_MS) {
      return null
    }

    const roles = (roleSegment ? roleSegment.split(',') : [])
      .map(r => r.trim())
      .filter(Boolean)

    return { email, roles: roles.length > 0 ? roles : ['super_admin'] }
  }
  catch {
    return null
  }
}

/** Boolean check used by API route guards. */
export async function verifyAdminSession(): Promise<boolean> {
  return (await getAdminSession()) !== null
}

export async function getAdminEmail(): Promise<string | null> {
  const session = await getAdminSession()
  return session?.email ?? null
}

export async function getAdminRoles(): Promise<string[]> {
  const session = await getAdminSession()
  return session?.roles ?? []
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  cookieStore.delete('admin_email')
  cookieStore.delete('admin_role')
}
