import { PublicKey } from '@solana/web3.js'
import { address as bitcoinAddress, networks } from 'bitcoinjs-lib'
import { TronWeb } from 'tronweb'
import { isAddress } from 'viem'

// Inlined rather than imported from @/lib/{bitcoin,solana,tron} — those modules are
// marked 'server-only' (they touch private keys/mnemonics), and this file is imported
// by client components (e.g. CustodialWithdrawForm). Must stay in sync with the
// BITCOIN_NETWORK/SOLANA_NETWORK/TRON_NETWORK constants in those files.
const BITCOIN_NETWORK = 'bitcoin'
const SOLANA_NETWORK = 'solana'
const TRON_NETWORK = 'tron'

// bitcoinjs-lib network only affects address checksum/prefix validation (bc1.../tb1...);
// this validates client-supplied withdrawal destination addresses, which are always
// mainnet-format regardless of which mode our own treasury/hot wallets run in, since
// users withdraw to their own real-world wallets.
const BITCOIN_VALIDATION_NETWORK = networks.bitcoin

export function isValidAddressForNetwork(network: string, address: string): boolean {
  if (network === TRON_NETWORK) {
    return TronWeb.isAddress(address)
  }
  if (network === SOLANA_NETWORK) {
    try {
      return PublicKey.isOnCurve(address)
    }
    catch {
      return false
    }
  }
  if (network === BITCOIN_NETWORK) {
    try {
      bitcoinAddress.toOutputScript(address, BITCOIN_VALIDATION_NETWORK)
      return true
    }
    catch {
      return false
    }
  }
  return isAddress(address)
}
