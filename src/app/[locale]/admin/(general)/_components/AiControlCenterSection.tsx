'use client'

import { useExtracted } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import SettingsAccordionSection from './SettingsAccordionSection'

interface AiControlCenterSectionProps {
  isPending: boolean
  openSections: string[]
  onToggleSection: (value: string) => void
  aiMarketAssistantEnabled: boolean
  onAiMarketAssistantEnabledChange: (value: boolean) => void
  aiInsightsEnabled: boolean
  onAiInsightsEnabledChange: (value: boolean) => void
  aiRiskEngineEnabled: boolean
  onAiRiskEngineEnabledChange: (value: boolean) => void
  aiUserProfilingEnabled: boolean
  onAiUserProfilingEnabledChange: (value: boolean) => void
}

interface FeatureRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}

function FeatureRow({ id, label, description, checked, disabled, onCheckedChange }: FeatureRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}

function AiControlCenterSection({
  isPending,
  openSections,
  onToggleSection,
  aiMarketAssistantEnabled,
  onAiMarketAssistantEnabledChange,
  aiInsightsEnabled,
  onAiInsightsEnabledChange,
  aiRiskEngineEnabled,
  onAiRiskEngineEnabledChange,
  aiUserProfilingEnabled,
  onAiUserProfilingEnabledChange,
}: AiControlCenterSectionProps) {
  const t = useExtracted()

  return (
    <SettingsAccordionSection
      value="ai-control-center"
      isOpen={openSections.includes('ai-control-center')}
      onToggle={onToggleSection}
      header={<h3 className="text-base font-medium">{t('AI Control Center')}</h3>}
    >
      <div className="grid gap-6">

        <div className="grid gap-3">
          <div className="grid gap-1">
            <h4 className="text-sm font-medium">{t('AI Market Assistant')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('Monitors markets for anomalies, fake hype, news spikes, sentiment shifts, risk exposure, and manipulation.')}
            </p>
          </div>
          <FeatureRow
            id="ai-market-assistant-enabled"
            label={t('Enable AI Market Assistant')}
            description={t('Detects market anomalies, fake hype, news spikes, sentiment, risk exposure and manipulation in real time.')}
            checked={aiMarketAssistantEnabled}
            disabled={isPending}
            onCheckedChange={onAiMarketAssistantEnabledChange}
          />
          <input
            type="hidden"
            name="ai_market_assistant_enabled"
            value={aiMarketAssistantEnabled ? 'true' : 'false'}
          />
        </div>

        <div className="grid gap-3 border-t border-border/50 pt-6">
          <div className="grid gap-1">
            <h4 className="text-sm font-medium">{t('AI-Generated Insights')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('Auto-generates market summaries, probability explanations, risk warnings, smart entry timing, and crowd psychology analysis.')}
            </p>
          </div>
          <FeatureRow
            id="ai-insights-enabled"
            label={t('Enable AI-Generated Insights')}
            description={t('Automatically generates market summaries, probability explanations, risk warnings, smart entry timing and crowd psychology.')}
            checked={aiInsightsEnabled}
            disabled={isPending}
            onCheckedChange={onAiInsightsEnabledChange}
          />
          <input
            type="hidden"
            name="ai_insights_enabled"
            value={aiInsightsEnabled ? 'true' : 'false'}
          />
        </div>

        <div className="grid gap-3 border-t border-border/50 pt-6">
          <div className="grid gap-1">
            <h4 className="text-sm font-medium">{t('AI Risk Engine')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('Scores each market on manipulation risk, resolution clarity, liquidity quality, volatility, and credibility.')}
            </p>
          </div>
          <FeatureRow
            id="ai-risk-engine-enabled"
            label={t('Enable AI Risk Engine')}
            description={t('Scores markets on manipulation risk, resolution clarity, liquidity quality, volatility and credibility.')}
            checked={aiRiskEngineEnabled}
            disabled={isPending}
            onCheckedChange={onAiRiskEngineEnabledChange}
          />
          <input
            type="hidden"
            name="ai_risk_engine_enabled"
            value={aiRiskEngineEnabled ? 'true' : 'false'}
          />
        </div>

        <div className="grid gap-3 border-t border-border/50 pt-6">
          <div className="grid gap-1">
            <h4 className="text-sm font-medium">{t('AI User Profiling')}</h4>
            <p className="text-xs text-muted-foreground">
              {t('Behavioral trading intelligence — not personal profiling. Analyzes trading patterns to improve market recommendations.')}
            </p>
          </div>
          <FeatureRow
            id="ai-user-profiling-enabled"
            label={t('Enable AI User Profiling')}
            description={t('Behavioral trading intelligence based on trading patterns. Does not collect personal data.')}
            checked={aiUserProfilingEnabled}
            disabled={isPending}
            onCheckedChange={onAiUserProfilingEnabledChange}
          />
          <input
            type="hidden"
            name="ai_user_profiling_enabled"
            value={aiUserProfilingEnabled ? 'true' : 'false'}
          />
        </div>

      </div>
    </SettingsAccordionSection>
  )
}

export default AiControlCenterSection
