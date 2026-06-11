import { cookies } from 'next/headers'
import crypto from 'crypto'

const ADMIN_EMAIL = 'admin@thoughtsmarket.com'
const SESSION_SECRET = process.env.SESSION_SECRET || 'admin_session_secret_key_change_in_production'

export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('admin_session')?.value
    const adminEmail = cookieStore.get('admin_email')?.value

    if (!sessionToken || !adminEmail) {
      return false
    }

    // Verify email is correct
    if (adminEmail !== ADMIN_EMAIL) {
      return false
    }

    // Verify session token signature
    const parts = sessionToken.split('.')
    if (parts.length !== 2) {
      return false
    }

    const [encodedData, signature] = parts

    // Decode the data first
    let data: string
    try {
      data = Buffer.from(encodedData, 'base64').toString()
    }
    catch {
      return false
    }

    // Verify HMAC signature (must sign the original data, not the base64)
    const hmac = crypto.createHmac('sha256', SESSION_SECRET)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex')

    if (signature !== expectedSignature) {
      return false
    }

    // Verify timestamp (session not too old)
    const [, timestamp] = data.split(':')
    const age = Date.now() - parseInt(timestamp)
    const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

    return age < maxAge
  }
  catch {
    return false
  }
}

export async function getAdminEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get('admin_email')?.value || null
  }
  catch {
    return null
  }
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  cookieStore.delete('admin_email')
}
