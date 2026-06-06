import type { TokenExtended } from '@lifi/types'
import { getQuote, getTokens } from '@lifi/sdk'
import { NextResponse } from 'next/server'
import { isAddress, parseUnits } from 'viem'
import { sanitizeNumericInput } from '@/lib/amount-input'
import { COLLATERAL_TOKEN_ADDRESS } from '@/lib/contracts'
import { ensureLiFiServerConfig } from '@/lib/lifi'
import { DEFAULT_CHAIN_ID } from '@/lib/network'

// Cross-chain withdrawal quote: bridge USDC from the (Polygon) deposit wallet to
// a recipient on another chain. Returns the full LI.FI quote, including the
// `transactionRequest` to execute on Polygon via the deposit wallet.

interface WithdrawQuoteBody {
  toChainId: number
  fromAddress: string // deposit wallet (Polygon)
  toAddress: string // recipient on the destination chain
  amount: string // human USDC amount
}

// Destination chains we support for cross-chain withdrawals.
const SUPPORTED_TO_CHAINS = new Set<number>([1, 8453, 42161]) // Ethereum, Base, Arbitrum

function findUsdcToken(tokens: TokenExtended[]) {
  return tokens.find(t => t.symbol.toUpperCase() === 'USDC')
    ?? tokens.find(t => t.symbol.toUpperCase().includes('USDC'))
}

export async function POST(request: Request) {
  await ensureLiFiServerConfig()

  let body: WithdrawQuoteBody
  try {
    body = await request.json()
  }
  catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const toChainId = Number(body.toChainId)
  if (!SUPPORTED_TO_CHAINS.has(toChainId)) {
    return NextResponse.json({ error: 'Unsupported destination chain.' }, { status: 400 })
  }
  if (!isAddress(body.fromAddress) || !isAddress(body.toAddress)) {
    return NextResponse.json({ error: 'Invalid address.' }, { status: 400 })
  }

  const sanitizedAmount = sanitizeNumericInput(body.amount ?? '')
  if (!sanitizedAmount) {
    return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  }

  let fromAmount: string
  try {
    const raw = parseUnits(sanitizedAmount, 6) // USDC has 6 decimals
    if (raw <= 0n) {
      return NextResponse.json({ error: 'Amount must be greater than zero.' }, { status: 400 })
    }
    fromAmount = raw.toString()
  }
  catch {
    return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
  }

  try {
    // Resolve USDC on the destination chain.
    const tokensResponse = await getTokens({ extended: true, chains: [toChainId] })
    const destUsdc = findUsdcToken(tokensResponse.tokens[toChainId] ?? [])
    if (!destUsdc) {
      return NextResponse.json({ error: 'USDC not available on the destination chain.' }, { status: 400 })
    }

    const quote = await getQuote({
      fromChain: DEFAULT_CHAIN_ID, // Polygon
      toChain: toChainId,
      fromToken: COLLATERAL_TOKEN_ADDRESS, // Polygon USDC
      toToken: destUsdc.address,
      fromAddress: body.fromAddress, // deposit wallet
      toAddress: body.toAddress, // recipient on destination chain
      fromAmount,
    })

    return NextResponse.json({ quote })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch withdrawal quote.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
