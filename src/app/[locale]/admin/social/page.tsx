import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import SocialManagement from '@/app/[locale]/admin/social/_components/SocialManagement'
import { Skeleton } from '@/components/ui/skeleton'

export default async function AdminSocialPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">Social Management</h1>
        <p className="text-sm text-muted-foreground">
          Moderate reports, manage community bans, review flagged content, and control spam.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SocialManagement />
      </Suspense>
    </section>
  )
}
