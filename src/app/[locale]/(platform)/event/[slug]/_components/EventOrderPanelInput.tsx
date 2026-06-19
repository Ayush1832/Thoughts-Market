import type { RefObject } from 'react'
import type { OrderSide } from '@/types'
import { useExtracted } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLiveFiatRate, useMoneyFormatter } from '@/hooks/useMoneyFormatter'
import { formatDisplayAmount, getAmountSizeClass, MAX_AMOUNT_INPUT, sanitizeNumericInput } from '@/lib/amount-input'
import { ORDER_SIDE } from '@/lib/constants'
import { getFiatCurrency } from '@/lib/fiat'
import { formatAmountInputValue } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { usePortfolioValueVisibility } from '@/stores/usePortfolioValueVisibility'
import { useWalletSettings } from '@/stores/useWalletSettings'

// Quick-add increments (in whole units of the displayed currency).
const QUICK_ADD = [1, 5, 10, 100]

interface BalanceSummary {
  raw: number
  text: string
  symbol?: string
}

interface EventOrderPanelInputProps {
  isMobile: boolean
  side: OrderSide
  amount: string
  amountNumber: number
  availableShares: number
  balance: BalanceSummary
  isBalanceLoading?: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onAmountChange: (value: string) => void
  shouldShake?: boolean
}

