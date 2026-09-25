-- expect-error: Out of range value for column 'available_balance_vnd'
-- Wallet không bao giờ âm; cột UNSIGNED chặn giá trị âm ngay ở tầng kiểu dữ liệu
-- (CHECK chk_wallet_available_nonnegative là defense-in-depth, không chạy tới).
UPDATE wallet_accounts SET available_balance_vnd = -1 WHERE id = 1;