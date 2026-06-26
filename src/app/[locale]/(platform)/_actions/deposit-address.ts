'use server'

import { z } from 'zod'
import { DEFAULT_ERROR_MESSAGE } from '@/lib/constants'
import {
  getOrCreateActiveDepositAddress,
  refreshDepositAddress,
} from '@/lib/db/queries/deposit-addresses'
import { listBalances } from '@/lib/db/queries/ledger'
import { UserRepository } from '@/lib/db/queries/user'
import { isDepositHdConfigured } from '@/lib/deposit-hd'

const SUPPORTED_COINS = ['USDC', 'USDT'] as const
const SUPPORTED_NETWORKS = ['polygon'] as const

const DepositAddressInputSchema = z.object({
  coin: z.enum(SUPPORTED_COINS),
  network: z.enum(SUPPORTED_NETWORKS),
})

export type DepositAddressInput = z.input<typeof DepositAddressInputSchema>

export interface DepositAddressActionResult {
  error: string | null
  data: {
    address: string
    coin: string
    network: string
    rotationIndex: number
  } | null
}

const FEATURE_DISABLED_MESSAGE = 'Deposit addresses are not available yet. Please try again later.'

async function resolveCurrentUserId(): Promise<string | null> {
  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  return user?.id ?? null
}

export async function getDepositAddressAction(
  input: DepositAddressInput,
): Promise<DepositAddressActionResult> {
  const parsed = DepositAddressInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid coin or network.', data: null }
  }

  if (!isDepositHdConfigured()) {
    return { error: FEATURE_DISABLED_MESSAGE, data: null }
  }

  const userId = await resolveCurrentUserId()
  if (!userId) {
    return { error: 'Unauthenticated.', data: null }
  }

  try {
    const record = await getOrCreateActiveDepositAddress(userId, parsed.data.coin, parsed.data.network)
    return {
      error: null,
      data: {
        address: record.address,
        coin: record.coin,
        network: record.network,
        rotationIndex: record.rotationIndex,
      },
    }
  }
  catch (error) {
    console.error('Failed to resolve deposit address', error)
    return { error: DEFAULT_ERROR_MESSAGE, data: null }
  }
}

export async function refreshDepositAddressAction(
  input: DepositAddressInput,
): Promise<DepositAddressActionResult> {
  const parsed = DepositAddressInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid coin or network.', data: null }
  }

  if (!isDepositHdConfigured()) {
    return { error: FEATURE_DISABLED_MESSAGE, data: null }
  }

  const userId = await resolveCurrentUserId()
  if (!userId) {
    return { error: 'Unauthenticated.', data: null }
  }

  try {
    const record = await refreshDepositAddress(userId, parsed.data.coin, parsed.data.network)
    return {
      error: null,
      data: {
        address: record.address,
        coin: record.coin,
        network: record.network,
        rotationIndex: record.rotationIndex,
      },
    }
  }
  catch (error) {
    console.error('Failed to refresh deposit address', error)
    return { error: DEFAULT_ERROR_MESSAGE, data: null }
  }
}

export interface BalancesActionResult {
  error: string | null
  data: Array<{ currency: string, available: string }> | null
}

export async function getMyBalancesAction(): Promise<BalancesActionResult> {
  const userId = await resolveCurrentUserId()
  if (!userId) {
    return { error: 'Unauthenticated.', data: null }
  }

  try {
    const data = await listBalances(userId)
    return { error: null, data }
  }
  catch (error) {
    console.error('Failed to load balances', error)
    return { error: DEFAULT_ERROR_MESSAGE, data: null }
  }
}
