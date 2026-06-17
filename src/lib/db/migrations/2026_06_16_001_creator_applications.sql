-- Creator Applications table for Creators Corner
CREATE TABLE IF NOT EXISTS creator_applications (
  id text PRIMARY KEY DEFAULT generate_ulid(),
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  username text NOT NULL,
  niche text NOT NULL,
  social_link text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'verified')),
  is_active boolean NOT NULL DEFAULT true,
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS creator_applications_username_idx
  ON creator_applications (username);

ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_creator_applications"
  ON creator_applications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE creator_applications;
