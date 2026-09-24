-- expect-error: chk_ledger_amount_positive
-- Amount phải là số nguyên dương; 0 bị CHECK chặn.
INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role)
VALUES (1, 'income', 0, 1, '2026-09-01 00:00:00.000', 'original');