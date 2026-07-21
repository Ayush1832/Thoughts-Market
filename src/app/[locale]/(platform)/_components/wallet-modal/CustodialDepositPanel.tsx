'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { getDepositAddressAction, refreshDepositAddressAction } from '@/app/[locale]/(platform)/_actions/deposit-address'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

const NETWORKS = [
  { value: 'polygon', label: 'Polygon' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'bsc', label: 'BNB Smart Chain' },
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'base', label: 'Base' },
  { value: 'optimism', label: 'Optimism' },
  { value: 'ronin', label: 'Ronin' },
  { value: 'hyperliquid', label: 'Hyperliquid' },
  { value: 'tron', label: 'TRON' },
  { value: 'solana', label: 'Solana' },
  { value: 'bitcoin', label: 'Bitcoin' },
] as const
type Network = (typeof NETWORKS)[number]['value']

const NETWORK_TOKENS: Record<Network, readonly string[]> = {
  polygon: ['POL', 'USDC', 'USDT'],
  ethereum: ['ETH', 'USDC', 'USDT', 'LINK', 'UNI', 'SAND', 'IMX', 'RLB'],
  bsc: ['BNB', 'USDC', 'USDT'],
  avalanche: ['AVAX', 'USDC', 'USDT'],
  arbitrum: ['ETH', 'USDC', 'USDT'],
  base: ['ETH', 'USDC'],
  optimism: ['ETH', 'USDC', 'USDT'],
  ronin: ['RON'],
  hyperliquid: ['HYPE'],
  bitcoin: ['BTC'],
  tron: ['TRX', 'USDT'],
  solana: ['SOL', 'USDC', 'USDT'],
}

function networkLabel(value: Network): string {
  return NETWORKS.find(option => option.value === value)?.label ?? value
}

function CustodialDepositPanel() {
  const [network, setNetwork] = useState<Network>('polygon')
  const [coin, setCoin] = useState<string>(NETWORK_TOKENS.polygon[0] ?? 'USDC')
  const [address, setAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  function handleNetworkChange(value: string) {
    const next = value as Network
    setNetwork(next)
    if (!NETWORK_TOKENS[next].includes(coin)) {
      setCoin(NETWORK_TOKENS[next][0] ?? '')
    }
  }

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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Network</Label>
          <Select value={network} onValueChange={handleNetworkChange}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">{networkLabel(network)}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {NETWORKS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Token</Label>
          <Select value={coin} onValueChange={setCoin}>
            <SelectTrigger className="h-12 w-full justify-between bg-card text-foreground">{coin}</SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6}>
              {NETWORK_TOKENS[network].map(option => (
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
