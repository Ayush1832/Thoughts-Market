'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getRecentTreasuryPayoutsAction,
  getTreasuryBalancesAction,
  runTreasuryConsolidationAction,
  triggerTreasuryPayoutAction,
  updateClientTronAddressAction,
} from '@/app/[locale]/admin/finance/_actions/treasury-payout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

interface Balance {
  network: string
  coin: string
  formatted: string
}

interface PayoutRow {
  id: string
  fromNetwork: string
  fromCoin: string
  amount: string
  status: string
  txHash: string | null
  createdAt: string
}

export default function TreasuryPayoutSection() {
  const [configured, setConfigured] = useState(false)
  const [clientTronAddress, setClientTronAddress] = useState<string | null>(null)
  const [balances, setBalances] = useState<Balance[]>([])
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [network, setNetwork] = useState('')
  const [coin, setCoin] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [consolidating, setConsolidating] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  function loadData() {
    Promise.all([getTreasuryBalancesAction(), getRecentTreasuryPayoutsAction()])
      .then(([balanceResult, payoutResult]) => {
        if (balanceResult.data) {
          setConfigured(balanceResult.data.configured)
          setClientTronAddress(balanceResult.data.clientTronAddress)
          setAddressInput(prev => prev || balanceResult.data!.clientTronAddress || '')
          setBalances(balanceResult.data.balances)
          if (balanceResult.data.balances.length > 0) {
            setNetwork(prev => prev || balanceResult.data!.balances[0]!.network)
            setCoin(prev => prev || balanceResult.data!.balances[0]!.coin)
          }
        }
        if (payoutResult.data) {
          setPayouts(payoutResult.data)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  async function handlePayout() {
    if (!network || !coin || Number(amount) <= 0) {
      toast.error('Select a balance and enter an amount.')
      return
    }
    setSubmitting(true)
    try {
      const result = await triggerTreasuryPayoutAction({ network, coin, amount })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Payout sent', { description: `Tx: ${result.data?.txHash}` })
      setAmount('')
      loadData()
    }
    finally {
      setSubmitting(false)
    }
  }

  async function handleSaveAddress() {
    setSavingAddress(true)
    try {
      const result = await updateClientTronAddressAction(addressInput)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setClientTronAddress(result.data!.clientTronAddress)
      toast.success('Client payout address saved')
    }
    finally {
      setSavingAddress(false)
    }
  }

  async function handleConsolidate() {
    setConsolidating(true)
    try {
      const result = await runTreasuryConsolidationAction()
      if (result.error) {
        toast.error(result.error)
        return
      }
      const { succeeded, failed, skipped } = result.data!
      if (succeeded.length === 0 && failed.length === 0) {
        toast.info('Nothing to consolidate', { description: `${skipped.length} balance(s) skipped (dust or gas reserve).` })
      }
      else {
        toast.success(`Consolidated ${succeeded.length} balance(s)`, {
          description: failed.length > 0 ? `${failed.length} failed — see recent payouts.` : undefined,
        })
      }
      loadData()
    }
    finally {
      setConsolidating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-20 animate-pulse rounded-sm bg-muted" />
        </CardContent>
      </Card>
    )
  }

  const addressCard = (
    <Card>
      <CardHeader>
        <CardTitle>Client Payout Address</CardTitle>
        <CardDescription>
          The Tron (TRC-20) wallet address that receives treasury payouts. Only the client can provide their real address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="client-tron-address">Tron address</Label>
            <Input
              id="client-tron-address"
              value={addressInput}
              onChange={event => setAddressInput(event.target.value.trim())}
              placeholder="T..."
              className="h-11 font-mono"
            />
          </div>
          <Button onClick={handleSaveAddress} disabled={savingAddress} className="h-11">
            {savingAddress ? 'Saving…' : 'Save Address'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (!configured || !clientTronAddress) {
    return (
      <div className="space-y-6">
        {addressCard}
        <Card>
          <CardHeader>
            <CardTitle>Pay Out to Client</CardTitle>
            <CardDescription>
              {!configured
                ? 'Not configured. Set TREASURY_PRIVATE_KEY to enable payouts.'
                : 'Set and save the client payout address above to enable payouts.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {addressCard}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Pay Out to Client</CardTitle>
            <CardDescription>
              Bridges EVM/Bitcoin/Solana/Tron treasury holdings to
              {' '}
              {clientTronAddress}
              {' '}
              as TRC-20 USDT. TRX requires manual conversion first — no swap integration exists for it.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleConsolidate}
            disabled={consolidating || balances.length === 0}
          >
            {consolidating ? 'Consolidating…' : 'Consolidate & Pay Out All'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {balances.length === 0 && (
            <p className="text-sm text-muted-foreground">No treasury balances found.</p>
          )}

          {balances.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Source balance</Label>
                <Select
                  value={`${network}:${coin}`}
                  onValueChange={(value) => {
                    const [nextNetwork, nextCoin] = value.split(':')
                    setNetwork(nextNetwork ?? '')
                    setCoin(nextCoin ?? '')
                  }}
                >
                  <SelectTrigger className="h-11 w-full justify-between">
                    {network && coin ? `${coin} on ${network}` : 'Select balance'}
                  </SelectTrigger>
                  <SelectContent>
                    {balances.map(balance => (
                      <SelectItem key={`${balance.network}:${balance.coin}`} value={`${balance.network}:${balance.coin}`}>
                        {balance.coin}
                        {' '}
                        on
                        {' '}
                        {balance.network}
                        {' '}
                        (
                        {balance.formatted}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="treasury-payout-amount">Amount</Label>
                <Input
                  id="treasury-payout-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={event => setAmount(event.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handlePayout} disabled={submitting} className="h-11 w-full">
                  {submitting ? 'Sending…' : 'Pay Out'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0
            ? <p className="text-sm text-muted-foreground">No payouts yet.</p>
            : (
                <div className="space-y-2">
                  {payouts.map(payout => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                    >
                      <span>
                        {payout.amount}
                        {' '}
                        {payout.fromCoin}
                        {' '}
                        from
                        {' '}
                        {payout.fromNetwork}
                      </span>
                      <span className={payout.status === 'completed'
                        ? 'text-green-600'
                        : payout.status === 'failed'
                          ? `text-red-600`
                          : `text-muted-foreground`}
                      >
                        {payout.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  )
}
