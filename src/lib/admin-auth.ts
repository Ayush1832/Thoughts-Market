import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import 'server-only'

// Lightweight, self-contained admin username/password auth — completely
// separate from the wallet (SIWE) login. Sessions are signed cookies (HMAC),
// passwords are scrypt-hashed. The bootstrap super admin comes from env.

const SECRET = process.env.BETTER_AUTH_SECRET ?? 'dev-admin-secret-change-me'
export const ADMIN_SESSION_COOKIE = 'tm_admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 hours

// ── Password hashing (scrypt) ──────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) {
    return false
  }
  const hashBuf = Buffer.from(hash, 'hex')
  const test = scryptSync(password, salt, 64)
  return hashBuf.length === test.length && timingSafeEqual(hashBuf, test)
}

// ── Signed session token ────────────────────────────────────────────────────
export interface AdminSessionPayload {
  sub: string // credential id
  username: string
  role: string
  exp: number
}

export function signAdminSession(data: Omit<AdminSessionPayload, 'exp'>): string {
  const payload: AdminSessionPayload = { ...data, exp: Date.now() + SESSION_TTL_MS }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyAdminSession(token?: string | null): AdminSessionPayload | null {
  if (!token) {
    return null
  }
  const [body, sig] = token.split('.')
  if (!body || !sig) {
    return null
  }
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminSessionPayload
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null
    }
    return payload
  }
  catch {
    return null
  }
}

// ── Credential verification (bootstrap super admin from env + DB accounts) ──
export async function verifyAdminLogin(
  username: string,
  password: string,
): Promise<{ id: string, username: string, role: string } | null> {
  const u = username.trim().toLowerCase()
  if (!u || !password) {
    return null
  }

  // 1) Bootstrap super admin from env (works without any DB seed).
  const envEmail = process.env.ADMIN_LOGIN_EMAIL?.trim().toLowerCase()
  const envPassword = process.env.ADMIN_LOGIN_PASSWORD
  if (envEmail && envPassword && u === envEmail && password === envPassword) {
    return { id: `env:${envEmail}`, username: envEmail, role: 'super_admin' }
  }

  // 2) In-app accounts (admin_credentials table) — TODO: wire up once the
  //    credentials table + repository are migrated. For now only the env
  //    bootstrap super admin can log in via username/password.

  return null
}
