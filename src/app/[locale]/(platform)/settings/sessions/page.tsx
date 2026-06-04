import type { Metadata } from 'next'
import { getExtracted, setRequestLocale } from 'next-intl/server'
import SettingsSessionsContent from '@/app/[locale]/(platform)/settings/_components/SettingsSessionsContent'

export async function generateMetadata({ params }: PageProps<'/[locale]/settings/sessions'>): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()
  return { title: t('Sessions') }
}

export default async function SessionsSettingsPage({ params }: PageProps<'/[locale]/settings/sessions'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()

  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Sessions')}</h1>
        <p className="text-muted-foreground">{t('Devices currently signed in to your account.')}</p>
      </div>
      <div className="mx-auto w-full max-w-2xl lg:mx-0">
        <SettingsSessionsContent />
      </div>
    </section>
  )
}
