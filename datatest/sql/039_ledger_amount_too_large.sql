-- expect-error: chk_ledger_amount_safe
INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role)
VALUES (1, 'income', 9007199254740992, 1, '2026-09-02 00:00:00.000', 'original');
