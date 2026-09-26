-- expect-error: chk_savings_transfer_amount_safe
INSERT INTO savings_transfers (user_id, direction, amount_vnd, note)
VALUES (1, 'deposit', 9007199254740992, 'test boundary');
