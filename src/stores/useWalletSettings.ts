import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletSettingsState {
  /** Show balances converted into the selected fiat currency. */
  displayInFiat: boolean
  /** Selected fiat currency code (ISO 4217). */
  currency: string
  setDisplayInFiat: (value: boolean) => void
  setCurrency: (code: string) => void
}

export const useWalletSettings = create<WalletSettingsState>()(
  persist(
    set => ({
      displayInFiat: false,
      currency: 'USD',
      setDisplayInFiat: displayInFiat => set({ displayInFiat }),
      setCurrency: currency => set({ currency }),
    }),
    { name: 'wallet-settings' },
  ),
)
