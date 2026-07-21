import { TronWeb } from 'tronweb'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { deriveTronAccount, getTronClient, getTronConfirmationStatus, isTronConfigured, TRON_NETWORK, TRON_USDT_CONTRACT, TRON_USDT_DECIMALS } from '@/lib/tron'
import 'server-only'

const MAX_SWEEPS_PER_RUN = 25
const MIN_USDT_SWEEP_RAW = BigInt(1 * 10 ** TRON_USDT_DECIMALS)
const TRX_TOPUP_SUN = 15_000_000
const MIN_NATIVE_SWEEP_SUN = 5_000_000
const NATIVE_RESERVE_SUN = 1_000_000
const CONFIRMATION_POLL_ATTEMPTS = 10
const CONFIRMATION_POLL_DELAY_MS = 1500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForTronConfirmation(client: TronWeb, txid: string): Promise<boolean> {
  for (let attempt = 0; attempt < CONFIRMATION_POLL_ATTEMPTS; attempt += 1) {
    await sleep(CONFIRMATION_POLL_DELAY_MS)
    try {
      const tx = await client.trx.getConfirmedTransaction(txid)
      if (tx) {
        return true
      }
    }
    catch {
      // not yet confirmed, keep polling
    }
  }
  return false
}

export interface TronSweepResult {
  disabled: boolean
  swept: number
}

interface Trc20Contract {
  balanceOf: (address: string) => { call: () => Promise<{ toString: () => string }> }
  transfer: (to: string, amount: string) => { send: (options: { feeLimit: number }) => Promise<string> }
}

export async function runTronSweep(): Promise<TronSweepResult> {
  const treasury = process.env.TRON_TREASURY_ADDRESS?.trim()
  const gasKey = process.env.TRON_GAS_PRIVATE_KEY?.trim()
  if (!isTronConfigured() || !treasury || !TronWeb.isAddress(treasury) || !gasKey) {
    return { disabled: true, swept: 0 }
  }

  const gasClient = getTronClient(gasKey)
  const monitored = (await listMonitoredDepositAddresses()).filter(record => record.network === TRON_NETWORK)
  let swept = 0

  for (const record of monitored) {
    const account = deriveTronAccount(record.derivationIndex)
    const client = getTronClient(account.privateKey)
    const contract = await client.contract().at(TRON_USDT_CONTRACT) as unknown as Trc20Contract

    const usdtBalance = await contract.balanceOf(record.address).call()
    const usdtRaw = BigInt(usdtBalance.toString())

    if (usdtRaw >= MIN_USDT_SWEEP_RAW) {
      const nativeBalance = await client.trx.getBalance(record.address)
      if (nativeBalance < TRX_TOPUP_SUN) {
        const topUp = await gasClient.trx.sendTransaction(record.address, TRX_TOPUP_SUN - nativeBalance)
        const confirmed = topUp.result && await waitForTronConfirmation(gasClient, topUp.txid)
        if (!confirmed) {
          continue
        }
      }

      const sweepTxid = await contract.transfer(treasury, usdtRaw.toString()).send({ feeLimit: 50_000_000 })
      const sweepStatus = await getTronConfirmationStatus(client, sweepTxid)
      if (sweepStatus === 'success') {
        swept += 1
        if (swept >= MAX_SWEEPS_PER_RUN) {
          return { disabled: false, swept }
        }
      }
      // 'reverted' or 'unknown': the USDT balance is still sitting at the
      // deposit address either way, so leaving it unswept is safe — the next
      // run will simply re-attempt it. Do not count it as swept.
    }

    const nativeBalance = await client.trx.getBalance(record.address)
    if (nativeBalance >= MIN_NATIVE_SWEEP_SUN) {
      const sweepAmount = nativeBalance - NATIVE_RESERVE_SUN
      if (sweepAmount > 0) {
        const result = await client.trx.sendTransaction(treasury, sweepAmount)
        const confirmed = result.result && await waitForTronConfirmation(client, result.txid)
        if (confirmed) {
          swept += 1
          if (swept >= MAX_SWEEPS_PER_RUN) {
            return { disabled: false, swept }
          }
        }
      }
    }
  }

  return { disabled: false, swept }
}
