import type { Event, Market } from '@/types'
import { loadMarketContextSettings } from '@/lib/ai/market-context-config'
import { requestOpenRouterCompletion, sanitizeForPrompt } from '@/lib/ai/openrouter'

export interface AiRiskScore {
  manipulation_risk: number
  resolution_clarity: number
  liquidity_quality: number
  volatility: number
  credibility: number
  overall_score: number
  summary: string
}

function buildRiskPrompt(event: Event, market: Market): string {
  return `You are a prediction market risk analyst. Score this market on 5 dimensions (0-100 scale) and return ONLY valid JSON.

Event: ${sanitizeForPrompt(event.title)}
Market: ${sanitizeForPrompt(market.title ?? market.question)}
Resolution source: ${sanitizeForPrompt(market.resolution_source ?? market.resolution_source_url)}
Creator: ${sanitizeForPrompt(event.creator)}
Probability: ${market.probability != null ? `${(market.probability * 100).toFixed(1)}%` : 'unknown'}
Volume 24h: $${market.volume_24h ?? 0}
Total volume: $${market.volume ?? 0}
Status: ${market.is_resolved ? 'resolved' : 'active'}

Score each 0-100 where 100 = best/safest:
- manipulation_risk: 100 = very hard to manipulate, 0 = easy to manipulate
- resolution_clarity: 100 = crystal clear resolution criteria, 0 = very ambiguous
- liquidity_quality: 100 = deep liquid market, 0 = very illiquid
- volatility: 100 = stable price, 0 = extremely volatile
- credibility: 100 = highly credible event/creator, 0 = questionable

Return ONLY valid JSON (no markdown):
{
  "manipulation_risk": <0-100>,
  "resolution_clarity": <0-100>,
  "liquidity_quality": <0-100>,
  "volatility": <0-100>,
  "credibility": <0-100>,
  "overall_score": <0-100 weighted average>,
  "summary": "<1 sentence overall risk assessment>"
}`
}

export async function generateAiRiskScore(event: Event, market: Market): Promise<AiRiskScore> {
  const settings = await loadMarketContextSettings()
  if (!settings.apiKey) {
    throw new Error('OpenRouter API key is not configured.')
  }

  const prompt = buildRiskPrompt(event, market)

  const raw = await requestOpenRouterCompletion(
    [{ role: 'user', content: prompt }],
    { apiKey: settings.apiKey, model: settings.model, temperature: 0.3, maxTokens: 300 },
  )

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON for risk score.')
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<AiRiskScore>

  const clamp = (v: unknown) => Math.max(0, Math.min(100, Number(v) || 0))

  const manipulation_risk = clamp(parsed.manipulation_risk)
  const resolution_clarity = clamp(parsed.resolution_clarity)
  const liquidity_quality = clamp(parsed.liquidity_quality)
  const volatility = clamp(parsed.volatility)
  const credibility = clamp(parsed.credibility)
  const overall_score = parsed.overall_score
    ? clamp(parsed.overall_score)
    : Math.round((manipulation_risk + resolution_clarity + liquidity_quality + volatility + credibility) / 5)

  return {
    manipulation_risk,
    resolution_clarity,
    liquidity_quality,
    volatility,
    credibility,
    overall_score,
    summary: parsed.summary ?? '',
  }
}
