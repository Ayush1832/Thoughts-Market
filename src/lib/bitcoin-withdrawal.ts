import { Psbt } from 'bitcoinjs-lib'
import { addressFromKeyPair, BITCOIN_JS_NETWORK, BITCOIN_NATIVE_DECIMALS, bitcoinKeyPairFromWif } from '@/lib/bitcoin'
import { broadcastTx, buildAndSignWithdrawalTransaction, fetchFeeRate, fetchUtxos } from '@/lib/bitcoin-tx'
import 'server-only'

function getHotKeyPair() {
  const wif = process.env.BITCOIN_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!wif) {
    throw new Error('BITCOIN_HOT_WALLET_PRIVATE_KEY is not set.')
  }
  return bitcoinKeyPairFromWif(wif)
}

export function bitcoinAmountToSats(amount: string): bigint {
  return BigInt(Math.round(Number(amount) * 10 ** BITCOIN_NATIVE_DECIMALS))
}

export async function getBitcoinHotBalance(): Promise<bigint> {
  const address = addressFromKeyPair(getHotKeyPair())
  const utxos = (await fetchUtxos(address)).filter(utxo => utxo.status.confirmed)
  return utxos.reduce((sum, utxo) => sum + BigInt(utxo.value), 0n)
}

export async function sendBitcoinPayout(amountSats: bigint, toAddress: string): Promise<string> {
  const keyPair = getHotKeyPair()
  const hotAddress = addressFromKeyPair(keyPair)
  const utxos = (await fetchUtxos(hotAddress)).filter(utxo => utxo.status.confirmed)
  const feeRate = await fetchFeeRate()

  const hex = buildAndSignWithdrawalTransaction(keyPair, hotAddress, utxos, toAddress, Number(amountSats), feeRate)
  return broadcastTx(hex)
}

export async function getBitcoinTreasuryBalance(): Promise<bigint> {
  const address = process.env.BITCOIN_TREASURY_ADDRESS?.trim()
  if (!address) {
    throw new Error('BITCOIN_TREASURY_ADDRESS is not set.')
  }
  const utxos = (await fetchUtxos(address)).filter(utxo => utxo.status.confirmed)
  return utxos.reduce((sum, utxo) => sum + BigInt(utxo.value), 0n)
}

function getTreasuryKeyPair() {
  const wif = process.env.BITCOIN_TREASURY_PRIVATE_KEY?.trim()
  if (!wif) {
    throw new Error('BITCOIN_TREASURY_PRIVATE_KEY is not set.')
  }
  const keyPair = bitcoinKeyPairFromWif(wif)
  const address = addressFromKeyPair(keyPair)
  const expected = process.env.BITCOIN_TREASURY_ADDRESS?.trim()
  if (expected && address !== expected) {
    throw new Error('BITCOIN_TREASURY_PRIVATE_KEY does not match BITCOIN_TREASURY_ADDRESS. Refusing to move funds from an unexpected wallet.')
  }
  return keyPair
}

export function getBitcoinTreasuryAddress(): string {
  return addressFromKeyPair(getTreasuryKeyPair())
}

/**
 * Signs a PSBT returned by a LI.FI quote (Bitcoin as the source chain) with the treasury key
 * and broadcasts it. All inputs are expected to belong to the treasury address, same assumption
 * used by the existing sweep/withdrawal PSBT signing above.
 */
export async function signAndBroadcastBitcoinPsbt(psbtHex: string): Promise<string> {
  const keyPair = getTreasuryKeyPair()
  const psbt = Psbt.fromHex(psbtHex, { network: BITCOIN_JS_NETWORK })
  psbt.signAllInputs(keyPair)
  psbt.finalizeAllInputs()
  const hex = psbt.extractTransaction().toHex()
  return broadcastTx(hex)
}
