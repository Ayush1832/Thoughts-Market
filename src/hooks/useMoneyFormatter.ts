'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { formatFiat } from '@/lib/fiat'
import { useWalletSettings } from '@/stores/useWalletSettings'

interface FxRatesResponse {
  rates: Record<string, number> | null
}

/**
 * Live USD→fiat rates from /api/fx-rates (cached upstream for an hour). Only
 * fetched when the user has enabled fiat display, and react-query caches it so
 * every consumer shares one request.
 */
function useFxRates(enabled: boolean) {
  return useQuery({
    queryKey: ['fx-rates'],
    queryFn: async (): Promise<FxRatesResponse> => {
      const res = await fetch('/api/fx-rates', { credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error('Failed to load FX rates')
      }
      return res.json()
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/**
 * Returns a `format(usdAmount)` function that respects the wallet currency
 * settings: plain USD when fiat display is off, otherwise the selected fiat
 * using the live FX rate (falling back to the static approximation in fiat.ts
 * if the live feed is unavailable).
 */
/**
 * The live FX rate (units of the selected currency per 1 USD) when fiat display
 * is enabled, or undefined (callers should then fall back to the static rate).
 */
export function useLiveFiatRate(): number | undefined {
  const displayInFiat = useWalletSettings(state => state.displayInFiat)
  const currency = useWalletSettings(state => state.currency)
  const { data } = useFxRates(displayInFiat)
  return displayInFiat ? data?.rates?.[currency] : undefined
}

export function useMoneyFormatter() {
  const displayInFiat = useWalletSettings(state => state.displayInFiat)
  const currency = useWalletSettings(state => state.currency)
  const { data } = useFxRates(displayInFiat)
  const liveRate = displayInFiat ? data?.rates?.[currency] : undefined

  return useCallback((usdAmount: number) => {
    const safe = Number.isFinite(usdAmount) ? usdAmount : 0
    if (!displayInFiat) {
      return `$${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return formatFiat(safe, currency, liveRate)
  }, [displayInFiat, currency, liveRate])
}
