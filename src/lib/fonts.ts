import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'

// Kept for compatibility; no longer the primary sans.
export const openSauceOne = localFont({
  src: [
    { path: '../../public/fonts/open-sauce-one-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/open-sauce-one-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/open-sauce-one-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/open-sauce-one-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-open-sauce',
})

// Prototype design system fonts.
export const fontSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
})

export const fontDisplay = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
})

export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
})

// Convenience: every font variable in one className for <html>.
export const fontVariables = [
  fontSans.variable,
  fontDisplay.variable,
  fontMono.variable,
  openSauceOne.variable,
].join(' ')
