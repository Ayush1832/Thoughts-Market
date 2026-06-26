
CREATE SEQUENCE IF NOT EXISTS deposit_address_index_seq AS BIGINT START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS deposit_addresses (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  network TEXT NOT NULL DEFAULT 'polygon',
  coin TEXT NOT NULL DEFAULT 'USDC',
  rotation_index INTEGER NOT NULL DEFAULT 0,
  derivation_index BIGINT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  swept_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS deposit_addresses_address_idx ON deposit_addresses(LOWER(address));
CREATE INDEX IF NOT EXISTS deposit_addresses_user_id_idx ON deposit_addresses(user_id);
CREATE INDEX IF NOT EXISTS deposit_addresses_coin_network_idx ON deposit_addresses(coin, network);
CREATE UNIQUE INDEX IF NOT EXISTS deposit_addresses_active_unique_idx
  ON deposit_addresses(user_id, coin, network)
  WHERE is_active;

ALTER TABLE deposit_addresses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_deposit_addresses'
      AND tablename = 'deposit_addresses'
  ) THEN
    CREATE POLICY "service_role_all_deposit_addresses"
      ON deposit_addresses FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
