ALTER TABLE savings_transfers
  ADD CONSTRAINT chk_savings_transfer_amount_safe_integer CHECK (amount_vnd <= 9007199254740991);
