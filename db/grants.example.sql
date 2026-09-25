-- Campus Coin — least-privilege grants template, DBA review/run on each environment.
-- Values below are placeholders; never commit real credentials.

-- 1) Tạo database nếu provider yêu cầu (charset bắt buộc utf8mb4).
-- CREATE DATABASE campus_coin CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 2) Migration role: isolated from application runtime; DDL is powerful and must
-- only be used by an operator/CI migration job, never by the deployed API.
CREATE USER IF NOT EXISTS 'cc_migrate'@'%' IDENTIFIED BY '${CAMPUS_COIN_DB_MIGRATE_PASSWORD}';
-- Upgrade existing broad grants only after reviewing SHOW GRANTS:
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON campus_coin.* FROM 'cc_migrate'@'%';
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, TRIGGER
  ON campus_coin.* TO 'cc_migrate'@'%';
GRANT SELECT, INSERT ON campus_coin.schema_migrations TO 'cc_migrate'@'%';
GRANT INSERT ON campus_coin.categories TO 'cc_migrate'@'%';
GRANT INSERT, UPDATE ON campus_coin.savings_accounts TO 'cc_migrate'@'%';
GRANT UPDATE (available_balance_vnd) ON campus_coin.wallet_accounts TO 'cc_migrate'@'%';
GRANT SELECT ON campus_coin.categories TO 'cc_migrate'@'%';
GRANT SELECT ON campus_coin.ledger_transactions TO 'cc_migrate'@'%';
GRANT SELECT ON campus_coin.mutation_idempotency TO 'cc_migrate'@'%';
GRANT SELECT ON campus_coin.budgets TO 'cc_migrate'@'%';
GRANT SELECT ON campus_coin.wallet_accounts TO 'cc_migrate'@'%';
GRANT SELECT ON campus_coin.savings_accounts TO 'cc_migrate'@'%';

-- 3) Runtime role: reset the former schema-wide DML grant, then grant only
-- table/column operations required by application repositories. No DELETE.
CREATE USER IF NOT EXISTS 'cc_runtime'@'%' IDENTIFIED BY '${CAMPUS_COIN_DB_PASSWORD}';
-- Mandatory upgrade step for an account that previously had schema-wide DML;
-- first confirm these grants exist with SHOW GRANTS, then run once:
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON campus_coin.* FROM 'cc_runtime'@'%';

GRANT SELECT ON campus_coin.users TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.auth_identities TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.sessions TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.wallet_accounts TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.mutation_idempotency TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.categories TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.ledger_transactions TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.budgets TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.savings_accounts TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.savings_transfers TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.issues TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.issue_events TO 'cc_runtime'@'%';
GRANT SELECT ON campus_coin.audit_events TO 'cc_runtime'@'%';

GRANT INSERT ON campus_coin.users TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.auth_identities TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.sessions TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.wallet_accounts TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.mutation_idempotency TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.categories TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.ledger_transactions TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.budgets TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.savings_transfers TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.issues TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.issue_events TO 'cc_runtime'@'%';
GRANT INSERT ON campus_coin.audit_events TO 'cc_runtime'@'%';

GRANT UPDATE (display_name, locale, timezone) ON campus_coin.users TO 'cc_runtime'@'%';
GRANT UPDATE (last_seen_at, revoked_at) ON campus_coin.sessions TO 'cc_runtime'@'%';
GRANT UPDATE (response_json) ON campus_coin.mutation_idempotency TO 'cc_runtime'@'%';
GRANT UPDATE (name_en, name_vi, status) ON campus_coin.categories TO 'cc_runtime'@'%';
GRANT UPDATE (limit_vnd, idempotency_id, updated_at) ON campus_coin.budgets TO 'cc_runtime'@'%';
GRANT UPDATE (title, description, category, status, priority) ON campus_coin.issues TO 'cc_runtime'@'%';

-- CLI-only operations register writer; not granted to the application runtime.
-- Run this section only after migrations create db_operation_logs.
CREATE USER IF NOT EXISTS 'cc_ops'@'%' IDENTIFIED BY '${CAMPUS_COIN_DB_OPS_PASSWORD}';
GRANT INSERT ON campus_coin.db_operation_logs TO 'cc_ops'@'%';
FLUSH PRIVILEGES;

-- Lưu ý bảo mật:
-- - Runtime has no schema_migrations, DELETE, DDL, TRIGGER, REFERENCES, PROCESS,
--   SUPER, FILE, CREATE ROUTINE, or GRANT OPTION privileges.
-- - Wallet/savings projection UPDATE and savings_accounts INSERT are trigger-definer
--   privileges only; runtime cannot write projections directly.
-- - Add grants only with a reviewed DB-enforced invariant and a negative direct-SQL test;
--   owner authorization tests belong at the service/API boundary (ADR-0008).
-- - Use a separate disposable test-admin role for creating/dropping integration DBs;
--   never add CREATE/DROP DATABASE to cc_runtime or cc_migrate.
-- - Replace '%' only if the provider/network offers a stable source address policy.
-- - Credentials belong only in secret manager/runtime environment.
-- - Owner authorization is service-layer only for the shared cc_runtime identity;
--   DB constraints/triggers enforce integrity, not per-user row visibility.
-- - db:operation-log uses cc_ops and stores only bounded operational metadata;
--   preflight stays read-only and CI logs remain in GitHub Actions.
