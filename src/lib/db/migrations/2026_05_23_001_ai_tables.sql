-- ===========================================
-- AI feature tables: insights, risk scores, alerts
-- ===========================================

CREATE TABLE IF NOT EXISTS ai_event_insights (
  event_id TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  summary TEXT NOT NULL DEFAULT '',
  probability_explanation TEXT NOT NULL DEFAULT '',
  risk_warning TEXT NOT NULL DEFAULT '',
  entry_timing TEXT NOT NULL DEFAULT '',
  crowd_psychology TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_event_insights_event_locale ON ai_event_insights (event_id, locale);
CREATE INDEX IF NOT EXISTS idx_ai_event_insights_event_id ON ai_event_insights (event_id);

ALTER TABLE ai_event_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_ai_event_insights' AND tablename = 'ai_event_insights'
  ) THEN
    CREATE POLICY "service_role_all_ai_event_insights"
      ON ai_event_insights FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_risk_scores (
  condition_id TEXT PRIMARY KEY,
  manipulation_risk REAL NOT NULL DEFAULT 0,
  resolution_clarity REAL NOT NULL DEFAULT 0,
  liquidity_quality REAL NOT NULL DEFAULT 0,
  volatility REAL NOT NULL DEFAULT 0,
  credibility REAL NOT NULL DEFAULT 0,
  overall_score REAL NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_risk_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_ai_risk_scores' AND tablename = 'ai_risk_scores'
  ) THEN
    CREATE POLICY "service_role_all_ai_risk_scores"
      ON ai_risk_scores FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_market_alerts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_market_alerts_event_id ON ai_market_alerts (event_id);
CREATE INDEX IF NOT EXISTS idx_ai_market_alerts_type ON ai_market_alerts (alert_type);

ALTER TABLE ai_market_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_ai_market_alerts' AND tablename = 'ai_market_alerts'
  ) THEN
    CREATE POLICY "service_role_all_ai_market_alerts"
      ON ai_market_alerts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
