'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { isAddress } from 'viem'
import { requestWithdrawalAction } from '@/app/[locale]/(platform)/_actions/custodial-withdrawal'
import { getMyBalancesAction } from '@/app/[locale]/(platform)/_actions/deposit-address'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

const NETWORK_LABELS: Record<string, string> = {
  polygon: 'Polygon',
  ethereum: 'Ethereum',
  bsc: 'BNB Smart Chain',
  avalanche: 'Avalanche',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
}

const COIN_NETWORKS: Record<string, readonly string[]> = {
  USDC: ['polygon', 'ethereum', 'bsc', 'avalanche', 'arbitrum', 'base', 'optimism'],
  USDT: ['polygon', 'ethereum', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
  POL: ['polygon'],
  ETH: ['ethereum', 'arbitrum', 'base', 'optimism'],
  BNB: ['bsc'],
  AVAX: ['avalanche'],
  LINK: ['ethereum'],
  UNI: ['ethereum'],
  SAND: ['ethereum'],
  IMX: ['ethereum'],
  RLB: ['ethereum'],
}

const COINS = ['USDC', 'USDT', 'POL', 'ETH', 'BNB', 'AVAX', 'LINK', 'UNI', 'SAND', 'IMX', 'RLB'] as const

function CustodialWithdrawForm({ onClose }: { onClose: () => void }) {
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [coin, setCoin] = useState<string>('USDC')
  const [network, setNetwork] = useState<string>('polygon')
  const [amount, setAmount] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  function handleCoinChange(value: string) {
    setCoin(value)
    const networks = COIN_NETWORKS[value] ?? []
    if (!networks.includes(network)) {
      setNetwork(networks[0] ?? '')
    }
  }

  const available = Number(balances[coin] ?? '0')
  const networks = COIN_NETWORKS[coin] ?? []

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAddress(toAddress)) {
      toast.error('Enter a valid destination address.')
      return
    }
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    if (parsedAmount > available) {
      toast.error('Amount exceeds your balance.')
      return
    }

    setSubmitting(true)
    try {
      const result = await requestWithdrawalAction({
        coin,
        amount,
        destNetwork: network,
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Token</Label>
          <Select value={coin} onValueChange={handleCoinChange}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">{coin}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {COINS.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Available:
            {' '}
            {available.toLocaleString('en-US', { maximumFractionDigits: 6 })}
            {' '}
            {coin}
          </p>
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
        <Label htmlFor="custodial-withdraw-amount" className="text-foreground">Amount</Label>
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
            onClick={() => setAmount(String(available))}
          >
            Max
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custodial-withdraw-to" className="text-foreground">Recipient address</Label>
        <Input
          id="custodial-withdraw-to"
          value={toAddress}
          onChange={event => setToAddress(event.target.value)}
          placeholder="0x..."
          className="h-12"
          required
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Sending
        {' '}
        {coin}
        {' '}
        on
        {' '}
        {NETWORK_LABELS[network] ?? network}
        . Make sure the recipient address supports this network.
      </p>

      <Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Withdraw'}
      </Button>
    </form>
  )
}

export default CustodialWithdrawForm
