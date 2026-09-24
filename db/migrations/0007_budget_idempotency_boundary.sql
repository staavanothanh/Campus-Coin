ALTER TABLE budgets
  ADD COLUMN idempotency_id BIGINT UNSIGNED NULL,
  ADD UNIQUE KEY uq_budgets_idempotency (idempotency_id),
  ADD CONSTRAINT chk_budgets_limit_safe_integer CHECK (limit_vnd <= 9007199254740991),
  ADD CONSTRAINT fk_budgets_idempotency_owner
    FOREIGN KEY (idempotency_id, user_id)
    REFERENCES mutation_idempotency (id, user_id) ON DELETE RESTRICT;
