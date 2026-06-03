-- ============================================================
-- P2P Rooms & Participants
-- ============================================================

CREATE TABLE IF NOT EXISTS rooms (
  id               TEXT        PRIMARY KEY DEFAULT generate_ulid(),
  code             TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  host_id          TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_id         TEXT        REFERENCES events (id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'open',
  max_participants INTEGER     NOT NULL DEFAULT 50,
  pot_amount       TEXT        NOT NULL DEFAULT '0',
  is_private       BOOLEAN     NOT NULL DEFAULT false,
  metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  started_at       TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_participants (
  id             TEXT        PRIMARY KEY DEFAULT generate_ulid(),
  room_id        TEXT        NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  user_id        TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role           TEXT        NOT NULL DEFAULT 'player',
  outcome_choice TEXT,
  stake_amount   TEXT        NOT NULL DEFAULT '0',
  pnl            TEXT        NOT NULL DEFAULT '0',
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at        TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_host_id    ON rooms (host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_code       ON rooms (code);
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants (room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants (user_id);

CREATE OR REPLACE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_service_role"
  ON rooms FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "room_participants_service_role"
  ON room_participants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Realtime: enable for live room updates
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
