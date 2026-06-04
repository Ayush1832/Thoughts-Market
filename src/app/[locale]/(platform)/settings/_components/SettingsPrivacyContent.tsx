'use client'

import { useExtracted } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  type PrivacySettingsInput,
  updatePrivacySettingsAction,
} from '@/app/[locale]/(platform)/settings/_actions/update-privacy-settings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

function Row({ title, description, control }: { title: string, description: string, control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

export default function SettingsPrivacyContent({ initial }: { initial: PrivacySettingsInput }) {
  const t = useExtracted()
  const [state, setState] = useState<PrivacySettingsInput>(initial)
  const [isPending, startTransition] = useTransition()
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [newBlock, setNewBlock] = useState('')

  function persist(next: PrivacySettingsInput) {
    setState(next)
    startTransition(async () => {
      const { error } = await updatePrivacySettingsAction(next)
      if (error) {
        toast.error(error)
        setState(state) // revert
        return
      }
      toast.success(t('Privacy settings saved.'))
    })
  }

  function addBlocked() {
    const value = newBlock.trim()
    if (!value) {
      return
    }
    if (state.blocked.includes(value)) {
      toast.error(t('Already blocked.'))
      return
    }
    persist({ ...state, blocked: [...state.blocked, value] })
    setNewBlock('')
  }

  function removeBlocked(addr: string) {
    persist({ ...state, blocked: state.blocked.filter(a => a !== addr) })
  }

  return (
    <>
      <div className="rounded-2xl border border-border/50 p-5">
        <div className="mb-2">
          <h2 className="text-xl font-semibold">{t('Privacy')}</h2>
          <p className="text-sm text-muted-foreground">{t('What\'s visible to others.')}</p>
        </div>

        <Row
          title={t('Profile visibility')}
          description={t('Who can see your portfolio and history')}
          control={(
            <Select
              value={state.profile_visibility}
              onValueChange={(v) => { persist({ ...state, profile_visibility: v as PrivacySettingsInput['profile_visibility'] }) }}
              disabled={isPending}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t('Public')}</SelectItem>
                <SelectItem value="friends">{t('Friends only')}</SelectItem>
                <SelectItem value="private">{t('Private')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />

        <Row
          title={t('Show on public leaderboard')}
          description={t('Toggle off and you\'ll appear as \'Anonymous\'')}
          control={(
            <Switch
              checked={state.show_on_leaderboard}
              onCheckedChange={(c) => { persist({ ...state, show_on_leaderboard: c }) }}
              disabled={isPending}
            />
          )}
        />

        <Row
          title={t('Share betting history with friends')}
          description={t('Friends in your rooms can see your last 30 days')}
          control={(
            <Switch
              checked={state.share_history_with_friends}
              onCheckedChange={(c) => { persist({ ...state, share_history_with_friends: c }) }}
              disabled={isPending}
            />
          )}
        />

        <Row
          title={t('Block list')}
          description={t('{count} accounts blocked', { count: String(state.blocked.length) })}
          control={(
            <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(true)}>
              {t('Manage')}
            </Button>
          )}
        />
      </div>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Block list')}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={newBlock}
              onChange={e => setNewBlock(e.target.value)}
              placeholder={t('Wallet address or username')}
              onKeyDown={(e) => { if (e.key === 'Enter') addBlocked() }}
            />
            <Button type="button" onClick={addBlocked} disabled={isPending}>{t('Block')}</Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {state.blocked.length === 0
              ? <p className="py-4 text-center text-sm text-muted-foreground">{t('No blocked accounts.')}</p>
              : state.blocked.map(addr => (
                  <div key={addr} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                    <span className="truncate text-sm">{addr}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeBlocked(addr)} disabled={isPending}>
                      {t('Unblock')}
                    </Button>
                  </div>
                ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(false)}>{t('Done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
