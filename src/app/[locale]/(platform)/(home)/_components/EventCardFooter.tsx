import type { Event } from '@/types'
import { Repeat } from 'lucide-react'
import EventBookmark from '@/app/[locale]/(platform)/event/[slug]/_components/EventBookmark'
import { NewBadge } from '@/components/ui/new-badge'
import { formatVolume } from '@/lib/formatters'
import { isEventResolvedLike } from '@/lib/home-events'

interface EventCardFooterProps {
  event: Event
  shouldShowNewBadge: boolean
  showLiveBadge: boolean
  resolvedVolume: number
  endedLabel?: string | null
}

export default function EventCardFooter({
  event,
  shouldShowNewBadge,
  showLiveBadge,
  resolvedVolume,
  endedLabel,
}: EventCardFooterProps) {
  const isResolvedEvent = isEventResolvedLike(event)
  const recurrenceLabel = event.series_recurrence?.trim() || null
  const recurrenceDisplayLabel = recurrenceLabel
    ? `${recurrenceLabel.charAt(0).toUpperCase()}${recurrenceLabel.slice(1)}`
    : null

  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        {showLiveBadge && !shouldShowNewBadge && (
          <span className="flex items-center gap-1.5 rounded-full border border-[#00d4ff]/25 bg-[#00d4ff]/8 px-2 py-0.5 shadow-[0_0_8px_rgba(0,212,255,0.15)]">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-1.5 animate-ping rounded-full bg-[#00d4ff] opacity-70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#00d4ff]" />
            </span>
            <span className="text-[10px] font-bold leading-none tracking-wider text-[#00d4ff] uppercase">Live</span>
          </span>
        )}
        {shouldShowNewBadge
          ? <NewBadge />
          : (
              <span className="font-mono-pr">
                {formatVolume(resolvedVolume)}
                {' '}
                Vol.
              </span>
            )}
        {recurrenceDisplayLabel && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Repeat className="size-3" />
            <span>{recurrenceDisplayLabel}</span>
          </span>
        )}
      </div>
      {isResolvedEvent
        ? (endedLabel
            ? <span>{endedLabel}</span>
            : null)
        : <EventBookmark event={event} refreshStatusOnMount={false} />}
    </div>
  )
}
