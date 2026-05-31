import type { SupportedLocale } from '@/i18n/locales'
import type { Event } from '@/types'
import HomeClient from '@/app/[locale]/(platform)/(home)/_components/HomeClient'
import { listHomeEventsPage } from '@/lib/home-events-page'

interface HomeContentProps {
  locale: string
  initialTag?: string
  initialMainTag?: string
}

export default async function HomeContent({
  locale,
  initialTag,
  initialMainTag,
}: HomeContentProps) {
  const resolvedLocale = locale as SupportedLocale
  const initialTagSlug = initialTag ?? 'trending'
  const initialMainTagSlug = initialMainTag ?? initialTagSlug
  let initialCurrentTimestamp: number | null = null

  let initialEvents: Event[] = []

  try {
    // 4-second timeout — if DB is slow/unreachable, SSR returns empty and
    // the client-side React Query hydrates the feed without blocking the page.
    const result = await Promise.race([
      listHomeEventsPage({
        tag: initialTagSlug,
        mainTag: initialMainTagSlug,
        search: '',
        userId: '',
        bookmarked: false,
        locale: resolvedLocale,
        currentTimestamp: null,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SSR DB timeout')), 4000),
      ),
    ])

    initialCurrentTimestamp = result.currentTimestamp ?? null
    if (!result.error) {
      initialEvents = result.data ?? []
    }
  }
  catch {
    initialEvents = []
  }

  return (
    <main className="container grid gap-4 py-4">
      <HomeClient
        initialEvents={initialEvents}
        initialCurrentTimestamp={initialCurrentTimestamp}
        initialTag={initialTagSlug}
        initialMainTag={initialMainTagSlug}
      />
    </main>
  )
}
