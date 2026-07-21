'use server'

import { z } from 'zod'
import { isValidAddressForNetwork } from '@/lib/address-validation'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { debitTx } from '@/lib/db/queries/ledger'
import { UserRepository } from '@/lib/db/queries/user'
import { finance_transactions } from '@/lib/db/schema/finance/tables'
import { withdrawals } from '@/lib/db/schema/ledger/tables'
import { getCoinDecimalsOnNetwork, isCoinSupportedOnNetwork, SUPPORTED_DEPOSIT_NETWORKS } from '@/lib/deposit-chains'
import { db } from '@/lib/drizzle'
import { getUsdPrice } from '@/lib/pricing'
import { quoteWithdrawalFee } from '@/lib/withdrawal-fees'

const WithdrawalInputSchema = z.object({
  coin: z.string().trim().min(1).max(16),
  destNetwork: z.string().trim().min(1),
  amountUsd: z.string().regex(/^\d+(?:\.\d+)?$/, 'Invalid amount.'),
  toAddress: z.string().min(1),
}).refine(
  input => SUPPORTED_DEPOSIT_NETWORKS.includes(input.destNetwork) && isCoinSupportedOnNetwork(input.destNetwork, input.coin),
  { message: 'Unsupported coin or network.' },
).refine(
  input => isValidAddressForNetwork(input.destNetwork, input.toAddress),
  { message: 'Invalid destination address.' },
)

export type WithdrawalInput = z.input<typeof WithdrawalInputSchema>

function formatCoinAmount(value: number, decimals: number): string {
  return value.toFixed(Math.min(decimals, 18))
}

export interface WithdrawalQuoteResult {
  error: string | null
  data: {
    amountUsd: number
    feeUsd: number
    netUsd: number
    coinAmount: string
    price: number
    minUsd: number
  } | null
}

export async function getWithdrawalQuoteAction(
  input: { coin: string, destNetwork: string, amountUsd: string },
): Promise<WithdrawalQuoteResult> {
  const amountUsd = Number(input.amountUsd)
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { error: 'Invalid amount.', data: null }
  }
  if (!SUPPORTED_DEPOSIT_NETWORKS.includes(input.destNetwork) || !isCoinSupportedOnNetwork(input.destNetwork, input.coin)) {
    return { error: 'Unsupported coin or network.', data: null }
  }

  const quote = quoteWithdrawalFee(input.destNetwork, amountUsd)
  if (!quote) {
    return { error: 'Unsupported network.', data: null }
  }
  if (quote.belowMinimum) {
    return { error: `Minimum withdrawal is $${quote.minUsd}.`, data: null }
  }

  try {
    const price = await getUsdPrice(input.coin)
    const decimals = getCoinDecimalsOnNetwork(input.destNetwork, input.coin) ?? 6
    const coinAmount = formatCoinAmount(quote.netUsd / price, decimals)
    return {
      error: null,
      data: { amountUsd, feeUsd: quote.totalFee, netUsd: quote.netUsd, coinAmount, price, minUsd: quote.minUsd },
    }
  }
  catch {
    return { error: 'Price unavailable, please try again.', data: null }
  }
}

export interface WithdrawalActionResult {
  error: string | null
  data: { id: string } | null
}

export async function requestWithdrawalAction(input: WithdrawalInput): Promise<WithdrawalActionResult> {
  const parsed = WithdrawalInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.', data: null }
  }

  const amountUsd = Number(parsed.data.amountUsd)
  const quote = quoteWithdrawalFee(parsed.data.destNetwork, amountUsd)
  if (!quote) {
    return { error: 'Unsupported network.', data: null }
  }
  if (quote.belowMinimum) {
    return { error: `Minimum withdrawal is $${quote.minUsd}.`, data: null }
  }

  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    return { error: 'Unauthenticated.', data: null }
  }

  let price: number
  try {
    price = await getUsdPrice(parsed.data.coin)
  }
  catch {
    return { error: 'Price unavailable, please try again.', data: null }
  }

  const decimals = getCoinDecimalsOnNetwork(parsed.data.destNetwork, parsed.data.coin) ?? 6
  const coinAmount = formatCoinAmount(quote.netUsd / price, decimals)
  if (Number(coinAmount) <= 0) {
    return { error: 'Amount is too small after fees.', data: null }
  }

  try {
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(withdrawals)
        .values({
          user_id: user.id,
          coin: parsed.data.coin,
          amount: coinAmount,
          usd_amount: parsed.data.amountUsd,
          fee_usd: String(quote.totalFee),
          dest_network: parsed.data.destNetwork,
          dest_coin: parsed.data.coin,
          to_address: parsed.data.toAddress,
          status: 'pending',
        })
        .returning({ id: withdrawals.id })

      await debitTx(tx, {
        userId: user.id,
        currency: 'USDC',
        amount: parsed.data.amountUsd,
        type: 'withdrawal',
        reference: row!.id,
        metadata: {
          coin: parsed.data.coin,
          network: parsed.data.destNetwork,
          coinAmount,
          feeUsd: quote.totalFee,
        },
      })

      await tx.insert(finance_transactions).values({
        user_id: user.id,
        withdrawal_id: row!.id,
        wallet_address: parsed.data.toAddress,
        type: 'withdrawal',
        amount: coinAmount,
        currency: parsed.data.coin,
        status: 'pending',
        method: 'Crypto Withdrawal',
      })

      return row!.id
    })

    return { error: null, data: { id } }
  }
  catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return { error: 'Insufficient balance.', data: null }
    }
    console.error('Withdrawal request failed', error)
    return { error: DEFAULT_ERROR_MESSAGE, data: null }
  }
}
