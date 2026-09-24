-- 0001_initial_schema.sql — Campus Coin initial MySQL schema
-- Target: MySQL 8.0.16+ (CHECK constraints enforced), InnoDB, utf8mb4.
-- Invariant nguồn: docs/DOMAIN-MODEL.md, docs/ARCHITECTURE.md, ADR-0005.
-- a) Tiền luôn BIGINT UNSIGNED (integer VND, không floating point, không số âm).
-- b) Ledger/audit/savings_transfers/issue_events append-only — chặn UPDATE/DELETE bằng trigger.
-- c) Mọi financial row có user_id; mọi query trong code phải scope theo owner.
-- d) Thời điểm kỹ thuật lưu DATETIME(3) UTC; kỳ báo cáo HCMC tính ở tầng application.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  locale ENUM('en', 'vi') NOT NULL DEFAULT 'en',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  role ENUM('user', 'admin', 'security') NOT NULL DEFAULT 'user',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_email_nonempty CHECK (email <> ''),
  CONSTRAINT chk_users_display_name_nonempty CHECK (display_name <> '')
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS auth_identities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('google') NOT NULL,
  subject VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_identities_provider_subject (provider, subject),
  KEY idx_auth_identities_user (user_id),
  CONSTRAINT fk_auth_identities_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

-- Session: A sở hữu runtime; schema chốt: chỉ lưu hash token opaque, có expiry/revoke.
CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token_hash CHAR(64) NULL,
  issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  last_seen_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  initialized TINYINT(1) NOT NULL DEFAULT 0,
  initial_balance_vnd BIGINT UNSIGNED NOT NULL DEFAULT 0,
  available_balance_vnd BIGINT UNSIGNED NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_accounts_user (user_id),
  CONSTRAINT fk_wallet_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  -- Wallet không bao giờ âm: defense in depth, kiểm tra trong transaction là chính.
  CONSTRAINT chk_wallet_initial_nonnegative CHECK (initial_balance_vnd >= 0),
  CONSTRAINT chk_wallet_available_nonnegative CHECK (available_balance_vnd >= 0)
) ENGINE = InnoDB;

