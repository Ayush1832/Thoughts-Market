'use client'

import { getFiatCurrency } from '@/lib/fiat'
import { useWalletSettings } from '@/stores/useWalletSettings'

/**
 * Small currency indicator shown next to the site logo when the user has
 * enabled "Display Crypto in Fiat". Reflects the selected fiat currency so it's
 * always clear which currency the balances around the app are shown in.
 */
export default function CurrencyChip() {
  const displayInFiat = useWalletSettings(state => state.displayInFiat)
  const currency = useWalletSettings(state => state.currency)

  if (!displayInFiat) {
    return null
  }

  const fiat = getFiatCurrency(currency)
  // flagcdn serves flag images by lowercase ISO country code (works on Windows,
  // unlike flag emojis which don't render there).
  const flagCode = fiat.country.toLowerCase()

  return (
    <span
      title={fiat.name}
      className="
        inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/60 py-0.5 pr-2.5 pl-1
        text-xs font-semibold text-foreground
      "
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/h20/${flagCode}.png`}
        srcSet={`https://flagcdn.com/h40/${flagCode}.png 2x`}
        alt={fiat.country}
        width={20}
        height={15}
        loading="lazy"
        className="h-[15px] w-5 rounded-[3px] object-cover"
      />
      <span className="text-muted-foreground">{fiat.code}</span>
    </span>
  )
}
