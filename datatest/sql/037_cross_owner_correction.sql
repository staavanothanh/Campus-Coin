-- expect-error
-- User 2 không thể tham chiếu ledger row của user 1, kể cả target là original.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason, idempotency_id)
VALUES
  (2, 'income', 100000, 1, '2026-09-03 00:00:00.000', 'reversal', 1, 'cross-owner probe', 10);
