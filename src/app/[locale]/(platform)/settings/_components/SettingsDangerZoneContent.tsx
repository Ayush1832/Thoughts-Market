'use client'

import { Loader2Icon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useDisconnect } from 'wagmi'
import { exportAccountDataAction } from '@/app/[locale]/(platform)/settings/_actions/export-account-data'
import SettingsDeleteAccountContent from '@/app/[locale]/(platform)/settings/_components/SettingsDeleteAccountContent'
import { Button } from '@/components/ui/button'
import { signOutAndRedirect } from '@/lib/logout'

function Row({ title, description, action }: { title: string, description: string, action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export default function SettingsDangerZoneContent() {
  const t = useExtracted()
  const { disconnect } = useDisconnect()
  const [isExporting, startExport] = useTransition()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  function handleExport() {
    startExport(async () => {
      const { data, error } = await exportAccountDataAction()
      if (error || !data) {
        toast.error(error ?? t('Export failed.'))
        return
      }
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `account-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('Your data has been exported.'))
    })
  }

  function handleDisconnect() {
    setIsDisconnecting(true)
    try {
      disconnect()
    }
    catch {}
    void signOutAndRedirect({ currentPathname: window.location.pathname })
  }

  return (
    <div className="grid gap-6">
      <div className="tm-glass p-5">
        <Row
          title={t('Export all data')}
          description={t('Bets, positions, transactions — as a JSON file')}
          action={(
            <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2Icon className="size-4 animate-spin" /> : t('Export')}
            </Button>
          )}
        />
        <Row
          title={t('Disconnect wallet')}
          description={t('You can reconnect anytime. Open positions stay on-chain.')}
          action={(
            <Button
              type="button"
              variant="outline"
              className="border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <Loader2Icon className="size-4 animate-spin" /> : t('Disconnect')}
            </Button>
          )}
        />
      </div>

      <SettingsDeleteAccountContent />
    </div>
  )
}
