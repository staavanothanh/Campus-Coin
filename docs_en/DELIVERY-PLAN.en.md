# Delivery Plan — Campus Coin

> Updated: 2026-09-26 · Owner: Team Leader — Hiệp
> Auth decision sources: [ADR-0008](./adr/0008-email-password-otp-auth.en.md) and supplemental Google Sign-In at [ADR-0009](./adr/0009-optional-google-sign-in.en.md)

This document records operational delivery status and release gates. The Team Leader confirmed retaining email/password/OTP alongside optional Google Sign-In; production readiness is an independent status substantiated only by empirical evidence.

Detailed guidance for isolated MySQL testing, staging auth/email validation, and owner scoping resides in [DB-STAGING-TESTING.en.md](./DB-STAGING-TESTING.en.md). Scoring rubrics and evidence requirements reside in [QUALITY-AND-SCORING.en.md](./QUALITY-AND-SCORING.en.md); technical principles and practical applications in [ENGINEERING-PRINCIPLES-APPLICATION.en.md](./ENGINEERING-PRINCIPLES-APPLICATION.en.md); decisions and current statuses in [CURRENT-STATUS.en.md](./CURRENT-STATUS.en.md).

## 1. Finalized Product Flows

```text
register → OTP-only screen/API verify → account details/final OTP consume → login → session
forgot password → OTP-only screen/API verify → new password/final OTP consume
Google Sign-In (optional) → verify OIDC → session
active session → explicitly link Google
```

When Google is unconfigured, email flows continue operating normally and provider discovery reports Google as disabled. Never use personal Gmail credentials, Gmail inboxes, or Gmail APIs; do not auto-merge accounts by email. The Team Leader verified staging registration/reset emails function; provider failures, timeouts, and retries require separate verification. Never emit OTPs to logs or dev fallbacks.

## 2. Current Status

### Admin UI Additions (2026-09-28)

The operational dashboard using existing APIs features queues, filters, detail views, status/priority triage, append-only notes, and read-only audit logging in VI/EN. Counts reflect loaded pages only. Typecheck, build, and 31 focused tests pass; Playwright smoke tests use synthetic APIs and do not prove live DB/admin authorization. Assigning owners and content/incident controls lack contracts and are not considered complete. Evidence: [Admin Dashboard](./working/admin-dashboard-2026-09-28.en.md).

### Admin User Management Additions (2026-09-28)

Added `GET /api/v1/admin/users` (masked emails, paginated) and `PATCH /api/v1/admin/users/{userId}` to toggle active/disabled status. Status changes: admin-only, cannot self-disable the active operator account, mandatory reason (3–500 chars), idempotent via `mutation_idempotency`, append-only audit event `admin.user.status_change`. No migrations, no schema modifications, no alteration of roles/balances/ledgers. UI includes an Accounts tab (listing, masked emails, suspend/activate button with reason modal, toggle hidden for current user). Added `GET /api/v1/admin/metrics` (aggregates users/issues/audit, no user total money) + Operational Metrics tab. OpenAPI and artifacts regenerated. Typecheck, lint, build pass; 38 focused tests + 8 admin tests pass; Playwright smoke tests use synthetic APIs. Awaiting: live admin tests against real DB, CI runs, and server-side log/redaction review. Owner assignment and content administration remain blocked pending migration/schema changes. Evidence: [Admin Dashboard](./working/admin-dashboard-2026-09-28.en.md).

