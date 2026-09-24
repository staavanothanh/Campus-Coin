SET @test_user_id = 999001;

SET @start = NOW(6);
SELECT u.id, u.display_name, w.available_balance_vnd
FROM users u
JOIN wallet_accounts w ON w.user_id = u.id
WHERE u.status = 'active'
ORDER BY w.available_balance_vnd DESC
LIMIT 10;
SET @t_wallet_lookup = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SET @start = NOW(6);
SELECT id, type, amount_vnd, category_id, occurred_at, description
FROM ledger_transactions
WHERE user_id = @test_user_id
  AND occurred_at >= '2026-08-31 17:00:00'
  AND occurred_at < '2026-09-30 17:00:00'
ORDER BY id DESC
LIMIT 50;
SET @t_ledger_monthly = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SET @start = NOW(6);
SELECT
  c.name_en,
  t.type,
  SUM(t.amount_vnd) AS total_vnd,
  COUNT(*) AS tx_count
FROM ledger_transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = @test_user_id
  AND t.occurred_at >= '2026-08-31 17:00:00'
  AND t.occurred_at < '2026-09-30 17:00:00'
GROUP BY c.name_en, t.type
ORDER BY total_vnd DESC;
SET @t_report_agg = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SET @start = NOW(6);
SELECT
  b.month,
  c.name_en,
  b.limit_vnd,
  COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount_vnd END), 0) AS spent_vnd,
  CASE
    WHEN COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount_vnd END), 0) > b.limit_vnd THEN 'over'
    ELSE 'under'
  END AS budget_status
FROM budgets b
JOIN categories c ON c.id = b.category_id
LEFT JOIN ledger_transactions t
  ON t.category_id = b.category_id
  AND t.user_id = b.user_id
  AND t.type = 'payment'
   AND t.occurred_at >= '2026-08-31 17:00:00'
   AND t.occurred_at < '2026-09-30 17:00:00'
WHERE b.user_id = @test_user_id
GROUP BY b.month, c.name_en, b.limit_vnd;
SET @t_budget_check = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SET @start = NOW(6);
SELECT
  DATE(CONVERT_TZ(t.occurred_at, '+00:00', '+07:00')) AS occurred_day,
  SUM(CASE WHEN t.type = 'income' THEN t.amount_vnd ELSE -t.amount_vnd END) AS net_vnd
FROM ledger_transactions t
WHERE t.user_id = @test_user_id
   AND t.occurred_at >= '2026-08-31 17:00:00'
   AND t.occurred_at < '2026-09-30 17:00:00'
GROUP BY occurred_day
ORDER BY occurred_day;
SET @t_daily_hcmc = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SET @start = NOW(6);
SELECT
  a.user_id,
  a.balance_vnd,
  (SELECT COUNT(*) FROM savings_transfers st WHERE st.user_id = a.user_id) AS transfer_count,
  (SELECT SUM(amount_vnd) FROM savings_transfers st WHERE st.user_id = a.user_id AND st.direction = 'deposit') AS total_deposits,
  (SELECT SUM(amount_vnd) FROM savings_transfers st WHERE st.user_id = a.user_id AND st.direction = 'withdraw') AS total_withdrawals
FROM savings_accounts a
WHERE a.user_id IN (999001, 999002);
SET @t_savings_join = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SET @start = NOW(6);
SELECT COUNT(*) AS ledger_rows, MIN(occurred_at) AS earliest, MAX(occurred_at) AS latest
FROM ledger_transactions
WHERE user_id = @test_user_id;
SET @t_ledger_count = TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000;

SELECT
  @t_wallet_lookup AS t_wallet_lookup_ms,
  @t_ledger_monthly AS t_ledger_monthly_ms,
  @t_report_agg AS t_report_agg_ms,
  @t_budget_check AS t_budget_check_ms,
  @t_daily_hcmc AS t_daily_hcmc_ms,
  @t_savings_join AS t_savings_join_ms,
  @t_ledger_count AS t_ledger_count_ms;

EXPLAIN ANALYZE
SELECT id, type, amount_vnd, category_id, occurred_at
FROM ledger_transactions
WHERE user_id = @test_user_id
  AND occurred_at >= '2026-08-31 17:00:00'
  AND occurred_at < '2026-09-30 17:00:00'
ORDER BY id DESC
LIMIT 50;

EXPLAIN ANALYZE
SELECT
  c.name_en,
  t.type,
  SUM(t.amount_vnd) AS total_vnd,
  COUNT(*) AS tx_count
FROM ledger_transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = @test_user_id
  AND t.occurred_at >= '2026-08-31 17:00:00'
  AND t.occurred_at < '2026-09-30 17:00:00'
GROUP BY c.name_en, t.type
ORDER BY total_vnd DESC;

EXPLAIN ANALYZE
SELECT
  DATE(CONVERT_TZ(t.occurred_at, '+00:00', '+07:00')) AS occurred_day,
  SUM(CASE WHEN t.type = 'income' THEN t.amount_vnd ELSE -t.amount_vnd END) AS net_vnd
FROM ledger_transactions t
WHERE t.user_id = @test_user_id
  AND t.occurred_at >= '2026-08-31 17:00:00'
  AND t.occurred_at < '2026-09-30 17:00:00'
GROUP BY occurred_day
ORDER BY occurred_day;
