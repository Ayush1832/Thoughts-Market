-- Guard against a typo'd status string silently creating a stuck withdrawal row
-- (the column was previously free-text with no constraint at all).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_status_check'
  ) THEN
    ALTER TABLE withdrawals
      ADD CONSTRAINT withdrawals_status_check
      CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;
