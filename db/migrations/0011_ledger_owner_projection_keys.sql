ALTER TABLE ledger_transactions
  ADD CONSTRAINT chk_ledger_amount_safe_integer CHECK (amount_vnd <= 9007199254740991),
  ADD COLUMN reference_target_role ENUM('original', 'reversal', 'adjustment', 'replacement')
    NOT NULL DEFAULT 'original',
  ADD COLUMN wallet_delta_vnd BIGINT NULL,
  ADD UNIQUE KEY uq_ledger_id_user (id, user_id),
  ADD UNIQUE KEY uq_ledger_id_user_role (id, user_id, role),
  ADD UNIQUE KEY uq_ledger_id_user_role_type (id, user_id, role, type),
  ADD UNIQUE KEY uq_ledger_user_reference (user_id, reference_id),
  ADD UNIQUE KEY uq_ledger_idempotency (idempotency_id),
  ADD CONSTRAINT chk_ledger_reference_target_role CHECK (reference_target_role = 'original'),
  ADD CONSTRAINT fk_ledger_reference_owner_role
    FOREIGN KEY (reference_id, user_id, reference_target_role, type)
    REFERENCES ledger_transactions (id, user_id, role, type) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ledger_idempotency_owner
    FOREIGN KEY (idempotency_id, user_id)
    REFERENCES mutation_idempotency (id, user_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ledger_wallet_owner
    FOREIGN KEY (user_id) REFERENCES wallet_accounts (user_id) ON DELETE RESTRICT,
  DROP FOREIGN KEY fk_ledger_reference,
  DROP FOREIGN KEY fk_ledger_idempotency;
