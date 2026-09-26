-- expect-error: chk_savings_balance_safe
UPDATE savings_accounts SET balance_vnd = 9007199254740992 WHERE user_id = 1;
