'use client'

import { AlertTriangleIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface TreasuryStats {
  treasuryBalance: number
  totalDeposits: number
  totalWithdrawals: number
  tradingFees30d: number
  tradingFees30dChange: number
  withdrawalFees30d: number
  pendingExposure: number
  totalRevenue30d: number
}

function fmt(n: number) {
  if (n >= 1_000_000) { return `$${(n / 1_000_000).toFixed(2)}M` }
  if (n >= 1_000) { return `$${(n / 1_000).toFixed(1)}K` }
  return `$${n.toFixed(2)}`
}

function pct(value: number, max: number) {
  if (max <= 0) { return 0 }
  return Math.min(Math.round((value / max) * 100), 100)
}

export default function TreasuryPanelSection() {
  const [data, setData] = useState<TreasuryStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/en/admin/api/finance/treasury')
      .then(r => r.ok ? r.json() : null)
      .then((d) => {
        if (d) { setData(d) }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-20 animate-pulse rounded-sm bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totalDeposits = data?.totalDeposits ?? 0
  const totalWithdrawals = data?.totalWithdrawals ?? 0
  const balance = data?.treasuryBalance ?? 0
  const pendingExp = data?.pendingExposure ?? 0
  const tradingFees = data?.tradingFees30d ?? 0
  const tradingFeesChange = data?.tradingFees30dChange ?? 0
  const withdrawalFees = data?.withdrawalFees30d ?? 0
  const totalRevenue = data?.totalRevenue30d ?? 0

  const reserveMax = Math.max(totalDeposits * 1.2, 1)
  const exposureMax = Math.max(balance * 0.5, pendingExp * 1.5, 1)

  const treasuryMetrics = [
    {
      label: 'Total Deposits',
      value: fmt(totalDeposits),
      change: 0,
      isPositive: true,
    },
    {
      label: 'Total Withdrawals',
      value: fmt(totalWithdrawals),
      change: 0,
      isPositive: false,
    },
    {
      label: 'Net Balance',
      value: fmt(balance),
      change: 0,
      isPositive: balance >= 0,
    },
    {
      label: 'Total Revenue (30d)',
      value: fmt(totalRevenue),
      change: tradingFeesChange,
      isPositive: tradingFeesChange >= 0,
    },
  ]

  const exposureMetrics = [
    {
      label: 'Pending Settlements Exposure',
      value: fmt(pendingExp),
      max: fmt(exposureMax),
      percentage: pct(pendingExp, exposureMax),
    },
    {
      label: 'Withdrawals vs Deposits',
      value: fmt(totalWithdrawals),
      max: fmt(totalDeposits),
      percentage: pct(totalWithdrawals, totalDeposits),
    },
  ]

  const analyticsMetrics = [
    { label: 'Total Revenue (30d)', value: fmt(totalRevenue), change: `${tradingFeesChange > 0 ? '+' : ''}${tradingFeesChange.toFixed(1)}%` },
    { label: 'Trading Fees Collected', value: fmt(tradingFees), change: `${tradingFeesChange > 0 ? '+' : ''}${tradingFeesChange.toFixed(1)}%` },
    { label: 'Withdrawal Fees (30d)', value: fmt(withdrawalFees), change: '' },
    { label: 'Net Deposits', value: fmt(balance), change: '' },
  ]

  const healthPct = totalDeposits > 0 ? Math.min(Math.round((balance / totalDeposits) * 100), 100) : 0

  return (
    <div className="space-y-6">
      {/* Treasury Reserves Overview */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Treasury Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {treasuryMetrics.map(metric => (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.change !== 0 && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${metric.isPositive
                      ? `text-green-600`
                      : `text-red-600`}`}
                    >
                      {metric.isPositive ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />}
                      {metric.change > 0 ? '+' : ''}
                      {metric.change.toFixed(1)}
                      %
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Exposure Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Exposure Analysis</CardTitle>
          <CardDescription>Monitor liability and payout exposure from real transaction data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {exposureMetrics.map(metric => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {metric.value}
                  {' '}
                  /
                  {metric.max}
                </span>
              </div>
              <Progress value={metric.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {metric.percentage}
                % utilized
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revenue Analytics */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Revenue Analytics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {analyticsMetrics.map(metric => (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.change && (
                    <Badge
                      variant="secondary"
                      className={metric.change.startsWith('+')
                        ? 'bg-green-100 text-green-800'
                        : `bg-red-100 text-red-800`}
                    >
                      {metric.change}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Treasury Health</CardTitle>
          <CardDescription>Derived from real on-chain order data and transaction records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reserves Health</span>
                <Badge
                  variant="outline"
                  className={healthPct >= 50
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : `border-red-200 bg-red-50 text-red-700`}
                >
                  {healthPct >= 50 ? 'Healthy' : 'At Risk'}
                </Badge>
              </div>
              <p className="text-2xl font-bold">
                {healthPct}
                %
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Exposure</span>
                <Badge
                  variant="outline"
                  className={pendingExp < balance * 0.3
                    ? `border-blue-200 bg-blue-50 text-blue-700`
                    : `border-yellow-200 bg-yellow-50 text-yellow-700`}
                >
                  {pendingExp < balance * 0.3 ? 'Stable' : 'Monitor'}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{fmt(pendingExp)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {balance < 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center gap-4 pb-3">
            <AlertTriangleIcon className="size-5 text-yellow-600" />
            <div>
              <CardTitle className="text-yellow-900">Treasury Health Alert</CardTitle>
              <CardDescription className="text-yellow-700">Withdrawals exceed deposits — net balance is negative</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800">
              Current net balance is
              {' '}
              {fmt(balance)}
              . Review pending settlements and withdrawal queue immediately.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
