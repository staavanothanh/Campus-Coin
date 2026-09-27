-- 001_schema_and_seed.sql — kiểm tra migration đã áp dụng, bảng tồn tại, seed đúng.
-- Quy ước assert của datatest: `SET @n = (…); DO 1 / (@n = mong_doi);`
-- → khi đúng: 1/1 = 1 (trôi); khi sai: chia 0 → ERROR → test fail.
-- Bắt buộc ERROR_FOR_DIVISION_BY_ZERO (dòng đầu), máy chủ MySQL >= 8.0.16.

SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',ERROR_FOR_DIVISION_BY_ZERO');

-- Tất cả 27 migration phải được ghi trong schema_migrations.
SET @n = (SELECT COUNT(*) FROM schema_migrations);
DO 1 / (@n = 27);

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
DO 1 / (@n = 4);

SET @n = (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'audit_events');
DO 1 / (@n = 2);

-- CHECK amount > 0 tồn tại.
SET @n = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_ledger_amount_positive');
DO 1 / (@n = 1);

-- Index owner-scoped cho antijoin correction: thiếu index này thì query report/budget
-- dò DISTINCT reference_id toàn bảng, chi phí theo tổng tenant thay vì theo owner.
SET @n = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ledger_transactions'
    AND INDEX_NAME = 'uq_ledger_user_reference'
    AND (SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'user_id' OR SEQ_IN_INDEX = 2 AND COLUMN_NAME = 'reference_id'));
DO 1 / (@n = 2);

-- Composite owner FKs cover corrections, issue references, and idempotency links.
SET @n = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND CONSTRAINT_NAME IN (
      'fk_ledger_reference_owner_role', 'fk_ledger_idempotency_owner',
      'fk_ledger_wallet_owner', 'fk_issues_transaction_owner',
      'fk_savings_transfer_idempotency_owner', 'fk_savings_transfer_wallet_owner',
      'fk_savings_transfer_savings_owner', 'fk_wallet_idempotency_owner',
      'fk_categories_idempotency_owner', 'fk_budgets_idempotency_owner',
      'fk_issues_idempotency_owner'
    ));
DO 1 / (@n = 21);

-- Direct SQL writes pass through the category/owner boundary triggers.
SET @n = (SELECT COUNT(*) FROM information_schema.TRIGGERS
  WHERE TRIGGER_SCHEMA = DATABASE()
    AND TRIGGER_NAME IN (
      'trg_ledger_insert_owner_boundary', 'trg_savings_transfer_insert_owner_boundary',
      'trg_budget_insert_owner_boundary', 'trg_budget_update_owner_boundary',
      'trg_issue_update_owner_boundary', 'trg_category_insert_custom_owner_only',
      'trg_wallet_insert_baseline_boundary', 'trg_wallet_insert_savings_account',
      'trg_ledger_apply_wallet_delta', 'trg_savings_transfer_apply_projections',
      'trg_issue_insert_owner_boundary', 'trg_category_update_custom_owner_only'
    ));
DO 1 / (@n = 12);

-- Wallet của user 1 chỉ một hàng (UNIQUE user_id).
SET @n = (SELECT COUNT(*) FROM wallet_accounts WHERE user_id = 1);
DO 1 / (@n = 1);
