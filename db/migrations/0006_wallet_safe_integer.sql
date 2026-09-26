-- 0006_wallet_safe_integer.sql
-- Wallet values are exposed as JSON numbers and must remain exact in JavaScript.

ALTER TABLE wallet_accounts
  ADD CONSTRAINT chk_wallet_initial_safe CHECK (initial_balance_vnd <= 9007199254740991),
  ADD CONSTRAINT chk_wallet_available_safe CHECK (available_balance_vnd <= 9007199254740991);
