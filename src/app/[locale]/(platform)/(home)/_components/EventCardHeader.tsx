import type { Event, Market } from '@/types'
import { useExtracted } from 'next-intl'
import AppLink from '@/components/AppLink'
import EventIconImage from '@/components/EventIconImage'
import Sparkline from '@/components/Sparkline'
import { useOutcomeLabel } from '@/hooks/useOutcomeLabel'
import { OUTCOME_INDEX } from '@/lib/constants'
import { resolveEventPagePath } from '@/lib/events-routing'
import { isEventResolvedLike } from '@/lib/home-events'
import { cn } from '@/lib/utils'

function normalizeOutcomeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

interface EventCardHeaderProps {
  event: Event
  title: string
  isSingleMarket: boolean
  primaryMarket?: Market
  roundedPrimaryDisplayChance: number
}

export default function EventCardHeader({
  event,
  title,
  isSingleMarket,
  primaryMarket,
  roundedPrimaryDisplayChance,
}: EventCardHeaderProps) {
  const t = useExtracted()
  const normalizeOutcomeLabel = useOutcomeLabel()
  const isResolvedEvent = isEventResolvedLike(event)
  const yesOutcome = primaryMarket?.outcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.YES) ?? primaryMarket?.outcomes[0]
  const noOutcome = primaryMarket?.outcomes.find(outcome => outcome.outcome_index === OUTCOME_INDEX.NO) ?? primaryMarket?.outcomes[1]
  const outcomeLabels = new Set([
    normalizeOutcomeText(yesOutcome?.outcome_text),
    normalizeOutcomeText(noOutcome?.outcome_text),
  ])
  const hasStandardYesNoOutcomes = outcomeLabels.has('yes') && outcomeLabels.has('no')
  const isTiedChance = roundedPrimaryDisplayChance === 50
  const leadingOutcomeLabel = roundedPrimaryDisplayChance > 50
    ? yesOutcome?.outcome_text
    : noOutcome?.outcome_text
  const chanceFooterLabel = !hasStandardYesNoOutcomes && !isTiedChance
    ? (normalizeOutcomeLabel(leadingOutcomeLabel) || t('chance'))
    : t('chance')
  const eventHref = resolveEventPagePath(event)
  const isSportsEvent = Boolean(event.sports_event_id || event.sports_sport_slug || event.sports_event_slug)

  return (
    <div className="mb-3 flex items-start justify-between">
      <AppLink intentPrefetch href={eventHref} className="flex flex-1 items-center gap-2 pr-2">
        <div
          className="flex size-10 shrink-0 items-center justify-center self-start rounded-sm"
        >
          <EventIconImage
            src={event.icon_url}
            alt={title || event.creator || 'Market'}
            sizes="40px"
            containerClassName="size-full rounded-sm"
          />
        </div>

        <h3
          className={cn(
            `
              w-full text-sm/5 font-semibold underline-offset-2 transition-colors duration-200
              hover:text-foreground hover:underline
            `,
            isSportsEvent ? 'line-clamp-2' : 'line-clamp-3',
          )}
        >
          {title}
        </h3>
      </AppLink>

      {isSingleMarket && !isResolvedEvent && (
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <Sparkline
            seed={`${title}-${roundedPrimaryDisplayChance}`}
            trend={roundedPrimaryDisplayChance >= 50 ? 'up' : 'down'}
            width={68}
            height={30}
            className="h-[30px] w-[68px]"
          />
          <span
            className={cn(
              'text-sm leading-none font-bold',
              roundedPrimaryDisplayChance < 40
                ? 'text-no'
                : roundedPrimaryDisplayChance === 50
                  ? 'text-slate-400'
                  : 'text-yes',
            )}
          >
            {roundedPrimaryDisplayChance}
            %
          </span>
          <span className="text-2xs font-medium text-slate-500 dark:text-slate-400">
            {chanceFooterLabel}
          </span>
        </div>
      )}
    </div>
  )
}
