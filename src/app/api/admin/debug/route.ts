import { verifyAdminSession, getAdminEmail } from '@/lib/admin-session'

export async function GET() {
  try {
    const isValid = await verifyAdminSession()
    const email = await getAdminEmail()

    return Response.json({
      isValid,
      email,
      message: 'Admin session debug info',
    })
  }
  catch (error: any) {
    console.error('Debug error:', error)
    return Response.json(
      { error: error.message },
      { status: 500 },
    )
  }
}
