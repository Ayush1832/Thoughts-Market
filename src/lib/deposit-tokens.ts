import type { Address } from 'viem'
import { COLLATERAL_TOKEN_ADDRESS } from '@/lib/contracts'

export interface DepositToken {
  coin: string
  address: Address
  decimals: number
}

const POLYGON_USDT: Address = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'

export const DEPOSIT_TOKENS: DepositToken[] = [
  { coin: 'USDC', address: COLLATERAL_TOKEN_ADDRESS, decimals: 6 },
  { coin: 'USDT', address: POLYGON_USDT, decimals: 6 },
]
