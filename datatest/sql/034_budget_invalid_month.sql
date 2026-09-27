-- expect-error: chk_budgets_month_format
-- Month budget phải YYYY-MM hợp lệ; '2026-13' bị CHECK regexp chặn.
INSERT INTO budgets (user_id, category_id, month, limit_vnd, idempotency_id)
VALUES (1, 5, '2026-13', 100000, 20);
