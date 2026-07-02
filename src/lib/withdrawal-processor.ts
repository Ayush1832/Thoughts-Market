import { createPublicClient, createWalletClient, erc20Abi, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { credit } from '@/lib/db/queries/ledger'
import { claimPendingWithdrawals, markWithdrawal } from '@/lib/db/queries/withdrawals'
import { finance_transactions } from '@/lib/db/schema/finance/tables'
import { getDepositChain } from '@/lib/deposit-chains'
import { db } from '@/lib/drizzle'
import 'server-only'

const MAX_WITHDRAWALS_PER_RUN = 20

export interface WithdrawalProcessingResult {
  disabled: boolean
  processed: number
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim()
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`
}

export async function runWithdrawalProcessing(): Promise<WithdrawalProcessingResult> {
  const hotKey = process.env.WITHDRAWAL_HOT_WALLET_PRIVATE_KEY?.trim()
  if (!hotKey) {
    return { disabled: true, processed: 0 }
  }

  const account = privateKeyToAccount(normalizePrivateKey(hotKey))
  const pending = await claimPendingWithdrawals(MAX_WITHDRAWALS_PER_RUN)
  let processed = 0

  for (const withdrawal of pending) {
    try {
      const chainConfig = getDepositChain(withdrawal.dest_network)
      if (!chainConfig) {
        throw new Error(`Unsupported network ${withdrawal.dest_network}`)
      }

      const isNative = chainConfig.native.coin === withdrawal.coin
      const token = chainConfig.tokens.find(item => item.coin === withdrawal.coin)
      if (!isNative && !token) {
        throw new Error(`Unsupported coin ${withdrawal.coin} on ${withdrawal.dest_network}`)
      }

      const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
      const wallet = createWalletClient({ account, chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
      const recipient = withdrawal.to_address as `0x${string}`

      const txHash = isNative
        ? await wallet.sendTransaction({
            to: recipient,
            value: parseUnits(withdrawal.amount, chainConfig.native.decimals),
          })
        : await wallet.writeContract({
            address: token!.address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient, parseUnits(withdrawal.amount, token!.decimals)],
          })

      await publicClient.waitForTransactionReceipt({ hash: txHash })
      await markWithdrawal(withdrawal.id, 'completed', { txHash })
      await db.insert(finance_transactions).values({
        user_id: withdrawal.user_id,
        wallet_address: withdrawal.to_address,
        type: 'withdrawal',
        amount: withdrawal.amount,
        currency: withdrawal.coin,
        status: 'completed',
        method: 'Crypto Withdrawal',
        tx_hash: txHash,
      })
      processed += 1
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed.'
      await markWithdrawal(withdrawal.id, 'failed', { error: message })
      await credit({
        userId: withdrawal.user_id,
        currency: withdrawal.coin,
        amount: withdrawal.amount,
        type: 'refund',
        reference: withdrawal.id,
      })
    }
  }

  return { disabled: false, processed }
}
