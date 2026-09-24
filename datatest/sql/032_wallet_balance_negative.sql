-- expect-error: chk_wallet_available_nonnegative
-- Wallet không bao giờ âm; UPDATE balance < 0 bị CHECK chặn.
UPDATE wallet_accounts SET available_balance_vnd = -1 WHERE id = 1;