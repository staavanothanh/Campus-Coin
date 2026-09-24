-- expect-error: fk_ledger_category
-- Ledger không được trỏ tới category không tồn tại (FK RESTRICT).
INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role)
VALUES (1, 'income', 10000, 99999, '2026-09-01 00:00:00.000', 'original');