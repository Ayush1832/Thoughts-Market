'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EditIcon, SaveIcon, XIcon } from 'lucide-react'

interface FeeConfig {
  id: string
  name: string
  description: string
  current: number
  previous: number
  category: 'trading' | 'withdrawal' | 'creator' | 'liquidity' | 'referral'
  lastUpdated: string
  status: 'active' | 'pending' | 'archived'
}

const mockFeeConfigs: FeeConfig[] = [
  {
    id: 'FEE-001',
    name: 'Trading Fee (Maker)',
    description: 'Fee charged for market makers',
    current: 0.1,
    previous: 0.15,
    category: 'trading',
    lastUpdated: '2026-05-15',
    status: 'active',
  },
  {
    id: 'FEE-002',
    name: 'Trading Fee (Taker)',
    description: 'Fee charged for market takers',
    current: 0.25,
    previous: 0.2,
    category: 'trading',
    lastUpdated: '2026-05-10',
    status: 'active',
  },
  {
    id: 'FEE-003',
    name: 'Withdrawal Fee',
    description: 'Fixed fee for withdrawals',
    current: 1.5,
    previous: 1.0,
    category: 'withdrawal',
    lastUpdated: '2026-05-01',
    status: 'active',
  },
  {
    id: 'FEE-004',
    name: 'Creator Fee',
    description: 'Revenue share for market creators',
    current: 2.0,
    previous: 2.0,
    category: 'creator',
    lastUpdated: '2026-04-20',
    status: 'active',
  },
  {
    id: 'FEE-005',
    name: 'Liquidity Provider Rewards',
    description: 'Rewards for providing liquidity',
    current: 0.5,
    previous: 0.5,
    category: 'liquidity',
    lastUpdated: '2026-04-15',
    status: 'active',
  },
  {
    id: 'FEE-006',
    name: 'Referral Commission',
    description: 'Commission paid to referrers',
    current: 10.0,
    previous: 8.0,
    category: 'referral',
    lastUpdated: '2026-05-20',
    status: 'pending',
  },
]

const feeStats = [
  { label: 'Total Trading Fees (30d)', value: '$45,200', trend: '+8.5%' },
  { label: 'Total Withdrawal Fees', value: '$12,500', trend: '+3.2%' },
  { label: 'Creator Fees Distributed', value: '$28,000', trend: '+15.2%' },
  { label: 'Referral Commissions', value: '$8,500', trend: '+22.1%' },
]

export default function FeesManagementSection() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({})

  const handleEdit = (feeId: string, currentValue: number) => {
    setEditingId(feeId)
    setEditValues({ [feeId]: currentValue.toString() })
  }

  const handleSave = (feeId: string) => {
    // Save logic would go here
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValues({})
  }

  return (
    <div className="space-y-6">
      {/* Fee Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {feeStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold">{stat.value}</div>
                <span className="text-xs font-semibold text-green-600">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fee Management */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
          <CardDescription>Manage and update all platform fees</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
              <TabsTrigger value="creator">Creator</TabsTrigger>
              <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
              <TabsTrigger value="referral">Referral</TabsTrigger>
            </TabsList>

            {['all', 'trading', 'withdrawal', 'creator', 'liquidity', 'referral'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Current Value</TableHead>
                        <TableHead>Previous Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockFeeConfigs.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">{fee.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs">{fee.description}</TableCell>
                          <TableCell>
                            {editingId === fee.id ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues[fee.id] || fee.current}
                                onChange={(e) => setEditValues({ [fee.id]: e.target.value })}
                                className="w-24"
                              />
                            ) : (
                              <span className="font-semibold">{fee.current}%</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{fee.previous}%</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                fee.status === 'active'
                                  ? 'default'
                                  : fee.status === 'pending'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{fee.lastUpdated}</TableCell>
                          <TableCell>
                            {editingId === fee.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleSave(fee.id)}
                                >
                                  <SaveIcon className="size-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancel}
                                >
                                  <XIcon className="size-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(fee.id, fee.current)}
                              >
                                <EditIcon className="size-4 mr-1" />
                                Edit
                              </Button>
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

      {/* Fee Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Distribution Summary</CardTitle>
          <CardDescription>Overview of where fees are allocated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Trading Fees (Platform)</span>
                <span className="text-sm font-semibold">45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Creator Fees</span>
                <span className="text-sm font-semibold">35%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Referral Commissions</span>
                <span className="text-sm font-semibold">12%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Liquidity Provider Rewards</span>
                <span className="text-sm font-semibold">8%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: '8%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
