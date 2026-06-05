import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import AtlasClient from '@/app/[locale]/(platform)/atlas/_components/AtlasClient'

export async function generateMetadata({ params }: PageProps<'/[locale]/atlas'>): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)
  return { title: 'Atlas · Global Intelligence' }
}

export default async function AtlasPage({ params }: PageProps<'/[locale]/atlas'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AtlasClient />
}
