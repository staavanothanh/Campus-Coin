-- expect-error: uq_ledger_user_reference
-- Mỗi original chỉ có tối đa một correction.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason, idempotency_id)
VALUES
  (1, 'payment', 1, 5, '2026-09-04 00:00:00.000', 'reversal', 2, 'duplicate correction probe', 12);
