'use server'

import { isAddress } from 'viem'
import { z } from 'zod'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import { debitTx } from '@/lib/db/queries/ledger'
import { UserRepository } from '@/lib/db/queries/user'
import { withdrawals } from '@/lib/db/schema/ledger/tables'
import { isCoinSupportedOnNetwork, SUPPORTED_DEPOSIT_NETWORKS } from '@/lib/deposit-chains'
import { db } from '@/lib/drizzle'

const WithdrawalInputSchema = z.object({
  coin: z.string().trim().min(1).max(16),
  amount: z.string().regex(/^\d+(?:\.\d+)?$/, 'Invalid amount.'),
  destNetwork: z.string().trim().min(1),
  toAddress: z.string().refine(value => isAddress(value), 'Invalid destination address.'),
}).refine(
  input => SUPPORTED_DEPOSIT_NETWORKS.includes(input.destNetwork) && isCoinSupportedOnNetwork(input.destNetwork, input.coin),
  { message: 'Unsupported coin or network.' },
)

export type WithdrawalInput = z.input<typeof WithdrawalInputSchema>

export interface WithdrawalActionResult {
  error: string | null
  data: { id: string } | null
}

export async function requestWithdrawalAction(input: WithdrawalInput): Promise<WithdrawalActionResult> {
  const parsed = WithdrawalInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.', data: null }
  }
  if (Number(parsed.data.amount) <= 0) {
    return { error: 'Invalid amount.', data: null }
  }

  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    return { error: 'Unauthenticated.', data: null }
  }

  try {
    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(withdrawals)
        .values({
          user_id: user.id,
          coin: parsed.data.coin,
          amount: parsed.data.amount,
          dest_network: parsed.data.destNetwork,
          dest_coin: parsed.data.coin,
          to_address: parsed.data.toAddress,
          status: 'pending',
        })
        .returning({ id: withdrawals.id })

      await debitTx(tx, {
        userId: user.id,
        currency: parsed.data.coin,
        amount: parsed.data.amount,
        type: 'withdrawal',
        reference: row!.id,
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
