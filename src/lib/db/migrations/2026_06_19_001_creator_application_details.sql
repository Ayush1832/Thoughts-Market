-- ===========================================
-- Creator application: detailed form fields
-- Stores the full multi-section application (personal info, social media,
-- community data, Thought So activity, etc.) as a flexible JSON blob so we
-- don't need a column per field. Core fields stay as their own columns.
-- ===========================================

ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;
