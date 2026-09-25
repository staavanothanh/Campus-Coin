SET @test_user_id = 999001;
SET @test_user_id2 = 999002;

INSERT INTO users (id, display_name, email, email_verified, status, locale, timezone, role)
VALUES
  (@test_user_id, 'Benchmark User A', 'bench-a@test.local', 1, 'active', 'vi', 'Asia/Ho_Chi_Minh', 'user'),
  (@test_user_id2, 'Benchmark User B', 'bench-b@test.local', 1, 'active', 'en', 'Asia/Ho_Chi_Minh', 'user')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

INSERT INTO mutation_idempotency (id, user_id, scope, idempotency_key, request_hash, response_json)
VALUES
  (100, @test_user_id, 'wallet.baseline', 'bench-wallet-01', SHA2('bench-wallet-01', 256), CAST('{}' AS JSON)),
  (101, @test_user_id, 'ledger.create', 'bench-ledger-01', SHA2('bench-ledger-01', 256), CAST('{}' AS JSON)),
  (102, @test_user_id, 'ledger.create', 'bench-ledger-02', SHA2('bench-ledger-02', 256), CAST('{}' AS JSON)),
  (103, @test_user_id, 'ledger.create', 'bench-ledger-03', SHA2('bench-ledger-03', 256), CAST('{}' AS JSON)),
  (104, @test_user_id, 'ledger.create', 'bench-ledger-04', SHA2('bench-ledger-04', 256), CAST('{}' AS JSON)),
  (105, @test_user_id, 'ledger.create', 'bench-ledger-05', SHA2('bench-ledger-05', 256), CAST('{}' AS JSON)),
  (106, @test_user_id, 'ledger.create', 'bench-ledger-06', SHA2('bench-ledger-06', 256), CAST('{}' AS JSON)),
  (107, @test_user_id, 'ledger.create', 'bench-ledger-07', SHA2('bench-ledger-07', 256), CAST('{}' AS JSON)),
  (108, @test_user_id, 'ledger.create', 'bench-ledger-08', SHA2('bench-ledger-08', 256), CAST('{}' AS JSON)),
  (109, @test_user_id2, 'ledger.create', 'bench-ledger-09', SHA2('bench-ledger-09', 256), CAST('{}' AS JSON)),
  (110, @test_user_id2, 'ledger.create', 'bench-ledger-10', SHA2('bench-ledger-10', 256), CAST('{}' AS JSON)),
  (111, @test_user_id2, 'ledger.create', 'bench-ledger-11', SHA2('bench-ledger-11', 256), CAST('{}' AS JSON)),
  (112, @test_user_id2, 'ledger.create', 'bench-ledger-12', SHA2('bench-ledger-12', 256), CAST('{}' AS JSON)),
  (113, @test_user_id, 'savings.transfer', 'bench-savings-01', SHA2('bench-savings-01', 256), CAST('{}' AS JSON)),
  (114, @test_user_id, 'savings.transfer', 'bench-savings-02', SHA2('bench-savings-02', 256), CAST('{}' AS JSON)),
  (115, @test_user_id, 'savings.transfer', 'bench-savings-03', SHA2('bench-savings-03', 256), CAST('{}' AS JSON)),
  (116, @test_user_id2, 'savings.transfer', 'bench-savings-04', SHA2('bench-savings-04', 256), CAST('{}' AS JSON)),
  (117, @test_user_id, 'budget.upsert', 'bench-budget-01', SHA2('bench-budget-01', 256), CAST('{}' AS JSON)),
  (118, @test_user_id, 'budget.upsert', 'bench-budget-02', SHA2('bench-budget-02', 256), CAST('{}' AS JSON)),
  (119, @test_user_id2, 'budget.upsert', 'bench-budget-03', SHA2('bench-budget-03', 256), CAST('{}' AS JSON)),
  (120, @test_user_id2, 'wallet.baseline', 'bench-wallet-02', SHA2('bench-wallet-02', 256), CAST('{}' AS JSON));

INSERT INTO wallet_accounts (user_id, initialized, initial_balance_vnd, available_balance_vnd, currency, idempotency_id)
VALUES
  (@test_user_id, 1, 5000000, 5000000, 'VND', 100),
  (@test_user_id2, 1, 10000000, 10000000, 'VND', 120);

SET @cat_salary = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'income' AND name_en = 'Salary' LIMIT 1);
SET @cat_food = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'payment' AND name_en = 'Food & Dining' LIMIT 1);
SET @cat_transport = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'payment' AND name_en = 'Transport' LIMIT 1);
SET @cat_freelance = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'income' ORDER BY id LIMIT 1);

INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, description, idempotency_id)
VALUES
  (@test_user_id, 'income', 8500000, @cat_salary, '2026-09-01 08:00:00', 'Monthly salary', 101),
  (@test_user_id, 'income', 2000000, @cat_freelance, '2026-09-05 14:30:00', 'Side project payment', 102),
  (@test_user_id, 'payment', 450000, @cat_food, '2026-09-10 12:15:00', 'Team lunch', 103),
  (@test_user_id, 'payment', 120000, @cat_transport, '2026-09-11 07:45:00', 'Fuel', 104),
  (@test_user_id, 'payment', 890000, @cat_food, '2026-09-15 19:00:00', 'Family dinner', 105),
  (@test_user_id, 'income', 1500000, @cat_freelance, '2026-09-18 10:00:00', 'Consulting fee', 106),
  (@test_user_id, 'payment', 250000, @cat_transport, '2026-09-20 08:30:00', 'Ride to office', 107),
  (@test_user_id, 'payment', 350000, @cat_food, '2026-09-22 11:45:00', 'Groceries', 108),
  (@test_user_id2, 'income', 12000000, @cat_salary, '2026-09-01 08:00:00', 'Monthly salary', 109),
  (@test_user_id2, 'payment', 1500000, @cat_food, '2026-09-05 18:30:00', 'Client dinner', 110),
  (@test_user_id2, 'payment', 800000, @cat_transport, '2026-09-12 09:00:00', 'Flight ticket', 111),
  (@test_user_id2, 'income', 5000000, @cat_freelance, '2026-09-14 16:00:00', 'Contract work', 112);

INSERT INTO savings_transfers (user_id, direction, amount_vnd, note, idempotency_id)
VALUES
  (@test_user_id, 'deposit', 1000000, 'Initial savings', 113),
  (@test_user_id, 'deposit', 500000, 'Monthly save', 114),
  (@test_user_id, 'withdraw', 200000, 'Emergency', 115),
  (@test_user_id2, 'deposit', 3000000, 'Savings plan', 116);

INSERT INTO budgets (user_id, category_id, month, limit_vnd, idempotency_id)
VALUES
  (@test_user_id, @cat_food, '2026-09', 2000000, 117),
  (@test_user_id, @cat_transport, '2026-09', 1000000, 118),
  (@test_user_id2, @cat_food, '2026-09', 3000000, 119);

SELECT 'setup complete' AS status, @test_user_id AS user_a, @test_user_id2 AS user_b;
