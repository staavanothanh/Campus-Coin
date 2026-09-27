-- expect-error
-- User 2 không thể dùng custom category thuộc user 1 qua SQL trực tiếp.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
VALUES
  (2, 'payment', 1000, 100, '2026-09-03 00:00:00.000', 'original', 9);
