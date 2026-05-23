import { Suspense } from 'react'
import { getExtracted, setRequestLocale } from 'next-intl/server'
import { DataTableSkeleton } from '@/app/[locale]/admin/_components/DataTableSkeleton'
import AdminSupportTable from './_components/AdminSupportTable'

export default async function AdminSupportPage({ params }: PageProps<'/[locale]/admin/support'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">{t('Support Center')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('Manage support tickets for deposits, withdrawals, KYC, market disputes, and technical issues.')}
        </p>
      </div>
      <div className="min-w-0">
        <Suspense fallback={<DataTableSkeleton />}>
          <AdminSupportTable />
        </Suspense>
      </div>
    </section>
  )
}
