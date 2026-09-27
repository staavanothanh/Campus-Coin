-- expect-error
-- A payment category cannot be assigned to an income row through direct SQL.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
VALUES
  (1, 'income', 1000, 5, '2026-09-05 00:00:00.000', 'original', 13);
