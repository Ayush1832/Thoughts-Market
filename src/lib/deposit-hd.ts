import type { Address } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import 'server-only'

const HD_MAX_INDEX = 2_147_483_647

function getMasterMnemonic(): string {
  const mnemonic = process.env.DEPOSIT_HD_MNEMONIC?.trim()
  if (!mnemonic) {
    throw new Error('DEPOSIT_HD_MNEMONIC is not set. Custodial deposit addresses are disabled.')
  }
  return mnemonic
}

export function isDepositHdConfigured(): boolean {
  return Boolean(process.env.DEPOSIT_HD_MNEMONIC?.trim())
}

export function assertValidDerivationIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > HD_MAX_INDEX) {
    throw new Error(`Invalid deposit derivation index: ${String(index)}`)
  }
}

export function deriveDepositAddress(derivationIndex: number): Address {
  assertValidDerivationIndex(derivationIndex)
  return mnemonicToAccount(getMasterMnemonic(), { addressIndex: derivationIndex }).address
}

export function deriveDepositAccount(derivationIndex: number) {
  assertValidDerivationIndex(derivationIndex)
  return mnemonicToAccount(getMasterMnemonic(), { addressIndex: derivationIndex })
}
