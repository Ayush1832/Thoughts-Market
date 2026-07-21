'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getWithdrawalQuoteAction, requestWithdrawalAction } from '@/app/[locale]/(platform)/_actions/custodial-withdrawal'
import { getMyBalancesAction } from '@/app/[locale]/(platform)/_actions/deposit-address'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { isValidAddressForNetwork } from '@/lib/address-validation'

const NETWORK_LABELS: Record<string, string> = {
  polygon: 'Polygon',
  ethereum: 'Ethereum',
  bsc: 'BNB Smart Chain',
  avalanche: 'Avalanche',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
  ronin: 'Ronin',
  hyperliquid: 'Hyperliquid',
  tron: 'TRON',
  solana: 'Solana',
  bitcoin: 'Bitcoin',
}

const COIN_NETWORKS: Record<string, readonly string[]> = {
  USDC: ['polygon', 'ethereum', 'bsc', 'avalanche', 'arbitrum', 'base', 'optimism', 'solana'],
  USDT: ['polygon', 'ethereum', 'bsc', 'avalanche', 'arbitrum', 'optimism', 'tron', 'solana'],
  POL: ['polygon'],
  ETH: ['ethereum', 'arbitrum', 'base', 'optimism'],
  BNB: ['bsc'],
  AVAX: ['avalanche'],
  LINK: ['ethereum'],
  UNI: ['ethereum'],
  SAND: ['ethereum'],
  IMX: ['ethereum'],
  RLB: ['ethereum'],
  RON: ['ronin'],
  HYPE: ['hyperliquid'],
  TRX: ['tron'],
  SOL: ['solana'],
  BTC: ['bitcoin'],
}

const COINS = ['USDC', 'USDT', 'POL', 'ETH', 'BNB', 'AVAX', 'LINK', 'UNI', 'SAND', 'IMX', 'RLB', 'RON', 'HYPE', 'TRX', 'SOL', 'BTC'] as const

interface Quote {
  feeUsd: number
  netUsd: number
  coinAmount: string
}

function CustodialWithdrawForm({ onClose }: { onClose: () => void }) {
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [coin, setCoin] = useState<string>('USDC')
  const [network, setNetwork] = useState<string>('polygon')
  const [amount, setAmount] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState('')

  useEffect(() => {
    let cancelled = false
    getMyBalancesAction()
      .then((result) => {
        if (cancelled || !result.data) {
          return
        }
        const next: Record<string, string> = {}
        for (const entry of result.data) {
          next[entry.currency] = entry.available
        }
        setBalances(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const availableUsd = Number(balances.USDC ?? '0')
  const networks = COIN_NETWORKS[coin] ?? []

  useEffect(() => {
    setQuote(null)
    setQuoteError('')
    const amountUsd = Number(amount)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return
    }
    let cancelled = false
    const handle = setTimeout(() => {
      getWithdrawalQuoteAction({ coin, destNetwork: network, amountUsd: amount })
        .then((result) => {
          if (cancelled) {
            return
          }
          if (result.error || !result.data) {
            setQuoteError(result.error ?? 'Could not price this withdrawal.')
            return
          }
          setQuote({ feeUsd: result.data.feeUsd, netUsd: result.data.netUsd, coinAmount: result.data.coinAmount })
        })
        .catch(() => {
          if (!cancelled) {
            setQuoteError('Could not price this withdrawal.')
          }
        })
    }, 450)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [coin, network, amount])

  function handleCoinChange(value: string) {
    setCoin(value)
    const nextNetworks = COIN_NETWORKS[value] ?? []
    if (!nextNetworks.includes(network)) {
      setNetwork(nextNetworks[0] ?? '')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValidAddressForNetwork(network, toAddress)) {
      toast.error('Enter a valid destination address.')
      return
    }
    const amountUsd = Number(amount)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    if (amountUsd > availableUsd) {
      toast.error('Amount exceeds your balance.')
      return
    }

    setSubmitting(true)
    try {
      const result = await requestWithdrawalAction({
        coin,
        destNetwork: network,
        amountUsd: amount,
        toAddress,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Withdrawal requested', { description: 'We are processing your payout.' })
      onClose()
    }
    finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="custodial-withdraw-amount" className="text-foreground">Amount (USD)</Label>
        <div className="relative">
          <Input
            id="custodial-withdraw-amount"
            inputMode="decimal"
            value={amount}
            onChange={event => setAmount(event.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            className="h-12 pr-16"
            required
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute inset-y-2 right-2 text-xs"
            onClick={() => setAmount(String(availableUsd))}
          >
            Max
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Available:
          {' '}
          {availableUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          {' '}
          USDC
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Receive coin</Label>
          <Select value={coin} onValueChange={handleCoinChange}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">{coin}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {COINS.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Network</Label>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">
              {NETWORK_LABELS[network] ?? network}
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {networks.map(option => (
                <SelectItem key={option} value={option}>{NETWORK_LABELS[option] ?? option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custodial-withdraw-to" className="text-foreground">Recipient address</Label>
        <Input
          id="custodial-withdraw-to"
          value={toAddress}
          onChange={event => setToAddress(event.target.value)}
          placeholder={
            network === 'tron'
              ? 'T...'
              : network === 'solana'
                ? 'Solana address'
                : network === 'bitcoin' ? 'bc1...' : '0x...'
          }
          className="h-12"
          required
        />
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-sm text-foreground">
        {quoteError
          ? <span className="text-destructive">{quoteError}</span>
          : quote
            ? (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee</span>
                    <span>{`$${quote.feeUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You receive</span>
                    <span>{`${quote.coinAmount} ${coin}`}</span>
                  </div>
                </div>
              )
            : <span className="text-muted-foreground">Enter an amount to see the fee and payout.</span>}
      </div>

      <Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Withdraw'}
      </Button>
    </form>
  )
}

export default CustodialWithdrawForm
