'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { getDepositAddressAction, refreshDepositAddressAction } from '@/app/[locale]/(platform)/_actions/deposit-address'
import { Button } from '@/components/ui/button'

const COINS = ['USDC', 'USDT'] as const
type Coin = (typeof COINS)[number]

function CustodialDepositPanel() {
  const [coin, setCoin] = useState<Coin>('USDC')
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setAddress(null)
    setError('')

    getDepositAddressAction({ coin, network: 'polygon' })
      .then((result) => {
        if (cancelled) {
          return
        }
        if (result.error || !result.data) {
          setStatus('error')
          setError(result.error ?? 'Deposit address unavailable.')
          return
        }
        setAddress(result.data.address)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setError('Deposit address unavailable.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [coin])

  async function handleRefresh() {
    setRefreshing(true)
    setError('')
    try {
      const result = await refreshDepositAddressAction({ coin, network: 'polygon' })
      if (result.error || !result.data) {
        setError(result.error ?? 'Could not generate a new address.')
        return
      }
      setAddress(result.data.address)
    }
    finally {
      setRefreshing(false)
    }
  }

  async function handleCopy() {
    if (!address) {
      return
    }
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(setCopied, 1200, false)
    }
    catch {
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {COINS.map(option => (
          <Button
            key={option}
            type="button"
            variant={option === coin ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => setCoin(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Send
        {' '}
        {coin}
        {' '}
        on Polygon to this address. Your balance updates automatically after the network confirms.
      </p>

      <div className="flex justify-center">
        <div className="rounded-lg border bg-white p-2">
          {status === 'ready' && address
            ? <QRCode value={address} size={180} />
            : (
                <div className="
                  flex size-[180px] items-center justify-center px-3 text-center text-sm text-muted-foreground
                "
                >
                  {status === 'error' ? error : 'Loading…'}
                </div>
              )}
        </div>
      </div>

      {address && (
        <div className="space-y-2">
          <div className="rounded-md border bg-muted/40 p-3 text-center font-mono text-xs break-all">
            {address}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy address'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Generating…' : 'New address'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustodialDepositPanel
