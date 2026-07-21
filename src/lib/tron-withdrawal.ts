import { getTronClient, getTronConfirmationStatus, TRON_NATIVE_COIN, TRON_NATIVE_DECIMALS, TRON_USDT_CONTRACT, TRON_USDT_DECIMALS } from '@/lib/tron'
import 'server-only'

// Thrown when a Tron payout was broadcast but its on-chain result could not be
// determined (never got indexed within the poll window). Callers must not
// treat this the same as a confirmed failure — funds may have actually moved.
export class TronConfirmationUnknownError extends Error {}

interface Trc20Contract {
  transfer: (to: string, amount: string) => { send: (options: { feeLimit: number }) => Promise<string> }
}

function normalizePrivateKey(value: string): string {
  return value.trim()
}

export function getTronHotAddress(): string {
  const key = process.env.TRON_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('TRON_HOT_WALLET_PRIVATE_KEY is not set.')
  }
  const client = getTronClient(normalizePrivateKey(key))
  const address = client.address.fromPrivateKey(normalizePrivateKey(key))
  if (!address) {
    throw new Error('Failed to derive Tron hot wallet address.')
  }
  return address
}

export async function getTronHotBalance(coin: string): Promise<bigint> {
  const key = process.env.TRON_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('TRON_HOT_WALLET_PRIVATE_KEY is not set.')
  }
  const client = getTronClient(normalizePrivateKey(key))
  const address = getTronHotAddress()

  if (coin === TRON_NATIVE_COIN) {
    const balance = await client.trx.getBalance(address)
    return BigInt(balance)
  }

  const contract = await client.contract().at(TRON_USDT_CONTRACT) as unknown as {
    balanceOf: (addr: string) => { call: () => Promise<{ toString: () => string }> }
  }
  const balance = await contract.balanceOf(address).call()
  return BigInt(balance.toString())
}

export function tronAmountToRaw(coin: string, amount: string): bigint {
  const decimals = coin === TRON_NATIVE_COIN ? TRON_NATIVE_DECIMALS : TRON_USDT_DECIMALS
  return BigInt(Math.round(Number(amount) * 10 ** decimals))
}

export async function sendTronPayout(coin: string, amountRaw: bigint, toAddress: string): Promise<string> {
  const key = process.env.TRON_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('TRON_HOT_WALLET_PRIVATE_KEY is not set.')
  }
  const client = getTronClient(normalizePrivateKey(key))

  if (coin === TRON_NATIVE_COIN) {
    const result = await client.trx.sendTransaction(toAddress, Number(amountRaw))
    if (!result.result) {
      throw new Error(`Tron transaction failed: ${result.message}`)
    }
    // Native TRX transfers can't revert once accepted, so this only confirms
    // inclusion — but that's still worth waiting for so we don't report a
    // txid that never actually lands.
    const status = await getTronConfirmationStatus(client, result.txid)
    if (status === 'unknown') {
      throw new TronConfirmationUnknownError(`Tron transaction ${result.txid} broadcast but was not indexed within the confirmation window.`)
    }
    return result.txid
  }

  const contract = await client.contract().at(TRON_USDT_CONTRACT) as unknown as Trc20Contract
  const txid = await contract.transfer(toAddress, amountRaw.toString()).send({ feeLimit: 50_000_000 })
  const status = await getTronConfirmationStatus(client, txid)
  if (status === 'reverted') {
    throw new Error(`Tron transaction ${txid} reverted on-chain.`)
  }
  if (status === 'unknown') {
    throw new TronConfirmationUnknownError(`Tron transaction ${txid} broadcast but was not indexed within the confirmation window.`)
  }
  return txid
}

function getTreasuryPrivateKey(): string {
  const key = process.env.TRON_TREASURY_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('TRON_TREASURY_PRIVATE_KEY is not set.')
  }
  return normalizePrivateKey(key)
}

export function getTronTreasuryAddress(): string {
  const client = getTronClient(getTreasuryPrivateKey())
  const address = client.address.fromPrivateKey(getTreasuryPrivateKey())
  if (!address) {
    throw new Error('Failed to derive Tron treasury address.')
  }
  const expected = process.env.TRON_TREASURY_ADDRESS?.trim()
  if (expected && address !== expected) {
    throw new Error('TRON_TREASURY_PRIVATE_KEY does not match TRON_TREASURY_ADDRESS. Refusing to move funds from an unexpected wallet.')
  }
  return address
}

export async function getTronTreasuryBalance(coin: string): Promise<bigint> {
  const client = getTronClient()
  const address = getTronTreasuryAddress()

  if (coin === TRON_NATIVE_COIN) {
    const balance = await client.trx.getBalance(address)
    return BigInt(balance)
  }

  const contract = await client.contract().at(TRON_USDT_CONTRACT) as unknown as {
    balanceOf: (addr: string) => { call: () => Promise<{ toString: () => string }> }
  }
  const balance = await contract.balanceOf(address).call()
  return BigInt(balance.toString())
}

export async function sendTronTreasuryPayout(coin: string, amountRaw: bigint, toAddress: string): Promise<string> {
  if (coin !== 'USDT') {
    throw new Error(`Automated Tron treasury payout only supports USDT (direct transfer). ${coin} requires manual conversion.`)
  }
  const client = getTronClient(getTreasuryPrivateKey())
  getTronTreasuryAddress()
  const contract = await client.contract().at(TRON_USDT_CONTRACT) as unknown as Trc20Contract
  return contract.transfer(toAddress, amountRaw.toString()).send({ feeLimit: 50_000_000 })
}
