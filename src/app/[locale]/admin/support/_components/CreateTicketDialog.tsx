'use client'

import { useState, useTransition } from 'react'
import { useExtracted } from 'next-intl'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/lib/db/schema/support/tables'
import type { TicketCategory, TicketPriority } from '@/lib/db/schema/support/tables'
import { createTicketAction } from '../_actions/update-ticket'

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  kyc: 'KYC',
  market_disputes: 'Market Disputes',
  technical_issues: 'Technical Issues',
}

export function CreateTicketDialog({ onSuccess }: { onSuccess?: () => void }) {
  const t = useExtracted()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<TicketCategory | ''>('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!category || !subject.trim() || !description.trim()) {
      setError(t('Category, subject, and description are required.'))
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createTicketAction({
        category: category as TicketCategory,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      })
      if (result.error) {
        setError(result.error)
      }
      else {
        setOpen(false)
        setCategory('')
        setSubject('')
        setDescription('')
        setPriority('medium')
        onSuccess?.()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="mr-2 size-4" />
          {t('New Ticket')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Create Support Ticket')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>{t('Category')}</Label>
            <Select value={category} onValueChange={v => setCategory(v as TicketCategory)}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select category')} />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">{t('Subject')}</Label>
            <Input
              id="subject"
              placeholder={t('Brief description of the issue')}
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <Textarea
              id="description"
              placeholder={t('Detailed description...')}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('Priority')}</Label>
            <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITIES.map(p => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? t('Creating...') : t('Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
