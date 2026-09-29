# Current Status — Campus Coin

> Updated: 2026-09-26 · Integration Branch: `hiep`

This document provides newcomers with current architectural decisions, implemented components, and pending release gates. Decision details reside in ADRs; testing guidelines in [DB-STAGING-TESTING.en.md](./DB-STAGING-TESTING.en.md); delivery progress in [DELIVERY-PLAN.en.md](./DELIVERY-PLAN.en.md).

## Governing Decisions

- Account registration and recovery utilize email, passwords, and OTPs. Google Sign-In is a supplemental option. Refer to [ADR-0008](./adr/0008-email-password-otp-auth.en.md) and [ADR-0009](./adr/0009-optional-google-sign-in.en.md).
- Google OIDC runs server-side, validating state, PKCE, nonce, audience, and email verification; no personal Gmail credentials, inboxes, or Gmail APIs; no Google token persistence; no automatic account merging by email.
- The browser utilizes opaque server-side sessions stored in secure cookies. Request ownership is invariably derived from the session.
- Database is MySQL over TLS; financial transactions are strictly append-only; currency is stored as integer VND. Never use administrative accounts as runtime roles.
- JEV is optional, backend-only, default-off; it possesses zero authority over balances or ledger records.
- Source code must remain readable, linearly structured, and sufficiently simple for team members to explain. Abstractions should only be introduced when justified by concrete requirements.
- The scoring rubric and prioritization order reside in [QUALITY-AND-SCORING.en.md](./QUALITY-AND-SCORING.en.md).

## Pushed Commits on `hiep`

- `4bbdb61` — updated branch status, scoring rubric, engineering principles application, and team coordination checklist.
- `3bf6c0c` — recorded Auth MySQL integration test results and CI run #7.
- `5ee8858` — fixed two CI issues: returning `404 NOT_FOUND` for out-of-owner budgets, and verifying Google redirect without invoking fake hostnames.
- `e9a40d4` — applied semantic HTML/native validation and updated evidence for auth forms.
- `586a7ce` — tuned OTP cooldown/quota logic, trusted only configured proxy IPs, added tests, and updated OpenAPI/artifacts and doc statuses.
- `36ed519` — added guards against destructive MySQL tests and HTTP owner-scoping tests across two user accounts.
- `be7aac6` — partitioned MySQL test suites to isolate CI failures.
- Enforced running DB tests strictly off `defaultdb`. CI provisions isolated MySQL instances; test harnesses generate distinct temporary schemas and drop them post-test.
- Engineering principles questions and implementations documented in [ENGINEERING-PRINCIPLES-APPLICATION.en.md](./ENGINEERING-PRINCIPLES-APPLICATION.en.md); documentation does not claim unexecuted staging gates have passed.
- Team Leader confirmed Part 2 auth staging complete: registration/password reset emails, invalid/expired/resend OTPs, and logout/session revocation. This reflects Team Leader reporting, not an independent live execution within this task; SMTP/provider failure timeouts/retries require independent verification.

