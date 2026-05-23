import { getExtracted, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@/app/[locale]/admin/_components/DataTableSkeleton'
import AdminRolesTable from './_components/AdminRolesTable'

export default async function AdminRolesPage({ params }: PageProps<'/[locale]/admin/roles'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold">{t('Role System')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('Assign and manage admin roles. Each role grants specific platform permissions.')}
        </p>
      </div>
      <div className="min-w-0">
        <Suspense fallback={<DataTableSkeleton />}>
          <AdminRolesTable />
        </Suspense>
      </div>
    </section>
  )
}
