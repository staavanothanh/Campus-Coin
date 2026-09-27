-- The new unique owner/reference key replaces this non-unique query index.
ALTER TABLE ledger_transactions
  DROP INDEX idx_ledger_user_reference;
