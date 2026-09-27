ALTER TABLE savings_transfers
  ADD UNIQUE KEY uq_savings_transfer_idempotency (idempotency_id),
  ADD CONSTRAINT fk_savings_transfer_idempotency_owner
    FOREIGN KEY (idempotency_id, user_id)
    REFERENCES mutation_idempotency (id, user_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_savings_transfer_wallet_owner
    FOREIGN KEY (user_id) REFERENCES wallet_accounts (user_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_savings_transfer_savings_owner
    FOREIGN KEY (user_id) REFERENCES savings_accounts (user_id) ON DELETE RESTRICT,
  DROP FOREIGN KEY fk_savings_transfers_idempotency;
