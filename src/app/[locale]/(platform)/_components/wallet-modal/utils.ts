import type { ChangeEventHandler, FormEvent } from 'react'
import type { LiFiWalletTokenItem } from '@/hooks/useLiFiWalletTokens'

export const MELD_PAYMENT_METHODS = [
  'apple_pay',
  'google_pay',
  'pix',
  'paypal',
  'neteller',
  'skrill',
  'binance',
  'coinbase',
] as const

export const TRANSFER_PAYMENT_METHODS = [
  'polygon',
  'usdc',
] as const
export const TEST_MODE_DISCORD_URL = 'https://discord.gg/kuest'

// All EVM tokens enabled (routed via LI.FI). SOL stays disabled — it's a
// Solana (non-EVM) asset and can't be delivered from the EVM deposit wallet.
export const WITHDRAW_TOKEN_OPTIONS = [
  { value: 'USDC', label: 'USDC', icon: '/images/withdraw/token/usdc.svg', enabled: true },
  { value: 'ARB', label: 'ARB', icon: '/images/withdraw/token/arb.svg', enabled: true },
  { value: 'BNB', label: 'BNB', icon: '/images/withdraw/token/bsc.svg', enabled: true },
  { value: 'BTCB', label: 'BTCB', icon: '/images/withdraw/token/btc.svg', enabled: true },
  { value: 'BUSD', label: 'BUSD', icon: '/images/withdraw/token/busd.svg', enabled: true },
  { value: 'CBBTC', label: 'CBBTC', icon: '/images/withdraw/token/cbbtc.svg', enabled: true },
  { value: 'DAI', label: 'DAI', icon: '/images/withdraw/token/dai.svg', enabled: true },
  { value: 'ETH', label: 'ETH', icon: '/images/withdraw/token/eth.svg', enabled: true },
  { value: 'POL', label: 'POL', icon: '/images/withdraw/token/matic.svg', enabled: true },
  { value: 'SOL', label: 'SOL', icon: '/images/withdraw/token/sol.svg', enabled: false },
  { value: 'USDe', label: 'USDe', icon: '/images/withdraw/token/usde.svg', enabled: true },
  { value: 'USDT', label: 'USDT', icon: '/images/withdraw/token/usdt.svg', enabled: true },
  { value: 'WBNB', label: 'WBNB', icon: '/images/withdraw/token/bsc.svg', enabled: true },
  { value: 'WETH', label: 'WETH', icon: '/images/withdraw/token/weth.svg', enabled: true },
] as const

// All EVM chains enabled. Solana stays disabled (non-EVM).
export const WITHDRAW_CHAIN_OPTIONS = [
  { value: 'Ethereum', label: 'Ethereum', icon: '/images/withdraw/chain/ethereum.svg', enabled: true },
  { value: 'Solana', label: 'Solana', icon: '/images/withdraw/chain/solana.svg', enabled: false },
  { value: 'BSC', label: 'BSC', icon: '/images/withdraw/chain/bsc.svg', enabled: true },
  { value: 'Base', label: 'Base', icon: '/images/withdraw/chain/base.svg', enabled: true },
  { value: 'Polygon', label: 'Polygon', icon: '/images/withdraw/chain/polygon.svg', enabled: true },
  { value: 'Arbitrum', label: 'Arbitrum', icon: '/images/withdraw/chain/arbitrum.svg', enabled: true },
  { value: 'Optimism', label: 'Optimism', icon: '/images/withdraw/chain/optimism.svg', enabled: true },
] as const

// Map withdraw-chain option value → EVM chain id (used for cross-chain quotes).
export const WITHDRAW_CHAIN_IDS: Record<string, number> = {
  Polygon: 137,
  Ethereum: 1,
  Base: 8453,
  Arbitrum: 42161,
  BSC: 56,
  Optimism: 10,
}

/** Receive selection passed from the withdraw form to the submit handler. */
export interface WithdrawReceiveSelection {
  receiveChain: string
  receiveToken: string
}

export function getSelectedWalletTokenId(items: LiFiWalletTokenItem[], preferredSelectedTokenId: string) {
  if (!items.length) {
    return ''
  }

  if (preferredSelectedTokenId && items.some(item => item.id === preferredSelectedTokenId && !item.disabled)) {
    return preferredSelectedTokenId
  }

  const firstEnabledItem = items.find(item => !item.disabled)
  return firstEnabledItem?.id ?? ''
}

export type WalletDepositView = 'fund' | 'receive' | 'wallets' | 'amount' | 'confirm' | 'success'

export interface PendingWithdrawalItem {
  id: string
  amount: string
  to: string
  createdAt: number
}

export interface WalletDepositModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  walletAddress?: string | null
  walletEoaAddress?: string | null
  siteName?: string
  meldUrl: string | null
  hasDeployedDepositWallet: boolean
  view: WalletDepositView
  onViewChange: (view: WalletDepositView) => void
  onBuy: (url: string) => void
  walletBalance?: string | null
  isBalanceLoading?: boolean
}

export interface WalletWithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  siteName?: string
  sendTo: string
  onChangeSendTo: ChangeEventHandler<HTMLInputElement>
  sendAmount: string
  onChangeSendAmount: (value: string) => void
  isSending: boolean
  onSubmitSend: (event: FormEvent<HTMLFormElement>, receive?: WithdrawReceiveSelection) => void
  connectedWalletAddress?: string | null
  onUseConnectedWallet?: () => void
  availableBalance?: number | null
  onMax?: () => void
  isBalanceLoading?: boolean
  pendingWithdrawals?: PendingWithdrawalItem[]
  /** Deposit wallet (Polygon) used as the source for live cross-chain quotes. */
  depositWalletAddress?: string | null
}
