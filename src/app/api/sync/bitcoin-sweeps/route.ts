import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/auth-cron'
import { runBitcoinSweep } from '@/lib/bitcoin-sweeper'
import { sendOpsAlert } from '@/lib/ops-alert'

export const maxDuration = 300

async function handleRequest(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 })
  }

  try {
    const result = await runBitcoinSweep()
    return NextResponse.json({ success: true, ...result })
  }
  catch (error) {
    console.error('bitcoin-sweep failed', error)
    await sendOpsAlert('bitcoin-sweep', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  return handleRequest(request)
}

export async function POST(request: Request) {
  return handleRequest(request)
}
