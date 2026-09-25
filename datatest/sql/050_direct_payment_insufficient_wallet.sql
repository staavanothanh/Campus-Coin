-- expect-error
-- Direct SQL cannot create a payment that would make the wallet negative.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
VALUES
  (1, 'payment', 999999999, 5, '2026-09-08 00:00:00.000', 'original', 25);
