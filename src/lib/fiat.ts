// Lightweight fiat-currency support for the wallet "Display Crypto in Fiat"
// setting. Balances settle in USDC (~USD), so conversion is USD -> selected fiat.
//
// NOTE: rates are static approximations so the feature works offline with no API
// key. Swap `rate` for a live FX feed if real-time accuracy is required.

export interface FiatCurrency {
  code: string // ISO 4217, e.g. USD
  symbol: string // display symbol
  country: string // ISO country (for the flag/label chip)
  name: string
  rate: number // units of this currency per 1 USD
}

export const FIAT_CURRENCIES: FiatCurrency[] = [
  { code: 'USD', symbol: '$', country: 'US', name: 'US Dollar', rate: 1 },
  { code: 'EUR', symbol: '€', country: 'EU', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', country: 'GB', name: 'British Pound', rate: 0.79 },
  { code: 'JPY', symbol: '¥', country: 'JP', name: 'Japanese Yen', rate: 157 },
  { code: 'INR', symbol: '₹', country: 'IN', name: 'Indian Rupee', rate: 83.3 },
  { code: 'CAD', symbol: 'C$', country: 'CA', name: 'Canadian Dollar', rate: 1.37 },
  { code: 'CNY', symbol: '¥', country: 'CN', name: 'Chinese Yuan', rate: 7.25 },
  { code: 'AED', symbol: 'د.إ', country: 'AE', name: 'UAE Dirham', rate: 3.67 },
  { code: 'AUD', symbol: 'A$', country: 'AU', name: 'Australian Dollar', rate: 1.52 },
  { code: 'CHF', symbol: 'Fr', country: 'CH', name: 'Swiss Franc', rate: 0.89 },
  { code: 'SGD', symbol: 'S$', country: 'SG', name: 'Singapore Dollar', rate: 1.35 },
  { code: 'HKD', symbol: 'HK$', country: 'HK', name: 'Hong Kong Dollar', rate: 7.81 },
  { code: 'BRL', symbol: 'R$', country: 'BR', name: 'Brazilian Real', rate: 5.1 },
  { code: 'KRW', symbol: '₩', country: 'KR', name: 'South Korean Won', rate: 1380 },
  { code: 'MXN', symbol: 'Mex$', country: 'MX', name: 'Mexican Peso', rate: 17.1 },
  { code: 'ZAR', symbol: 'R', country: 'ZA', name: 'South African Rand', rate: 18.2 },
  { code: 'NGN', symbol: '₦', country: 'NG', name: 'Nigerian Naira', rate: 1500 },
  { code: 'RUB', symbol: '₽', country: 'RU', name: 'Russian Ruble', rate: 90 },
  { code: 'TRY', symbol: '₺', country: 'TR', name: 'Turkish Lira', rate: 32.2 },
  { code: 'SAR', symbol: '﷼', country: 'SA', name: 'Saudi Riyal', rate: 3.75 },
]

export function getFiatCurrency(code: string): FiatCurrency {
  return FIAT_CURRENCIES.find(c => c.code === code) ?? FIAT_CURRENCIES[0]
}

/**
 * Format a USD amount into the selected fiat currency.
 * Pass `overrideRate` (units of `code` per 1 USD) to use a live FX rate; falls
 * back to the static approximation when no valid live rate is provided.
 */
export function formatFiat(usdAmount: number, code: string, overrideRate?: number): string {
  const currency = getFiatCurrency(code)
  const rate = typeof overrideRate === 'number' && overrideRate > 0 ? overrideRate : currency.rate
  const value = usdAmount * rate
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value)
  }
  catch {
    return `${currency.symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  }
}
