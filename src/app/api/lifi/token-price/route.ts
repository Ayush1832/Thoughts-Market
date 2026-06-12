import { getTokens } from '@lifi/sdk'
import { NextResponse } from 'next/server'
import { ensureLiFiServerConfig } from '@/lib/lifi'

// Returns the USD price of a token on a given chain, so the withdraw form can
// convert between USDC (the balance) and the selected receive token.
// GET /api/lifi/token-price?chainId=137&symbol=POL
export async function GET(request: Request) {
  await ensureLiFiServerConfig()

  const { searchParams } = new URL(request.url)
  const chainId = Number(searchParams.get('chainId'))
  const symbol = (searchParams.get('symbol') ?? '').toUpperCase()

  if (!chainId || !symbol) {
    return NextResponse.json({ error: 'Missing chainId or symbol.' }, { status: 400 })
  }

  try {
    const res = await getTokens({ chains: [chainId] })
    const tokens = res.tokens[chainId] ?? []
    const token = tokens.find(t => t.symbol.toUpperCase() === symbol)
      ?? tokens.find(t => t.symbol.toUpperCase().includes(symbol))
    const priceUSD = Number(token?.priceUSD ?? 0)
    if (!priceUSD) {
      return NextResponse.json({ error: 'Price unavailable.' }, { status: 404 })
    }
    return NextResponse.json({ priceUSD })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch token price.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
