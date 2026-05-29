'use client'

import { AlertCircleIcon, AlertTriangleIcon, BellIcon, CheckCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AlertEvent {
  id: number
  alert_key: string
  type: 'warning' | 'critical' | 'info'
  title: string
  message: string
  threshold: string | null
  current_value: string | null
  status: 'active' | 'dismissed' | 'resolved'
  triggered_at: string
}

interface AlertConfig {
  id: number
  alert_key: string
  name: string
  description: string
  threshold: string
  severity: 'low' | 'medium' | 'high'
  is_enabled: boolean
  recipients: string[]
}

interface Counts {
  activeCount: number
  resolvedCount: number
  enabledConfigs: number
  totalConfigs: number
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'critical': return <AlertTriangleIcon className="size-5 text-red-600" />
    case 'warning': return <AlertCircleIcon className="size-5 text-yellow-600" />
    default: return <BellIcon className="size-5 text-blue-600" />
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'high': return <Badge variant="destructive">High</Badge>
    case 'medium': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
    default: return <Badge variant="outline">Low</Badge>
  }
}

export default function AutoAlertsSection() {
  const [events, setEvents] = useState<AlertEvent[]>([])
  const [configs, setConfigs] = useState<AlertConfig[]>([])
  const [counts, setCounts] = useState<Counts>({ activeCount: 0, resolvedCount: 0, enabledConfigs: 0, totalConfigs: 0 })
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [updatingEventId, setUpdatingEventId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [eventsRes, configsRes] = await Promise.all([
        fetch('/en/admin/api/finance/alerts/events'),
        fetch('/en/admin/api/finance/alerts/configs'),
      ])
      if (eventsRes.ok) {
        const { events: evts, counts: cts } = await eventsRes.json()
        setEvents(evts ?? [])
        setCounts(cts)
      }
      if (configsRes.ok) { setConfigs(await configsRes.json()) }
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleConfig = async (id: number, currentEnabled: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/en/admin/api/finance/alerts/configs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !currentEnabled }),
      })
      if (res.ok) {
        setConfigs(prev => prev.map(c => c.id === id ? { ...c, is_enabled: !currentEnabled } : c))
        setCounts(prev => ({
          ...prev,
          enabledConfigs: !currentEnabled ? prev.enabledConfigs + 1 : prev.enabledConfigs - 1,
        }))
      }
    }
    finally {
      setTogglingId(null)
    }
  }

  const updateEventStatus = async (id: number, status: 'dismissed' | 'resolved') => {
    setUpdatingEventId(id)
    try {
      const res = await fetch(`/en/admin/api/finance/alerts/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e))
        setCounts(prev => ({
          ...prev,
          activeCount: status === 'dismissed' ? prev.activeCount - 1 : prev.activeCount - 1,
          resolvedCount: status === 'resolved' ? prev.resolvedCount + 1 : prev.resolvedCount,
        }))
      }
    }
    finally {
      setUpdatingEventId(null)
    }
  }

  const activeEvents = events.filter(e => e.status === 'active')
  const allEvents = events

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangleIcon className="size-4 text-red-600" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counts.activeCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BellIcon className="size-4 text-blue-600" />
              Alert Configs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {counts.enabledConfigs}
              /
              {counts.totalConfigs}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Monitoring rules active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircleIcon className="size-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{counts.resolvedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeEvents.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Active Alerts</CardTitle>
            <CardDescription className="text-red-700">Immediate action may be required</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeEvents.map(alert => (
                <div key={alert.id} className="rounded-r-md border-l-4 border-red-500 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 gap-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold">{alert.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                        {alert.threshold && alert.current_value && (
                          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                            <span>
                              Threshold:
                              {alert.threshold}
                            </span>
                            <span>
                              Current:
                              {alert.current_value}
                            </span>
                          </div>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(alert.triggered_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingEventId === alert.id}
                        onClick={() => updateEventStatus(alert.id, 'dismissed')}
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        disabled={updatingEventId === alert.id}
                        onClick={() => updateEventStatus(alert.id, 'resolved')}
                      >
                        Resolve
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
          <CardDescription>Toggle rules on/off — changes persist to the database</CardDescription>
        </CardHeader>
        <CardContent>
          {loading
            ? <div className="py-8 text-center text-sm text-muted-foreground">Loading configurations...</div>
            : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Enabled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map(config => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.name}</TableCell>
                          <TableCell className="max-w-xs text-sm text-muted-foreground">{config.description}</TableCell>
                          <TableCell className="font-mono text-sm">{config.threshold}</TableCell>
                          <TableCell>{getSeverityBadge(config.severity)}</TableCell>
                          <TableCell className="text-sm">
                            <div className="space-y-1">
                              {config.recipients.map((r, i) => (
                                <div key={i} className="text-xs text-muted-foreground">{r}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={config.is_enabled}
                              disabled={togglingId === config.id}
                              onCheckedChange={() => toggleConfig(config.id, config.is_enabled)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>All alerts and their resolution status</CardDescription>
        </CardHeader>
        <CardContent>
          {allEvents.length === 0
            ? <p className="py-4 text-center text-sm text-muted-foreground">No alerts recorded yet.</p>
            : (
                <div className="space-y-3">
                  {allEvents.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex flex-1 items-center gap-3">
                        {getAlertIcon(alert.type)}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.triggered_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={alert.status === 'active' ? 'destructive' : alert.status === 'dismissed' ? 'secondary' : 'default'}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  )
}
