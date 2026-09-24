-- 000_fixtures.sql — dữ liệu mẫu cho các test (chạy đầu tiên, phải thành công).
-- Id cố định để các file test tham chiếu ổn định. Không phải dữ liệu production.

SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',ERROR_FOR_DIVISION_BY_ZERO');

INSERT INTO users (id, display_name, email, email_verified)
VALUES (1, 'Alice', 'alice@example.com', 1), (2, 'Bob', 'bob@example.com', 1);

INSERT INTO wallet_accounts (id, user_id, initialized, initial_balance_vnd, available_balance_vnd, currency)
VALUES (1, 1, 1, 500000, 500000, 'VND');

INSERT INTO categories (id, user_id, name_en, name_vi, applies_to, status, is_default)
VALUES (100, 1, 'Snacks', 'Ăn vặt', 'payment', 'active', 0);

INSERT INTO ledger_transactions (id, user_id, type, amount_vnd, category_id, occurred_at, role)
VALUES (1, 1, 'income', 100000, 1, '2026-09-01 00:00:00.000', 'original');

INSERT INTO savings_accounts (id, user_id, balance_vnd, currency)
VALUES (1, 1, 30000, 'VND');

INSERT INTO savings_transfers (id, user_id, direction, amount_vnd, note)
VALUES (1, 1, 'deposit', 30000, 'mẫu');

INSERT INTO audit_events (id, user_id, actor_type, actor_user_id, action, scope, outcome)
VALUES (1, 1, 'user', 1, 'wallet.initialize', 'wallet', 'success');

INSERT INTO issues (id, user_id, title, description, category)
VALUES (1, 1, 'Test issue', 'abc', 'bug');

INSERT INTO issue_events (id, issue_id, actor_user_id, kind)
VALUES (1, 1, 1, 'created');

INSERT INTO mutation_idempotency (id, user_id, scope, idempotency_key, request_hash, response_json)
VALUES (1, 1, 'wallet.baseline', 'key-fixture', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', CAST('{"ok":true}' AS JSON));

INSERT INTO budgets (id, user_id, category_id, month, limit_vnd)
VALUES (1, 1, 5, '2026-09', 200000);