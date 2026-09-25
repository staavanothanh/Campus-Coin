-- expect-error: chk_ledger_role_shape
-- Correction (role <> original) bắt buộc có reference_id + reason.
INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role, reason, idempotency_id)
VALUES (1, 'income', 10000, 1, '2026-09-01 00:00:00.000', 'reversal', 'lý do', 7);
-- reference_id NULL → vi phạm CHECK role shape → error.
