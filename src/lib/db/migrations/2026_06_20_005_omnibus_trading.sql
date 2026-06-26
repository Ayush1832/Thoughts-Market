CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  shares NUMERIC(38, 6) NOT NULL DEFAULT 0,
  avg_price_cents NUMERIC(10, 4) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(38, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS positions_user_token_idx ON positions(user_id, token_id);
CREATE INDEX IF NOT EXISTS positions_user_id_idx ON positions(user_id);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_positions' AND tablename = 'positions'
  ) THEN
    CREATE POLICY "service_role_all_positions"
      ON positions FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS omnibus_orders (
  id TEXT PRIMARY KEY DEFAULT generate_ulid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clob_order_id TEXT UNIQUE,
  condition_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  shares NUMERIC(38, 6) NOT NULL DEFAULT 0,
  price_cents NUMERIC(10, 4) NOT NULL DEFAULT 0,
  reserved_amount NUMERIC(38, 6) NOT NULL DEFAULT 0,
  filled_shares NUMERIC(38, 6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  currency TEXT NOT NULL DEFAULT 'USDC',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS omnibus_orders_user_id_idx ON omnibus_orders(user_id);
CREATE INDEX IF NOT EXISTS omnibus_orders_status_idx ON omnibus_orders(status);

ALTER TABLE omnibus_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'service_role_all_omnibus_orders' AND tablename = 'omnibus_orders'
  ) THEN
    CREATE POLICY "service_role_all_omnibus_orders"
      ON omnibus_orders FOR ALL TO service_role
      USING (TRUE) WITH CHECK (TRUE);
  END IF;
END $$;
