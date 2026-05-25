import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import ContentCMS from '@/app/[locale]/admin/content/_components/ContentCMS'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminContentPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Content CMS</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage articles, announcements, tutorials, AI insights, market analysis, and settlement explanations.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ContentCMS />
      </Suspense>
    </section>
  )
}
