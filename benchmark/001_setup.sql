USE campus_coin;

SET @test_user_id = 999001;
SET @test_user_id2 = 999002;

INSERT INTO users (id, display_name, email, email_verified, status, locale, timezone, role)
VALUES
  (@test_user_id, 'Benchmark User A', 'bench-a@test.local', 1, 'active', 'vi', 'Asia/Ho_Chi_Minh', 'user'),
  (@test_user_id2, 'Benchmark User B', 'bench-b@test.local', 1, 'active', 'en', 'Asia/Ho_Chi_Minh', 'user')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

INSERT INTO wallet_accounts (user_id, initialized, initial_balance_vnd, available_balance_vnd, currency)
VALUES
  (@test_user_id, 1, 5000000, 3500000, 'VND'),
  (@test_user_id2, 1, 10000000, 7200000, 'VND')
ON DUPLICATE KEY UPDATE available_balance_vnd = VALUES(available_balance_vnd);

SET @cat_salary = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'income' AND name_en = 'Salary' LIMIT 1);
SET @cat_food = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'payment' AND name_en = 'Food & Dining' LIMIT 1);
SET @cat_transport = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'payment' AND name_en = 'Transport' LIMIT 1);
SET @cat_freelance = (SELECT id FROM categories WHERE is_default = 1 AND applies_to = 'income' ORDER BY id LIMIT 1);

INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, description)
VALUES
  (@test_user_id, 'income', 8500000, @cat_salary, '2026-09-01 08:00:00', 'Monthly salary'),
  (@test_user_id, 'income', 2000000, @cat_freelance, '2026-09-05 14:30:00', 'Side project payment'),
  (@test_user_id, 'payment', 450000, @cat_food, '2026-09-10 12:15:00', 'Team lunch'),
  (@test_user_id, 'payment', 120000, @cat_transport, '2026-09-11 07:45:00', 'Fuel'),
  (@test_user_id, 'payment', 890000, @cat_food, '2026-09-15 19:00:00', 'Family dinner'),
  (@test_user_id, 'income', 1500000, @cat_freelance, '2026-09-18 10:00:00', 'Consulting fee'),
  (@test_user_id, 'payment', 250000, @cat_transport, '2026-09-20 08:30:00', 'Ride to office'),
  (@test_user_id, 'payment', 350000, @cat_food, '2026-09-22 11:45:00', 'Groceries'),
  (@test_user_id2, 'income', 12000000, @cat_salary, '2026-09-01 08:00:00', 'Monthly salary'),
  (@test_user_id2, 'payment', 1500000, @cat_food, '2026-09-05 18:30:00', 'Client dinner'),
  (@test_user_id2, 'payment', 800000, @cat_transport, '2026-09-12 09:00:00', 'Flight ticket'),
  (@test_user_id2, 'income', 5000000, @cat_freelance, '2026-09-14 16:00:00', 'Contract work');

INSERT INTO savings_accounts (user_id, balance_vnd, currency)
VALUES
  (@test_user_id, 1500000, 'VND'),
  (@test_user_id2, 3000000, 'VND')
ON DUPLICATE KEY UPDATE balance_vnd = VALUES(balance_vnd);

INSERT INTO savings_transfers (user_id, direction, amount_vnd, note)
VALUES
  (@test_user_id, 'deposit', 1000000, 'Initial savings'),
  (@test_user_id, 'deposit', 500000, 'Monthly save'),
  (@test_user_id, 'withdraw', 200000, 'Emergency'),
  (@test_user_id2, 'deposit', 3000000, 'Savings plan');

INSERT INTO budgets (user_id, category_id, month, limit_vnd)
VALUES
  (@test_user_id, @cat_food, '2026-09', 2000000),
  (@test_user_id, @cat_transport, '2026-09', 1000000),
  (@test_user_id2, @cat_food, '2026-09', 3000000);

SELECT 'setup complete' AS status, @test_user_id AS user_a, @test_user_id2 AS user_b;
