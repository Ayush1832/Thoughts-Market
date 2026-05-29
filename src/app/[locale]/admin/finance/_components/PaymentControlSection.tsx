'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, AlertCircleIcon, CheckCircleIcon, XCircleIcon, ClockIcon, PlusIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'settlement' | 'refund'
  amount: string
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'chargeback'
  wallet_address: string
  method: string
  tx_hash?: string | null
  created_at: string
}

interface Stats {
  depositsToday: number
  depositsTodayTrend: number
  withdrawalsToday: number
  withdrawalsTodayTrend: number
  pendingSettlements: number
  failedTransactions: number
  activeChargebacks: number
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function trendLabel(t: number) {
  if (!t) return ''
  return `${t > 0 ? '+' : ''}${t.toFixed(1)}%`
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircleIcon className="size-4 text-green-500" />
    case 'pending': return <ClockIcon className="size-4 text-yellow-500" />
    case 'failed': return <XCircleIcon className="size-4 text-red-500" />
    case 'chargeback': return <AlertCircleIcon className="size-4 text-red-600" />
    default: return null
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <Badge className="bg-green-600">Completed</Badge>
    case 'pending': return <Badge className="bg-yellow-600 text-white">Pending</Badge>
    case 'failed': return <Badge variant="destructive">Failed</Badge>
    case 'chargeback': return <Badge variant="destructive" className="bg-red-700">Chargeback</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

export default function PaymentControlSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async (type?: string) => {
    setLoading(true)
    try {
      const txParam = type && type !== 'all' && type !== 'pending' && type !== 'issues'
        ? `&type=${type}`
        : ''
      const statusParam = type === 'pending'
        ? '&status=pending'
        : type === 'issues'
          ? '&status=chargeback'
          : ''

      const [statsRes, txRes] = await Promise.all([
        fetch('/en/admin/api/finance/stats'),
        fetch(`/en/admin/api/finance/transactions?limit=50${txParam}${statusParam}`),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (txRes.ok) {
        const { data } = await txRes.json()
        setTransactions(data ?? [])
      }
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/en/admin/api/finance/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) fetchData(activeTab)
    }
    finally {
      setUpdating(null)
    }
  }

  const statCards = stats
    ? [
        { label: 'Total Deposits Today', value: fmt(stats.depositsToday), trend: trendLabel(stats.depositsTodayTrend) },
        { label: 'Total Withdrawals', value: fmt(stats.withdrawalsToday), trend: trendLabel(stats.withdrawalsTodayTrend) },
        { label: 'Pending Settlements', value: fmt(stats.pendingSettlements), trend: '' },
        { label: 'Failed Transactions', value: String(stats.failedTransactions), trend: '' },
        { label: 'Active Chargebacks', value: String(stats.activeChargebacks), trend: '' },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && !stats
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))
          : statCards.map(stat => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  {stat.trend && (
                    <span className={`text-xs font-semibold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend}
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Transaction Management */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Control Dashboard</CardTitle>
          <CardDescription>Manage deposits, withdrawals, settlements, and disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposit">
                <ArrowDownIcon className="mr-2 size-4" />
                Deposits
              </TabsTrigger>
              <TabsTrigger value="withdrawal">
                <ArrowUpIcon className="mr-2 size-4" />
                Withdrawals
              </TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            {['all', 'deposit', 'withdrawal', 'pending', 'issues'].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4">
                {loading
                  ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        Loading transactions...
                      </div>
                    )
                  : transactions.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                          <p className="text-sm">No transactions yet.</p>
                          <Button size="sm" variant="outline" onClick={() => {}}>
                            <PlusIcon className="size-4 mr-1" />
                            Add Transaction
                          </Button>
                        </div>
                      )
                    : (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Wallet</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transactions.map(tx => (
                                <TableRow key={tx.id}>
                                  <TableCell className="font-mono text-xs">{tx.id.slice(0, 10)}…</TableCell>
                                  <TableCell className="capitalize">{tx.type}</TableCell>
                                  <TableCell className="font-medium">
                                    {tx.type === 'deposit' || tx.type === 'settlement' ? '+' : '-'}
                                    {Number(tx.amount).toLocaleString()} {tx.currency}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {tx.wallet_address ? `${tx.wallet_address.slice(0, 8)}…` : '—'}
                                  </TableCell>
                                  <TableCell className="text-sm">{tx.method}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(tx.status)}
                                      {getStatusBadge(tx.status)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {new Date(tx.created_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    {tx.status === 'pending' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={updating === tx.id}
                                        onClick={() => updateStatus(tx.id, 'completed')}
                                      >
                                        Approve
                                      </Button>
                                    )}
                                    {tx.status === 'chargeback' && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={updating === tx.id}
                                        onClick={() => updateStatus(tx.id, 'resolved')}
                                      >
                                        Resolve
                                      </Button>
                                    )}
                                    {tx.status === 'failed' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={updating === tx.id}
                                        onClick={() => updateStatus(tx.id, 'pending')}
                                      >
                                        Retry
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
