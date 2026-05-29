-- Finance transactions: track deposits, withdrawals, settlements
CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'settlement', 'refund')),
  amount NUMERIC(20, 6) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'chargeback')),
  method TEXT NOT NULL DEFAULT 'Crypto Wallet',
  tx_hash TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS finance_transactions_user_id_idx ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS finance_transactions_type_idx ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS finance_transactions_status_idx ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS finance_transactions_created_at_idx ON finance_transactions(created_at DESC);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_finance_transactions'
      AND tablename = 'finance_transactions'
  ) THEN
    CREATE POLICY "service_role_all_finance_transactions"
      ON finance_transactions FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- Fee configuration table
CREATE TABLE IF NOT EXISTS finance_fee_configs (
  id SERIAL PRIMARY KEY,
  fee_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('trading', 'withdrawal', 'creator', 'liquidity', 'referral')),
  rate_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  previous_rate_percent NUMERIC(10, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived')),
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_fee_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_finance_fee_configs'
      AND tablename = 'finance_fee_configs'
  ) THEN
    CREATE POLICY "service_role_all_finance_fee_configs"
      ON finance_fee_configs FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- Seed default fee configs
INSERT INTO finance_fee_configs (fee_key, name, description, category, rate_percent, previous_rate_percent, status)
VALUES
  ('trading_maker', 'Trading Fee (Maker)', 'Fee charged for market makers', 'trading', 0.10, 0.15, 'active'),
  ('trading_taker', 'Trading Fee (Taker)', 'Fee charged for market takers', 'trading', 0.25, 0.20, 'active'),
  ('withdrawal',    'Withdrawal Fee',      'Fixed fee for withdrawals',     'withdrawal', 1.50, 1.00, 'active'),
  ('creator',       'Creator Fee',         'Revenue share for market creators', 'creator', 2.00, 2.00, 'active'),
  ('liquidity',     'Liquidity Provider Rewards', 'Rewards for providing liquidity', 'liquidity', 0.50, 0.50, 'active'),
  ('referral',      'Referral Commission', 'Commission paid to referrers',   'referral', 10.00, 8.00, 'pending')
ON CONFLICT (fee_key) DO NOTHING;

-- Alert monitoring config
CREATE TABLE IF NOT EXISTS finance_alert_configs (
  id SERIAL PRIMARY KEY,
  alert_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  threshold TEXT NOT NULL DEFAULT '0',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_alert_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_finance_alert_configs'
      AND tablename = 'finance_alert_configs'
  ) THEN
    CREATE POLICY "service_role_all_finance_alert_configs"
      ON finance_alert_configs FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

-- Seed default alert configs
INSERT INTO finance_alert_configs (alert_key, name, description, threshold, severity, is_enabled, recipients)
VALUES
  ('low_liquidity',       'Low Liquidity Alert',     'Triggered when market liquidity falls below threshold',    '$500,000', 'high',   TRUE, ARRAY['finance@admin.com', 'ops@admin.com']),
  ('high_payout',         'High Payout Exposure',    'Triggered when open payouts exceed 85% of limit',         '85%',      'high',   TRUE, ARRAY['finance@admin.com', 'risk@admin.com']),
  ('whale_dominance',     'Whale Dominance',         'Triggered when single user exceeds 10% of liquidity',     '10%',      'medium', TRUE, ARRAY['ops@admin.com']),
  ('treasury_imbalance',  'Treasury Imbalance',      'Triggered when reserves fall below 90% of target',        '90%',      'medium', TRUE, ARRAY['finance@admin.com']),
  ('withdrawal_spike',    'Unusual Withdrawals',     'Triggered when withdrawal volume exceeds 200% of average','200%',     'medium', TRUE, ARRAY['ops@admin.com', 'compliance@admin.com'])
ON CONFLICT (alert_key) DO NOTHING;

-- Alert events: individual triggered alert instances
CREATE TABLE IF NOT EXISTS finance_alert_events (
  id SERIAL PRIMARY KEY,
  config_id INTEGER REFERENCES finance_alert_configs(id) ON DELETE SET NULL,
  alert_key TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  threshold TEXT,
  current_value TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
  metadata JSONB NOT NULL DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS finance_alert_events_status_idx ON finance_alert_events(status);
CREATE INDEX IF NOT EXISTS finance_alert_events_triggered_at_idx ON finance_alert_events(triggered_at DESC);

ALTER TABLE finance_alert_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_finance_alert_events'
      AND tablename = 'finance_alert_events'
  ) THEN
    CREATE POLICY "service_role_all_finance_alert_events"
      ON finance_alert_events FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
