import type { AppKitNetwork } from '@reown/appkit/networks'
import type { DefaultNetworkKey } from '@/lib/network'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { polygon, polygonAmoy } from '@reown/appkit/networks'
import { DEFAULT_NETWORK_KEY } from '@/lib/network'
import { reownProjectId } from '@/lib/reown-project-id'
import { defaultViemRpcUrl } from '@/lib/viem-network'

const projectId = reownProjectId

const APPKIT_NETWORKS_BY_KEY = {
  amoy: polygonAmoy,
  polygon,
} as const satisfies Record<DefaultNetworkKey, AppKitNetwork>

export const defaultNetwork = APPKIT_NETWORKS_BY_KEY[DEFAULT_NETWORK_KEY]
export const networks = [defaultNetwork] as [AppKitNetwork, ...AppKitNetwork[]]

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  networks,
  // viem's built-in default RPC for Polygon Amoy (rpc-amoy.polygon.technology)
  // no longer resolves — point wagmi's own RPC calls at the same working
  // endpoint used elsewhere instead of the dead chain default.
  customRpcUrls: {
    [`eip155:${defaultNetwork.id}`]: [{ url: defaultViemRpcUrl }],
  },
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
