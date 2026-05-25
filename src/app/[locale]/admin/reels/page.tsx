import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import ReelsControl from '@/app/[locale]/admin/reels/_components/ReelsControl'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminReelsPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Reels / Shorts Control</h1>
        <p className="text-sm text-muted-foreground">
          Manage reel campaigns, approve creator clips, feature creators, and control market reaction clips.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ReelsControl />
      </Suspense>
    </section>
  )
}
