-- 001_schema_and_seed.sql — kiểm tra migration đã áp dụng, bảng tồn tại, seed đúng.
-- Assertion false phải bị CHECK chặn để runner nhận lỗi thật.

CREATE TEMPORARY TABLE _datatest_assertions (
  assertion_name VARCHAR(100) PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  CONSTRAINT chk_datatest_assertion_passed CHECK (passed = 1)
);

-- Mười migration phải được ghi trong schema_migrations.
SET @n = (SELECT COUNT(*) FROM schema_migrations);
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('migration count', @n = 10);

-- Đủ 17 bảng từ 0001–0010: 13 bảng domain + schema_migrations + 3 bảng auth.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (
    'users', 'auth_identities', 'sessions', 'wallet_accounts', 'mutation_idempotency',
    'categories', 'ledger_transactions', 'budgets', 'savings_accounts', 'savings_transfers',
    'issues', 'issue_events', 'audit_events', 'schema_migrations',
    'auth_credentials', 'email_otps', 'auth_rate_limits'
  ));
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('table count', @n = 17);

-- Các bảng auth của migration 0004–0005 tồn tại.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('auth_credentials', 'email_otps', 'auth_rate_limits'));
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('auth tables', @n = 3);

-- Seed: income 4, payment 7, tất cả active.
SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND applies_to = 'income');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('income seed', @n = 4);

SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND applies_to = 'payment');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('payment seed', @n = 7);

SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND status <> 'active');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('active seed categories', @n = 0);

-- Trigger append-only tồn tại cho ledger và audit.
SET @n = (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'ledger_transactions');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('ledger triggers', @n = 2);

SET @n = (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'audit_events');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('audit triggers', @n = 2);

-- CHECK amount > 0 tồn tại.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_ledger_amount_positive');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('positive amount check', @n = 1);

-- Index owner-scoped cho antijoin correction: thiếu index này thì query report/budget
-- dò DISTINCT reference_id toàn bảng, chi phí theo tổng tenant thay vì theo owner.
SET @n = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ledger_transactions'
    AND INDEX_NAME = 'idx_ledger_user_reference'
    AND (SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'user_id' OR SEQ_IN_INDEX = 2 AND COLUMN_NAME = 'reference_id'));
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('owner reference index', @n = 2);

-- Migration 0006 giới hạn mọi cột tiền ở miền integer an toàn của JavaScript.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME IN (
    'chk_wallet_initial_safe', 'chk_wallet_available_safe', 'chk_ledger_amount_safe',
    'chk_budgets_limit_safe', 'chk_savings_balance_safe', 'chk_savings_transfer_amount_safe'
  ));
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('safe integer checks', @n = 6);

-- Fixture được chèn theo schema cũ trước migration 0006–0010 vẫn còn nguyên.
SET @n = (SELECT COUNT(*) FROM ledger_transactions WHERE user_id = 1 AND id = 1 AND amount_vnd = 100000);
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('fixture ledger row', @n = 1);
SET @n = (SELECT COUNT(*) FROM savings_accounts WHERE user_id = 1 AND balance_vnd = 30000);
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('fixture savings row', @n = 1);

-- Wallet của user 1 chỉ một hàng (UNIQUE user_id).
SET @n = (SELECT COUNT(*) FROM wallet_accounts WHERE user_id = 1);
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('fixture wallet row', @n = 1);
