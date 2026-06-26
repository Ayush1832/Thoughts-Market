'use client'

import { useQuery } from '@tanstack/react-query'
import { getMyBalancesAction } from '@/app/[locale]/(platform)/_actions/deposit-address'
import { getMyConditionSharesAction } from '@/app/[locale]/(platform)/_actions/ledger-portfolio'

const EMPTY_SHARES: Record<string, number> = {}

export function useLedgerUsdcBalance() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ledger-usdc-balance'],
    queryFn: async () => {
      const result = await getMyBalancesAction()
      if (result.error || !result.data) {
        return 0
      }
      const usdc = result.data.find(entry => entry.currency === 'USDC')
      return usdc ? Number(usdc.available) : 0
    },
    refetchInterval: 10_000,
  })

  return { ledgerUsdc: data ?? 0, isLoadingLedgerBalance: isLoading, refetchLedgerBalance: refetch }
}

export function useLedgerConditionShares(conditionId?: string) {
  const { data } = useQuery({
    queryKey: ['ledger-condition-shares', conditionId],
    enabled: Boolean(conditionId),
    queryFn: async () => {
      const result = await getMyConditionSharesAction({ conditionId: conditionId as string })
      const map: Record<string, number> = {}
      if (result.data) {
        for (const entry of result.data) {
          map[entry.tokenId.toLowerCase()] = Number(entry.shares)
        }
      }
      return map
    },
    refetchInterval: 10_000,
  })

  return data ?? EMPTY_SHARES
}
