-- 000_fixtures.sql — dữ liệu mẫu cho các test (chạy đầu tiên, phải thành công).
-- Id cố định để các file test tham chiếu ổn định. Không phải dữ liệu production.

SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',ERROR_FOR_DIVISION_BY_ZERO');

INSERT INTO users (id, display_name, email, email_verified)
VALUES (1, 'Alice', 'alice@example.com', 1), (2, 'Bob', 'bob@example.com', 1);

INSERT INTO mutation_idempotency (id, user_id, scope, idempotency_key, request_hash, response_json)
VALUES
  (1, 1, 'wallet.baseline', 'key-fixture', REPEAT('a', 64), CAST('{"ok":true}' AS JSON)),
  (2, 1, 'ledger.create', 'key-ledger-fixture', REPEAT('b', 64), CAST('{"ok":true}' AS JSON)),
  (3, 1, 'savings.transfer', 'key-savings-fixture', REPEAT('c', 64), CAST('{"ok":true}' AS JSON)),
  (4, 1, 'ledger.create', 'key-ledger-valid', REPEAT('d', 64), CAST('{"ok":true}' AS JSON)),
  (5, 1, 'ledger.correction', 'key-correction-valid', REPEAT('e', 64), CAST('{"ok":true}' AS JSON)),
  (6, 1, 'ledger.create', 'key-ledger-zero', REPEAT('f', 64), CAST('{"ok":true}' AS JSON)),
  (7, 1, 'ledger.correction', 'key-correction-missing-ref', REPEAT('1', 64), CAST('{"ok":true}' AS JSON)),
  (8, 1, 'ledger.create', 'key-ledger-missing-category', REPEAT('2', 64), CAST('{"ok":true}' AS JSON)),
  (9, 2, 'ledger.create', 'key-ledger-other-owner', REPEAT('3', 64), CAST('{"ok":true}' AS JSON)),
  (10, 2, 'ledger.correction', 'key-correction-other-owner', REPEAT('4', 64), CAST('{"ok":true}' AS JSON)),
  (11, 2, 'savings.transfer', 'key-savings-other-owner', REPEAT('5', 64), CAST('{"ok":true}' AS JSON)),
  (12, 1, 'ledger.correction', 'key-correction-duplicate', REPEAT('6', 64), CAST('{"ok":true}' AS JSON)),
  (13, 1, 'ledger.create', 'key-ledger-wrong-type', REPEAT('7', 64), CAST('{"ok":true}' AS JSON)),
  (14, 1, 'ledger.correction', 'key-correction-chain', REPEAT('8', 64), CAST('{"ok":true}' AS JSON)),
  (15, 1, 'category.create', 'key-category-fixture', REPEAT('9', 64), CAST('{"ok":true}' AS JSON)),
  (16, 1, 'budget.upsert', 'key-budget-fixture', REPEAT('a', 64), CAST('{"ok":true}' AS JSON)),
  (17, 1, 'issue.create', 'key-issue-fixture', REPEAT('b', 64), CAST('{"ok":true}' AS JSON)),
  (18, 1, 'budget.upsert', 'key-budget-valid', REPEAT('c', 64), CAST('{"ok":true}' AS JSON)),
  (19, 1, 'category.create', 'key-category-duplicate', REPEAT('d', 64), CAST('{"ok":true}' AS JSON)),
  (20, 1, 'budget.upsert', 'key-budget-invalid-month', REPEAT('e', 64), CAST('{"ok":true}' AS JSON)),
  (21, 2, 'budget.upsert', 'key-budget-other-owner', REPEAT('f', 64), CAST('{"ok":true}' AS JSON)),
  (22, 1, 'budget.upsert', 'key-budget-income-category', REPEAT('1', 64), CAST('{"ok":true}' AS JSON)),
  (23, 2, 'issue.create', 'key-issue-other-owner', REPEAT('2', 64), CAST('{"ok":true}' AS JSON)),
  (24, 1, 'ledger.create', 'key-ledger-overflow', REPEAT('3', 64), CAST('{"ok":true}' AS JSON)),
  (25, 1, 'ledger.create', 'key-ledger-insufficient', REPEAT('4', 64), CAST('{"ok":true}' AS JSON)),
  (26, 1, 'savings.transfer', 'key-savings-insufficient', REPEAT('5', 64), CAST('{"ok":true}' AS JSON));

INSERT INTO wallet_accounts (id, user_id, initialized, initial_balance_vnd, available_balance_vnd, currency, idempotency_id)
VALUES (1, 1, 1, 500000, 500000, 'VND', 1);

INSERT INTO categories (id, user_id, name_en, name_vi, applies_to, status, is_default, idempotency_id)
VALUES (100, 1, 'Snacks', 'Ăn vặt', 'payment', 'active', 0, 15);

INSERT INTO ledger_transactions (id, user_id, type, amount_vnd, category_id, occurred_at, role, idempotency_id)
VALUES (1, 1, 'income', 100000, 1, '2026-09-01 00:00:00.000', 'original', 2);

INSERT INTO savings_transfers (id, user_id, direction, amount_vnd, note, idempotency_id)
VALUES (1, 1, 'deposit', 30000, 'mẫu', 3);

INSERT INTO audit_events (id, user_id, actor_type, actor_user_id, action, scope, outcome)
VALUES (1, 1, 'user', 1, 'wallet.initialize', 'wallet', 'success');

INSERT INTO issues (id, user_id, title, description, category, idempotency_id)
VALUES (1, 1, 'Test issue', 'abc', 'bug', 17);

INSERT INTO issue_events (id, issue_id, actor_user_id, kind)
VALUES (1, 1, 1, 'created');

INSERT INTO budgets (id, user_id, category_id, month, limit_vnd, idempotency_id)
VALUES (1, 1, 5, '2026-09', 200000, 16);
