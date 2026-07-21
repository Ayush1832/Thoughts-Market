export interface NetworkFee {
  flatUsd: number
  minUsd: number
}

export const WITHDRAWAL_PERCENT_FEE = 0.003

const FEE_SCHEDULE: Record<string, NetworkFee> = {
  ethereum: { flatUsd: 12, minUsd: 40 },
  polygon: { flatUsd: 1, minUsd: 5 },
  bsc: { flatUsd: 1, minUsd: 5 },
  avalanche: { flatUsd: 1, minUsd: 5 },
  arbitrum: { flatUsd: 1, minUsd: 5 },
  base: { flatUsd: 1, minUsd: 5 },
  optimism: { flatUsd: 1, minUsd: 5 },
  tron: { flatUsd: 2, minUsd: 10 },
  solana: { flatUsd: 1, minUsd: 5 },
  ronin: { flatUsd: 3.5, minUsd: 15 },
  hyperliquid: { flatUsd: 3.5, minUsd: 15 },
  bitcoin: { flatUsd: 3, minUsd: 15 },
}

export interface WithdrawalFeeQuote {
  amountUsd: number
  flatFee: number
  percentFee: number
  totalFee: number
  netUsd: number
  minUsd: number
  belowMinimum: boolean
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function getNetworkFee(network: string): NetworkFee | undefined {
  return FEE_SCHEDULE[network]
}

export function quoteWithdrawalFee(network: string, amountUsd: number): WithdrawalFeeQuote | null {
  const fee = FEE_SCHEDULE[network]
  if (!fee) {
    return null
  }
  const percentFee = round2(amountUsd * WITHDRAWAL_PERCENT_FEE)
  const totalFee = round2(fee.flatUsd + percentFee)
  const netUsd = round2(amountUsd - totalFee)
  return {
    amountUsd,
    flatFee: fee.flatUsd,
    percentFee,
    totalFee,
    netUsd,
    minUsd: fee.minUsd,
    belowMinimum: amountUsd < fee.minUsd,
  }
}
