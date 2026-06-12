'use client'

import type { ChangeEventHandler, FormEvent } from 'react'
import type { PendingWithdrawalItem, WithdrawReceiveSelection } from '@/app/[locale]/(platform)/_components/wallet-modal/utils'
import { useAppKitAccount } from '@reown/appkit/react'
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  FuelIcon,
  InfoIcon,
  WalletIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { formatUnits } from 'viem'
import { WITHDRAW_CHAIN_IDS, WITHDRAW_CHAIN_OPTIONS, WITHDRAW_TOKEN_OPTIONS } from '@/app/[locale]/(platform)/_components/wallet-modal/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDisplayAmount, MAX_AMOUNT_INPUT, sanitizeNumericInput } from '@/lib/amount-input'
import { formatAmountInputValue } from '@/lib/formatters'
import { cn } from '@/lib/utils'

function WalletSendForm({
  sendTo,
  onChangeSendTo,
  sendAmount,
  onChangeSendAmount,
  isSending,
  onSubmitSend,
  onBack,
  connectedWalletAddress,
  onUseConnectedWallet,
  availableBalance,
  onMax,
  isBalanceLoading = false,
  pendingWithdrawals = [],
  depositWalletAddress,
}: {
  sendTo: string
  onChangeSendTo: ChangeEventHandler<HTMLInputElement>
  sendAmount: string
  onChangeSendAmount: (value: string) => void
  isSending: boolean
  onSubmitSend: (event: FormEvent<HTMLFormElement>, receive?: WithdrawReceiveSelection) => void
  onBack?: () => void
  connectedWalletAddress?: string | null
  onUseConnectedWallet?: () => void
  availableBalance?: number | null
  onMax?: () => void
  isBalanceLoading?: boolean
  pendingWithdrawals?: PendingWithdrawalItem[]
  depositWalletAddress?: string | null
}) {
  const trimmedRecipient = sendTo.trim()
  const isRecipientAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedRecipient)
  const parsedAmount = Number(sendAmount)
  const [receiveToken, setReceiveToken] = useState<string>('USDC')
  const [receiveChain, setReceiveChain] = useState<string>('Polygon')
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
  // The Amount field is denominated in the selected receive token. The balance
  // stays in USDC, so we convert via the token's USD price (USDC = 1).
  const isUsdcUnit = receiveToken === 'USDC'
  const [tokenPrice, setTokenPrice] = useState<number | null>(1)
  // True when the selected token doesn't exist on the selected chain (e.g. WBNB on Polygon).
  const [priceUnavailable, setPriceUnavailable] = useState(false)
  const priceForUnit = isUsdcUnit ? 1 : tokenPrice
  const [amountInput, setAmountInput] = useState<string>(() => formatDisplayAmount(sendAmount))
  const appKitAccount = useAppKitAccount()
  const isSubmitDisabled = (
    isSending
    || !trimmedRecipient
    || !isRecipientAddress
    || !Number.isFinite(parsedAmount)
    || parsedAmount <= 0
  )
  const showConnectedWalletButton = !sendTo?.trim()
  const amountDisplay = Number.isFinite(parsedAmount)
    ? parsedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00'
  // ── Live cross-chain/swap quote (real "You will receive" + fees) ──
  const isDirectTransfer = receiveToken === 'USDC' && receiveChain === 'Polygon'
  const [quote, setQuote] = useState<{
    receiveAmount: string
    receiveUsd: number
    networkCostUsd: number
    feeUsd: number
    priceImpactPct: number
  } | null>(null)
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'error' | 'need-recipient'>('idle')
  const [quoteError, setQuoteError] = useState('')

  useEffect(() => {
    const amt = Number(sendAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setQuote(null); setQuoteStatus('idle'); return
    }
    // Same-chain Polygon USDC = direct 1:1 transfer, no bridge/swap.
    if (isDirectTransfer) {
      setQuote({ receiveAmount: amt.toFixed(2), receiveUsd: amt, networkCostUsd: 0, feeUsd: 0, priceImpactPct: 0 })
      setQuoteStatus('idle'); setQuoteError(''); return
    }
    if (!isRecipientAddress) { setQuote(null); setQuoteStatus('need-recipient'); return }
    const toChainId = WITHDRAW_CHAIN_IDS[receiveChain]
    if (!depositWalletAddress || !toChainId) {
      setQuote(null); setQuoteStatus('error'); setQuoteError('Withdrawal route unavailable.'); return
    }

    let cancelled = false
    setQuoteStatus('loading')
    const handle = setTimeout(async () => {
      try {
        const res = await fetch('/api/lifi/withdraw-quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ toChainId, toToken: receiveToken, fromAddress: depositWalletAddress, toAddress: trimmedRecipient, amount: String(amt) }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok || !data?.quote) {
          setQuote(null); setQuoteStatus('error'); setQuoteError(data?.error ?? 'Could not fetch a quote.'); return
        }
        const q = data.quote
        const est = q.estimate ?? {}
        const decimals = Number(q.action?.toToken?.decimals ?? 18)
        const priceUsd = Number(q.action?.toToken?.priceUSD ?? 0)
        const receiveNum = Number(formatUnits(BigInt(est.toAmount ?? '0'), decimals))
        const receiveUsd = Number(est.toAmountUSD ?? receiveNum * priceUsd)
        const fromUsd = Number(est.fromAmountUSD ?? amt)
        const gasUsd = (est.gasCosts ?? []).reduce((s: number, c: any) => s + Number(c.amountUSD ?? 0), 0)
        const feeUsd = (est.feeCosts ?? []).reduce((s: number, c: any) => s + Number(c.amountUSD ?? 0), 0)
        setQuote({
          receiveAmount: receiveNum.toLocaleString('en-US', { maximumFractionDigits: 5 }),
          receiveUsd,
          networkCostUsd: gasUsd,
          feeUsd,
          priceImpactPct: fromUsd > 0 ? Math.max(0, ((fromUsd - receiveUsd) / fromUsd) * 100) : 0,
        })
        setQuoteStatus('idle'); setQuoteError('')
      }
      catch {
        if (!cancelled) { setQuote(null); setQuoteStatus('error'); setQuoteError('Could not fetch a quote.') }
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [sendAmount, receiveToken, receiveChain, trimmedRecipient, isRecipientAddress, depositWalletAddress, isDirectTransfer])

  const usd2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  // Cross-chain/swap requires a successful live quote before submitting; an
  // unavailable token/chain combo blocks it outright.
  const quoteBlocksSubmit = priceUnavailable || (!isDirectTransfer && (quoteStatus === 'loading' || quoteStatus === 'error'))

  // Fetch the receive token's USD price so we can denominate the Amount in it.
  useEffect(() => {
    if (isUsdcUnit) { setTokenPrice(1); setPriceUnavailable(false); return }
    const chainId = WITHDRAW_CHAIN_IDS[receiveChain]
    if (!chainId) { setTokenPrice(null); setPriceUnavailable(true); return }
    let cancelled = false
    setTokenPrice(null)
    setPriceUnavailable(false)
    fetch(`/api/lifi/token-price?chainId=${chainId}&symbol=${encodeURIComponent(receiveToken)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) { return }
        if (d?.priceUSD) { setTokenPrice(Number(d.priceUSD)) }
        else { setPriceUnavailable(true) } // token not available on this chain
      })
      .catch(() => { if (!cancelled) { setPriceUnavailable(true) } })
    return () => { cancelled = true }
  }, [receiveToken, receiveChain, isUsdcUnit])

  // When the unit/price changes (token switched), re-show the same USDC spend as
  // the equivalent token amount. Intentionally keyed only on price, not the
  // amount, so typing isn't overwritten.
  useEffect(() => {
    if (priceForUnit == null) { return }
    const usdc = Number(sendAmount)
    setAmountInput(Number.isFinite(usdc) && usdc > 0 ? formatTokenAmount(usdc / priceForUnit) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceForUnit])

  function formatTokenAmount(n: number): string {
    if (!Number.isFinite(n) || n <= 0) { return '' }
    return n.toLocaleString('en-US', { maximumFractionDigits: 6, useGrouping: false })
  }
  function tokenToUsdc(tokenAmount: number): number {
    return tokenAmount * (priceForUnit ?? 1)
  }
  function usdcToToken(usdc: number): number {
    const p = priceForUnit ?? 1
    return p > 0 ? usdc / p : 0
  }
  const balanceInUnit = priceForUnit ? usdcToToken(Number(availableBalance ?? 0)) : null
  const formattedBalance = balanceInUnit != null && Number.isFinite(balanceInUnit)
    ? balanceInUnit.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: isUsdcUnit ? 2 : 4,
      })
    : '—'
  const balanceDisplay = (isBalanceLoading || (!isUsdcUnit && tokenPrice == null && !priceUnavailable))
    ? <Skeleton className="h-4 w-16" />
    : formattedBalance
  const selectedToken = WITHDRAW_TOKEN_OPTIONS.find(option => option.value === receiveToken)
  const selectedChain = WITHDRAW_CHAIN_OPTIONS.find(option => option.value === receiveChain)
  const visiblePendingWithdrawals = pendingWithdrawals.slice(0, 2)

  function handleAmountChange(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)
    setAmountInput(cleaned)
    if (cleaned === '') { onChangeSendAmount(''); return }
    const num = Number.parseFloat(cleaned)
    if (!Number.isFinite(num)) { return }
    const usdc = tokenToUsdc(num) // parent always stores the USDC spend
    if (usdc <= MAX_AMOUNT_INPUT) {
      onChangeSendAmount(formatAmountInputValue(usdc))
    }
  }

  function handleAmountBlur(rawValue: string) {
    const cleaned = sanitizeNumericInput(rawValue)
    const num = Number.parseFloat(cleaned)
    if (!cleaned || Number.isNaN(num)) {
      setAmountInput('')
      onChangeSendAmount('')
      return
    }
    const usdc = Math.min(tokenToUsdc(num), MAX_AMOUNT_INPUT)
    setAmountInput(formatTokenAmount(usdcToToken(usdc)))
    onChangeSendAmount(formatAmountInputValue(usdc))
  }

  function handleMaxClick() {
    onMax?.() // parent sets the USDC spend to the full balance
    const bal = Number(availableBalance)
    if (Number.isFinite(bal) && bal > 0) {
      setAmountInput(formatTokenAmount(usdcToToken(bal)))
    }
  }

  return (
    <div className="space-y-5">
      {onBack && (
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </button>
      )}

      <form
        className="mt-2 grid gap-4"
        onSubmit={event => onSubmitSend(event, { receiveChain, receiveToken })}
      >
        <div className="grid gap-2">
          <Label htmlFor="wallet-send-to">Recipient address</Label>
          <div className="relative">
            <Input
              id="wallet-send-to"
              value={sendTo}
              onChange={onChangeSendTo}
              placeholder="0x..."
              className={cn('h-12 text-sm placeholder:text-sm', { 'pr-28': showConnectedWalletButton })}
              required
            />
            {showConnectedWalletButton && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onUseConnectedWallet}
                disabled={!connectedWalletAddress || !!appKitAccount.embeddedWalletInfo?.authProvider}
                className="absolute inset-y-2 right-2 text-xs"
              >
                <WalletIcon className="size-3.5 shrink-0" />
                <span>use connected</span>
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="wallet-send-amount">Amount</Label>
          <div className="relative">
            <Input
              id="wallet-send-amount"
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={event => handleAmountChange(event.target.value)}
              onBlur={event => handleAmountBlur(event.target.value)}
              placeholder="0.00"
              className={`
                h-12 [appearance:textfield] pr-36 text-sm
                [&::-webkit-inner-spin-button]:appearance-none
                [&::-webkit-outer-spin-button]:appearance-none
              `}
              required
            />
            <div className="absolute inset-y-2 right-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{receiveToken}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs text-foreground hover:text-muted-foreground"
                onClick={handleMaxClick}
                disabled={!onMax || isBalanceLoading || (!isUsdcUnit && tokenPrice == null)}
              >
                Max
              </Button>
            </div>
          </div>
          <div className="mx-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              $
              {amountDisplay}
            </span>
            <span className="flex items-center gap-1">
              <span>Balance:</span>
              <span>{balanceDisplay}</span>
              <span>{receiveToken}</span>
            </span>
          </div>
          {priceUnavailable && (
            <p className="mx-2 text-xs text-destructive">
              {receiveToken}
              {' '}
              isn’t available on
              {' '}
              {receiveChain}
              . Pick a different token or chain.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Receive token</Label>
            <Select value={receiveToken} onValueChange={setReceiveToken}>
              <SelectTrigger className="h-12 w-full justify-between">
                <div className="flex items-center gap-2">
                  {selectedToken && (
                    <Image
                      src={selectedToken.icon}
                      alt={selectedToken.label}
                      width={20}
                      height={20}
                    />
                  )}
                  <span className="text-sm font-medium">{selectedToken?.label ?? 'Select token'}</span>
                </div>
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
                {WITHDRAW_TOKEN_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} disabled={!option.enabled}>
                    <div className="flex items-center gap-2">
                      <Image src={option.icon} alt={option.label} width={18} height={18} />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Receive chain</Label>
            <Select value={receiveChain} onValueChange={setReceiveChain}>
              <SelectTrigger className="h-12 w-full justify-between">
                <div className="flex items-center gap-2">
                  {selectedChain && (
                    <Image
                      src={selectedChain.icon}
                      alt={selectedChain.label}
                      width={20}
                      height={20}
                    />
                  )}
                  <span className="text-sm font-medium">{selectedChain?.label ?? 'Select chain'}</span>
                </div>
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
                {WITHDRAW_CHAIN_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} disabled={!option.enabled}>
                    <div className="flex items-center gap-2">
                      <Image src={option.icon} alt={option.label} width={18} height={18} />
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">You will receive</span>
            <div className="flex items-center gap-3 text-right">
              {quoteStatus === 'loading'
                ? <span className="text-muted-foreground">Fetching quote…</span>
                : quoteStatus === 'need-recipient'
                  ? <span className="text-muted-foreground">Enter recipient to estimate</span>
                  : quoteStatus === 'error'
                    ? <span className="text-destructive">{quoteError}</span>
                    : (
                        <>
                          <span className="text-foreground">
                            {quote?.receiveAmount ?? '0.00000'}
                            {' '}
                            {receiveToken}
                          </span>
                          <span className="text-muted-foreground">
                            $
                            {usd2(quote?.receiveUsd ?? 0)}
                          </span>
                        </>
                      )}
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm text-muted-foreground"
            onClick={() => setIsBreakdownOpen(current => !current)}
          >
            <span>Transaction breakdown</span>
            <span className="flex items-center gap-1">
              {!isBreakdownOpen && <span>{(quote?.priceImpactPct ?? 0).toFixed(2)}%</span>}
              <ChevronRightIcon
                className={cn('size-4 transition', { 'rotate-90': isBreakdownOpen })}
              />
            </span>
          </button>
          {isBreakdownOpen && (
            <TooltipProvider>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span>Network cost</span>
                        <InfoIcon className="size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 text-xs text-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <span>Network cost</span>
                          <span className="text-right">
                            $
                            {usd2(quote?.networkCostUsd ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Provider fee</span>
                          <span className="text-right">
                            $
                            {usd2(quote?.feeUsd ?? 0)}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1">
                    <FuelIcon className="size-4" />
                    <span>
                      $
                      {usd2((quote?.networkCostUsd ?? 0) + (quote?.feeUsd ?? 0))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span>Price impact</span>
                        <InfoIcon className="size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 text-xs text-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <span>Total impact</span>
                          <span className="text-right">
                            {(quote?.priceImpactPct ?? 0).toFixed(2)}
                            %
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <span>
                    {(quote?.priceImpactPct ?? 0).toFixed(2)}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <span>Max slippage</span>
                        <InfoIcon className="size-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Slippage occurs due to price changes during trade execution. Minimum received: $
                      {usd2((quote?.receiveUsd ?? 0) * 0.995)}
                    </TooltipContent>
                  </Tooltip>
                  <span>Auto • 0.00%</span>
                </div>
              </div>
            </TooltipProvider>
          )}
        </div>

        {visiblePendingWithdrawals.length > 0 && (
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2 text-xs text-foreground">
              <p className="font-semibold">Pending withdrawal</p>
              {visiblePendingWithdrawals.map((pendingWithdrawal) => {
                const amount = Number(pendingWithdrawal.amount)
                const formattedAmount = Number.isFinite(amount)
                  ? amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : pendingWithdrawal.amount
                const shortAddress = pendingWithdrawal.to.length > 12
                  ? `${pendingWithdrawal.to.slice(0, 6)}...${pendingWithdrawal.to.slice(-4)}`
                  : pendingWithdrawal.to

                return (
                  <div key={pendingWithdrawal.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{shortAddress}</span>
                    <span className="font-semibold tabular-nums">
                      $
                      {formattedAmount}
                    </span>
                  </div>
                )
              })}
              <p className="text-muted-foreground">
                Shown locally until wallet sync catches up.
              </p>
            </div>
          </div>
        )}

        <Button type="submit" className="h-12 w-full gap-2 text-base" disabled={isSubmitDisabled || quoteBlocksSubmit}>
          {isSending ? 'Submitting…' : 'Withdraw'}
        </Button>
      </form>
    </div>
  )
}

export default WalletSendForm
