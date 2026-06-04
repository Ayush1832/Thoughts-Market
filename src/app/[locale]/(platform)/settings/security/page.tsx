import type { Metadata } from 'next'
import { getExtracted, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import SettingsTwoFactorAuthContent from '@/app/[locale]/(platform)/settings/_components/SettingsTwoFactorAuthContent'
import { UserRepository } from '@/lib/db/queries/user'

export async function generateMetadata({ params }: PageProps<'/[locale]/settings/security'>): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()
  return { title: t('Security') }
}

export default async function SecuritySettingsPage({ params }: PageProps<'/[locale]/settings/security'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()

  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    notFound()
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Security')}</h1>
        <p className="text-muted-foreground">{t('Authentication, sessions, recovery.')}</p>
      </div>

      <div className="mx-auto grid w-full max-w-2xl gap-6 lg:mx-0">
        <section className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold">{t('Two-Factor Authentication')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('Help keep your account safe. 2FA prevents anyone from accessing your account even if they know your password.')}
            </p>
          </div>
          <SettingsTwoFactorAuthContent user={user} />
        </section>
      </div>
    </section>
  )
}
