import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/admin-session'

export async function POST() {
  try {
    await clearAdminSession()

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear cookies
    response.cookies.delete('admin_session')
    response.cookies.delete('admin_email')

    return response
  }
  catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 },
    )
  }
}
