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

const COINS = ['USDC', 'USDT'] as const
const NETWORKS = ['polygon', 'ethereum', 'base', 'arbitrum', 'bsc', 'optimism'] as const
const DEST_COINS = ['USDC', 'USDT', 'ETH', 'DAI', 'POL'] as const

type Coin = (typeof COINS)[number]
type Network = (typeof NETWORKS)[number]

function CustodialWithdrawForm({ onClose }: { onClose: () => void }) {
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [coin, setCoin] = useState<Coin>('USDC')
  const [destNetwork, setDestNetwork] = useState<Network>('polygon')
  const [destCoin, setDestCoin] = useState<string>('USDC')
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

  const available = Number(balances[coin] ?? '0')

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
        destNetwork,
        destCoin,
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
          <Label>From balance</Label>
          <Select value={coin} onValueChange={value => setCoin(value as Coin)}>
            <SelectTrigger className="h-12 w-full justify-between">{coin}</SelectTrigger>
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
          <Label htmlFor="custodial-withdraw-amount">Amount</Label>
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Receive network</Label>
          <Select value={destNetwork} onValueChange={value => setDestNetwork(value as Network)}>
            <SelectTrigger className="h-12 w-full justify-between capitalize">{destNetwork}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {NETWORKS.map(option => (
                <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Receive token</Label>
          <Select value={destCoin} onValueChange={setDestCoin}>
            <SelectTrigger className="h-12 w-full justify-between">{destCoin}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {DEST_COINS.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="custodial-withdraw-to">Recipient address</Label>
        <Input
          id="custodial-withdraw-to"
          value={toAddress}
          onChange={event => setToAddress(event.target.value)}
          placeholder="0x..."
          className="h-12"
          required
        />
      </div>

      <Button type="submit" className="h-12 w-full text-base" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Withdraw'}
      </Button>
    </form>
  )
}

export default CustodialWithdrawForm
