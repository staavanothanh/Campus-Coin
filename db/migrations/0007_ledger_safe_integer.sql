-- 0007_ledger_safe_integer.sql

ALTER TABLE ledger_transactions
  ADD CONSTRAINT chk_ledger_amount_safe CHECK (amount_vnd <= 9007199254740991);
