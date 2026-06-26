import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { connection } from 'next/server'
import CashTabs from '@/app/[locale]/(platform)/cash/_components/CashTabs'
import PortfolioWalletActions from '@/app/[locale]/(platform)/portfolio/_components/PortfolioWalletActions'
import PublicProfileHeroCards from '@/app/[locale]/(platform)/profile/_components/PublicProfileHeroCards'
import { UserRepository } from '@/lib/db/queries/user'
import { fetchPortfolioSnapshot } from '@/lib/portfolio'

export const metadata: Metadata = {
  title: 'Cash',
}

// Cash page — modelled on the Portfolio page, but focused on the balance and
// adding funds. Arriving via the header "Cash" tap (with ?action=deposit) auto-
// opens the deposit flow.
export default async function CashPage({ params }: PageProps<'/[locale]/cash'>) {
  const { locale } = await params
  setRequestLocale(locale)

  await connection()

  const user = await UserRepository.getCurrentUser()
  const snapshotAddress = user?.deposit_wallet_address
  const publicAddress = user?.deposit_wallet_address ?? null
  const snapshot = await fetchPortfolioSnapshot(snapshotAddress)

  return (
    <>
      {/* Prototype-style header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
          Cash
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-tight md:text-5xl">
          Add funds to trade
        </h1>
      </div>

      <PublicProfileHeroCards
        profile={{
          username: user?.username ?? 'Your balance',
          avatarUrl: user?.image ?? '',
          joinedAt: (user as any)?.created_at?.toString?.() ?? (user as any)?.createdAt?.toString?.(),
          portfolioAddress: publicAddress ?? undefined,
        }}
        snapshot={snapshot}
        actions={<PortfolioWalletActions />}
        variant="portfolio"
        fallbackChartEndDate={new Date().toISOString()}
      />

      <CashTabs />
    </>
  )
}
