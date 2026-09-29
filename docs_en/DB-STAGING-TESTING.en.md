# Database, Staging, and Owner Isolation Testing Guide

This document describes how to verify three critical subsystems: isolated test databases, staging authentication and email flows, and API domain owner isolation.

## 1. Isolated Test Database

### Safety Rules

- `npm run db:datatest` and MySQL integration tests generate temporary schemas, execute migrations and tests, and subsequently drop the temporary schemas.
- `npm run db:verify-clone` accesses `campus_coin_done` strictly during read-only preflight/status checks; all downstream test runs execute against randomly generated temporary schemas.
- Run tests strictly on a dedicated local/CI MySQL instance or an isolated test service/schema confirmed by the DB owner to contain zero shared data.
- Never use `defaultdb`, production databases, staging databases holding real data, or under-privileged runtime accounts for destructive testing.
- The migration/test account requires privileges to create and drop temporary test schemas; runtime application roles maintain minimal required privileges.
- Test runners automatically generate names formatted as `campus_coin_test_<process>_<id>`. `CAMPUS_COIN_DB_NAME` must start with `campus_coin_test_` to confirm testing intent; this name check alone does not guarantee server isolation, which must be verified by the DB owner.

### Verification in DBeaver

Connect to the designated test target and execute read-only queries:

```sql
SELECT 1 AS connection_ok;
SELECT DATABASE() AS selected_database, CURRENT_USER() AS db_account;
SELECT VERSION() AS mysql_version;
SHOW TABLES;
```

Confirm `selected_database` is the intended test schema and that Developer B / DB owner has confirmed the host is not a shared database. These queries verify connectivity; they do not substantiate ownership or operational isolation.

### Distinguishing Application Schemas from Test Servers

- `CAMPUS_COIN_DB_NAME` in `.env` dictates the schema used by `db:status`, `db:preflight`, and `db:migrate`. Before running these commands, confirm it points to an authorized clone schema, such as `campus_coin_done`.
- The provided Aiven Service URI defaults to database `/defaultdb`. Setting `CAMPUS_COIN_DB_NAME=campus_coin_done` selects a specific application schema on that host; it does not automatically provision clones, alter servers, or grant permissions. Preflight checks must confirm the clone is reachable before testing proceeds.
- When running `db:datatest` or MySQL integration tests, setting `CAMPUS_COIN_DB_NAME=campus_coin_test_<name>` serves purely as an intent confirmation guard. The test harness connects using the host/port/credentials from `.env`, creates a temporary schema with a randomized name, executes migrations/tests, and drops the schema. Tests do not execute inside `campus_coin_done`.
- Changing the database name in environment variables does not alter the underlying MySQL service instance. The host, port, and credentials in `.env` must target a test service where Developer B has authorized temporary schema creation and deletion.

### Running Clone Verification

In PowerShell, designate the clone target for read-only checks, then run:

```powershell
$env:CAMPUS_COIN_DB_NAME = "campus_coin_done"
npm run db:verify-clone
```

The script halts if the database name is invalid, the target does not exist or is unreachable, checksum mismatches occur, migrations remain `pending`, or migration status cannot be established. Only when `db:status` verifies at least one migration and confirms all are `applied` does the script switch the test label to `campus_coin_test_verify` and execute `db:datatest` alongside the three MySQL integration suites.

Integration steps never write to or delete `campus_coin_done`. They create and drop temporary schemas on the **same MySQL server** configured in `.env`. Run this only when Developer B confirms the server is isolated for testing and that credentials permit schema lifecycle operations. If permissions are insufficient, stop and request a dedicated local/CI MySQL instance; never escalate privileges on shared databases.

### Running on Windows PowerShell

First create or obtain an isolated test target, e.g., `campus_coin_test_local`, then configure local `.env` with test credentials, TLS, and CA certificates. Never commit `.env` or CA files.

```powershell
$env:CAMPUS_COIN_TEST_DB = "1"
$env:CAMPUS_COIN_DB_NAME = "campus_coin_test_local"

npm run db:datatest
node --env-file-if-exists=.env --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts
```

`CAMPUS_COIN_DB_NAME` acts as an intent confirmation flag; the harness connects and creates temporary schemas prefixed with the test identifier. It does not write test records to `campus_coin_test_local`. The harness automatically executes all migrations under `db/migrations/`. `npm run test:auth-security` executes standalone HTTP tests checking invalid Origins, missing CSRF tokens, and subsequent valid requests; this also requires an isolated MySQL instance with temporary schema permissions. Do not run `db:migrate` on `defaultdb` to prepare test environments. After completion, clear environment overrides in the terminal:

```powershell
Remove-Item Env:CAMPUS_COIN_TEST_DB
Remove-Item Env:CAMPUS_COIN_DB_NAME
```

