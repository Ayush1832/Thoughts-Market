-- ===========================================
-- Content CMS, Reels, and Social Management tables
-- ===========================================

CREATE TABLE IF NOT EXISTS content_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'article',
  status TEXT NOT NULL DEFAULT 'draft',
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts (status);
CREATE INDEX IF NOT EXISTS idx_content_posts_type ON content_posts (type);
CREATE INDEX IF NOT EXISTS idx_content_posts_author_id ON content_posts (author_id);

CREATE TABLE IF NOT EXISTS reels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reels_status ON reels (status);
CREATE INDEX IF NOT EXISTS idx_reels_type ON reels (type);
CREATE INDEX IF NOT EXISTS idx_reels_creator_id ON reels (creator_id);

CREATE TABLE IF NOT EXISTS content_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content_type ON content_reports (content_type);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports (reporter_id);

CREATE TABLE IF NOT EXISTS community_bans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_bans_user_id ON community_bans (user_id);
