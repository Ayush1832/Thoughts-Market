import { verifyAdminSession } from '@/lib/admin-session'

export async function isAdminAuthorized(): Promise<boolean> {
  try {
    // Check for valid admin session (email/password login)
    return await verifyAdminSession()
  }
  catch {
    return false
  }
}
