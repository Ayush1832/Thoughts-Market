CREATE TABLE IF NOT EXISTS treasury_payouts (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  from_network TEXT NOT NULL,
  from_coin TEXT NOT NULL,
  amount NUMERIC(38, 18) NOT NULL,
  to_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  triggered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS treasury_payouts_created_at_idx ON treasury_payouts(created_at DESC);

ALTER TABLE treasury_payouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_treasury_payouts'
      AND tablename = 'treasury_payouts'
  ) THEN
    CREATE POLICY "service_role_all_treasury_payouts"
      ON treasury_payouts FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
