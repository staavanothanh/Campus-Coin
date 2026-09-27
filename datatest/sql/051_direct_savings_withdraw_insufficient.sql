-- expect-error
-- Direct SQL cannot withdraw more savings than the projection contains.
INSERT INTO savings_transfers (user_id, direction, amount_vnd, idempotency_id)
VALUES (1, 'withdraw', 100000, 26);
