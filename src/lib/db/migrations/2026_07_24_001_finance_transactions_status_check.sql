-- finance_transactions.status was constrained to ('pending', 'completed',
-- 'failed', 'chargeback') with no 'processing' value, but
-- markWithdrawalTransactionsProcessing() (withdrawal-processor.ts) sets it to
-- 'processing' as the very first step of every withdrawal-processing cron
-- run. That violated this constraint and crashed withdrawal processing
-- entirely for any pending withdrawal. withdrawals_status_check was already
-- fixed to allow 'processing' (2026_07_22_002); this applies the same fix
-- here.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_status_check'
  ) THEN
    ALTER TABLE finance_transactions DROP CONSTRAINT finance_transactions_status_check;
  END IF;

  ALTER TABLE finance_transactions
    ADD CONSTRAINT finance_transactions_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'chargeback'));
END $$;
