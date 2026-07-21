import 'server-only'

const RESEND_API_URL = 'https://api.resend.com/emails'

export async function sendOpsAlert(source: string, error: unknown): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.OPS_ALERT_EMAIL?.trim()
  if (!apiKey || !to) {
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  try {
    await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.OPS_ALERT_FROM?.trim() || 'alerts@resend.dev',
        to,
        subject: `[ALERT] ${source} failed`,
        text: `${source} failed at ${new Date().toISOString()}\n\n${message}${stack ? `\n\n${stack}` : ''}`,
      }),
    })
  }
  catch (sendError) {
    console.error('sendOpsAlert failed to send email', sendError)
  }
}
