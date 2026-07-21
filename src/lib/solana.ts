import { Buffer } from 'node:buffer'
import { mnemonicToSeedSync } from '@scure/bip39'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { derivePath } from 'ed25519-hd-key'
import { IS_TEST_MODE } from '@/lib/network'
import 'server-only'

export const SOLANA_NETWORK = 'solana'
export const SOLANA_NATIVE_COIN = 'SOL'
export const SOLANA_NATIVE_DECIMALS = 9
export const SOLANA_USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
// Circle's official devnet USDC mint, verified against Circle's own docs
// (developers.circle.com/stablecoins/quickstart-transfer-10-usdc-on-solana)
// rather than guessed — same discipline as every other token address here.
export const SOLANA_USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
export const SOLANA_USDT_MINT_MAINNET = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
export const SOLANA_TOKEN_DECIMALS = 6
// USDT has no verified official devnet mint (Tether does not publish one) —
// omitted in test mode rather than guessing, same precedent as Polygon USDT.
export const SOLANA_COINS = IS_TEST_MODE
  ? [SOLANA_NATIVE_COIN, 'USDC'] as const
  : [SOLANA_NATIVE_COIN, 'USDC', 'USDT'] as const
export const SOLANA_LIFI_CHAIN_ID = 1_151_111_081_099_710
export const SOLANA_NATIVE_LIFI_ADDRESS = '11111111111111111111111111111111'

function getMasterMnemonic(): string {
  const mnemonic = process.env.DEPOSIT_HD_MNEMONIC?.trim()
  if (!mnemonic) {
    throw new Error('DEPOSIT_HD_MNEMONIC is not set. Solana deposit addresses are disabled.')
  }
  return mnemonic
}

export function isSolanaConfigured(): boolean {
  return Boolean(process.env.DEPOSIT_HD_MNEMONIC?.trim() && process.env.SOLANA_RPC_URL?.trim())
}

export function getSolanaConnection(): Connection {
  const rpcUrl = process.env.SOLANA_RPC_URL?.trim()
  if (!rpcUrl) {
    throw new Error('SOLANA_RPC_URL is not set.')
  }
  return new Connection(rpcUrl, 'confirmed')
}

export function deriveSolanaKeypair(index: number): Keypair {
  const seedHex = Buffer.from(mnemonicToSeedSync(getMasterMnemonic())).toString('hex')
  const path = `m/44'/501'/${index}'/0'`
  const derived = derivePath(path, seedHex)
  return Keypair.fromSeed(derived.key)
}

export function deriveSolanaAddress(index: number): string {
  return deriveSolanaKeypair(index).publicKey.toBase58()
}

export function getMintForCoin(coin: string): PublicKey | undefined {
  if (coin === 'USDC') {
    return IS_TEST_MODE ? SOLANA_USDC_MINT_DEVNET : SOLANA_USDC_MINT_MAINNET
  }
  if (coin === 'USDT') {
    // No verified devnet USDT mint exists — fail closed rather than guess.
    return IS_TEST_MODE ? undefined : SOLANA_USDT_MINT_MAINNET
  }
  return undefined
}

export function getCoinDecimalsOnSolana(coin: string): number | undefined {
  if (coin === SOLANA_NATIVE_COIN) {
    return SOLANA_NATIVE_DECIMALS
  }
  if (coin === 'USDC' || coin === 'USDT') {
    return SOLANA_TOKEN_DECIMALS
  }
  return undefined
}
