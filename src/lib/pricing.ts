import 'server-only'

const STABLES = new Set(['USDC', 'USDT'])

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  POL: 'matic-network',
  BNB: 'binancecoin',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  SAND: 'the-sandbox',
  IMX: 'immutable-x',
  RLB: 'rollbit-coin',
  RON: 'ronin',
  HYPE: 'hyperliquid',
  TRX: 'tron',
  SOL: 'solana',
  BTC: 'bitcoin',
}

const CACHE_TTL_MS = 60_000

interface CacheEntry {
  price: number
  at: number
}

const priceCache = new Map<string, CacheEntry>()

function readCache(coin: string): number | null {
  const entry = priceCache.get(coin)
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) {
    return entry.price
  }
  return null
}

async function fetchFromCoinGecko(ids: string[]): Promise<Record<string, number>> {
  const apiKey = process.env.PRICE_API_KEY?.trim()
  const query = `ids=${ids.join(',')}&vs_currencies=usd`
  const url = `https://api.coingecko.com/api/v3/simple/price?${query}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    throw new Error(`Price API error ${response.status}`)
  }

  const payload = await response.json() as Record<string, { usd?: number }>
  const prices: Record<string, number> = {}
  for (const [id, value] of Object.entries(payload)) {
    if (typeof value.usd === 'number') {
      prices[id] = value.usd
    }
  }
  return prices
}

export function isStable(coin: string): boolean {
  return STABLES.has(coin.toUpperCase())
}

export async function getUsdPrices(coins: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  const idToCoin: Record<string, string> = {}

  for (const raw of coins) {
    const coin = raw.toUpperCase()
    if (result[coin] !== undefined) {
      continue
    }
    if (STABLES.has(coin)) {
      result[coin] = 1
      continue
    }
    const cachedPrice = readCache(coin)
    if (cachedPrice !== null) {
      result[coin] = cachedPrice
      continue
    }
    const id = COINGECKO_IDS[coin]
    if (!id) {
      throw new Error(`No price mapping for ${coin}`)
    }
    idToCoin[id] = coin
  }

  const ids = Object.keys(idToCoin)
  if (ids.length > 0) {
    const prices = await fetchFromCoinGecko(ids)
    for (const [id, coin] of Object.entries(idToCoin)) {
      const price = prices[id]
      if (typeof price !== 'number' || price <= 0) {
        throw new Error(`No price available for ${coin}`)
      }
      result[coin] = price
      priceCache.set(coin, { price, at: Date.now() })
    }
  }

  return result
}

export async function getUsdPrice(coin: string): Promise<number> {
  const prices = await getUsdPrices([coin])
  return prices[coin.toUpperCase()]!
}
