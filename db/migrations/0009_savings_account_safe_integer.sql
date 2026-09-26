-- 0009_savings_account_safe_integer.sql

ALTER TABLE savings_accounts
  ADD CONSTRAINT chk_savings_balance_safe CHECK (balance_vnd <= 9007199254740991);
