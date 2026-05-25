import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import TrendingEngine from '@/app/[locale]/admin/trending/_components/TrendingEngine'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminTrendingPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Trending Engine</h1>
        <p className="text-sm text-muted-foreground">
          Control featured markets, hot picks, viral topics, emergency banners, and live event mode.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TrendingEngine />
      </Suspense>
    </section>
  )
}
