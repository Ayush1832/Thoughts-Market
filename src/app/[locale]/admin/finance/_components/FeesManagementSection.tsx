'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  id: number
  fee_key: string
  name: string
  description: string
  category: string
  rate_percent: string
  previous_rate_percent: string
  status: 'active' | 'pending' | 'archived'
  updated_by: string | null
  updated_at: string
}

const FEE_DISTRIBUTION: { label: string, pct: number, color: string }[] = [
  { label: 'Trading Fees (Platform)', pct: 45, color: 'bg-blue-600' },
  { label: 'Creator Fees', pct: 35, color: 'bg-green-600' },
  { label: 'Referral Commissions', pct: 12, color: 'bg-purple-600' },
  { label: 'Liquidity Provider Rewards', pct: 8, color: 'bg-orange-600' },
]

export default function FeesManagementSection() {
  const [fees, setFees] = useState<FeeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFees = async () => {
    setLoading(true)
    try {
      const res = await fetch('/en/admin/api/finance/fees')
      if (res.ok) setFees(await res.json())
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFees() }, [])

  const handleEdit = (fee: FeeConfig) => {
    setEditingId(fee.id)
    setEditValue(fee.rate_percent)
    setError(null)
  }

  const handleSave = async (id: number) => {
    const rate = Number(editValue)
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setError('Rate must be between 0 and 100.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/en/admin/api/finance/fees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_percent: rate }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchFees()
      }
      else {
        setError('Failed to save. Please try again.')
      }
    }
    finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValue('')
    setError(null)
  }

  const CATEGORIES = ['all', 'trading', 'withdrawal', 'creator', 'liquidity', 'referral'] as const

  const filtered = (cat: string) =>
    cat === 'all' ? fees : fees.filter(f => f.category === cat)

  return (
    <div className="space-y-6">
      {/* Fee Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Configuration</CardTitle>
          <CardDescription>Manage and update all platform fees — changes are saved to the database immediately</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {CATEGORIES.map(cat => (
                <TabsTrigger key={cat} value={cat} className="capitalize">{cat}</TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(cat => (
              <TabsContent key={cat} value={cat} className="mt-4">
                {loading
                  ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">Loading fees...</div>
                    )
                  : (
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Current</TableHead>
                              <TableHead>Previous</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered(cat).map(fee => (
                              <TableRow key={fee.id}>
                                <TableCell className="font-medium">{fee.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-xs">{fee.description}</TableCell>
                                <TableCell>
                                  {editingId === fee.id
                                    ? (
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="100"
                                          value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          className="w-24"
                                        />
                                      )
                                    : (
                                        <span className="font-semibold">{Number(fee.rate_percent).toFixed(2)}%</span>
                                      )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {Number(fee.previous_rate_percent).toFixed(2)}%
                                </TableCell>
                                <TableCell>
                                  <Badge variant={fee.status === 'active' ? 'default' : fee.status === 'pending' ? 'secondary' : 'outline'}>
                                    {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(fee.updated_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {editingId === fee.id
                                    ? (
                                        <div className="flex gap-2">
                                          <Button size="sm" disabled={saving} onClick={() => handleSave(fee.id)}>
                                            <SaveIcon className="size-4 mr-1" />
                                            {saving ? 'Saving…' : 'Save'}
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={handleCancel}>
                                            <XIcon className="size-4" />
                                          </Button>
                                        </div>
                                      )
                                    : (
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(fee)}>
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
                    )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Fee Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Distribution Summary</CardTitle>
          <CardDescription>Overview of where fees are allocated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FEE_DISTRIBUTION.map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm font-semibold">{item.pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
