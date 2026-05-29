-- ===========================================
-- support_tickets table
-- ===========================================

CREATE TABLE IF NOT EXISTS support_tickets
(
  id               TEXT        PRIMARY KEY DEFAULT generate_ulid(),
  user_id          TEXT        REFERENCES users (id) ON DELETE SET NULL,
  category         TEXT        NOT NULL,
  subject          TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'open',
  priority         TEXT        NOT NULL DEFAULT 'medium',
  assigned_to      TEXT        REFERENCES users (id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets (category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id  ON support_tickets (user_id);

CREATE OR REPLACE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_service_role"
  ON support_tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
