import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { connection } from 'next/server'
import PortfolioMarketsWonCard from '@/app/[locale]/(platform)/portfolio/_components/PortfolioMarketsWonCard'
import PortfolioTabs from '@/app/[locale]/(platform)/portfolio/_components/PortfolioTabs'
import PublicProfileHeroCards from '@/app/[locale]/(platform)/profile/_components/PublicProfileHeroCards'
import { UserRepository } from '@/lib/db/queries/user'
import { fetchPortfolioSnapshot } from '@/lib/portfolio'

export const metadata: Metadata = {
  title: 'Portfolio',
}

function getFallbackChartEndDate() {
  return new Date().toISOString()
}

export default async function PortfolioPage({ params }: PageProps<'/[locale]/portfolio'>) {
  const { locale } = await params
  setRequestLocale(locale)

  await connection()
  const fallbackChartEndDate = getFallbackChartEndDate()

  const user = await UserRepository.getCurrentUser()
  const userAddress = user?.deposit_wallet_address ?? ''
  const snapshotAddress = user?.deposit_wallet_address
  const publicAddress = user?.deposit_wallet_address ?? null
  const snapshot = await fetchPortfolioSnapshot(snapshotAddress)

  return (
    <>
      {/* Prototype-style header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
          Portfolio
        </p>
        <h1 className="font-display text-4xl/tight tracking-tight md:text-5xl">
          Your edge, in numbers
        </h1>
      </div>

      <PublicProfileHeroCards
        profile={{
          username: user?.username ?? 'Your portfolio',
          avatarUrl: user?.image ?? '',
          joinedAt: (user as any)?.created_at?.toString?.() ?? (user as any)?.createdAt?.toString?.(),
          portfolioAddress: publicAddress ?? undefined,
        }}
        snapshot={snapshot}
        variant="portfolio"
        fallbackChartEndDate={fallbackChartEndDate}
        // Empty slot on Portfolio: no Deposit/Withdraw buttons and no stat tiles.
        // (Passing an element overrides the default Positions/Biggest Win/Predictions fallback.)
        actions={<span className="hidden" />}
      />

      <PortfolioMarketsWonCard depositWalletAddress={publicAddress} />

      <PortfolioTabs userAddress={userAddress} />
    </>
  )
}