Commands halt prior to connecting if `CAMPUS_COIN_TEST_DB=1` is missing or the database name lacks the required test prefix. CI utilizes dedicated MySQL services with prefix `campus_coin_test_ci`.

## 2. Live Authentication and Email on Staging

Automated tests evaluate authentication flows using mock email senders. The Team Leader confirmed Part 2 staging testing is complete (registration/reset emails, invalid/expired/resend OTPs, and logout/sessions); this represents Team Leader reporting, not live execution within this task. SMTP/provider failure timeouts and retries remain separate gates.

### Prerequisites

- Use staging hostnames, staging databases, and team-controlled test mailboxes. Never use production accounts or databases.
- SMTP credentials, OTP/session secrets, and database credentials reside strictly within staging secret configuration. Never record them in source code, documentation, or chat.
- Ensure staging logs redact full email addresses, passwords, OTPs, reset tokens, cookies, and SMTP credentials.

### Required Test Flows

1. Register test mailbox; confirm email delivery, submit valid OTP, and verify successful account onboarding.
2. Enter invalid OTP; confirm generic error returned without account creation.
3. Request resend during cooldown; confirm rate-limiting blocks the request. After cooldown expires, resend and confirm the new OTP functions while the previous OTP is invalidated.
4. Trigger repeated failed verifications up to the threshold; confirm OTP lockout and that response indicates retry delay.
5. Perform valid and invalid logins; verify account and IP rate-limiting enforcement.
6. Log in and initiate forgot-password; confirm reset email arrives. Test invalid, expired, and valid codes; confirm old password is invalidated and new password succeeds.
7. Retain an active session prior to password reset; confirm that session is terminated post-reset. Log out of the new session and verify cookies are cleared and subsequent requests return 401.
8. Test invalid Origins and missing CSRF headers on mutations per the detailed instructions below. Attempt reading resources of a second test account; verify access is forbidden.
9. When staging SMTP is intentionally unavailable, confirm bounded timeouts, limited retries, standardized error envelopes, and zero leakage of provider diagnostics or OTPs.

Record results with timestamps, staging release/commit identifiers, tested flows, and pass/fail statuses. Record only masked email addresses; never screenshot or store OTPs or cookies.

### Manual Origin and CSRF Testing with Postman

Use staging and test accounts exclusively. Session cookies and CSRF tokens are sensitive session credentials; never share them or paste them into issues or chat.

1. Create request `POST https://<staging-host>/api/v1/auth/login`. Add header `Origin` matching the staging UI origin, e.g., `https://<staging-host>`; supply test credentials in the JSON body. Allow Postman to store `Set-Cookie` in its cookie jar and copy `data.csrfToken` from the response.
2. Create request `POST https://<staging-host>/api/v1/auth/logout`, allowing the cookie jar to send session cookies automatically with matching `Origin`. **Do not send** `X-CSRF-Token`. Expected result: HTTP `403` with `error.code = CSRF_INVALID`. Send `GET /api/v1/auth/session`; expected result: HTTP `200`, confirming rejected requests do not invalidate sessions.
3. Resend `POST /api/v1/auth/logout`, setting `X-CSRF-Token` to the token from Step 1, but changing `Origin` to `https://attacker.invalid`. Expected result: HTTP `403` with `error.code = ORIGIN_INVALID`. Query `/api/v1/auth/session`; expected result remains HTTP `200`.
4. Using the same Postman cookie jar, send `POST /api/v1/auth/logout` with valid `Origin` and matching `X-CSRF-Token`. Expected result: HTTP `200`; subsequent `GET /api/v1/auth/session` must return HTTP `401`. To test UI logout buttons, log in separately within a web browser and log out there.

Stale or invalid CSRF tokens against active sessions must be rejected without revoking sessions. "Idempotent logout" applies only when sessions are expired, revoked, or absent: the server returns success and clears cookies. MySQL integration tests cover both scenarios.

If Postman fails to retain cookies automatically, verify the cookie jar domain settings for the staging host. Never take screenshots displaying cookies or tokens. Automated tests via `npm run test:auth-security` send mock Origins and omit CSRF tokens on `POST /api/v1/wallet/baseline`; both requests must return `403` with corresponding error codes. The test then dispatches a valid request to confirm correct wallet creation without corruption from the rejected attempts.

### Staging Google Sign-In Testing

Google Sign-In is optional. The Team Leader reported successful OAuth linking without documenting the environment or specific flows exercised. On staging, verify both flows independently:

1. Send `GET /api/v1/auth/providers`; `data.google` must equal `true`.
2. Log in with email/password into a test account, initiate Google linking, and confirm the callback returns to the matching account.
3. Log out, then log in using the linked Google account. Verify the session resolves to the original Campus Coin account.

