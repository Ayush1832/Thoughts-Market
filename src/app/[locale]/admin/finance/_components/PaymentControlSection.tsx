'use client'

import { AlertCircleIcon, ArrowDownIcon, ArrowUpIcon, CheckCircleIcon, ClockIcon, PlusIcon, XCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  if (!t) {
    return ''
  }
  return `${t > 0 ? '+' : ''}${t.toFixed(1)}%`
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircleIcon className="size-4 text-green-500" />
    case 'pending': return <ClockIcon className="size-4 text-yellow-500" />
    case 'failed': return <XCircleIcon className="size-4 text-red-500" />
    case 'chargeback': return <AlertCircleIcon className="size-4 text-red-600" />
    default: return null
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed': return <Badge className="bg-green-600">Completed</Badge>
    case 'pending': return <Badge className="bg-yellow-600 text-white">Pending</Badge>
    case 'failed': return <Badge variant="destructive">Failed</Badge>
    case 'chargeback': return <Badge variant="destructive" className="bg-red-700">Chargeback</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

const TX_TYPES = ['deposit', 'withdrawal', 'settlement', 'refund'] as const

export default function PaymentControlSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    type: 'deposit' as typeof TX_TYPES[number],
    amount: '',
    currency: 'USDC',
    wallet_address: '',
    notes: '',
  })

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

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
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

  async function submitNewTransaction() {
    if (!form.amount || Number(form.amount) <= 0) {
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/en/admin/api/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setAddOpen(false)
        setForm({ type: 'deposit', amount: '', currency: 'USDC', wallet_address: '', notes: '' })
        fetchData(activeTab)
      }
    }
    finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    try {
      const res = await fetch(`/en/admin/api/finance/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        fetchData(activeTab)
      }
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
                  <div className="h-4 w-32 animate-pulse rounded-sm bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 animate-pulse rounded-sm bg-muted" />
                </CardContent>
              </Card>
            ))
          : statCards.map(stat => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  {stat.trend && (
                    <span className={`text-xs font-semibold ${stat.trend.startsWith('+')
                      ? 'text-green-600'
                      : `text-red-600`}`}
                    >
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
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Payment Control Dashboard</CardTitle>
            <CardDescription>Manage deposits, withdrawals, settlements, and disputes</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <PlusIcon className="mr-1 size-4" />
            Add Transaction
          </Button>
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
                      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                        Loading transactions...
                      </div>
                    )
                  : transactions.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                          <p className="text-sm">No transactions yet.</p>
                          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                            <PlusIcon className="mr-1 size-4" />
                            Add Transaction
                          </Button>
                        </div>
                      )
                    : (
                        <div className="overflow-x-auto rounded-md border">
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
                                  <TableCell className="font-mono text-xs">
                                    {tx.id.slice(0, 10)}
                                    …
                                  </TableCell>
                                  <TableCell className="capitalize">{tx.type}</TableCell>
                                  <TableCell className="font-medium">
                                    {tx.type === 'deposit' || tx.type === 'settlement' ? '+' : '-'}
                                    {Number(tx.amount).toLocaleString()}
                                    {' '}
                                    {tx.currency}
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
                                        onClick={() => updateStatus(tx.id, 'completed')}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Manually record a transaction (e.g. an off-chain adjustment).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={value => setForm(f => ({ ...f, type: value as typeof TX_TYPES[number] }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tx-amount">Amount</Label>
                <Input
                  id="tx-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-currency">Currency</Label>
                <Input
                  id="tx-currency"
                  value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-wallet">Wallet address</Label>
              <Input
                id="tx-wallet"
                value={form.wallet_address}
                onChange={e => setForm(f => ({ ...f, wallet_address: e.target.value }))}
                placeholder="0x…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-notes">Notes</Label>
              <Input
                id="tx-notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitNewTransaction} disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
