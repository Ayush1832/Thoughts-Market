import type { Event, Market } from '@/types'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { requestOpenRouterCompletion, sanitizeForPrompt } from '@/lib/ai/openrouter'

export interface AiInsights {
  summary: string
  probability_explanation: string
  risk_warning: string
  entry_timing: string
  crowd_psychology: string
}

function buildInsightsPrompt(event: Event, market: Market, locale: string): string {
  const outcomes = (market.outcomes ?? [])
    .map(o => `  - ${o.outcome_text}: buy ${o.buy_price ?? '?'}¢ / sell ${o.sell_price ?? '?'}¢`)
    .join('\n')

  const localeNote = locale !== 'en' ? `\nRespond in language: ${locale}.` : ''

  return `You are an expert prediction market analyst. Analyze this market and return a JSON object with exactly these 5 keys:

Event: ${sanitizeForPrompt(event.title)}
Market: ${sanitizeForPrompt(market.title ?? market.question)}
Probability: ${market.probability != null ? `${(market.probability * 100).toFixed(1)}%` : 'unknown'}
Volume 24h: $${market.volume_24h ?? 0}
Total Volume: $${market.volume ?? 0}
Outcomes:\n${outcomes || '  Not available'}
${localeNote}

Return ONLY valid JSON (no markdown, no explanation):
{
  "summary": "2-3 sentence market summary covering key dynamics and current positioning",
  "probability_explanation": "1-2 sentences explaining what the current probability implies and why",
  "risk_warning": "1-2 sentences on the biggest risk factor for traders in this market",
  "entry_timing": "1-2 sentences on smart entry timing — when to act and when to wait",
  "crowd_psychology": "1-2 sentences on crowd behavior and sentiment patterns visible in this market"
}`
}

export async function generateAiInsights(
  event: Event,
  market: Market,
  locale = 'en',
): Promise<AiInsights> {
  const settings = await loadMarketContextSettings()
  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is not configured.')
  }

  const prompt = buildInsightsPrompt(event, market, locale)

  const raw = await requestOpenRouterCompletion(
    [{ role: 'user', content: prompt }],
    { apiKey: settings.apiKey, model: settings.model, temperature: 0.5, maxTokens: 800 },
  )

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON for insights.')
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<AiInsights>

  return {
    summary: parsed.summary ?? '',
    probability_explanation: parsed.probability_explanation ?? '',
    risk_warning: parsed.risk_warning ?? '',
    entry_timing: parsed.entry_timing ?? '',
    crowd_psychology: parsed.crowd_psychology ?? '',
  }
}