| Category | Status | Remaining Proof / Gate |
|---|---|---|
| Auth Decisions & Canonical Docs | Finalized; ADR-0008 governs email auth, ADR-0009 adds optional Google | Team Leader reported Google OAuth linking succeeded; environment and dual login/linking execution unverified |
| Auth Implementation | Email/OTP, Google OIDC start/callback, explicit linking, provider discovery, opaque sessions, CSRF/Origin, login rate-limiting implemented; `verify-otp` validates without consuming so completion endpoints re-verify and consume atomically | Build and OpenAPI validation pass for new endpoints; MySQL integration passed previously on disposable CI DB but needs re-run for new flow; SMTP failures and staging CSRF/Origin checks pending |
| Google Sign-In | Server-side SDK, PKCE S256, state, nonce, verified email, Google `sub`; never stores tokens or calls Gmail API | Team Leader reported connect succeeded; lacks separate evidence for Google login vs linking, or fresh CI runs |
| Shared Migration Sequence | `0031_create_oauth_challenges.sql` matches applied row on shared DB; email auth and rate-limiting are local `0032`/`0033` | `npm run db:preflight` must pass with `0032`/`0033` pending; do not run `db:migrate` on shared DB until owner/grants/backup verified |
| Migration `0004_email_auth.sql` (alternate Aiven chain) | `npm run db:status` on 2026-09-25 reported applied on configured `campus_coin` schema | No evidence for `campus_coin_done`; current credentials return `Unknown database`; DevB must confirm service/schema/grants |
| Migration `0005_auth_rate_limits.sql` (alternate Aiven chain) | `npm run db:status` on 2026-09-25 reported applied on configured `campus_coin` schema | No evidence for `campus_coin_done`; current credentials return `Unknown database`; DevB must confirm service/schema/grants |
| Aiven Query Access | `.env` connects to `campus_coin_clone`; MySQL 8.4.8, TLS pass, 31 migration rows read read-only | `0032`/`0033` unapplied on target; confirm owner/grants before executing migrations |
| Running `db:datatest` outside CI | Team Leader ran suite on Aiven MySQL and received `3/15` due to 12 negative test files misparsed | CRLF parser fixed; regression tests pass in 20 unit tests, typecheck/build pass. Database suite not yet re-run on clone target |
| SMTP / Email | SMTP adapter has 10s timeout, max 2 attempts, fail-closed error handling; local regression tests bounded timeout/retry with hanging server; no OTP log/dev fallbacks | DevD executes controlled outage in isolated Preview, verifies `EMAIL_UNAVAILABLE`, confirms zero log leaks, restores service, and verifies live register/reset delivery |
| Domain APIs | Auth, preferences, wallet, ledger, savings, categories, budgets, reports, issues, admin wired to application services; client supports standard HTTP methods | OpenAPI declares `403` for Origin on auth mutations; 5 non-blocking warnings on discovery/redirect/health; requires integration review with Developer B |
| UI | Auth UI has basic validation/accessibility and dual languages; post-login landing currently only greets user, connects Google, logs out | Missing domain UI for wallet onboarding, dashboards, income/payment/history, savings, categories/budgets, reports, admin queues; major functional milestone |
| CI | Workflow includes disposable MySQL service; runs typecheck, build, API validate/artifacts, auth/schema/Google/client-IP tests, DB guard, `db:datatest`, 3 MySQL suites | [Workflow run #11 on commit `5bc7185`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) passed entire workflow, including new CSRF/Origin/logout tests; [run #6 on code commit `5ee8858`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) passed `db:datatest` and all 3 MySQL suites |
| Domain Owner Isolation via HTTP | Dual-user tests cover wallet, ledger, savings, category, budget, report, dashboard; spoofed `userId` payloads do not alter owner | Auth MySQL integration passed in run #6; out-of-owner categories return `404 NOT_FOUND` and block budget creation |
| DB Branch Integration | Retain `hiep` as product branch; no wholesale branch merges | `origin/thien` committed `node_modules/` and `dist/`; `database-ingest-0.2` has 22 simulated conflicts with `hiep` and reuses numbers `0004`/`0005`. DevB must confirm apply/restore history before selective porting |
| Production / Restore | Zero evidence recorded | Requires backup/restore rehearsal, CA chain/role grants, TLS/connectivity, redacted logs, and rollback drills |
| Vercel Runtime / Deploy | Node.js Function adapter, SPA/API routing, max duration 60s, MySQL pool lifecycle hook, and manual deployment workflows added | DevD configures secrets/env and GitHub Environment; runs Preview post-CI, verifies app/API readiness. Deploy evidence not yet gathered |
| Cloud Benchmark | Local reference numbers only in `db/README.md`; no cloud measurements or repeatable harness. Pool hooks close idle connections on suspension but do not prove capacity | Following DB clone and runtime verification, measure report/dashboard/list/payment; document environment, load, p50/p95, connection headroom, query plans; never use real data |

Do not infer DB, SMTP, cloud, or production health from configuration presence, migration files, or superficial `SELECT 1` queries.

## 3. Auth and Security Gates

- Login account+IP rate limits, OTP attempt tracking/backoffs, and quotas implemented in MySQL; OTP resend cooldown does not consume send quotas; passed CI run #6. `X-Forwarded-For` trusted only when socket peers match `TRUSTED_PROXY_IPS`; unit tests cover spoofed headers.
- OTP expiration, max attempts, resend cooldowns, and single-use enforcement pass in CI MySQL suites. Team Leader confirmed staging Part 2 complete; live execution in this task pending. Google OAuth linking reported successful; specific flows unverified. SMTP failure handling and timeouts require testing.
- Cookies use `HttpOnly`, `Secure` in production, `SameSite`, expiration, revocation, logout, and session revocation on password resets; covered by CI.
- CSRF/Origin integration tests added to CI; contract strictly enforces Origin, rejecting Referer fallbacks. API responses and redirects send `Cache-Control: no-store, private`. Active sessions reject invalid CSRF with 403; expired sessions clear cookies idempotently. Staging CSRF/Origin and live SMTP outages require verification; standardized error envelopes verified in integration tests.
- Email: real SMTP provider adapter, timeouts, bounded retries, code reuse during retries, sanitized errors; no OTP leakage to logs/dev fallbacks.
- UI: register/verify-otp/resend/account details/login/forgot/verify-otp/new password, two-step verification with atomic final consumption, loading/error/success/expired/locked states, VI/EN parity, keyboard/focus/ARIA, double-submit prevention. Build passes; browser E2E for new OTP screens pending.

## 4. DB Handoff and Migrations

Before running migrations, confirm database ownership/purpose, verify environments are non-production, ensure backups are restorable, and check migration status. `db:datatest` and MySQL integration tests create and drop temporary databases; run strictly on isolated DB services with create/drop permissions.

Current Aiven connection details specify `defaultdb`; this name does not prove the database is `campus_coin`. Never direct `db:migrate`, `db:datatest`, CI harnesses, or seed scripts against this target. Run read-only queries (`SELECT 1`, `SELECT DATABASE()`, `SELECT VERSION()`, `SHOW TABLES`) until the Team Leader / DB owner verifies the target. Runtime must not use `avnadmin`; least-privilege roles required.

## 5. API and Domain Integration

Routes handle only validation, authentication, authorization, and serialization; business logic executes within application services and repositories. `user_id` is derived exclusively from server sessions. Paths for wallet, ledger, savings, categories, budgets, reports, issues, and admin are mapped per `docs/contracts/openapi.yaml`. CI must verify status codes and owner isolation; JEV currently has no runtime route.

## 6. CI and Verification Gates

Minimum CI execution:

```bash
npm run typecheck
npm run build
npm run api:validate
npm run api:bundle
npm run api:types
git diff --exit-code -- artifacts/openapi.json artifacts/api.d.ts
node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts test/env.test.ts tests/api-cache-header.test.ts
node --import tsx --test tests/vercel-adapter.test.ts tests/mail.test.ts
node --import tsx --test tests/db-test-guard.test.ts tests/datatest-sql-file.test.ts tests/db-clone-script.test.ts
npm run db:datatest
npm run test:auth-security
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/mysql.integration.test.ts
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/e2e.contract.smoke.test.ts
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/auth.mysql.integration.test.ts
```

MySQL tests use disposable instances provisioned by CI, never Aiven `defaultdb` or shared databases. `test:auth-security` executes fast CSRF/Origin checks and subsequent valid mutations. `db:verify-clone` runs local preflight/status against `campus_coin_done` before creating and dropping temporary test schemas on the same host. Auth MySQL E2E covers user journeys, cookies/sessions, CSRF/IDOR, OTP lifecycle, rate limiting, and failure handling using mock email adapters; mock adapters do not prove live email delivery. Pass status is reported only for verified CI jobs.

## 7. Evidence Log (2026-09-24 to 2026-09-26)

Historical notes record milestones at run time; active status resides in [CURRENT-STATUS.en.md](./CURRENT-STATUS.en.md). CI run #6 confirmed 3 MySQL suites passed on disposable DBs; runs #7, #8, #9, and #10 confirmed full workflows across commits `3bf6c0c`, `4bbdb61`, `ed62986`, and `dd90c11`.

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm run api:validate`: exit 0, valid schema; 5 non-blocking lint warnings on missing 4xx declarations for discovery, redirect/callback, and health endpoints.
- `npm run api:bundle` and `npm run api:types`: pass; regenerated from `docs/contracts/openapi.yaml`.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts`: 21 tests pass; covers Google config, PKCE S256, state, cookie signatures, callback cancellation, and 10-minute TTL. Nonce transmitted in authorization request and verified against ID token; live token exchange unverified.
- `node --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts`: 3 gated suites skipped without isolated MySQL; auth tests include explicit linking cases for existing emails.
- `npm run db:datatest` and gated MySQL integration require dedicated disposable MySQL instances.
- Google OAuth live callback unexecuted without verified client credentials and callback configurations. Team Leader reported successful linking; test scope unverified.
- Dedicated Aiven target unconfirmed. Team Leader reported staging email delivery complete; provider outage timeouts/retries, backup/restore, and fresh CI runs require evidence.

### Additions (2026-09-25)

- `npm run db:status`: configured DB reported `0001`–`0005` `applied`. Validates current target only, not CI/staging/production.
- `node --import tsx --test tests/auth.test.ts`: 15 tests pass, including local development Origins; `node --import tsx --test tests/client-ip.test.ts`: 4 tests pass, including spoofed `X-Forwarded-For`.
- `npm run typecheck`, `npm run build`, and `git diff --check`: pass. `npm run api:validate`: exit 0 with 5 documented warnings.
- Local browser checks: invalid emails display inline errors; password hidden by default, toggled via reveal button, and auto-hidden on blur. No OTP dispatched during this check.
- Health/readiness returns `pass`; probing auth endpoints with empty bodies via `http://127.0.0.1:5173` passes Origin checks and stops at `422 VALIDATION_ERROR` prior to DB or email access.
- `db:datatest`, auth MySQL integration, live SMTP send/receive, Google OAuth live, and backup/restore remained unexecuted at this checkpoint.

### Team Leader Confirmations (2026-09-25)

- `npm run typecheck`, `npm run build`, `npm run api:bundle`, and `npm run api:types`: pass.
- `npm run api:validate`: exit 0; OpenAPI valid with 5 warnings. Contract declares `403 ORIGIN_INVALID` for missing auth mutations.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts`: 27 tests pass.
- Team Leader confirmed Part 2 staging complete: registration/reset emails, invalid/expired/resend OTPs, logout/sessions. Reported by Team Leader; unverified independently in this task; provider outage timeout/retry remains pending.
- Do not run `db:datatest` or MySQL integration on Aiven `defaultdb`: test suites create and drop temporary databases, and this target is not confirmed isolated.
- Workflow run #9 passed the entire workflow on GitHub Actions.

### Code Updates (2026-09-26)

- Added `api/v1/[...path].ts`, `vercel.json`, and manual deploy workflows. Production deploys strictly from `hiep`; Vercel secrets and deployment settings unverified in this pass.
- Vercel adapter disables platform body parsers to enforce uniform payload limits; calls existing `handleRequest`.
- `@vercel/functions` attaches MySQL pool to close idle connections upon suspension; does not substitute for load-based capacity benchmarking.
- DB adapter reads CA PEM from `CAMPUS_COIN_DB_CA_BASE64` for `verify-ca` on serverless; avoids committing CA files.
- `getSession()` updates `last_seen_at` when unset or older than one minute.
- Added owner regression tests for foreign corrections, foreign category PATCH, and cross-owner `relatedTransactionId`.
- Added local SMTP adapter timeout/retry test using a hanging server; this is not a staging provider test.
- Origin-only enforcement and `Cache-Control: no-store, private` synchronized across documentation and OpenAPI.

## 8. Developer B Coordination

Detailed protocols for preventing destructive testing on shared databases reside in [DB-STAGING-TESTING.en.md](./DB-STAGING-TESTING.en.md).

- Synchronize migration `0004` and DB handoffs; never edit applied migrations.
- Confirm target schema, preflight/status, backup/restore, and grants on an isolated database.
- Enforce least-privilege runtime roles; never use `avnadmin` at runtime.
- Distribute Aiven CAs via environment secrets; runtime supports `CAMPUS_COIN_DB_CA_BASE64` for serverless functions. Never commit CA files or certificates.
- Wire domain routes to services, execute tests on isolated DBs, and deliver evidence to the Team Leader.

### Additions (2026-09-25)

- Team Leader reported `db:status`/`db:preflight` on configured schema `campus_coin`: migrations `0001`–`0005` applied, TLS pass, MySQL `8.4.8`, `applied=5 pending=0`; preflight logged warnings for pool `5/76` and charset `utf8mb4/utf8mb4_0900_ai_ci`.
- Read-only preflight overriding schema to `campus_coin_done` returned `Unknown database`. Migrations not applied to clone.
- Team Leader's `db:datatest` run achieved `3/15` due to CRLF carriage return parsing errors. Parser fixed and verified with regression tests; re-running full suite awaits verified target clone.
- Team Leader reported Google OAuth linking succeeded. Environment unstated; login and linking must be verified separately.
- Separated `test:auth-security` into dedicated script and CI step, verifying 403 responses on unauthorized attempts and valid wallet creation on authorized requests. Workflow run #11 passed on isolated CI MySQL; clone preflight still returns `Unknown database`.
- Added `npm run db:verify-clone`: performs read-only preflight on `campus_coin_done` before creating/dropping temporary test schemas. Halts at preflight without write operations.
- Post-change checks passed: typecheck, build, 36 unit tests, syntax checks, `git diff --check`. Commit `5bc7185` pushed; workflow run #11 passed. Aiven clone and staging CSRF/Origin remain pending.

## 9. GO / NO-GO Blockers

| ID | Blocker | Owner | Resolution Criteria |
|---|---|---|---|
| `BLK-OWNER-01` | Migrations `0011`/`0013`/`0014` add composite FKs and `0018`/`0020`/`0023` block cross-owner/type SQL | B | `db:datatest` 30/30 pass on local portable MySQL 8.0.41 (post-`0011` repair); await CI re-run and Team Leader approval |
| `BLK-IDEMP-01` | Injected DB helper; category/budget claims, replays, conflicts with body hashes and audits atomically | B | Unit/typecheck pass; concurrency/replay/integration passed locally (MySQL 8.0.41); await CI re-run |
| `BLK-API-01` | Fetch-compatible handlers for core/issue routes, validation, Origin/CSRF port, and envelopes | A + B | Await host mount, trusted auth/session adapter, and distributed rate limiting; route unit tests do not replace OAuth/session integration |
| `BLK-ISSUE-01` | Issue service/repository owner scope, related transaction ownership, atomic events/audits, admin role checks | B | Gated MySQL tests passed locally; admin roles must originate from trusted session adapter |
| `BLK-MIG-01` | `cmdUp` locks prior to loading/re-planning; concurrency integration tests pass | B | Unit and concurrency integration passed locally (MySQL 8.0.41); await CI re-run |
| `BLK-MIG-02` | Fresh MySQL 8.0.41 migration failed at `0011` (self-FK index timing); repaired by ordering DDL while preserving semantics | B + Team Leader | Repaired in PR #1 merged per Team Leader; branch `database-ingest-0.2` carries remaining history |
| `BLK-HARNESS-01` | Harness uses shared `sslOption`, dedicated migration principal for trigger `DEFINER`, runtime table/column grants | B | Resolved gaps: definer missing column updates and SELECT access; runtime missing updates for locking reads; trigger DEFINER verified locally; Aiven CA provenance/role pending |
| `BLK-MATH-01` | Checked arithmetic and exact integer parsing for money/report/projection paths | B | Focused unit and all gated MySQL suites passed locally (including BIGINT SUM and reconciliation); await CI re-run |
| `BLK-CURSOR-01` | Versioned HMAC-SHA256 cursor, mandatory key, bounded limits and lengths | A + B | Tamper and boundary tests pass; key rotation and production secrets remain deploy gates |
| `BLK-GRANT-01` | ADR-0008 places row-level authorization in service; DB enforces integrity, append-only, and column grants | B + Team Leader | Architecture locked; negative tests passed locally; direct SQL via runtime credentials is a residual risk noted in ADR-0008; production grants/TLS/restore await operator evidence |
| `BLK-AUDIT-01` | Category updates and audit inserts commit/rollback within same transaction | B | `updateUserCategory` wrapped in transaction; unit rollback and integration passed locally; await CI re-run |
| `BLK-CI-01` | Workflow splits unit, four MySQL suites, and OpenAPI validation; disposable MySQL service | B + D | Run `36100878978` (post-repair): success, all 15 steps green including four MySQL suites on disposable MySQL 8.0.41 |
| `BLK-RECON-01` | `db:reconcile` reconciles projections from immutable rows; `/health/ready` pings DB | B | Fixed camelCase alias bug causing exceptions on real MySQL; reconciliation passed in local integration; restore rehearsal and reconciliation on cloud target await operator |
| `BLK-OPSLOG-01` | Migrations `0028`–`0030` create append-only `db_operation_logs`; CLI uses `cc_ops` INSERT-only; CI logs in GitHub | B | DDL, CLI INSERT, and UPDATE/DELETE guards passed locally (`0001`–`0030` fresh); not yet applied to Aiven (operator-gated) |

### Aiven Findings (2026-09-25, read-only probe on `database-ingest-0.2`)
- Free-tier service auto-slept, causing NXDOMAIN; manually awakened and reconnected.
- Database `campus_coin` is **shared**: contains tables from another chain (`app_log`, `auth_credentials`, `auth_rate_limits`, `email_otps`) and `schema_migrations` records `0004_email_auth.sql` + `0005_auth_rate_limits.sql` (applied 2026-09-24) — colliding with versions `0004`/`0005` in our chain. Engine correctly failed closed.
- Objects for `0004`/`0005` from our chain did not exist on Aiven; `0001`/`0003` matched current DDL intent.
- Test data from our chain: users `999001`/`999002`, ledger 60 rows, savings_transfers 20 rows, categories retained 11 seeds; `wallet_accounts` 0 rows, triggers had 8 append-only guards from `0001` (DEFINER `avnadmin@%`).
- `cc_migrate`/`cc_runtime` not provisioned; current credentials represent provider admin (DBA use only).
- Team Leader elected to **converge on shared DB**; test data cleaned in a controlled manner, preserving seeds and third-party tables.
- **Phase 1 complete (2026-09-25):** Dropped 8 append-only triggers from `0001` → deleted test data for users `999001`/`999002` → recreated identical triggers → verified 11 seeds, 0 counts, 8 guards, other chain intact.
- **Convergence complete (2026-09-25):** DBA manually applied content of `0004`/`0005`. `db:status`/`db:preflight` on Aiven cleared failures: `0001`–`0003` clean, `0004`/`0005` external, pending `0006`–`0030` (25 files). ADR-0009 formally accepted by Team Leader.
- **Line-ending lesson (2026-09-25):** Checkout with `core.autocrlf=true` converted working tree to CRLF, breaking file checksums (false mismatch on `0002`). Pinned `.gitattributes` (`eol=lf` for sql/ts/mjs/json/yaml/md) and rewrote working tree; historical pins removed because LF files match recorded checksums byte-for-byte.
- **Migrations & roles complete (2026-09-25):** Provisioned `cc_migrate`/`cc_runtime` per `db/grants.example.sql` in two phases; ran `migrate up` via `cc_migrate` applying `0006`–`0030` on MySQL 8.4.8; `db:status` clean (28 applied, 0 pending); `db:reconcile` passed (0 users).
- **Team clone complete (2026-09-25):** Created `campus_coin_clone` on same service, copying 19 tables, 22 triggers, 28 foreign keys. User `cc_tester` granted DML only on clone, verified login and rejection from primary DB.
- **Review fixes (2026-09-25, verified locally):** Added UPDATE grants on trigger-assigned columns for migration role; added 3 CI gates (`db:datatest:ci`, ops-log integration, CLI migrate fresh/idempotent); relaxed empty password guard on loopback; dispatcher accepts optional `/api/v1` prefix once. Local gates pass: 116 pass / 0 fail, datatest 30/30.
- Remaining operational gates: switch app `.env` to `cc_runtime` and run smoke/reconcile; restore rehearsal; open PR from `0.2`/`0.3` to execute 3 new CI gates; merge to `main` upon Team Leader decision.

### Pre-Merge Cleanup

- [x] Corrected `docs/working/aiven-handoff.md`: no unverified CA/endpoint claims; admin credentials prohibited at runtime.
- [x] Benchmark creates and drops unique local-only schemas; never deletes append-only history.
- [x] Enforced `test:mysql:required`; default `npm test` may skip DB suites and does not constitute MySQL verification.
- [x] PR #1 merged after green CI (runs `36100878978`, `36101142911`) and reverted per Team Leader direction (branch push only); `main` lacks fixes and correctly fails CI.
- [ ] Remaining `BLK-MIG-02` production tasks: switch app `.env` to `cc_runtime` and verify smoke/reconcile; execute restore rehearsal; open PR from `0.2`/`0.3` to trigger CI; merge to `main` upon Team Leader approval.

### Recommended Merge Order

1. Owner isolation + idempotency.
2. API routes/envelopes + issue/admin boundaries.
3. TLS harness and migration/restore/reconciliation.
4. Arithmetic overflow protections + signed cursors.
5. Integration/E2E gates executed against real MySQL.
6. Branch `database-ingest-0.2`/`0.3` carrying `BLK-MIG-02` production tasks; CI green on run `36100878978`, 3 new gates await next PR.

Prior launch blockers regarding OAuth/IDOR, provider/region/restore, domain invariants, secrets/PII, accessibility, and rollbacks remain active. OpenRouter claims remain pending; JEV can stay disabled.

## 13. Related ADRs

[ADR-0003](./adr/0003-cloud-mysql-validation-gate.en.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.en.md), [ADR-0007](./adr/0007-five-day-thin-slice.en.md), [ADR-0008](./adr/0008-runtime-row-authorization-boundary.md).
