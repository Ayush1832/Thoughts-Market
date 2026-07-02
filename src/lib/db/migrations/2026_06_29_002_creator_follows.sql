-- ============================================================
-- Creator follows (Creators Corner)
-- ------------------------------------------------------------
-- Persists which creators a user follows so the "Follow" state
-- survives a page refresh.
-- ============================================================

CREATE TABLE IF NOT EXISTS creator_follows (
  follower_id TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  creator_id  TEXT        NOT NULL REFERENCES creator_applications (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_follows_follower ON creator_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_creator_follows_creator  ON creator_follows (creator_id);

ALTER TABLE creator_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_follows_service_role"
  ON creator_follows FOR ALL TO service_role USING (true) WITH CHECK (true);
