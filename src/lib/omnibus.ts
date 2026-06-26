import type { Address, TypedDataDomain } from 'viem'
import type { BlockchainOrder } from '@/types'
import { privateKeyToAccount } from 'viem/accounts'
import { getDepositWalletAddress } from '@/lib/deposit-wallet'
import { signOrderPayload } from '@/lib/orders/signing'
import 'server-only'

function getSignerKey(): `0x${string}` {
  const key = process.env.OMNIBUS_SIGNER_PRIVATE_KEY?.trim()
  if (!key) {
    throw new Error('OMNIBUS_SIGNER_PRIVATE_KEY is not set. Omnibus trading is disabled.')
  }
  return (key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`
}

export function isOmnibusConfigured(): boolean {
  return Boolean(
    process.env.OMNIBUS_SIGNER_PRIVATE_KEY?.trim()
    && process.env.KUEST_ADDRESS?.trim()
    && process.env.KUEST_API_KEY?.trim()
    && process.env.KUEST_API_SECRET?.trim()
    && process.env.KUEST_PASSPHRASE?.trim(),
  )
}

export function getOmnibusAccount() {
  return privateKeyToAccount(getSignerKey())
}

export async function getOmnibusDepositWalletAddress(): Promise<Address> {
  return getDepositWalletAddress(getOmnibusAccount().address)
}

export async function signOmnibusOrder(payload: BlockchainOrder, domain: TypedDataDomain): Promise<string> {
  const account = getOmnibusAccount()
  return signOrderPayload({
    payload,
    domain,
    signTypedDataAsync: args => account.signTypedData(args as unknown as Parameters<typeof account.signTypedData>[0]),
  })
}
