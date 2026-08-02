import { getWalletBalances } from '@lifi/sdk'
import { NextResponse } from 'next/server'
import { ensureLiFiServerConfig } from '@/lib/lifi'

interface BalancesRequestBody {
  walletAddress: string
}

export async function POST(request: Request) {
  await ensureLiFiServerConfig()

  let body: BalancesRequestBody
  try {
    body = await request.json()
  }
  catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!body.walletAddress) {
    return NextResponse.json({ error: 'walletAddress is required.' }, { status: 400 })
  }

  try {
    const balances = await getWalletBalances(body.walletAddress)
    return NextResponse.json({ balances })
  }
  catch {
    // LI.FI's /wallets/{address}/balances indexer endpoint has been permanently
    // deprecated upstream (returns 410 for every wallet). Degrade to an empty
    // balances map rather than surfacing a 500 until this is redesigned around
    // a curated token allowlist + getTokenBalances RPC calls.
    return NextResponse.json({ balances: {} })
  }
}
