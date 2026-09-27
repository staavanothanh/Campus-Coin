-- Read-only queries for a local/BTC review in DBeaver.
-- Use a demo account approved for the presentation; do not query every user.
-- Connect DBeaver to the database name shown by `npm run db:preflight`.
-- Clone migration checksum mismatch was found for 0006–0010; use only after
-- DevB confirms schema compatibility. These queries do not write application data.
-- Password, OTP, session token, CSRF, OAuth and provider-secret columns are excluded.

-- 1. Enter only the email of the demo account you are authorized to show.
-- Replace the example value, then execute this setup and the queries below
-- in the same DBeaver SQL console/connection.
SET @campus_coin_demo_email = 'replace-with-approved-demo-email';
SET @campus_coin_demo_user_id = (
  SELECT id
  FROM users
  WHERE email = @campus_coin_demo_email
  LIMIT 1
);

-- This should return the one selected demo account. If the ID is NULL,
-- check the email/database target; do not remove owner filters below.
SELECT DATABASE() AS selected_database,
       CURRENT_USER() AS db_account,
       VERSION() AS mysql_version,
       @campus_coin_demo_user_id AS demo_user_id;

SELECT id, display_name, email, email_verified, status, role, locale, created_at
FROM users
WHERE id = @campus_coin_demo_user_id
LIMIT 1;

-- 2. Sessions for that account. Session/CSRF values are intentionally omitted.
SELECT id, issued_at, expires_at, last_seen_at, revoked_at
FROM sessions
WHERE user_id = @campus_coin_demo_user_id
ORDER BY id DESC
LIMIT 10;

-- 3. Wallet and savings values for the selected account.
SELECT id, initialized, initial_balance_vnd, available_balance_vnd,
       currency, created_at, updated_at
FROM wallet_accounts
WHERE user_id = @campus_coin_demo_user_id
LIMIT 1;

SELECT id, balance_vnd, currency, created_at, updated_at
FROM savings_accounts
WHERE user_id = @campus_coin_demo_user_id
LIMIT 1;

SELECT id, direction, amount_vnd, note, created_at
FROM savings_transfers
WHERE user_id = @campus_coin_demo_user_id
ORDER BY id DESC
LIMIT 50;

-- 4. Income/payment history with category names for this account only.
SELECT l.id, l.type, l.amount_vnd,
       c.name_vi AS category_vi, c.name_en AS category_en,
       l.occurred_at, l.role, l.reference_id, l.description, l.created_at
FROM ledger_transactions AS l
LEFT JOIN categories AS c ON c.id = l.category_id
WHERE l.user_id = @campus_coin_demo_user_id
ORDER BY l.id DESC
LIMIT 50;

-- 5. Budgets and recent audit events for this account only.
SELECT b.id, b.month, b.limit_vnd, c.name_vi AS category_vi,
       b.created_at, b.updated_at
FROM budgets AS b
LEFT JOIN categories AS c ON c.id = b.category_id
WHERE b.user_id = @campus_coin_demo_user_id
ORDER BY b.month DESC, b.id DESC
LIMIT 50;

SELECT id, actor_type, action, scope, target_id, outcome, created_at
FROM audit_events
WHERE user_id = @campus_coin_demo_user_id
ORDER BY id DESC
LIMIT 50;

-- 6. Compact totals for this one account, not totals across the database.
SELECT
  (SELECT COUNT(*) FROM wallet_accounts
   WHERE user_id = @campus_coin_demo_user_id) AS wallet_count,
  (SELECT COUNT(*) FROM ledger_transactions
   WHERE user_id = @campus_coin_demo_user_id) AS transaction_count,
  (SELECT COUNT(*) FROM savings_transfers
   WHERE user_id = @campus_coin_demo_user_id) AS savings_transfer_count,
  (SELECT COUNT(*) FROM budgets
   WHERE user_id = @campus_coin_demo_user_id) AS budget_count;

-- 7. Migration evidence is schema metadata and contains no account records.
SELECT version, name, applied_at
FROM schema_migrations
ORDER BY version
LIMIT 20;
