import * as ecc from '@bitcoinerlab/secp256k1'
import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import { initEccLib, networks, payments } from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import { IS_TEST_MODE } from '@/lib/network'
import 'server-only'

initEccLib(ecc)

const ECPair = ECPairFactory(ecc)

export const BITCOIN_NETWORK = 'bitcoin'
export const BITCOIN_NATIVE_COIN = 'BTC'
export const BITCOIN_NATIVE_DECIMALS = 8
export const BITCOIN_MIN_CONFIRMATIONS = 2
export const BITCOIN_LIFI_CHAIN_ID = 20_000_000_000_001

/**
 * bitcoinjs-lib network used for address encoding and PSBT signing across
 * the whole Bitcoin integration. Testnet (tb1...) in test mode, mainnet
 * (bc1...) otherwise — mirrors the amoy/polygon split already used for EVM
 * chains (`@/lib/network`). Every call site in this codebase must go through
 * this constant rather than hardcoding `networks.bitcoin`, or a test-mode
 * deployment would silently derive real-money mainnet addresses.
 */
export const BITCOIN_JS_NETWORK = IS_TEST_MODE ? networks.testnet : networks.bitcoin

function getMasterMnemonic(): string {
  const mnemonic = process.env.DEPOSIT_HD_MNEMONIC?.trim()
  if (!mnemonic) {
    throw new Error('DEPOSIT_HD_MNEMONIC is not set. Bitcoin deposit addresses are disabled.')
  }
  return mnemonic
}

export function isBitcoinConfigured(): boolean {
  return Boolean(process.env.DEPOSIT_HD_MNEMONIC?.trim())
}

export function bitcoinApiBase(): string {
  const configured = process.env.BITCOIN_API_BASE?.trim()
  if (configured) {
    return configured
  }
  return IS_TEST_MODE ? 'https://mempool.space/testnet/api' : 'https://mempool.space/api'
}

export function deriveBitcoinKeyPair(index: number) {
  const seed = mnemonicToSeedSync(getMasterMnemonic())
  const path = `m/84'/0'/0'/0/${index}`
  const child = HDKey.fromMasterSeed(seed).derive(path)
  if (!child.privateKey) {
    throw new Error(`Failed to derive Bitcoin key at index ${index}`)
  }
  return ECPair.fromPrivateKey(child.privateKey, { network: BITCOIN_JS_NETWORK })
}

export function addressFromKeyPair(keyPair: ReturnType<typeof ECPair.fromPrivateKey>): string {
  const { address } = payments.p2wpkh({ pubkey: keyPair.publicKey, network: BITCOIN_JS_NETWORK })
  if (!address) {
    throw new Error('Failed to derive Bitcoin address from key pair.')
  }
  return address
}

export function deriveBitcoinAddress(index: number): string {
  return addressFromKeyPair(deriveBitcoinKeyPair(index))
}

export function bitcoinKeyPairFromWif(wif: string) {
  return ECPair.fromWIF(wif, BITCOIN_JS_NETWORK)
}

export function getCoinDecimalsOnBitcoin(coin: string): number | undefined {
  return coin === BITCOIN_NATIVE_COIN ? BITCOIN_NATIVE_DECIMALS : undefined
}
