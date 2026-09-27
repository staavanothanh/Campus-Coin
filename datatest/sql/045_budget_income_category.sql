-- expect-error
-- A budget must reference a payment category, not an income category.
INSERT INTO budgets (user_id, category_id, month, limit_vnd, idempotency_id)
VALUES (1, 1, '2026-09', 1000, 22);
