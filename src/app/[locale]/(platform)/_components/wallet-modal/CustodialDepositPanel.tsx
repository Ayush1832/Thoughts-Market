'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import {
  getDepositAddressAction,
  getSupportedDepositOptionsAction,
  refreshDepositAddressAction,
} from '@/app/[locale]/(platform)/_actions/deposit-address'
import { Button } from '@/components/ui/button'
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
  ronin: 'Ronin',
  hyperliquid: 'Hyperliquid',
  tron: 'TRON',
  solana: 'Solana',
  bitcoin: 'Bitcoin',
}

function networkLabel(value: string): string {
  return NETWORK_LABELS[value] ?? value
}

function CustodialDepositPanel() {
  const [options, setOptions] = useState<{ network: string, coins: string[] }[] | null>(null)
  const [network, setNetwork] = useState<string>('')
  const [coin, setCoin] = useState<string>('')
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  function handleNetworkChange(value: string) {
    setNetwork(value)
    const tokens = options?.find(option => option.network === value)?.coins ?? []
    if (!tokens.includes(coin)) {
      setCoin(tokens[0] ?? '')
    }
  }

  useEffect(() => {
    let cancelled = false
    getSupportedDepositOptionsAction()
      .then((result) => {
        if (cancelled) {
          return
        }
        setOptions(result)
        const firstNetwork = result[0]
        if (firstNetwork) {
          setNetwork(firstNetwork.network)
          setCoin(firstNetwork.coins[0] ?? '')
        }
        else {
          setStatus('error')
          setError('Deposits are not available right now.')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
          setError('Deposits are not available right now.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!network || !coin) {
      return
    }
    let cancelled = false
    setStatus('loading')
    setAddress(null)
    setError('')

    getDepositAddressAction({ coin, network })
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
  }, [coin, network])

  async function handleRefresh() {
    if (!network || !coin) {
      return
    }
    setRefreshing(true)
    setError('')
    try {
      const result = await refreshDepositAddressAction({ coin, network })
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

  if (!options) {
    return <p className="text-center text-sm text-muted-foreground">Loading…</p>
  }

  if (options.length === 0) {
    return <p className="text-center text-sm text-muted-foreground">Deposits are not available right now.</p>
  }

  const availableCoins = options.find(option => option.network === network)?.coins ?? []

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Network</Label>
          <Select value={network} onValueChange={handleNetworkChange}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">{networkLabel(network)}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {options.map(option => (
                <SelectItem key={option.network} value={option.network}>{networkLabel(option.network)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Token</Label>
          <Select value={coin} onValueChange={setCoin}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">{coin}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {availableCoins.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Send
        {' '}
        {coin}
        {' '}
        on
        {' '}
        {networkLabel(network)}
        {' '}
        to this address. Sending on any other network will result in lost funds. Your balance updates automatically after the network confirms.
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
          <div className="rounded-md border bg-muted/40 p-3 text-center font-mono text-xs break-all text-foreground">
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
