ALTER TABLE savings_accounts
  ADD CONSTRAINT chk_savings_balance_safe_integer CHECK (balance_vnd <= 9007199254740991);
