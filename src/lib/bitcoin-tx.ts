import type { ECPairInterface } from 'ecpair'
import { payments, Psbt } from 'bitcoinjs-lib'
import { BITCOIN_JS_NETWORK, bitcoinApiBase } from '@/lib/bitcoin'
import 'server-only'

const BASE_TX_VBYTES = 11n
const INPUT_VBYTES = 68n
const OUTPUT_VBYTES = 31n
const DEFAULT_FEE_RATE = 15n
const DUST_THRESHOLD_SATS = 330n

export interface EsploraUtxo {
  txid: string
  vout: number
  value: number
  status: { confirmed: boolean }
}

export async function fetchUtxos(address: string): Promise<EsploraUtxo[]> {
  const response = await fetch(`${bitcoinApiBase()}/address/${address}/utxo`, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok) {
    return []
  }
  return await response.json() as EsploraUtxo[]
}

export async function fetchFeeRate(): Promise<bigint> {
  try {
    const response = await fetch(`${bitcoinApiBase()}/v1/fees/recommended`, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) {
      return DEFAULT_FEE_RATE
    }
    const payload = await response.json() as { halfHourFee?: number }
    return payload.halfHourFee && payload.halfHourFee > 0 ? BigInt(Math.ceil(payload.halfHourFee)) : DEFAULT_FEE_RATE
  }
  catch {
    return DEFAULT_FEE_RATE
  }
}

export function estimateFee(inputCount: number, outputCount: number, feeRate: bigint): bigint {
  const vBytes = BASE_TX_VBYTES + BigInt(inputCount) * INPUT_VBYTES + BigInt(outputCount) * OUTPUT_VBYTES
  return vBytes * feeRate
}

export async function broadcastTx(hex: string): Promise<string> {
  const response = await fetch(`${bitcoinApiBase()}/tx`, {
    method: 'POST',
    body: hex,
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => 'broadcast failed')
    throw new Error(`Bitcoin broadcast failed: ${message}`)
  }
  return (await response.text()).trim()
}

export function buildAndSignSweepTransaction(
  keyPair: ECPairInterface,
  fromAddress: string,
  utxos: EsploraUtxo[],
  toAddress: string,
  feeRate: bigint,
): string {
  const { output: fromScript } = payments.p2wpkh({ pubkey: keyPair.publicKey, network: BITCOIN_JS_NETWORK })
  if (!fromScript) {
    throw new Error(`Failed to derive output script for ${fromAddress}`)
  }

  const psbt = new Psbt({ network: BITCOIN_JS_NETWORK })
  let totalInput = 0n
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: fromScript, value: BigInt(utxo.value) },
    })
    totalInput += BigInt(utxo.value)
  }

  const fee = estimateFee(utxos.length, 1, feeRate)
  const sendAmount = totalInput - fee
  if (sendAmount <= 0n) {
    throw new Error('Insufficient balance to cover Bitcoin network fee.')
  }

  psbt.addOutput({ address: toAddress, value: sendAmount })
  psbt.signAllInputs(keyPair)
  psbt.finalizeAllInputs()
  return psbt.extractTransaction().toHex()
}

export function buildAndSignWithdrawalTransaction(
  keyPair: ECPairInterface,
  changeAddress: string,
  utxos: EsploraUtxo[],
  toAddress: string,
  amountSats: number,
  feeRate: bigint,
): string {
  const { output: fromScript } = payments.p2wpkh({ pubkey: keyPair.publicKey, network: BITCOIN_JS_NETWORK })
  if (!fromScript) {
    throw new Error('Failed to derive output script for the withdrawal hot wallet.')
  }

  const amount = BigInt(amountSats)
  const psbt = new Psbt({ network: BITCOIN_JS_NETWORK })
  let totalInput = 0n
  let usedCount = 0
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: fromScript, value: BigInt(utxo.value) },
    })
    totalInput += BigInt(utxo.value)
    usedCount += 1
    const feeWithChange = estimateFee(usedCount, 2, feeRate)
    if (totalInput >= amount + feeWithChange) {
      break
    }
  }

  const feeWithChange = estimateFee(usedCount, 2, feeRate)
  if (totalInput < amount + feeWithChange) {
    throw new Error('Insufficient hot wallet balance to cover amount and network fee.')
  }

  psbt.addOutput({ address: toAddress, value: amount })
  const change = totalInput - amount - feeWithChange
  if (change >= DUST_THRESHOLD_SATS) {
    psbt.addOutput({ address: changeAddress, value: change })
  }
  // Sub-dust change is folded into the fee rather than creating a dust output that relays could reject.

  psbt.signAllInputs(keyPair)
  psbt.finalizeAllInputs()
  return psbt.extractTransaction().toHex()
}
