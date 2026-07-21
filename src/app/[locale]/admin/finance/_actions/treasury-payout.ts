'use server'

import { getAdminAccess } from '@/lib/admin-guard'
import { canAccessSection } from '@/lib/admin-permissions'
import { createTreasuryPayoutRecord, listRecentTreasuryPayouts, markTreasuryPayout } from '@/lib/db/queries/treasury'
import { UserRepository } from '@/lib/db/queries/user'
import { isCoinSupportedOnNetwork, SUPPORTED_DEPOSIT_NETWORKS } from '@/lib/deposit-chains'
import { getTreasuryBalances, isTreasuryPayoutConfigured, runTreasuryConsolidation, runTreasuryPayout } from '@/lib/treasury-payout'

export interface TreasuryBalancesResult {
  error: string | null
  data: {
    configured: boolean
    clientTronAddress: string | null
    balances: Array<{ network: string, coin: string, formatted: string }>
  } | null
}

export async function getTreasuryBalancesAction(): Promise<TreasuryBalancesResult> {
  const allowed = await getAdminAccess()
  if (!canAccessSection(allowed, 'finance')) {
    return { error: 'Unauthorized.', data: null }
  }

  const configured = isTreasuryPayoutConfigured()
  if (!configured) {
    return {
      error: null,
      data: { configured: false, clientTronAddress: null, balances: [] },
    }
  }

  try {
    const balances = await getTreasuryBalances()
    return {
      error: null,
      data: {
        configured: true,
        clientTronAddress: process.env.CLIENT_TRON_ADDRESS?.trim() ?? null,
        balances: balances
          .filter(entry => Number(entry.formatted) > 0)
          .map(entry => ({ network: entry.network, coin: entry.coin, formatted: entry.formatted })),
      },
    }
  }
  catch (error) {
    console.error('Failed to load treasury balances', error)
    return { error: 'Failed to load treasury balances.', data: null }
  }
}

export interface TriggerTreasuryPayoutResult {
  error: string | null
  data: { txHash: string } | null
}

export async function triggerTreasuryPayoutAction(input: {
  network: string
  coin: string
  amount: string
}): Promise<TriggerTreasuryPayoutResult> {
  const allowed = await getAdminAccess()
  if (!canAccessSection(allowed, 'finance')) {
    return { error: 'Unauthorized.', data: null }
  }

  if (!SUPPORTED_DEPOSIT_NETWORKS.includes(input.network) || !isCoinSupportedOnNetwork(input.network, input.coin)) {
    return { error: 'Unsupported coin or network.', data: null }
  }
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Invalid amount.', data: null }
  }
  if (!isTreasuryPayoutConfigured()) {
    return { error: 'Treasury payout is not configured.', data: null }
  }

  const admin = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  const clientTronAddress = process.env.CLIENT_TRON_ADDRESS!.trim()

  const recordId = await createTreasuryPayoutRecord({
    fromNetwork: input.network,
    fromCoin: input.coin,
    amount: input.amount,
    toAddress: clientTronAddress,
    triggeredBy: admin?.id ?? 'unknown',
  })

  try {
    const result = await runTreasuryPayout(input.network, input.coin, input.amount)
    await markTreasuryPayout(recordId, 'completed', { txHash: result.txHash })
    return { error: null, data: { txHash: result.txHash } }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Payout failed.'
    await markTreasuryPayout(recordId, 'failed', { error: message })
    return { error: message, data: null }
  }
}

export interface RunTreasuryConsolidationResult {
  error: string | null
  data: {
    succeeded: Array<{ network: string, coin: string, amount: string, txHash: string }>
    failed: Array<{ network: string, coin: string, amount: string, error: string }>
    skipped: Array<{ network: string, coin: string, reason: string }>
  } | null
}

export async function runTreasuryConsolidationAction(): Promise<RunTreasuryConsolidationResult> {
  const allowed = await getAdminAccess()
  if (!canAccessSection(allowed, 'finance')) {
    return { error: 'Unauthorized.', data: null }
  }

  if (!isTreasuryPayoutConfigured()) {
    return { error: 'Treasury payout is not configured.', data: null }
  }

  const admin = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  const clientTronAddress = process.env.CLIENT_TRON_ADDRESS!.trim()

  try {
    const result = await runTreasuryConsolidation()

    for (const item of result.succeeded) {
      const recordId = await createTreasuryPayoutRecord({
        fromNetwork: item.fromNetwork,
        fromCoin: item.fromCoin,
        amount: item.amount,
        toAddress: clientTronAddress,
        triggeredBy: admin?.id ?? 'unknown',
      })
      await markTreasuryPayout(recordId, 'completed', { txHash: item.txHash })
    }

    for (const item of result.failed) {
      const recordId = await createTreasuryPayoutRecord({
        fromNetwork: item.network,
        fromCoin: item.coin,
        amount: item.amount,
        toAddress: clientTronAddress,
        triggeredBy: admin?.id ?? 'unknown',
      })
      await markTreasuryPayout(recordId, 'failed', { error: item.error })
    }

    return {
      error: null,
      data: {
        succeeded: result.succeeded.map(item => ({
          network: item.fromNetwork,
          coin: item.fromCoin,
          amount: item.amount,
          txHash: item.txHash,
        })),
        failed: result.failed,
        skipped: result.skipped,
      },
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Consolidation failed.'
    return { error: message, data: null }
  }
}

export interface RecentTreasuryPayoutsResult {
  error: string | null
  data: Array<{
    id: string
    fromNetwork: string
    fromCoin: string
    amount: string
    status: string
    txHash: string | null
    createdAt: string
  }> | null
}

export async function getRecentTreasuryPayoutsAction(): Promise<RecentTreasuryPayoutsResult> {
  const allowed = await getAdminAccess()
  if (!canAccessSection(allowed, 'finance')) {
    return { error: 'Unauthorized.', data: null }
  }

  const rows = await listRecentTreasuryPayouts(20)
  return {
    error: null,
    data: rows.map(row => ({
      id: row.id,
      fromNetwork: row.fromNetwork,
      fromCoin: row.fromCoin,
      amount: row.amount,
      status: row.status,
      txHash: row.txHash,
      createdAt: row.createdAt.toISOString(),
    })),
  }
}
