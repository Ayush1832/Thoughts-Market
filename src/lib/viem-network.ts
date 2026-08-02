import type { Chain } from 'viem/chains'
import type { DefaultNetworkKey } from '@/lib/network'
import { polygon, polygonAmoy } from 'viem/chains'
import { DEFAULT_NETWORK_KEY } from '@/lib/network'

const VIEM_NETWORKS_BY_KEY = {
  amoy: polygonAmoy,
  polygon,
} as const satisfies Record<DefaultNetworkKey, Chain>

export const defaultViemNetwork = VIEM_NETWORKS_BY_KEY[DEFAULT_NETWORK_KEY]

// viem's built-in default RPC for Polygon Amoy (rpc-amoy.polygon.technology)
// no longer resolves (dead endpoint) — override with a working public RPC
// rather than letting every client-side contract read fail.
const RPC_URL_OVERRIDES: Partial<Record<DefaultNetworkKey, string>> = {
  amoy: 'https://polygon-amoy.drpc.org',
}

export const defaultViemRpcUrl = RPC_URL_OVERRIDES[DEFAULT_NETWORK_KEY] ?? defaultViemNetwork.rpcUrls.default.http[0]