## Recent Verification Evidence

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `node --import tsx --test tests/db-test-guard.test.ts`: 3/3 pass.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts`: 27/27 pass.
- `npm run api:validate`: pass; 5 pre-existing lint warnings on 4xx responses for discovery, redirect/callback, and health endpoints.
- Unit suite for auth/schema/client-IP/DB guard/parser/clone scripts: 36/36 pass on post-commit verification.
- [Workflow run #11](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) on commit `5bc7185` passed the entire workflow, including CSRF/Origin and logout regressions on isolated CI MySQL.
- Run #11 preceded changes made on 2026-09-26; it represents historical evidence and does not validate the Vercel adapter, SMTP timeout regressions, or the three new owner regressions.
- [Workflow run #10](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117665453) on commit `dd90c11` passed full workflow after doc evidence updates.
- [Workflow run #9](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117022485) on commit `ed62986` passed full workflow after collaboration conventions were updated.
- [Workflow run #8](https://github.com/staavanothanh/Campus-Coin/actions/runs/36116299740) on commit `4bbdb61` passed full workflow and confirmed branch/rubric doc updates.
- [Workflow run #7](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113725073) on commit `3bf6c0c` passed full workflow prior to the current update.
- [Workflow run #6](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) on commit `5ee8858` passed typecheck, build, API validation/artifacts, unit tests, `db:datatest`, MySQL domain integration, HTTP contract smoke, and Auth MySQL integration on isolated MySQL. Run #7 reconfirmed the workflow after doc updates.
- Earlier, CI identified that requesting a budget for a category outside the owner's scope returned `422` instead of `404`, and Google integration tests automatically followed redirects to mock hostnames. Budgets now correctly return `404 NOT_FOUND` and redirects are captured directly in the response; Run #6 confirmed auth/owner integration passed.

## Testing and Integration Updates (2026-09-25–26)

- Team Leader executed `db:status` and `db:preflight`: target configured in `.env` is `campus_coin`; migrations `0001`–`0005` applied, MySQL `8.4.8`, TLS negotiated, `applied=5 pending=0`.
- The provided Aiven Service URI connects to the verified host/port but includes suffix `/defaultdb`; variable `CAMPUS_COIN_DB_NAME` selects the schema on that host without confirming or creating `campus_coin_done`.
- Running read-only checks with `CAMPUS_COIN_DB_NAME=campus_coin_done` returned `Unknown database`. `npm run db:verify-clone` halted correctly at the preflight stage; no tests executed and no schemas were modified or dropped.
- Initial `db:datatest` achieved `3/15`; CRLF `expect-error` files were incorrectly parsed as successful scripts. The parser was fixed and verified with CRLF regression tests; database tests on the clone service must be re-executed once the target is verified.
- On 2026-09-25, Team Leader reported Google OAuth linking succeeded; the execution environment was not specified. It must be clarified whether both login and account-linking were tested or only one flow.
- CSRF/Origin tests were partitioned into `npm run test:auth-security`, verifying `ORIGIN_INVALID`, `CSRF_INVALID`, logout with incorrect CSRF, and valid mutations. Workflow run #11 passed on isolated CI MySQL; manual staging verification remains pending.
- Logout with invalid CSRF on active sessions is blocked with `403 CSRF_INVALID`; MySQL integration tests include this regression case. Logout when sessions are expired or revoked clears cookies and returns success, satisfying idempotency semantics.
- Added Vercel Node.js Function adapter `api/v1/[...path].ts`, `vercel.json` for routing, and manual deployment workflow `vercel-deploy.yml`. Production deployments strictly target branch `hiep`; Vercel project settings/secrets, Preview deployments, and Production deployments remain unverified.
- Vercel adapter disables platform body parsers to preserve API payload validation, attaches MySQL pool lifecycle hooks via `@vercel/functions`, and supports base64-encoded environment CAs for `verify-ca`. Developer B must confirm DB region and measure pool capacity before concluding performance or capacity bounds.
- API accepts only allowlisted `Origin` headers for mutations; `Referer` does not substitute. All JSON responses and redirects emit `Cache-Control: no-store, private`.
- `getSession()` updates `sessions.last_seen_at` if unset or older than one minute. Auth MySQL integration added negative owner cases for corrections, category PATCH, and issue `relatedTransactionId`; awaiting new CI run.
- Local SMTP adapter test simulates greeting timeouts and verifies bounded retries using Nodemailer against a local server. This does not substitute for testing live SMTP provider outages on staging.
- Local checks on 2026-09-26: `npm run typecheck`, `npm run build` pass; unit/regression suite passes 47/47, including OpenAPI verification of `Cache-Control` on all responses; `npm run api:validate` passes with 5 documented warnings. Owner regressions await a new CI run on this commit.
- Previous checks: 36 related unit tests, `node --check` for both DB clone scripts, and `git diff --check` pass.
- Full `db:datatest` on the Aiven clone remains `pending` until preflight passes and Developer B confirms temporary schema creation/deletion permissions. CSRF/Origin automated checks pass in CI; staging and local clone checks remain pending.

## Branch Audits and Merge Decisions

> Snapshot refs compared on 2026-09-25 against baseline `origin/hiep=4bbdb61`.

- `hiep` is the primary product branch per Team Leader decision.
- `origin/main` at `e4c68fc`; `origin/thien` at `2d54823` trailing `main` by exactly 2 commits. The first commit introduced independent sources to `thien`; the second added pre-built `node_modules/` and `dist/`. Do not merge `thien` directly into the product branch.
- `origin/thiên` (`af2beba`) exists in local remote-tracking refs but not on GitHub; treat as an obsolete ref.
- `origin/database-ingest-0.2` (`0d34c88`) is newer and includes the history of `origin/database-ingest` (`48f8cd4`) plus 7 commits extending migrations through `0030`. If DB features need porting, review `database-ingest-0.2`.
- At baseline `4bbdb61`, `hiep` contained 11 distinct commits relative to remote branches; other branches had distinct commits: `main` 21, `thien` 23, `database-ingest` 13, and `database-ingest-0.2` 20.
- Simulated merge checks at baseline `4bbdb61` showed 17 conflicts with `main` and 22 conflicts with `database-ingest-0.2`.
- Do not auto-merge: both branches assigned different migrations under `0004` and `0005`. In `hiep`, these are auth credentials/OTP and rate limits; in the DB branch, they are idempotency keys and wallet boundaries. File names differ, requiring schema reconciliation beyond Git conflict resolution.
- Required confirmation from Developer B / DB owner: active branch/schema, migration checksums and schema states per environment, test privileges, and backup/restore procedures. Port according to observed reality: do not simply take the highest migration number, do not alter applied migrations, and never use `defaultdb` for destructive testing.

## Remaining UI Scope

- Backend APIs have domain routes and owner-scoping integration verified on isolated CI MySQL.
- Frontend currently provides authentication flows and basic post-login landing (user greeting, Google connection, logout). Domain UI screens for wallet onboarding, dashboards, income/payments, history, savings, categories/budgets, reports, and issues/admin remain unbuilt. The domain APIs do not yet form a complete student MVP user experience.

## Remaining Action Items

1. **Implement initial domain UI slice**: wallet/dashboard, income/payment, and history; followed by savings, category/budget, reports, and issues/admin. Connect existing APIs with owners derived strictly from sessions.
2. **Reconcile SRS with features and tests**: construct requirement matrix → screen/API → test → result. Use the authoritative team SRS without modifying the original.
3. **Auth staging**: Team Leader confirmed Part 2 complete; SMTP provider failure timeout/retry remains an open test case. Clarify Google login vs account-linking testing scope.
4. **Finalize DB with Developer B / DB owner**: confirm isolated test DB, migrations/checksums per target, create/drop permissions, TLS/CA, runtime least-privilege roles, and backup/restore. Never run destructive tests against `defaultdb`.
5. **UI/accessibility/compatibility testing**: keyboard navigation, focus indicators, basic screen reader support, mobile viewports, and Chrome/Firefox/Edge/Opera testing; record browser versions, viewports, dates, and outcomes.
6. **Finalize Project Report and originality evidence**: problem statement, diagrams, module logic, assignments, execution runbooks, limitations, test evidence, and citations; team members must be prepared to defend their implementations.
7. **Final Packaging**: run CI on release commit, verify demo and build artifacts, tag release commit, and bundle submission.
8. **Vercel Preview and SMTP**: Developer D configures environment secrets, awaits passing CI, executes Preview deploy workflow; verifies API readiness, email delivery, controlled provider outage handling, and log redaction. Production deployment runs strictly via GitHub Environment approvals.

Detailed checklists reside in [QUALITY-AND-SCORING.en.md](./QUALITY-AND-SCORING.en.md). Technical principles and implementation statuses are documented in [ENGINEERING-PRINCIPLES-APPLICATION.en.md](./ENGINEERING-PRINCIPLES-APPLICATION.en.md).

## Ownership

- Developer A: Authentication, OTP/email adapters, sessions, CSRF/Origin, and auth UI.
- Developer B: MySQL, migrations, wallet, ledger, savings, budgets, reports, and DB permissions.
- Team Leader: Contracts, integration, verification evidence, and GO/NO-GO determination.
- Developer C/D: UI/accessibility, testing, and deployment per [TEAM-BOARD.en.md](./TEAM-BOARD.en.md).
