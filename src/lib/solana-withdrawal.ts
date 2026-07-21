import { Buffer } from 'node:buffer'
import { getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, transfer } from '@solana/spl-token'
import { Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { getMintForCoin, getSolanaConnection, SOLANA_NATIVE_COIN, SOLANA_NATIVE_DECIMALS, SOLANA_TOKEN_DECIMALS } from '@/lib/solana'
import 'server-only'

function getHotKeypair(): Keypair {
  const key = process.env.SOLANA_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('SOLANA_HOT_WALLET_PRIVATE_KEY is not set.')
  }
  return Keypair.fromSecretKey(bs58.decode(key))
}

export function solanaAmountToRaw(coin: string, amount: string): bigint {
  const decimals = coin === SOLANA_NATIVE_COIN ? SOLANA_NATIVE_DECIMALS : SOLANA_TOKEN_DECIMALS
  return BigInt(Math.round(Number(amount) * 10 ** decimals))
}

export async function getSolanaHotBalance(coin: string): Promise<bigint> {
  const connection = getSolanaConnection()
  const hotKeypair = getHotKeypair()

  if (coin === SOLANA_NATIVE_COIN) {
    const balance = await connection.getBalance(hotKeypair.publicKey)
    return BigInt(balance)
  }

  const mint = getMintForCoin(coin)
  if (!mint) {
    throw new Error(`Unsupported Solana coin ${coin}`)
  }
  const ata = getAssociatedTokenAddressSync(mint, hotKeypair.publicKey)
  const accountInfo = await connection.getAccountInfo(ata)
  if (!accountInfo) {
    return 0n
  }
  const balance = await connection.getTokenAccountBalance(ata)
  return BigInt(balance.value.amount)
}

export async function sendSolanaPayout(coin: string, amountRaw: bigint, toAddress: string): Promise<string> {
  const connection = getSolanaConnection()
  const hotKeypair = getHotKeypair()
  const recipient = new PublicKey(toAddress)

  if (coin === SOLANA_NATIVE_COIN) {
    const transaction = new Transaction().add(SystemProgram.transfer({
      fromPubkey: hotKeypair.publicKey,
      toPubkey: recipient,
      lamports: Number(amountRaw),
    }))
    return sendAndConfirmTransaction(connection, transaction, [hotKeypair])
  }

  const mint = getMintForCoin(coin)
  if (!mint) {
    throw new Error(`Unsupported Solana coin ${coin}`)
  }
  const sourceAta = getAssociatedTokenAddressSync(mint, hotKeypair.publicKey)
  const destAta = await getOrCreateAssociatedTokenAccount(connection, hotKeypair, mint, recipient)
  return transfer(connection, hotKeypair, sourceAta, destAta.address, hotKeypair, amountRaw)
}

export async function getSolanaTreasuryBalance(coin: string): Promise<bigint> {
  const address = process.env.SOLANA_TREASURY_ADDRESS?.trim()
  if (!address) {
    throw new Error('SOLANA_TREASURY_ADDRESS is not set.')
  }
  const connection = getSolanaConnection()
  const owner = new PublicKey(address)

  if (coin === SOLANA_NATIVE_COIN) {
    const balance = await connection.getBalance(owner)
    return BigInt(balance)
  }

  const mint = getMintForCoin(coin)
  if (!mint) {
    throw new Error(`Unsupported Solana coin ${coin}`)
  }
  const ata = getAssociatedTokenAddressSync(mint, owner)
  const accountInfo = await connection.getAccountInfo(ata)
  if (!accountInfo) {
    return 0n
  }
  const balance = await connection.getTokenAccountBalance(ata)
  return BigInt(balance.value.amount)
}

function getTreasuryKeypair(): Keypair {
  const key = process.env.SOLANA_TREASURY_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('SOLANA_TREASURY_PRIVATE_KEY is not set.')
  }
  const keypair = Keypair.fromSecretKey(bs58.decode(key))
  const expected = process.env.SOLANA_TREASURY_ADDRESS?.trim()
  if (expected && keypair.publicKey.toBase58() !== expected) {
    throw new Error('SOLANA_TREASURY_PRIVATE_KEY does not match SOLANA_TREASURY_ADDRESS. Refusing to move funds from an unexpected wallet.')
  }
  return keypair
}

export function getSolanaTreasuryAddress(): string {
  return getTreasuryKeypair().publicKey.toBase58()
}

/**
 * Signs and sends a base64-encoded VersionedTransaction returned by a LI.FI quote
 * (Solana as the source chain) with the treasury key.
 */
export async function signAndSendSolanaTransaction(base64Data: string): Promise<string> {
  const connection = getSolanaConnection()
  const keypair = getTreasuryKeypair()
  const transaction = VersionedTransaction.deserialize(Buffer.from(base64Data, 'base64'))
  transaction.sign([keypair])
  const signature = await connection.sendRawTransaction(transaction.serialize(), { maxRetries: 3 })
  const latestBlockhash = await connection.getLatestBlockhash()
  await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed')
  return signature
}
