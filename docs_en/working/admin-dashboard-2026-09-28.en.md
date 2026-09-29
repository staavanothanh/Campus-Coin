# Admin Dashboard — Evidence for 2026-09-28

## Account Management Additions (Same Day)

- Backend: `GET /api/v1/admin/users` and `PATCH /api/v1/admin/users/{userId}` in `src/routes/api.ts`, service `src/application/admin.service.ts`, repository `src/infrastructure/persistence/user.repository.ts`.
- Policy: admin-only (403 for other roles), cannot disable the currently active operator account, required reason between 3–500 chars, idempotent via `withIdempotentMutation`, append-only audit event `admin.user.status_change` with reason. Emails in listings are masked (`maskEmail`) — full emails are never returned to admin UI.
- OpenAPI: `docs/contracts/openapi.yaml` + `artifacts/openapi.json` + `artifacts/api.d.ts` regenerated via `npm run api:bundle` and `npm run api:types`.
- UI: "Accounts" tab in `AdminScreen.tsx` (`src/web/features/admin/AccountStatusModal.tsx`), VI/EN, disables action button for currently logged-in account, modal requires reason before submission.

## Admin Metrics Additions (§8 ADMIN-OPERATIONS)

- Backend: `GET /api/v1/admin/metrics` in `src/routes/api.ts`, `getAdminMetrics` + `readAdminMetrics` (`src/application/admin.service.ts`, `src/infrastructure/persistence/admin.repository.ts`).
- Aggregates strictly from `users`, `issues`, `audit_events` — does not read row contents, does not return user total balances, no money/ledger data.
- UI: "Operational Metrics" tab in `AdminScreen.tsx` (`MetricsTab`), VI/EN, grouped into Accounts/Reports/Audit.

## Scope

- Owner boundary: presentation/admin, per `docs/ADMIN-OPERATIONS.md` and existing API contracts.
- Source: `src/web/screens/AdminScreen.tsx`, `src/web/features/admin/`; navigation in `src/web/App.tsx` renders only for `admin`.
- Self-loading queues, cursor pagination, status/priority filters, issue details, triage, append-only notes, and read-only audit trails; VI/EN copy.
- Metrics represent counts for loaded pages with scope labels; does not misrepresent whole-system totals, latency/provider health, or user monetary totals.
- No modifications to API/domain/schema, migrations, financial authority, or out-of-scope JEV changes.

## Evidence

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm run lint`: pass.
- `npm run api:validate`: exit 0, schema valid, 5 pre-existing 4xx warnings noted (not new regressions).
- `npm run api:bundle` + `npm run api:types`: pass, artifacts regenerated from updated OpenAPI.
- `node --import tsx --test test/application/admin-user-management.test.js test/web/admin-model.test.js test/core-routes.test.ts`: 38 pass, 0 fail, 0 skip (prior to adding metrics); after adding metrics, `test/application/admin-user-management.test.js` reports 8 pass including `getAdminMetrics`.
- Playwright smoke (accounts section, same day): list users (masked email), disabled toggle hidden for active account, successful disable with CSRF + Idempotency-Key + reason, EN copy. No DB writes, no live sessions.
- `git diff --check`: pass; Git notes LF/CRLF warnings in working copy files.
- Playwright smoke (dashboard section, earlier): intercepted all `/api/v1/**` with synthetic payloads: triage `open` → `in_triage`, note fails 503 initially then retries successfully with same idempotency key, audit read, EN copy, and `security` role denied in UI. No DB writes or live sessions used.
- Smoke testing revealed note button was out of viewport; modal height limit and scrolling added.

## Gaps and Non-Inferences

- **Owner assignment lacks API/schema contract**: `issues` table lacks an assignee column; adding a column requires a new migration, but target Aiven clone currently has `0032` mismatch + `0033` pending (docs require pausing and manual inspection first). No migrations run; no fake UI simulated assignments.
- **Content/category admin (§5) blocked by trigger `0027`**: trigger `trg_category_update_custom_owner_only` sets `name_en = NULL` for any UPDATE that is not the owner's custom category → all system category changes fail CHECK `chk_categories_name_en_nonempty`. Trigger not bypassed; no API/content versioning in place.
- **Incident/read-only path (§4, §7)**: no flag/incident table exists; building safe controls requires schema + operational decisions, not yet implemented.
- Assign owner was previously not listed; added here for clarity.
- Account management: tests have not run against live admin accounts on a real DB (Aiven clone); no new CI run for this commit. Emails displayed only masked. Server-side log/redaction for new action `admin.user.status_change` and `maskEmail` requires team review. No real accounts were disabled during this task.
- Metrics: counts are snapshots at load time; do not infer latency, provider health, JEV cost/fallback, restore results, or error rates as no telemetry sources exist.
- Content/versioning/approval, incident/read-only operations, and system-wide metrics lack APIs for safe controls; do not add client-side self-authorizing controls.
- Live admin/API/DB, owner/403 isolation, and audit persistence were not exercised in this task. Do not infer backend authorization from intercepted smoke tests. Two API entrypoints have differing audit policies; UI tasks do not alter server policies.
- Input report/note masking and server-side privacy require separate review; UI warnings do not replace server redaction or authorization.
- No commits, pushes, deployments, or migrations performed.
