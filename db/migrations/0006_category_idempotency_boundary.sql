ALTER TABLE categories
  ADD COLUMN idempotency_id BIGINT UNSIGNED NULL,
  ADD UNIQUE KEY uq_categories_idempotency (idempotency_id),
  ADD CONSTRAINT fk_categories_idempotency_owner
    FOREIGN KEY (idempotency_id, user_id)
    REFERENCES mutation_idempotency (id, user_id) ON DELETE RESTRICT;
