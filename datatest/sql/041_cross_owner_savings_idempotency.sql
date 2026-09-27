-- expect-error
-- Savings transfer không thể dùng idempotency claim thuộc user 1.
INSERT INTO savings_transfers (user_id, direction, amount_vnd, idempotency_id)
VALUES (2, 'deposit', 1000, 3);
