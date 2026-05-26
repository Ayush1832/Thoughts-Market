'use client'

import { useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, AlertCircleIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react'
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
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'chargeback'
  user: string
  timestamp: string
  method?: string
}

const mockTransactions: Transaction[] = [
  {
    id: 'TXN-001',
    type: 'deposit',
    amount: 5000,
    currency: 'USD',
    status: 'completed',
    user: 'user@example.com',
    timestamp: '2026-05-26 14:30:00',
    method: 'Credit Card',
  },
  {
    id: 'TXN-002',
    type: 'withdrawal',
    amount: 2500,
    currency: 'USDC',
    status: 'pending',
    user: 'trader@example.com',
    timestamp: '2026-05-26 13:15:00',
    method: 'Crypto Wallet',
  },
  {
    id: 'TXN-003',
    type: 'deposit',
    amount: 10000,
    currency: 'EUR',
    status: 'completed',
    user: 'investor@example.com',
    timestamp: '2026-05-25 11:45:00',
    method: 'Bank Transfer',
  },
  {
    id: 'TXN-004',
    type: 'withdrawal',
    amount: 1500,
    currency: 'USD',
    status: 'failed',
    user: 'user2@example.com',
    timestamp: '2026-05-25 09:20:00',
    method: 'Credit Card',
  },
  {
    id: 'TXN-005',
    type: 'settlement',
    amount: 500,
    currency: 'USD',
    status: 'chargeback',
    user: 'user3@example.com',
    timestamp: '2026-05-24 16:00:00',
    method: 'Payment Processor',
  },
]

const stats = [
  { label: 'Total Deposits Today', value: '$15,000', trend: '+12%' },
  { label: 'Total Withdrawals', value: '$4,000', trend: '-8%' },
  { label: 'Pending Settlements', value: '$2,500', trend: '' },
  { label: 'Failed Transactions', value: '1', trend: '' },
  { label: 'Active Chargebacks', value: '1', trend: '' },
  { label: 'Treasury Balance', value: '$250,000', trend: '+5%' },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="size-4 text-green-500" />
    case 'pending':
      return <ClockIcon className="size-4 text-yellow-500" />
    case 'failed':
      return <XCircleIcon className="size-4 text-red-500" />
    case 'chargeback':
      return <AlertCircleIcon className="size-4 text-red-600" />
    default:
      return null
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-600">Completed</Badge>
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-600 text-white">Pending</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'chargeback':
      return <Badge variant="destructive" className="bg-red-700">Chargeback</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function PaymentControlSection() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
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
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposits">
                <ArrowDownIcon className="mr-2 size-4" />
                Deposits
              </TabsTrigger>
              <TabsTrigger value="withdrawals">
                <ArrowUpIcon className="mr-2 size-4" />
                Withdrawals
              </TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
            </TabsList>

            {['all', 'deposits', 'withdrawals', 'pending', 'issues'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                          <TableCell className="capitalize">{tx.type}</TableCell>
                          <TableCell className="font-medium">
                            {tx.type === 'deposit' || tx.type === 'settlement' ? '+' : '-'}${tx.amount.toLocaleString()} {tx.currency}
                          </TableCell>
                          <TableCell className="text-sm">{tx.user}</TableCell>
                          <TableCell className="text-sm">{tx.method}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(tx.status)}
                              {getStatusBadge(tx.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tx.timestamp}</TableCell>
                          <TableCell>
                            {tx.status === 'pending' && (
                              <Button size="sm" variant="outline">Approve</Button>
                            )}
                            {tx.status === 'chargeback' && (
                              <Button size="sm" variant="destructive">Review</Button>
                            )}
                            {tx.status === 'failed' && (
                              <Button size="sm" variant="outline">Retry</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
