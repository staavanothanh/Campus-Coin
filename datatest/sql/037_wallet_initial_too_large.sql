-- expect-error: chk_wallet_initial_safe
UPDATE wallet_accounts SET initial_balance_vnd = 9007199254740992 WHERE user_id = 1;
