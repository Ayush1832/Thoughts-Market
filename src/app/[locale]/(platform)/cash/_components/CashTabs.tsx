'use client'

import { useExtracted } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useMoneyFormatter } from '@/hooks/useMoneyFormatter'
import { useTabIndicatorPosition } from '@/hooks/useTabIndicatorPosition'
import { cn } from '@/lib/utils'

type TabType = 'all' | 'deposit' | 'withdrawal'

interface CashTransaction {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: string
  currency: string
  status: string
  method: string
  txHash: string | null
  createdAt: string
}

const baseTabs = [
  { id: 'all' as const },
  { id: 'deposit' as const },
  { id: 'withdrawal' as const },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusClasses(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-yes/15 text-yes'
    case 'failed':
    case 'chargeback':
      return 'bg-no/15 text-no'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function CashTabs() {
  const t = useExtracted()
  const formatMoney = useMoneyFormatter()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const tabs = useMemo(() => baseTabs, [])
  const { tabRef, indicatorStyle, isInitialized } = useTabIndicatorPosition({ tabs, activeTab })

  useEffect(() => {
    let active = true
    fetch('/api/cash/transactions', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.transactions)) {
          setTransactions(data.transactions)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    if (activeTab === 'all') {
      return transactions
    }
    return transactions.filter(tx => tx.type === activeTab)
  }, [transactions, activeTab])

  return (
    <div className="mt-6 overflow-hidden rounded-lg border">
      <div className="relative">
        <div className="flex items-center gap-6 px-4 pt-4 sm:px-6">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRef.current[index] = el
              }}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative pb-3 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.id === 'all'
                ? t('All')
                : tab.id === 'deposit'
                  ? t('Deposit')
                  : t('Withdrawal')}
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/80" />
        <div
          className={cn(
            'pointer-events-none absolute bottom-0 h-0.5 bg-primary',
            { 'transition-all duration-300 ease-out': isInitialized },
          )}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>

      <div className="p-4 sm:px-6">
        {isLoading
          ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t('Loading…')}</p>
            )
          : visible.length === 0
            ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t('No transactions found.')}</p>
              )
            : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        <th className="pr-4 pb-3 font-semibold">{t('Date')}</th>
                        <th className="pr-4 pb-3 font-semibold">{t('Type')}</th>
                        <th className="pr-4 pb-3 font-semibold">{t('Method')}</th>
                        <th className="pr-4 pb-3 text-right font-semibold">{t('Amount')}</th>
                        <th className="pb-3 text-right font-semibold">{t('Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(tx => (
                        <tr key={tx.id} className="border-t border-border/60">
                          <td className="py-3 pr-4 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                          <td className="py-3 pr-4 font-medium capitalize">
                            {tx.type === 'deposit' ? t('Deposit') : t('Withdrawal')}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{tx.method}</td>
                          <td
                            className={cn(
                              'py-3 pr-4 text-right font-semibold',
                              tx.type === 'deposit' ? 'text-yes' : 'text-no',
                            )}
                          >
                            {tx.type === 'deposit' ? '+' : '-'}
                            {formatMoney(Number(tx.amount) || 0)}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                                statusClasses(tx.status),
                              )}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </div>
    </div>
  )
}