export default function EventOrderPanelInput({
  isMobile,
  side,
  amount,
  amountNumber,
  availableShares,
  balance,
  isBalanceLoading = false,
  inputRef,
  onAmountChange,
  shouldShake,
}: EventOrderPanelInputProps) {
  const t = useExtracted()
  const areValuesHidden = usePortfolioValueVisibility(state => state.isHidden)
  const displayInFiat = useWalletSettings(state => state.displayInFiat)
  const currencyCode = useWalletSettings(state => state.currency)
  const liveRate = useLiveFiatRate()
  const fiat = getFiatCurrency(currencyCode)
  // Units of the selected currency per 1 USD (live rate, else static fallback).
  const rate = displayInFiat ? (liveRate ?? fiat.rate) : 1
  const currencySymbol = displayInFiat ? fiat.symbol : '$'
  // Only BUY amounts are money; SELL amounts are share counts (never converted).
  const useFiat = displayInFiat && side === ORDER_SIDE.BUY

  function focusInput() {
    inputRef?.current?.focus()
  }

  function handleInputChange(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)

    if (side === ORDER_SIDE.SELL) {
      onAmountChange(cleaned)
      return
    }

    if (useFiat) {
      if (cleaned === '') {
        onAmountChange('')
        return
      }
      const typed = Number.parseFloat(cleaned)
      if (!Number.isFinite(typed)) {
        return
      }
      // Typed value is in the display currency → store the USD equivalent.
      const usdValue = typed / rate
      if (usdValue <= MAX_AMOUNT_INPUT) {
        onAmountChange(formatAmountInputValue(usdValue))
      }
      return
    }

    const numericValue = Number.parseFloat(cleaned)

    if (cleaned === '' || numericValue <= MAX_AMOUNT_INPUT) {
      onAmountChange(cleaned)
    }
  }

  function handleBlur(value: string) {
    const cleaned = sanitizeNumericInput(value)
    const numeric = Number.parseFloat(cleaned)

    if (!cleaned || Number.isNaN(numeric)) {
      onAmountChange('')
      return
    }

    if (useFiat) {
      const usdValue = Math.min(numeric / rate, MAX_AMOUNT_INPUT)
      onAmountChange(formatAmountInputValue(usdValue))
      return
    }

    const clampedValue = side === ORDER_SIDE.SELL
      ? numeric
      : Math.min(numeric, MAX_AMOUNT_INPUT)

    onAmountChange(formatAmountInputValue(clampedValue))
  }

  function incrementAmount(delta: number) {
    const nextValue = amountNumber + delta

    if (side === ORDER_SIDE.SELL) {
      onAmountChange(formatAmountInputValue(nextValue))
      return
    }

    const limitedValue = Math.min(nextValue, MAX_AMOUNT_INPUT)
    onAmountChange(formatAmountInputValue(limitedValue))
  }

  function decrementAmount(delta: number) {
    const nextValue = Math.max(0, amountNumber - delta)
    onAmountChange(formatAmountInputValue(nextValue))
  }

  function handleBalanceClick() {
    if (side === ORDER_SIDE.SELL) {
      return
    }

    const maxBalance = Number.isFinite(balance.raw) ? balance.raw : 0
    const limitedBalance = Math.min(maxBalance, MAX_AMOUNT_INPUT)
    onAmountChange(formatAmountInputValue(limitedBalance, { roundingMode: 'floor' }))
    focusInput()
  }

  function renderActionButtons() {
    if (side === ORDER_SIDE.SELL) {
      const isDisabled = availableShares <= 0
      return ['25%', '50%', '75%'].map(percentage => (
        <button
          type="button"
          key={percentage}
          className={cn('pe-chip flex-1', { 'cursor-not-allowed opacity-50': isDisabled })}
          disabled={isDisabled}
          onClick={() => {
            if (isDisabled) {
              return
            }

            const percentValue = Number.parseInt(percentage.replace('%', ''), 10) / 100
            const newValue = availableShares * percentValue
            onAmountChange(formatAmountInputValue(newValue))
            focusInput()
          }}
        >
          {percentage}
        </button>
      ))
    }

    return QUICK_ADD.map((increment) => {
      // Adds `increment` units of the displayed currency; convert to USD when in
      // fiat mode so the underlying order amount stays in USD.
      const usdIncrement = useFiat ? increment / rate : increment
      return (
        <button
          type="button"
          key={increment}
          className="pe-chip flex-1"
          onClick={() => {
            const newValue = amountNumber + usdIncrement
            const limitedValue = Math.min(newValue, MAX_AMOUNT_INPUT)
            onAmountChange(formatAmountInputValue(limitedValue))
            focusInput()
          }}
        >
          {`+${currencySymbol}${increment}`}
        </button>
      )
    })
  }

  const formatMoney = useMoneyFormatter()
  const formattedBalanceText = formatMoney(Number.isFinite(balance.raw) ? balance.raw : 0)

  const rawAmountDisplay = formatDisplayAmount(amount)
  // In fiat mode the Amount is shown in the selected currency (converted from
  // the USD the engine tracks); otherwise it's the raw USD the user typed.
  const buyAmountDisplay = useFiat
    ? (amountNumber > 0 ? formatAmountInputValue(amountNumber * rate) : '')
    : rawAmountDisplay
  const inputValue = side === ORDER_SIDE.SELL
    ? rawAmountDisplay
    : buyAmountDisplay ? `${currencySymbol}${buyAmountDisplay}` : ''
  const amountSizeClass = getAmountSizeClass(side === ORDER_SIDE.SELL ? rawAmountDisplay : buyAmountDisplay)
  return (
    <>
      {isMobile
        ? (
            <div className="mb-4">
              <div className="mb-4 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  onClick={() => decrementAmount(side === ORDER_SIDE.SELL ? 0.1 : useFiat ? 1 / rate : 1)}
                  size="icon"
                  variant="ghost"
                >
                  −
                </Button>
                <div className="flex-1 text-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className={cn(
                      `
                        w-full [appearance:textfield] border-0 bg-transparent text-center font-semibold text-foreground
                        placeholder-muted-foreground outline-hidden
                        [&::-webkit-inner-spin-button]:appearance-none
                        [&::-webkit-outer-spin-button]:appearance-none
                      `,
                      amountSizeClass,
                      { 'animate-order-shake': shouldShake },
                    )}
                    placeholder={side === ORDER_SIDE.SELL ? '0' : `${currencySymbol}0`}
                    value={inputValue}
                    onChange={e => handleInputChange(e.target.value)}
                    onBlur={e => handleBlur(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => incrementAmount(side === ORDER_SIDE.SELL ? 0.1 : useFiat ? 1 / rate : 1)}
                  size="icon"
                  variant="ghost"
                >
                  +
                </Button>
              </div>
            </div>
          )
        : (
            <div className="mb-2 flex items-center gap-3">
              <div className="shrink-0">
                <div className="text-lg font-medium">
                  {side === ORDER_SIDE.SELL ? t('Shares') : t('Amount')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {side === ORDER_SIDE.SELL
                    ? null
                    : isBalanceLoading
                      ? <Skeleton className="inline-block h-3 w-16 align-middle" />
                      : (
                          <button
                            type="button"
                            className={`
                              cursor-pointer bg-transparent p-0 text-left transition-colors
                              hover:text-foreground
                            `}
                            onClick={handleBalanceClick}
                          >
                            {t('Balance')}
                            {' '}
                            {areValuesHidden ? '****' : formattedBalanceText}
                          </button>
                        )}
                </div>
              </div>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  className={cn(
                    `
                      h-14 w-full [appearance:textfield] border-0 bg-transparent text-right font-semibold text-slate-700
                      placeholder-slate-400 outline-hidden
                      dark:text-slate-300 dark:placeholder-slate-500
                      [&::-webkit-inner-spin-button]:appearance-none
                      [&::-webkit-outer-spin-button]:appearance-none
                    `,
                    amountSizeClass,
                    { 'animate-order-shake': shouldShake },
                  )}
                  placeholder={side === ORDER_SIDE.SELL ? '0' : '$0'}
                  value={inputValue}
                  onChange={e => handleInputChange(e.target.value)}
                  onBlur={e => handleBlur(e.target.value)}
                />
              </div>
            </div>
          )}

      <div
        className={cn(
          'mb-3 flex gap-2',
          isMobile ? 'justify-center' : 'justify-end',
        )}
      >
        {renderActionButtons()}
        <button
          type="button"
          className={cn(
            'pe-chip flex-1',
            { 'cursor-not-allowed opacity-50': side === ORDER_SIDE.SELL && availableShares <= 0 },
          )}
          disabled={side === ORDER_SIDE.SELL && availableShares <= 0}
          onClick={() => {
            if (side === ORDER_SIDE.SELL) {
              if (availableShares <= 0) {
                return
              }
              onAmountChange(formatAmountInputValue(availableShares, { roundingMode: 'floor' }))
            }
            else {
              const maxBalance = balance.raw
              const limitedBalance = Math.min(maxBalance, MAX_AMOUNT_INPUT)
              onAmountChange(formatAmountInputValue(limitedBalance, { roundingMode: 'floor' }))
            }
            focusInput()
          }}
        >
          {t('Max')}
        </button>
      </div>
    </>
  )
}
