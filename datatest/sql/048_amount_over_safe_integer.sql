-- expect-error: chk_ledger_amount_safe_integer
-- Domain/API amounts must fit exactly in the JavaScript safe-integer VND range.
INSERT INTO ledger_transactions
  (user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
VALUES
  (1, 'income', 9007199254740992, 1, '2026-09-07 00:00:00.000', 'original', 24);
