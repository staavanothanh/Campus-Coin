-- 0010_savings_transfer_safe_integer.sql

ALTER TABLE savings_transfers
  ADD CONSTRAINT chk_savings_transfer_amount_safe CHECK (amount_vnd <= 9007199254740991);
