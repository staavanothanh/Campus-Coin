ALTER TABLE issues
  ADD CONSTRAINT fk_issues_transaction_owner
    FOREIGN KEY (related_transaction_id, user_id)
    REFERENCES ledger_transactions (id, user_id) ON DELETE RESTRICT,
  DROP FOREIGN KEY fk_issues_transaction;
