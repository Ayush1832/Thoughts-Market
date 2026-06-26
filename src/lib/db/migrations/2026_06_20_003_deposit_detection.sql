CREATE TABLE IF NOT EXISTS deposit_events (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_address_id TEXT NOT NULL REFERENCES deposit_addresses(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'polygon',
  amount NUMERIC(38, 18) NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS deposit_events_tx_log_idx ON deposit_events(tx_hash, log_index);
CREATE INDEX IF NOT EXISTS deposit_events_user_id_idx ON deposit_events(user_id);

ALTER TABLE deposit_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_deposit_events'
      AND tablename = 'deposit_events'
  ) THEN
    CREATE POLICY "service_role_all_deposit_events"
      ON deposit_events FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS deposit_scan_state (
  key TEXT PRIMARY KEY,
  last_block BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deposit_scan_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_deposit_scan_state'
      AND tablename = 'deposit_scan_state'
  ) THEN
    CREATE POLICY "service_role_all_deposit_scan_state"
      ON deposit_scan_state FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