-- mutation_idempotency đứng trước ledger và savings_transfers vì là FK reference.
CREATE TABLE IF NOT EXISTS mutation_idempotency (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  scope VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_idempotency_user_scope_key (user_id, scope, idempotency_key),
  CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

-- Category: user_id NULL = system default (owner_key = 0), is_default=1.
-- Disable/retire giữ history; không hard-delete category đã tham chiếu.
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  owner_key BIGINT UNSIGNED NOT NULL GENERATED ALWAYS AS (IFNULL(user_id, 0)) STORED,
  name_en VARCHAR(80) NOT NULL,
  name_vi VARCHAR(80) NOT NULL DEFAULT '',
  applies_to ENUM('income', 'payment') NOT NULL,
  status ENUM('active', 'disabled', 'retired') NOT NULL DEFAULT 'active',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_owner_name (owner_key, applies_to, name_en),
  KEY idx_categories_user (user_id),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_categories_name_en_nonempty CHECK (name_en <> '')
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('income', 'payment') NOT NULL,
  amount_vnd BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  role ENUM('original', 'reversal', 'adjustment', 'replacement') NOT NULL DEFAULT 'original',
  reference_id BIGINT UNSIGNED NULL,
  description VARCHAR(500) NULL,
  reason VARCHAR(1000) NULL,
  idempotency_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_ledger_user_occurred (user_id, occurred_at, id),
  KEY idx_ledger_user_id (user_id, id),
  KEY idx_ledger_user_category (user_id, category_id, type),
  KEY idx_ledger_reference (reference_id),
  CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_reference FOREIGN KEY (reference_id) REFERENCES ledger_transactions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_idempotency FOREIGN KEY (idempotency_id) REFERENCES mutation_idempotency (id) ON DELETE RESTRICT,
  CONSTRAINT chk_ledger_amount_positive CHECK (amount_vnd > 0),
  -- original không reference/reason; correction bắt buộc có reference và reason.
  CONSTRAINT chk_ledger_role_shape CHECK (
    (role = 'original' AND reference_id IS NULL AND reason IS NULL)
    OR (role <> 'original' AND reference_id IS NOT NULL AND reason IS NOT NULL)
  )
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL,
  limit_vnd BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_budgets_user_category_month (user_id, category_id, month),
  KEY idx_budgets_user_month (user_id, month),
  CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_budgets_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT chk_budgets_month_format CHECK (month REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT chk_budgets_limit_nonnegative CHECK (limit_vnd >= 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS savings_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  balance_vnd BIGINT UNSIGNED NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_savings_accounts_user (user_id),
  CONSTRAINT fk_savings_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_savings_balance_nonnegative CHECK (balance_vnd >= 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS savings_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  direction ENUM('deposit', 'withdraw') NOT NULL,
  amount_vnd BIGINT UNSIGNED NOT NULL,
  note VARCHAR(500) NULL,
  idempotency_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_savings_transfers_user_id (user_id, id),
  CONSTRAINT fk_savings_transfers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_savings_transfers_idempotency FOREIGN KEY (idempotency_id) REFERENCES mutation_idempotency (id) ON DELETE RESTRICT,
  CONSTRAINT chk_savings_transfers_amount_positive CHECK (amount_vnd > 0)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issues (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  related_transaction_id BIGINT UNSIGNED NULL,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(4000) NOT NULL,
  category ENUM('financial_dispute', 'bug', 'other') NOT NULL,
  status ENUM('open', 'in_triage', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  priority ENUM('P0', 'P1', 'P2') NOT NULL DEFAULT 'P2',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_issues_user (user_id, id),
  KEY idx_issues_status (status, priority, id),
  CONSTRAINT fk_issues_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_issues_transaction FOREIGN KEY (related_transaction_id) REFERENCES ledger_transactions (id) ON DELETE RESTRICT,
  CONSTRAINT chk_issues_title_nonempty CHECK (title <> ''),
  CONSTRAINT chk_issues_description_nonempty CHECK (description <> '')
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  issue_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('created', 'status_change', 'priority_change', 'note') NOT NULL,
  note VARCHAR(4000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_issue_events_issue (issue_id, id),
  KEY idx_issue_events_actor (actor_user_id),
  CONSTRAINT fk_issue_events_issue FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE RESTRICT,
  CONSTRAINT fk_issue_events_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  actor_type ENUM('user', 'admin', 'system') NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(64) NOT NULL,
  scope VARCHAR(64) NOT NULL,
  target_id BIGINT UNSIGNED NULL,
  outcome ENUM('success', 'failure') NOT NULL,
  reason VARCHAR(1000) NULL,
  request_id VARCHAR(64) NULL,
  masked_metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_events_user (user_id, id),
  KEY idx_audit_events_created (created_at, id),
  CONSTRAINT fk_audit_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_events_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (version)
) ENGINE = InnoDB;

-- Append-only guards: nhị phân chống UPDATE/DELETE lên dòng đã commit.
-- Dùng một câu SIGNAL duy nhất (không BEGIN..END) để chạy được qua multipleStatements
-- của mysql2 (client này không hiểu DELIMITER).
CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE ON ledger_transactions
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger_transactions is append-only (update blocked)';

CREATE TRIGGER trg_ledger_no_delete
  BEFORE DELETE ON ledger_transactions
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger_transactions is append-only (delete blocked)';

CREATE TRIGGER trg_savings_transfers_no_update
  BEFORE UPDATE ON savings_transfers
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'savings_transfers is append-only (update blocked)';

CREATE TRIGGER trg_savings_transfers_no_delete
  BEFORE DELETE ON savings_transfers
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'savings_transfers is append-only (delete blocked)';

CREATE TRIGGER trg_audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_events is append-only (update blocked)';

CREATE TRIGGER trg_audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_events is append-only (delete blocked)';

CREATE TRIGGER trg_issue_events_no_update
  BEFORE UPDATE ON issue_events
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'issue_events is append-only (update blocked)';

CREATE TRIGGER trg_issue_events_no_delete
  BEFORE DELETE ON issue_events
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'issue_events is append-only (delete blocked)';