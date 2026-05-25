import type { Event, Market } from '@/types'
import { randomUUID } from 'node:crypto'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { requestOpenRouterCompletion, sanitizeForPrompt } from '@/lib/ai/openrouter'

export interface AiMarketAlert {
  id: string
  alert_type: 'anomaly' | 'fake_hype' | 'news_spike' | 'sentiment_shift' | 'risk_exposure' | 'manipulation'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  metadata: Record<string, unknown>
}

function buildAlertPrompt(event: Event, markets: Market[]): string {
  const marketList = markets.slice(0, 5).map(m =>
    `  - "${m.title ?? m.question}": prob=${m.probability != null ? `${(m.probability * 100).toFixed(1)}%` : '?'}, vol24h=$${m.volume_24h ?? 0}`,
  ).join('\n')

  return `You are an AI market monitoring assistant. Analyze this prediction market event for anomalies, risks and notable patterns. Return ONLY a valid JSON array of alerts (can be empty []).

Event: ${sanitizeForPrompt(event.title)}
Category: ${sanitizeForPrompt(event.main_tag)}
Status: ${event.status}
Markets:\n${marketList}

Alert types to check:
- anomaly: unusual price/volume behavior
- fake_hype: artificially inflated interest
- news_spike: sudden probability move from news
- sentiment_shift: crowd sentiment changing rapidly
- risk_exposure: traders taking outsized positions
- manipulation: potential market manipulation signals

Return ONLY valid JSON array (empty array if no alerts, no markdown):
[
  {
    "alert_type": "<one of the types above>",
    "severity": "<low|medium|high>",
    "title": "<short alert title>",
    "description": "<1-2 sentence description of the alert>"
  }
]`
}

export async function generateAiMarketAlerts(
  event: Event,
  markets: Market[],
): Promise<AiMarketAlert[]> {
  const settings = await loadMarketContextSettings()
  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is not configured.')
  }

  const prompt = buildAlertPrompt(event, markets)

  const raw = await requestOpenRouterCompletion(
    [{ role: 'user', content: prompt }],
    { apiKey: settings.apiKey, model: settings.model, temperature: 0.4, maxTokens: 500 },
  )

  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return []
  }

  const parsed = JSON.parse(jsonMatch[0]) as Array<Partial<AiMarketAlert>>

  const validTypes = new Set(['anomaly', 'fake_hype', 'news_spike', 'sentiment_shift', 'risk_exposure', 'manipulation'])
  const validSeverities = new Set(['low', 'medium', 'high'])

  return parsed
    .filter(a => a.alert_type && validTypes.has(a.alert_type) && a.title && a.description)
    .slice(0, 5)
    .map(a => ({
      id: randomUUID(),
      alert_type: a.alert_type as AiMarketAlert['alert_type'],
      severity: validSeverities.has(a.severity ?? '') ? a.severity as AiMarketAlert['severity'] : 'low',
      title: a.title ?? '',
      description: a.description ?? '',
      metadata: {},
    }))
}
