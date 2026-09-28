-- Product names are stored separately from the free-form description.
-- Existing immutable ledger rows remain valid; their item_name stays NULL.
ALTER TABLE ledger_transactions
  ADD COLUMN item_name VARCHAR(120) NULL AFTER description,
  ADD KEY idx_ledger_user_item_history (user_id, type, item_name, occurred_at, id),
  ADD CONSTRAINT chk_ledger_item_name_nonempty
    CHECK (item_name IS NULL OR (item_name <> '' AND item_name = TRIM(item_name)));
