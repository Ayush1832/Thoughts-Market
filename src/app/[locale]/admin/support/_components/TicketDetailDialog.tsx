'use client'

import type { TicketPriority, TicketStatus } from '@/lib/db/schema/support/tables'
import { useExtracted } from 'next-intl'
import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/lib/db/schema/support/tables'
import { updateTicketAction } from '../_actions/update-ticket'

export interface TicketRow {
  id: string
  category: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  resolution_notes: string | null
  created_at: Date | string
  updated_at: Date | string
  user_id: string | null
  reporter_username: string | null
  reporter_address: string | null
  reporter_email: string | null
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  in_progress: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  resolved: 'bg-green-500/15 text-green-600 border-green-500/30',
  closed: 'bg-muted text-muted-foreground',
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  urgent: 'bg-red-500/15 text-red-600 border-red-500/30',
}

interface Props {
  ticket: TicketRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function TicketDetailDialog({ ticket, open, onOpenChange, onUpdated }: Props) {
  const t = useExtracted()
  const [status, setStatus] = useState<TicketStatus>(ticket.status)
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority)
  const [notes, setNotes] = useState(ticket.resolution_notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateTicketAction(ticket.id, {
        status,
        priority,
        resolution_notes: notes || null,
      })
      if (result.error) {
        setError(result.error)
      }
      else {
        onOpenChange(false)
        onUpdated?.()
      }
    })
  }

  const categoryLabel = ticket.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const reporter = ticket.reporter_username ?? ticket.reporter_address ?? ticket.user_id ?? t('Unknown')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{ticket.subject}</span>
            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[ticket.status]}`}>
              {ticket.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              {t('Category')}
              :
              {' '}
              <strong className="text-foreground">{categoryLabel}</strong>
            </span>
            <span>·</span>
            <span>
              {t('Reporter')}
              :
              {' '}
              <strong className="text-foreground">{reporter}</strong>
            </span>
            <span>·</span>
            <span>{new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</span>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
            {ticket.description}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{t('Status')}</Label>
              <Select value={status} onValueChange={v => setStatus(v as TicketStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s]}`}>
                        {s.replace('_', ' ')}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('Priority')}</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>
                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[p]}`}>
                        {p}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t('Resolution Notes')}</Label>
            <Textarea
              placeholder={t('Add resolution notes...')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? t('Saving...') : t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
