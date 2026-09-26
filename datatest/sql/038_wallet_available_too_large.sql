-- expect-error: chk_wallet_available_safe
UPDATE wallet_accounts SET available_balance_vnd = 9007199254740992 WHERE user_id = 1;
