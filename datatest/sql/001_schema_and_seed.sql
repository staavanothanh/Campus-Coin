-- 001_schema_and_seed.sql — kiểm tra migration đã áp dụng, bảng tồn tại, seed đúng.
-- Quy ước assert của datatest: `SET @n = (…); DO 1 / (@n = mong_doi);`
-- → khi đúng: 1/1 = 1 (trôi); khi sai: chia 0 → ERROR → test fail.
-- Bắt buộc ERROR_FOR_DIVISION_BY_ZERO (dòng đầu), máy chủ MySQL >= 8.0.16.

SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',ERROR_FOR_DIVISION_BY_ZERO');

-- Hai migration phải được ghi trong schema_migrations.
SET @n = (SELECT COUNT(*) FROM schema_migrations);
DO 1 / (@n = 2);

-- Tối thiểu 14 bảng nghiệp vụ + schema_migrations.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE());
DO 1 / (@n >= 15);

-- Seed: income 4, payment 7, tất cả active.
SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND applies_to = 'income');
DO 1 / (@n = 4);

SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND applies_to = 'payment');
DO 1 / (@n = 7);

SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND status <> 'active');
DO 1 / (@n = 0);

-- Trigger append-only tồn tại cho ledger và audit.
SET @n = (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'ledger_transactions');
DO 1 / (@n = 2);

SET @n = (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'audit_events');
DO 1 / (@n = 2);

-- CHECK amount > 0 tồn tại.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_ledger_amount_positive');
DO 1 / (@n = 1);

-- Wallet của user 1 chỉ một hàng (UNIQUE user_id).
SET @n = (SELECT COUNT(*) FROM wallet_accounts WHERE user_id = 1);
DO 1 / (@n = 1);