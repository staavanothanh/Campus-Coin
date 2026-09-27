-- expect-error
-- User 2 không thể tạo budget trên custom category thuộc user 1.
INSERT INTO budgets (user_id, category_id, month, limit_vnd, idempotency_id)
VALUES (2, 100, '2026-09', 10000, 21);
