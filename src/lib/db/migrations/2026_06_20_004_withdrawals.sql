CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  amount NUMERIC(38, 18) NOT NULL,
  dest_network TEXT NOT NULL DEFAULT 'polygon',
  dest_coin TEXT NOT NULL,
  to_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON withdrawals(status);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_withdrawals'
      AND tablename = 'withdrawals'
  ) THEN
    CREATE POLICY "service_role_all_withdrawals"
      ON withdrawals FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
