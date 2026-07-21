import type { TransactionReceipt } from 'viem'
import { createPublicClient, createWalletClient, erc20Abi, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { getEnabledDepositChains } from '@/lib/deposit-chains'
import { deriveDepositAccount } from '@/lib/deposit-hd'
import { sendOpsAlert } from '@/lib/ops-alert'
import 'server-only'

const SWEEP_GAS_LIMIT = 120000n
const NATIVE_GAS_LIMIT = 21000n
const MAX_SWEEPS_PER_RUN = 25

export interface SweepResult {
  disabled: boolean
  swept: number
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim()
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`
}

function minSweepUnits(decimals: number): bigint {
  return 10n ** BigInt(Math.max(decimals - 1, 0))
}

// viem resolves waitForTransactionReceipt on a reverted tx instead of throwing.
function assertTransactionSuccess(receipt: TransactionReceipt): void {
  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${receipt.transactionHash} reverted on-chain.`)
  }
}

export async function runDepositSweep(): Promise<SweepResult> {
  const treasury = process.env.DEPOSIT_TREASURY_ADDRESS?.trim()
  const gasKey = process.env.DEPOSIT_GAS_PRIVATE_KEY?.trim()
  if (!treasury || !isAddress(treasury) || !gasKey) {
    return { disabled: true, swept: 0 }
  }

  const gasAccount = privateKeyToAccount(normalizePrivateKey(gasKey))
  const monitored = await listMonitoredDepositAddresses()
  let swept = 0

  for (const chainConfig of getEnabledDepositChains()) {
    const addresses = monitored.filter(record => record.network === chainConfig.network)
    if (addresses.length === 0) {
      continue
    }

    const publicClient = createPublicClient({ chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })
    const gasWallet = createWalletClient({ account: gasAccount, chain: chainConfig.chain, transport: http(chainConfig.rpcUrl) })

    for (const record of addresses) {
      const depositAddress = record.address as `0x${string}`

      for (const token of chainConfig.tokens) {
        try {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [depositAddress],
          })
          if (balance < minSweepUnits(token.decimals)) {
            continue
          }

          const gasPrice = await publicClient.getGasPrice()
          const requiredGas = gasPrice * SWEEP_GAS_LIMIT * 3n
          const nativeBalance = await publicClient.getBalance({ address: depositAddress })
          if (nativeBalance < requiredGas) {
            const topUpHash = await gasWallet.sendTransaction({
              to: depositAddress,
              value: requiredGas - nativeBalance,
            })
            assertTransactionSuccess(await publicClient.waitForTransactionReceipt({ hash: topUpHash }))
          }

          const wallet = createWalletClient({
            account: deriveDepositAccount(record.derivationIndex),
            chain: chainConfig.chain,
            transport: http(chainConfig.rpcUrl),
          })
          const sweepHash = await wallet.writeContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [treasury as `0x${string}`, balance],
            gas: SWEEP_GAS_LIMIT,
          })
          assertTransactionSuccess(await publicClient.waitForTransactionReceipt({ hash: sweepHash }))

          swept += 1
          if (swept >= MAX_SWEEPS_PER_RUN) {
            return { disabled: false, swept }
          }
        }
        catch (error) {
          // One address/token failing (dry gas wallet, RPC hiccup, revert) must
          // not abort sweeps for every other unrelated address in this run —
          // balance-based rechecking makes this safely retryable next run.
          await sendOpsAlert(`deposit-sweep (${chainConfig.network} ${token.coin} ${depositAddress})`, error)
        }
      }

      try {
        const nativeBalance = await publicClient.getBalance({ address: depositAddress })
        if (nativeBalance >= chainConfig.native.minSweep) {
          const gasPrice = await publicClient.getGasPrice()
          const gasReserve = gasPrice * NATIVE_GAS_LIMIT * 3n
          const value = nativeBalance - gasReserve
          if (value > 0n) {
            const wallet = createWalletClient({
              account: deriveDepositAccount(record.derivationIndex),
              chain: chainConfig.chain,
              transport: http(chainConfig.rpcUrl),
            })
            const nativeHash = await wallet.sendTransaction({
              to: treasury as `0x${string}`,
              value,
              gas: NATIVE_GAS_LIMIT,
            })
            assertTransactionSuccess(await publicClient.waitForTransactionReceipt({ hash: nativeHash }))

            swept += 1
            if (swept >= MAX_SWEEPS_PER_RUN) {
              return { disabled: false, swept }
            }
          }
        }
      }
      catch (error) {
        await sendOpsAlert(`deposit-sweep (${chainConfig.network} native ${depositAddress})`, error)
      }
    }
  }

  return { disabled: false, swept }
}
