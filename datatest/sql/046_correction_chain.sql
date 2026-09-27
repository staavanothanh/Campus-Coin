-- expect-error
-- A correction cannot target a row that is itself a correction.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, reason, idempotency_id)
VALUES
  (1, 'payment', 1, 5, '2026-09-06 00:00:00.000', 'reversal', 3, 'correction-chain probe', 14);
