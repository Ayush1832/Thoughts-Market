import type { Metadata } from 'next'
import { getExtracted, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { PrivacySettingsInput } from '@/app/[locale]/(platform)/settings/_actions/update-privacy-settings'
import SettingsPrivacyContent from '@/app/[locale]/(platform)/settings/_components/SettingsPrivacyContent'
import { UserRepository } from '@/lib/db/queries/user'

export async function generateMetadata({ params }: PageProps<'/[locale]/settings/privacy'>): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()
  return { title: t('Privacy') }
}

export default async function PrivacySettingsPage({ params }: PageProps<'/[locale]/settings/privacy'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getExtracted()

  const user = await UserRepository.getCurrentUser({ disableCookieCache: true, minimal: true })
  if (!user) {
    notFound()
  }

  const saved = (user.settings?.privacy ?? {}) as Partial<PrivacySettingsInput>
  const initial: PrivacySettingsInput = {
    profile_visibility: saved.profile_visibility ?? 'public',
    show_on_leaderboard: saved.show_on_leaderboard ?? true,
    share_history_with_friends: saved.share_history_with_friends ?? false,
    blocked: Array.isArray(saved.blocked) ? saved.blocked : [],
  }

  return (
    <section className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Privacy')}</h1>
        <p className="text-muted-foreground">{t('Control what other people can see about you.')}</p>
      </div>
      <div className="mx-auto w-full max-w-2xl lg:mx-0">
        <SettingsPrivacyContent initial={initial} />
      </div>
    </section>
  )
}
