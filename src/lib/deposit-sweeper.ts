import { createPublicClient, createWalletClient, erc20Abi, http, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { listMonitoredDepositAddresses } from '@/lib/db/queries/deposit-addresses'
import { deriveDepositAccount } from '@/lib/deposit-hd'
import { DEPOSIT_TOKENS } from '@/lib/deposit-tokens'
import { defaultViemNetwork, defaultViemRpcUrl } from '@/lib/viem-network'
import 'server-only'

const NETWORK = 'polygon'
const MIN_SWEEP_UNITS = 100000n
const SWEEP_GAS_LIMIT = 120000n
const MAX_SWEEPS_PER_RUN = 25

export interface SweepResult {
  disabled: boolean
  swept: number
}

function normalizePrivateKey(value: string): `0x${string}` {
  const trimmed = value.trim()
  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`
}

export async function runDepositSweep(): Promise<SweepResult> {
  const treasury = process.env.DEPOSIT_TREASURY_ADDRESS?.trim()
  const gasKey = process.env.DEPOSIT_GAS_PRIVATE_KEY?.trim()
  if (!treasury || !isAddress(treasury) || !gasKey) {
    return { disabled: true, swept: 0 }
  }

  const publicClient = createPublicClient({ chain: defaultViemNetwork, transport: http(defaultViemRpcUrl) })
  const gasWallet = createWalletClient({
    account: privateKeyToAccount(normalizePrivateKey(gasKey)),
    chain: defaultViemNetwork,
    transport: http(defaultViemRpcUrl),
  })

  const monitored = await listMonitoredDepositAddresses()
  const addresses = monitored.filter(record => record.network === NETWORK)
  let swept = 0

  for (const record of addresses) {
    const depositAddress = record.address as `0x${string}`

    for (const token of DEPOSIT_TOKENS) {
      const balance = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [depositAddress],
      })
      if (balance < MIN_SWEEP_UNITS) {
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
        await publicClient.waitForTransactionReceipt({ hash: topUpHash })
      }

      const wallet = createWalletClient({
        account: deriveDepositAccount(record.derivationIndex),
        chain: defaultViemNetwork,
        transport: http(defaultViemRpcUrl),
      })
      const sweepHash = await wallet.writeContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [treasury as `0x${string}`, balance],
        gas: SWEEP_GAS_LIMIT,
      })
      await publicClient.waitForTransactionReceipt({ hash: sweepHash })

      swept += 1
      if (swept >= MAX_SWEEPS_PER_RUN) {
        return { disabled: false, swept }
      }
    }
  }

  return { disabled: false, swept }
}
