CREATE TABLE IF NOT EXISTS user_balances (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USDC',
  available NUMERIC(38, 18) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_balances_user_currency_idx ON user_balances(user_id, currency);

ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_user_balances'
      AND tablename = 'user_balances'
  ) THEN
    CREATE POLICY "service_role_all_user_balances"
      ON user_balances FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USDC',
  amount NUMERIC(38, 18) NOT NULL,
  balance_after NUMERIC(38, 18) NOT NULL,
  type TEXT NOT NULL,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_entries_user_id_idx ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS ledger_entries_type_idx ON ledger_entries(type);
CREATE INDEX IF NOT EXISTS ledger_entries_created_at_idx ON ledger_entries(created_at DESC);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_ledger_entries'
      AND tablename = 'ledger_entries'
  ) THEN
    CREATE POLICY "service_role_all_ledger_entries"
      ON ledger_entries FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
