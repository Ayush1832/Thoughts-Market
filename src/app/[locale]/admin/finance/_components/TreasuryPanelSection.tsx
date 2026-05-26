'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangleIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface TreasuryMetric {
  label: string
  value: string
  change: number
  isPositive: boolean
}

const treasuryMetrics: TreasuryMetric[] = [
  { label: 'Platform Reserve', value: '$500,000', change: 3.2, isPositive: true },
  { label: 'Insurance Reserve', value: '$50,000', change: -1.5, isPositive: false },
  { label: 'Operating Capital', value: '$200,000', change: 5.8, isPositive: true },
  { label: 'Total Treasury', value: '$750,000', change: 2.1, isPositive: true },
]

const exposureMetrics = [
  { label: 'User Liability Exposure', value: '$120,000', max: '$500,000', percentage: 24 },
  { label: 'Open Payout Exposure', value: '$85,000', max: '$300,000', percentage: 28 },
  { label: 'Pending Settlement', value: '$45,000', max: '$200,000', percentage: 23 },
]

const analyticsMetrics = [
  { label: 'Total Revenue (30d)', value: '$125,000', change: '+8.5%' },
  { label: 'Trading Fees Collected', value: '$75,000', change: '+12.3%' },
  { label: 'Withdrawal Fees', value: '$15,000', change: '+3.2%' },
  { label: 'Affiliate Commissions Paid', value: '$25,000', change: '-2.1%' },
]

const runwayMetrics = [
  { label: 'Daily Burn Rate', value: '$5,200', trend: 'stable' },
  { label: 'Monthly Burn Rate', value: '$156,000', trend: 'decreasing' },
  { label: 'Operational Runway', value: '4.8 months', trend: 'stable' },
  { label: 'Reserves Health', value: '92%', trend: 'increasing' },
]

export default function TreasuryPanelSection() {
  return (
    <div className="space-y-6">
      {/* Treasury Reserves Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Treasury Reserves</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {treasuryMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.isPositive ? (
                      <TrendingUpIcon className="size-4" />
                    ) : (
                      <TrendingDownIcon className="size-4" />
                    )}
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </div>
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
          <CardDescription>Monitor user liability and payout exposure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {exposureMetrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.label}</span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {metric.value} / {metric.max}
                </span>
              </div>
              <Progress value={metric.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{metric.percentage}% utilized</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revenue Analytics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Revenue Analytics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {analyticsMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {metric.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Operational Runway */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Runway & Health</CardTitle>
          <CardDescription>Monitor burn rate and reserve health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {runwayMetrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <Badge
                    variant="outline"
                    className={`${
                      metric.trend === 'increasing'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : metric.trend === 'decreasing'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {metric.trend.charAt(0).toUpperCase() + metric.trend.slice(1)}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="flex flex-row items-center gap-4 pb-3">
          <AlertTriangleIcon className="size-5 text-yellow-600" />
          <div>
            <CardTitle className="text-yellow-900">Treasury Health Alert</CardTitle>
            <CardDescription className="text-yellow-700">Insurance reserve below optimal level</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-800">
            Current insurance reserve is 10% below the recommended threshold. Consider reallocating funds from operating capital to maintain risk coverage.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
