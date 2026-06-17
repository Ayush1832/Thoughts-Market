import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import CreatorsCornerManagement from '@/app/[locale]/admin/social/_components/SocialManagement'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminCreatorsCornerPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Creators Corner</h1>
        <p className="text-sm text-muted-foreground">
          Review creator applications, manage approved creators, and control market visibility.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CreatorsCornerManagement />
      </Suspense>
    </section>
  )
}
