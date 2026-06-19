'use client'

import { EyeIcon, EyeOffIcon, SlidersHorizontalIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import WalletSettingsDialog from '@/app/[locale]/(platform)/_components/WalletSettingsDialog'
import AppLink from '@/components/AppLink'
import Sparkline from '@/components/Sparkline'
import { useBalance } from '@/hooks/useBalance'
import { useLiveFiatRate } from '@/hooks/useMoneyFormatter'
import { usePortfolioValue } from '@/hooks/usePortfolioValue'
import { getAvatarPlaceholderStyle, shouldUseAvatarPlaceholder } from '@/lib/avatar'
import { formatFiat } from '@/lib/fiat'
import { formatCompactCurrency } from '@/lib/formatters'
import { buildPublicProfilePath, buildUsernameProfilePath } from '@/lib/platform-routing'
import { usePortfolioValueVisibility } from '@/stores/usePortfolioValueVisibility'
import { useUser } from '@/stores/useUser'
import { useWalletSettings } from '@/stores/useWalletSettings'

// Sidebar account card (reference-style). All values are REAL:
// identity from the user store, balance from the wallet + portfolio hooks.
export default function SidebarProfileCard() {
  const user = useUser()
  const { balance, isLoadingBalance } = useBalance()
  const { isLoading: isPositionsLoading, value: positionsValue } = usePortfolioValue()
  const isHidden = usePortfolioValueVisibility(state => state.isHidden)
  const toggleHidden = usePortfolioValueVisibility(state => state.toggle)
  const displayInFiat = useWalletSettings(state => state.displayInFiat)
  const currency = useWalletSettings(state => state.currency)
  const liveFiatRate = useLiveFiatRate()
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (!user) {
    return null
  }

  const address = user.deposit_wallet_address ?? user.address ?? ''
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''
  const username = user.username ?? 'Your account'
  // The public profile lives at /@username (or /<address>) — not /profile.
  const profileHref = buildUsernameProfilePath(user.username ?? '')
    ?? buildPublicProfilePath(address)
    ?? '/portfolio'
  const total = (positionsValue ?? 0) + (balance?.raw ?? 0)
  const isLoading = isLoadingBalance || isPositionsLoading
  const totalLabel = isHidden
    ? '••••••'
    : displayInFiat
      ? formatFiat(total, currency, liveFiatRate)
      : formatCompactCurrency(total)

  const avatarUrl = user.image?.trim() ?? ''
  const showPlaceholder = shouldUseAvatarPlaceholder(avatarUrl)
  const placeholderStyle = showPlaceholder ? getAvatarPlaceholderStyle(address || username) : undefined

  return (
    <div className="m-3 rounded-2xl border border-tm-border bg-tm-elevated/50 p-3">
      {/* identity */}
      <AppLink href={profileHref} className="flex items-center gap-2.5">
        {showPlaceholder
          ? <div aria-hidden className="size-9 shrink-0 rounded-full" style={placeholderStyle} />
          : (
              <Image
                src={avatarUrl}
                alt={username}
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-full object-cover"
              />
            )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-tm-primary">{username}</p>
          {shortAddress && <p className="font-mono-pr text-[11px] text-tm-secondary">{shortAddress}</p>}
        </div>
      </AppLink>

      {/* total balance (real) */}
      <div className="mt-3 border-t border-tm-border pt-3">
        <div className="flex items-center justify-between">
          <p className="text-2xs font-semibold tracking-[0.12em] text-tm-secondary/70 uppercase">Total balance</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleHidden}
              aria-label="Toggle balance visibility"
              className="text-tm-secondary/60 transition-colors hover:text-tm-primary"
            >
              {isHidden ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Wallet settings"
              className="text-tm-secondary/60 transition-colors hover:text-tm-primary"
            >
              <SlidersHorizontalIcon className="size-3.5" />
            </button>
          </div>
        </div>
        <p className="mt-0.5 font-mono-pr text-lg font-bold text-tm-primary">
          {isLoading ? '—' : totalLabel}
        </p>

        {/* trend graph */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex gap-0.5">
            <span className="size-1 rounded-full bg-green-400" />
            <span className="size-1 rounded-full bg-green-400" />
            <span className="size-1 rounded-full bg-green-400" />
          </span>
          <span className="text-2xs text-tm-secondary/60">24h</span>
        </div>
        <Sparkline
          seed={address || username}
          trend="up"
          width={220}
          height={44}
          className="mt-1 h-11 w-full"
        />
      </div>

      {/* actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <AppLink
          href="/portfolio"
          className="
            rounded-xl bg-[linear-gradient(135deg,#7d6cff,#54e3ff)] py-2 text-center text-xs font-semibold text-white
            transition
            hover:brightness-110
          "
        >
          Deposit
        </AppLink>
        <AppLink
          href="/portfolio"
          className="
            rounded-xl border border-tm-border bg-tm-surface py-2 text-center text-xs font-semibold text-tm-primary
            transition
            hover:bg-tm-elevated
          "
        >
          Withdraw
        </AppLink>
      </div>

      <WalletSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
