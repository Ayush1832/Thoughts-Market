ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS withdrawal_id TEXT REFERENCES withdrawals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS finance_transactions_withdrawal_id_idx ON finance_transactions(withdrawal_id);
