import { TronWeb } from 'tronweb'
import { IS_TEST_MODE } from '@/lib/network'
import 'server-only'

export const TRON_NETWORK = 'tron'
export const TRON_LIFI_CHAIN_ID = 728126428
// Mainnet-only USDT contract. A Nile testnet "test USDT" contract is
// distributed via TRON's own community faucet bot, but no first-party TRON/
// Tether page confirms its address — the same discipline already applied to
// Polygon/Solana test-mode USDT means we don't hardcode an unverified
// contract here either. TRC-20 USDT is omitted from TRON_COINS in test mode
// below; native TRX (which needs no contract address) still works.
export const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
export const TRON_NATIVE_COIN = 'TRX'
export const TRON_NATIVE_DECIMALS = 6
export const TRON_USDT_DECIMALS = 6
export const TRON_MIN_SWEEP_TRX = 5
export const TRON_COINS = IS_TEST_MODE
  ? [TRON_NATIVE_COIN] as const
  : [TRON_NATIVE_COIN, 'USDT'] as const

function getMasterMnemonic(): string {
  const mnemonic = process.env.DEPOSIT_HD_MNEMONIC?.trim()
  if (!mnemonic) {
    throw new Error('DEPOSIT_HD_MNEMONIC is not set. Tron deposit addresses are disabled.')
  }
  return mnemonic
}

export function isTronConfigured(): boolean {
  return Boolean(process.env.DEPOSIT_HD_MNEMONIC?.trim() && process.env.TRON_RPC_URL?.trim())
}

export function getTronClient(privateKey?: string): TronWeb {
  const fullHost = process.env.TRON_RPC_URL?.trim()
  if (!fullHost) {
    throw new Error('TRON_RPC_URL is not set.')
  }
  const headers: Record<string, string> = {}
  const apiKey = process.env.TRONGRID_API_KEY?.trim()
  if (apiKey) {
    headers['TRON-PRO-API-KEY'] = apiKey
  }
  return new TronWeb({ fullHost, headers, privateKey })
}

export function deriveTronAccount(index: number): { address: string, privateKey: string } {
  const mnemonic = getMasterMnemonic()
  const path = `m/44'/195'/0'/0/${index}`
  const account = TronWeb.fromMnemonic(mnemonic, path)
  if (!account.privateKey) {
    throw new Error(`Failed to derive Tron account at index ${index}`)
  }
  return { address: account.address, privateKey: account.privateKey }
}

export function deriveTronAddress(index: number): string {
  return deriveTronAccount(index).address
}

export function getCoinDecimalsOnTron(coin: string): number | undefined {
  if (coin === TRON_NATIVE_COIN) {
    return TRON_NATIVE_DECIMALS
  }
  if (coin === 'USDT') {
    return TRON_USDT_DECIMALS
  }
  return undefined
}

const CONFIRMATION_POLL_ATTEMPTS = 10
const CONFIRMATION_POLL_DELAY_MS = 1500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export type TronConfirmationStatus = 'success' | 'reverted' | 'unknown'

// TronWeb resolves a broadcast call once the node accepts the transaction into
// its mempool — that is not the same as the transaction succeeding on-chain.
// TRC20 transfers in particular can revert after being included in a block
// (OUT_OF_ENERGY, a paused/blacklisted token contract, etc.), so broadcast
// success alone must never be treated as payout success. This polls for the
// indexed transaction receipt and reports its real on-chain result — or
// 'unknown' if it never got indexed within the poll window, so callers can
// tell "confirmed failed" (safe to refund) apart from "uncertain" (funds may
// have moved; must not refund blindly).
export async function getTronConfirmationStatus(client: TronWeb, txid: string): Promise<TronConfirmationStatus> {
  for (let attempt = 0; attempt < CONFIRMATION_POLL_ATTEMPTS; attempt += 1) {
    await sleep(CONFIRMATION_POLL_DELAY_MS)
    try {
      const info = await client.trx.getTransactionInfo(txid) as { id?: string, receipt?: { result?: string } }
      if (info?.id) {
        const receiptResult = info.receipt?.result
        return (receiptResult === undefined || receiptResult === 'SUCCESS') ? 'success' : 'reverted'
      }
    }
    catch {
      // not yet indexed, keep polling
    }
  }
  return 'unknown'
}
