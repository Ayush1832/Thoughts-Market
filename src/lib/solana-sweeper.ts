import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token'
import { Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { deriveSolanaKeypair, getMintForCoin, getSolanaConnection, isSolanaConfigured, SOLANA_NATIVE_COIN, SOLANA_NETWORK } from '@/lib/solana'
import 'server-only'

const MAX_SWEEPS_PER_RUN = 25
const RENT_EXEMPT_RESERVE_LAMPORTS = 1_000_000
const TX_FEE_RESERVE_LAMPORTS = 5_000
const MIN_NATIVE_SWEEP_LAMPORTS = 2_000_000
const MIN_TOKEN_SWEEP_RAW = 1_000_000

export interface SolanaSweepResult {
  disabled: boolean
  swept: number
}

export async function runSolanaSweep(): Promise<SolanaSweepResult> {
  const treasuryAddress = process.env.SOLANA_TREASURY_ADDRESS?.trim()
  const gasKeyBase58 = process.env.SOLANA_GAS_PRIVATE_KEY?.trim()
  if (!isSolanaConfigured() || !treasuryAddress || !gasKeyBase58) {
    return { disabled: true, swept: 0 }
  }

  const connection = getSolanaConnection()
  const treasuryPubkey = new PublicKey(treasuryAddress)
  const gasKeypair = Keypair.fromSecretKey(bs58.decode(gasKeyBase58))

  const monitored = (await listMonitoredDepositAddresses()).filter(record => record.network === SOLANA_NETWORK)
  let swept = 0

  for (const record of monitored) {
    const depositKeypair = deriveSolanaKeypair(record.derivationIndex)
    const isNative = record.coin === SOLANA_NATIVE_COIN
    const mint = isNative ? null : getMintForCoin(record.coin)
    if (!isNative && !mint) {
      continue
    }

    if (isNative) {
      const balance = await connection.getBalance(depositKeypair.publicKey)
      const sweepAmount = balance - RENT_EXEMPT_RESERVE_LAMPORTS - TX_FEE_RESERVE_LAMPORTS
      if (balance >= MIN_NATIVE_SWEEP_LAMPORTS && sweepAmount > 0) {
        const transaction = new Transaction().add(SystemProgram.transfer({
          fromPubkey: depositKeypair.publicKey,
          toPubkey: treasuryPubkey,
          lamports: sweepAmount,
        }))
        await sendAndConfirmTransaction(connection, transaction, [depositKeypair])
        swept += 1
        if (swept >= MAX_SWEEPS_PER_RUN) {
          return { disabled: false, swept }
        }
      }
      continue
    }

    const sourceAta = getAssociatedTokenAddressSync(mint!, depositKeypair.publicKey)
    const accountInfo = await connection.getAccountInfo(sourceAta)
    if (!accountInfo) {
      continue
    }

    const treasuryAta = await getOrCreateAssociatedTokenAccount(connection, gasKeypair, mint!, treasuryPubkey)
    const balanceResponse = await connection.getTokenAccountBalance(sourceAta)
    const balanceRaw = BigInt(balanceResponse.value.amount)
    if (balanceRaw < BigInt(MIN_TOKEN_SWEEP_RAW)) {
      continue
    }

    await transfer(connection, gasKeypair, sourceAta, treasuryAta.address, depositKeypair, balanceRaw)
    swept += 1
    if (swept >= MAX_SWEEPS_PER_RUN) {
      return { disabled: false, swept }
    }
  }

  return { disabled: false, swept }
}
