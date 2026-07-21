import { BITCOIN_NETWORK, deriveBitcoinKeyPair, isBitcoinConfigured } from '@/lib/bitcoin'
import { broadcastTx, buildAndSignSweepTransaction, fetchFeeRate, fetchUtxos } from '@/lib/bitcoin-tx'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import 'server-only'

const MAX_SWEEPS_PER_RUN = 25
const MIN_SWEEP_SATS = 20_000

export interface BitcoinSweepResult {
  disabled: boolean
  swept: number
}

export async function runBitcoinSweep(): Promise<BitcoinSweepResult> {
  const treasury = process.env.BITCOIN_TREASURY_ADDRESS?.trim()
  if (!isBitcoinConfigured() || !treasury) {
    return { disabled: true, swept: 0 }
  }

  const monitored = (await listMonitoredDepositAddresses()).filter(record => record.network === BITCOIN_NETWORK)
  let swept = 0
  const feeRate = await fetchFeeRate()

  for (const record of monitored) {
    const utxos = (await fetchUtxos(record.address)).filter(utxo => utxo.status.confirmed)
    const totalValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0)
    if (totalValue < MIN_SWEEP_SATS || utxos.length === 0) {
      continue
    }

    const keyPair = deriveBitcoinKeyPair(record.derivationIndex)
    const hex = buildAndSignSweepTransaction(keyPair, record.address, utxos, treasury, feeRate)
    await broadcastTx(hex)

    swept += 1
    if (swept >= MAX_SWEEPS_PER_RUN) {
      return { disabled: false, swept }
    }
  }

  return { disabled: false, swept }
}
