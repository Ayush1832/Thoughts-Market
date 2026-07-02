import type { Address } from 'viem'
import type { Chain } from 'viem/chains'
import { arbitrum, avalanche, base, bsc, mainnet, optimism } from 'viem/chains'
import { COLLATERAL_TOKEN_ADDRESS } from '@/lib/contracts'
import { defaultViemNetwork, defaultViemRpcUrl } from '@/lib/viem-network'
import 'server-only'

export interface DepositChainToken {
  coin: string
  address: Address
  decimals: number
}

export interface DepositChainNative {
  coin: string
  decimals: number
  minSweep: bigint
}

export interface DepositChain {
  network: string
  chain: Chain
  rpcUrl: string
  confirmations: bigint
  maxRange: bigint
  maxNativeBlocks: bigint
  native: DepositChainNative
  tokens: DepositChainToken[]
}

interface DepositChainDef {
  network: string
  chain: Chain
  rpcUrl: () => string | undefined
  confirmations: bigint
  maxRange: bigint
  maxNativeBlocks: bigint
  native: DepositChainNative
  tokens: DepositChainToken[]
}

const POLYGON_USDT: Address = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
const ETHEREUM_USDC: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const ETHEREUM_USDT: Address = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const ETHEREUM_LINK: Address = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
const ETHEREUM_UNI: Address = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
const ETHEREUM_SAND: Address = '0x3845badAde8e6dFF049820680d1F14bD3903a5d0'
const ETHEREUM_IMX: Address = '0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF'
const ETHEREUM_RLB: Address = '0x046EeE2cc3188071C02BfC1745A6b17c656e3f3d'
const BSC_USDC: Address = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
const BSC_USDT: Address = '0x55d398326f99059fF775485246999027B3197955'
const AVALANCHE_USDC: Address = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'
const AVALANCHE_USDT: Address = '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7'
const ARBITRUM_USDC: Address = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
const ARBITRUM_USDT: Address = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
const BASE_USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const OPTIMISM_USDC: Address = '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
const OPTIMISM_USDT: Address = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'

const DEPOSIT_CHAIN_DEFS: DepositChainDef[] = [
  {
    network: 'polygon',
    chain: defaultViemNetwork,
    rpcUrl: () => process.env.DEPOSIT_RPC_POLYGON?.trim() || defaultViemRpcUrl,
    confirmations: 12n,
    maxRange: 2000n,
    maxNativeBlocks: 200n,
    native: { coin: 'POL', decimals: 18, minSweep: 2n * 10n ** 18n },
    tokens: [
      { coin: 'USDC', address: COLLATERAL_TOKEN_ADDRESS, decimals: 6 },
      { coin: 'USDT', address: POLYGON_USDT, decimals: 6 },
    ],
  },
  {
    network: 'ethereum',
    chain: mainnet,
    rpcUrl: () => process.env.DEPOSIT_RPC_ETHEREUM?.trim(),
    confirmations: 12n,
    maxRange: 2000n,
    maxNativeBlocks: 60n,
    native: { coin: 'ETH', decimals: 18, minSweep: 10n ** 16n },
    tokens: [
      { coin: 'USDC', address: ETHEREUM_USDC, decimals: 6 },
      { coin: 'USDT', address: ETHEREUM_USDT, decimals: 6 },
      { coin: 'LINK', address: ETHEREUM_LINK, decimals: 18 },
      { coin: 'UNI', address: ETHEREUM_UNI, decimals: 18 },
      { coin: 'SAND', address: ETHEREUM_SAND, decimals: 18 },
      { coin: 'IMX', address: ETHEREUM_IMX, decimals: 18 },
      { coin: 'RLB', address: ETHEREUM_RLB, decimals: 18 },
    ],
  },
  {
    network: 'bsc',
    chain: bsc,
    rpcUrl: () => process.env.DEPOSIT_RPC_BSC?.trim(),
    confirmations: 15n,
    maxRange: 2000n,
    maxNativeBlocks: 120n,
    native: { coin: 'BNB', decimals: 18, minSweep: 2n * 10n ** 16n },
    tokens: [
      { coin: 'USDC', address: BSC_USDC, decimals: 18 },
      { coin: 'USDT', address: BSC_USDT, decimals: 18 },
    ],
  },
  {
    network: 'avalanche',
    chain: avalanche,
    rpcUrl: () => process.env.DEPOSIT_RPC_AVALANCHE?.trim(),
    confirmations: 6n,
    maxRange: 2000n,
    maxNativeBlocks: 120n,
    native: { coin: 'AVAX', decimals: 18, minSweep: 10n ** 17n },
    tokens: [
      { coin: 'USDC', address: AVALANCHE_USDC, decimals: 6 },
      { coin: 'USDT', address: AVALANCHE_USDT, decimals: 6 },
    ],
  },
  {
    network: 'arbitrum',
    chain: arbitrum,
    rpcUrl: () => process.env.DEPOSIT_RPC_ARBITRUM?.trim(),
    confirmations: 20n,
    maxRange: 2000n,
    maxNativeBlocks: 600n,
    native: { coin: 'ETH', decimals: 18, minSweep: 2n * 10n ** 15n },
    tokens: [
      { coin: 'USDC', address: ARBITRUM_USDC, decimals: 6 },
      { coin: 'USDT', address: ARBITRUM_USDT, decimals: 6 },
    ],
  },
  {
    network: 'base',
    chain: base,
    rpcUrl: () => process.env.DEPOSIT_RPC_BASE?.trim(),
    confirmations: 12n,
    maxRange: 2000n,
    maxNativeBlocks: 200n,
    native: { coin: 'ETH', decimals: 18, minSweep: 2n * 10n ** 15n },
    tokens: [
      { coin: 'USDC', address: BASE_USDC, decimals: 6 },
    ],
  },
  {
    network: 'optimism',
    chain: optimism,
    rpcUrl: () => process.env.DEPOSIT_RPC_OPTIMISM?.trim(),
    confirmations: 12n,
    maxRange: 2000n,
    maxNativeBlocks: 200n,
    native: { coin: 'ETH', decimals: 18, minSweep: 2n * 10n ** 15n },
    tokens: [
      { coin: 'USDC', address: OPTIMISM_USDC, decimals: 6 },
      { coin: 'USDT', address: OPTIMISM_USDT, decimals: 6 },
    ],
  },
]

export function getEnabledDepositChains(): DepositChain[] {
  const chains: DepositChain[] = []
  for (const def of DEPOSIT_CHAIN_DEFS) {
    const rpcUrl = def.rpcUrl()
    if (!rpcUrl) {
      continue
    }
    chains.push({
      network: def.network,
      chain: def.chain,
      rpcUrl,
      confirmations: def.confirmations,
      maxRange: def.maxRange,
      maxNativeBlocks: def.maxNativeBlocks,
      native: def.native,
      tokens: def.tokens,
    })
  }
  return chains
}

export function getDepositChain(network: string): DepositChain | undefined {
  return getEnabledDepositChains().find(chain => chain.network === network)
}

export function getNetworkCoins(network: string): string[] {
  const def = DEPOSIT_CHAIN_DEFS.find(item => item.network === network)
  if (!def) {
    return []
  }
  return [def.native.coin, ...def.tokens.map(token => token.coin)]
}

export function isCoinSupportedOnNetwork(network: string, coin: string): boolean {
  return getNetworkCoins(network).includes(coin)
}

export const SUPPORTED_DEPOSIT_NETWORKS = DEPOSIT_CHAIN_DEFS.map(def => def.network)
