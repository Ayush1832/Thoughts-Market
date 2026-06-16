'use client'

import { CheckIcon, WalletIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { FIAT_CURRENCIES } from '@/lib/fiat'
import { cn } from '@/lib/utils'
import { useWalletSettings } from '@/stores/useWalletSettings'

interface WalletSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WalletSettingsDialog({ open, onOpenChange }: WalletSettingsDialogProps) {
  const displayInFiat = useWalletSettings(s => s.displayInFiat)
  const currency = useWalletSettings(s => s.currency)
  const setDisplayInFiat = useWalletSettings(s => s.setDisplayInFiat)
  const setCurrency = useWalletSettings(s => s.setCurrency)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      return FIAT_CURRENCIES.slice(0, 10)
    }
    return FIAT_CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q)
      || c.name.toLowerCase().includes(q)
      || c.country.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-tm-border p-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <WalletIcon className="size-5" />
          </span>
          <DialogTitle className="text-lg font-bold">Wallet Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {/* Display crypto in fiat */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-tm-primary">Display Crypto in Fiat</p>
              <p className="mt-0.5 text-xs text-tm-secondary">
                Show balances converted into your preferred fiat. Trades & transactions still settle in crypto.
              </p>
            </div>
            <Switch checked={displayInFiat} onCheckedChange={setDisplayInFiat} />
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Top 10 shown · search for more"
            className={cn(
              'h-11 w-full rounded-xl border border-tm-border bg-tm-elevated/60 px-4 text-sm text-tm-primary',
              'placeholder:text-tm-secondary/70 focus:border-primary/50 focus:outline-none',
            )}
          />

          {/* Currency grid */}
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {filtered.map((c) => {
              const selected = c.code === currency
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-tm-border bg-tm-elevated/40 hover:border-tm-border hover:bg-tm-elevated',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-primary bg-primary text-white' : 'border-tm-secondary/40',
                    )}
                    >
                      {selected && <CheckIcon className="size-3" />}
                    </span>
                    <span className="text-sm font-bold text-tm-primary">{c.code}</span>
                  </span>
                  <span className="text-xs font-medium text-tm-secondary/60">{c.country}</span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="col-span-2 py-6 text-center text-sm text-tm-secondary">No currencies found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
