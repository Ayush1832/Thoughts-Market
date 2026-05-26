'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { AlertTriangleIcon, AlertCircleIcon, BellIcon, CheckCircleIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Alert {
  id: string
  type: 'warning' | 'critical' | 'info'
  title: string
  message: string
  threshold?: string
  currentValue?: string
  timestamp: string
  status: 'active' | 'dismissed' | 'resolved'
}

interface AlertConfig {
  id: string
  name: string
  description: string
  enabled: boolean
  threshold: string
  severity: 'low' | 'medium' | 'high'
  recipients: string[]
}

const mockAlerts: Alert[] = [
  {
    id: 'ALERT-001',
    type: 'critical',
    title: 'Low Liquidity Warning',
    message: 'Market BTC/USD liquidity pool is below 500K threshold',
    threshold: '$500,000',
    currentValue: '$320,000',
    timestamp: '2026-05-26 14:00:00',
    status: 'active',
  },
  {
    id: 'ALERT-002',
    type: 'critical',
    title: 'High Payout Exposure',
    message: 'Open payout exposure has exceeded 85% of maximum threshold',
    threshold: '$300,000',
    currentValue: '$255,000',
    timestamp: '2026-05-26 13:30:00',
    status: 'active',
  },
  {
    id: 'ALERT-003',
    type: 'warning',
    title: 'Whale Dominance Alert',
    message: 'Single user controls 15% of platform liquidity',
    threshold: '10%',
    currentValue: '15%',
    timestamp: '2026-05-26 11:45:00',
    status: 'active',
  },
  {
    id: 'ALERT-004',
    type: 'warning',
    title: 'Treasury Imbalance',
    message: 'Insurance reserve is 12% below optimal allocation',
    threshold: '100%',
    currentValue: '88%',
    timestamp: '2026-05-25 16:20:00',
    status: 'active',
  },
  {
    id: 'ALERT-005',
    type: 'warning',
    title: 'Unusual Withdrawal Pattern',
    message: 'Withdrawal volume spiked 250% above 7-day average',
    threshold: '200%',
    currentValue: '250%',
    timestamp: '2026-05-25 14:10:00',
    status: 'dismissed',
  },
]

const alertConfigs: AlertConfig[] = [
  {
    id: 'CONFIG-001',
    name: 'Low Liquidity Alert',
    description: 'Triggered when market liquidity falls below threshold',
    enabled: true,
    threshold: '$500,000',
    severity: 'high',
    recipients: ['finance@admin.com', 'ops@admin.com'],
  },
  {
    id: 'CONFIG-002',
    name: 'High Payout Exposure',
    description: 'Triggered when open payouts exceed 85% of limit',
    enabled: true,
    threshold: '85%',
    severity: 'high',
    recipients: ['finance@admin.com', 'risk@admin.com'],
  },
  {
    id: 'CONFIG-003',
    name: 'Whale Dominance',
    description: 'Triggered when single user exceeds 15% of liquidity',
    enabled: true,
    threshold: '15%',
    severity: 'medium',
    recipients: ['ops@admin.com'],
  },
  {
    id: 'CONFIG-004',
    name: 'Treasury Imbalance',
    description: 'Triggered when reserves fall below 90% of target',
    enabled: true,
    threshold: '90%',
    severity: 'medium',
    recipients: ['finance@admin.com'],
  },
  {
    id: 'CONFIG-005',
    name: 'Unusual Withdrawals',
    description: 'Triggered when withdrawal volume exceeds 200% of average',
    enabled: true,
    threshold: '200%',
    severity: 'medium',
    recipients: ['ops@admin.com', 'compliance@admin.com'],
  },
]

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'critical':
      return <AlertTriangleIcon className="size-5 text-red-600" />
    case 'warning':
      return <AlertCircleIcon className="size-5 text-yellow-600" />
    case 'info':
      return <BellIcon className="size-5 text-blue-600" />
    default:
      return null
  }
}

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'high':
      return <Badge variant="destructive">High</Badge>
    case 'medium':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
    case 'low':
      return <Badge variant="outline">Low</Badge>
    default:
      return null
  }
}

export default function AutoAlertsSection() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(new Set(dismissedAlerts).add(alertId))
  }

  const resolveAlert = (alertId: string) => {
    setDismissedAlerts(new Set(Array.from(dismissedAlerts).filter(id => id !== alertId)))
  }

  const activeAlerts = mockAlerts.filter(alert => !dismissedAlerts.has(alert.id) && alert.status === 'active')
  const resolvedAlerts = mockAlerts.filter(alert => alert.status === 'resolved')

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-red-600" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BellIcon className="size-4 text-blue-600" />
              Alert Configs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alertConfigs.filter(c => c.enabled).length}/{alertConfigs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Monitoring rules active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolvedAlerts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Active Alerts</CardTitle>
            <CardDescription className="text-red-700">Immediate action may be required</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="border-l-4 border-red-500 bg-white p-4 rounded-r-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        {alert.threshold && alert.currentValue && (
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Threshold: {alert.threshold}</span>
                            <span>Current: {alert.currentValue}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Monitoring Configuration</CardTitle>
          <CardDescription>Configure automated monitoring rules and thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">{config.description}</TableCell>
                    <TableCell className="font-mono text-sm">{config.threshold}</TableCell>
                    <TableCell>
                      {getSeverityBadge(config.severity)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        {config.recipients.map((recipient, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">{recipient}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={() => {
                          // Toggle logic would go here
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        Configure
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Recent alerts and their resolution status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3 flex-1">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                  </div>
                </div>
                <Badge
                  variant={
                    alert.status === 'active'
                      ? 'destructive'
                      : alert.status === 'dismissed'
                        ? 'secondary'
                        : 'default'
                  }
                >
                  {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
