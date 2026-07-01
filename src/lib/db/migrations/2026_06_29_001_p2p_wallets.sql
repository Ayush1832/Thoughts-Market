-- ============================================================
-- P2P play-money wallet (ISOLATED ledger)
-- ------------------------------------------------------------
-- A self-contained balance used ONLY by the peer-to-peer game.
-- It is completely separate from on-chain USDC / deposit wallets
-- / trading balances — nothing here touches real funds.
--   • bet    -> stake is deducted from this balance
--   • win    -> payout is credited back to this balance
-- ============================================================

CREATE TABLE IF NOT EXISTS p2p_wallets (
  user_id    TEXT          PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  balance    NUMERIC(20,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Append-only history of every balance change (for transparency / display).
CREATE TABLE IF NOT EXISTS p2p_ledger (
  id            TEXT          PRIMARY KEY DEFAULT generate_ulid(),
  user_id       TEXT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  room_id       TEXT          REFERENCES rooms (id) ON DELETE SET NULL,
  type          TEXT          NOT NULL,           -- 'starting' | 'bet' | 'win' | 'refund'
  amount        NUMERIC(20,6) NOT NULL,           -- signed: negative for bet, positive otherwise
  balance_after NUMERIC(20,6) NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_ledger_user_id ON p2p_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ledger_room_id ON p2p_ledger (room_id);

CREATE OR REPLACE TRIGGER trg_p2p_wallets_updated_at
  BEFORE UPDATE ON p2p_wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS (server/service-role only, same as the rest of the app)
ALTER TABLE p2p_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_ledger  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2p_wallets_service_role"
  ON p2p_wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "p2p_ledger_service_role"
  ON p2p_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
