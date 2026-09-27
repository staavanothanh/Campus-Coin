-- Keep wallet values in the exact integer range accepted by JavaScript services.
ALTER TABLE wallet_accounts
  ADD COLUMN idempotency_id BIGINT UNSIGNED NULL,
  ADD UNIQUE KEY uq_wallet_idempotency (idempotency_id),
  ADD CONSTRAINT chk_wallet_initial_safe_integer CHECK (initial_balance_vnd <= 9007199254740991),
  ADD CONSTRAINT chk_wallet_available_safe_integer CHECK (available_balance_vnd <= 9007199254740991),
  ADD CONSTRAINT fk_wallet_idempotency_owner
    FOREIGN KEY (idempotency_id, user_id)
    REFERENCES mutation_idempotency (id, user_id) ON DELETE RESTRICT;
