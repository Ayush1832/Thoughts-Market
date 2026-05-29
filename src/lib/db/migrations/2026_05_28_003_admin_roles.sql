-- ===========================================
-- admin_roles table
-- Stores granular admin roles per user
-- ===========================================

CREATE TABLE IF NOT EXISTS admin_roles
(
  id         TEXT        PRIMARY KEY DEFAULT generate_ulid(),
  user_id    TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_roles_user_role_unique UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role    ON admin_roles (role);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_admin_roles_updated_at
  BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: allow service_role full access
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_roles_service_role"
  ON admin_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