Do not automatically merge accounts based on matching emails. If either flow was omitted, verify the remaining flow separately. If the provider is disabled, Google Cloud administrators must create an OAuth web application client and register redirect URIs matching `GOOGLE_OAUTH_REDIRECT_URI` exactly (typically `https://<staging-host>/api/v1/auth/google/callback` when APIs share the UI host). Configure `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, and `SESSION_SECRET` in secret settings, verify `CLIENT_ORIGIN`, and redeploy. Never place secrets in browsers, committed `.env` files, or chat. Refer to [Google OAuth Web Server Documentation](https://developers.google.com/identity/protocols/oauth2/web-server).

## 3. Domain API and Owner Isolation Testing

`test/auth.mysql.integration.test.ts` includes HTTP tests establishing two separate users and sessions. User A creates a wallet, category, income/payment, savings transfer, and budget; requests inject User B's `userId` in payloads to confirm the server enforces owner scoping from the session. User B must not be able to:

- read User A's balances, transactions, or savings;
- read User A's private categories/budgets or attach budgets to User A's categories;
- view User A's reports, dashboards, or recent activity;
- retrieve User A's transactions by ID.

CI executes this suite alongside MySQL integration tests against temporary schemas. Endpoints tested include wallet, ledger, savings, categories, budgets, monthly reports, and dashboards. Existing issue/IDOR tests continue running independently.

Workflow [#6 on commit `5ee8858`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) passed `db:datatest`, MySQL domain integration, HTTP contract smoke, and Auth MySQL integration on isolated CI databases. Workflows [#7 on commit `3bf6c0c`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113725073), [#8 on commit `4bbdb61`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36116299740), [#9 on commit `ed62986`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117022485), [#10 on commit `dd90c11`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117665453), and [#11 on commit `5bc7185`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) passed all workflows. Run #11 verified CSRF/Origin/logout regressions on isolated CI MySQL. Dual-user tests confirmed out-of-owner category budgets return `404 NOT_FOUND`; Google OAuth redirects are validated via HTTP responses without outbound network calls. This represents temporary CI DB evidence and does not substitute for staging SMTP or production validation.

### Completion Criteria

- Database: marked complete only when `db:datatest` and all three MySQL integration suites pass against dedicated test services/schemas.
- Staging Auth: marked complete only when registration and password resets receive live emails, with OTP, session, CSRF, and logout behaviors confirmed via UI/API.
- Owner Scoping: marked complete only when HTTP integration tests pass with two concurrent users/sessions, proving Session B cannot view or modify User A's records.
- When steps cannot execute due to missing staging environments, services, or mailboxes, record status as `pending` with explicit rationale; never mark passed based on mock tests.

## Environmental Evidence Provided by Team Leader (2026-09-25)

- `npm run db:status` reported migrations `0001`–`0005` applied without checksum mismatches.
- `npm run db:preflight` identified the target schema as `campus_coin`, MySQL `8.4.8`, TLS negotiated, and `applied=5 pending=0`. This does not validate clone schema `campus_coin_done`; both read-only commands must re-run with `CAMPUS_COIN_DB_NAME=campus_coin_done`.
- The provided Aiven Service URI ends with `/defaultdb`; this suffix does not confirm clone `campus_coin_done` exists or is accessible.
- Running read-only checks with `CAMPUS_COIN_DB_NAME=campus_coin_done` using current app configuration returned `Unknown database 'campus_coin_done'`. Developer B must confirm schema names, targets, and credential permissions; DBeaver schema listings do not prove application credentials have access.
- `npm run db:verify-clone` halted at the read-only preflight stage with the same error. Downstream `db:status`, `db:datatest`, and MySQL integration suites did not run; no schemas were created or deleted.
- Preflight logged two `WARN` messages for charset and connection pool; run details showed `utf8mb4/utf8mb4_0900_ai_ci` and pool size `5` against `max_connections=76`.
- Initial `db:datatest` achieved `3/15`. Twelve `expect-error` files were misinterpreted as successful runs due to CRLF `\r` trailing characters. The parser was fixed and verified with regression tests; `db:datatest` must re-run against a verified test MySQL service. Previous runs cannot be marked passed.
- Team Leader confirmed Part 2 auth staging complete: registration/reset emails, invalid/expired/resend OTPs, and logout/sessions. This represents Team Leader reporting; staging URLs and artifacts were not provided for independent verification in this task. SMTP/provider failure timeout and retry testing remains a separate requirement.
- Team Leader reported Google OAuth linking succeeded on 2026-09-25; environment was not specified. Screenshots showing unconfigured providers reflect prior state. Google login and account-linking must be documented separately once both flows are validated.
