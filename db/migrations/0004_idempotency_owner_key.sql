ALTER TABLE mutation_idempotency
  ADD UNIQUE KEY uq_idempotency_id_user (id, user_id);
