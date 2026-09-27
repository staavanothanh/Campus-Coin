-- expect-error: append-only
-- Ledger đã commit không được UPDATE (trigger chặn).
UPDATE ledger_transactions SET amount_vnd = 1 WHERE id = 1;