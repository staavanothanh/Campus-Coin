-- expect-error: append-only
-- Ledger đã commit không được DELETE (trigger chặn).
DELETE FROM ledger_transactions WHERE id = 1;