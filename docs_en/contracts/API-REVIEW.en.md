# API Risk Review — Campus Coin

> Updated: 2026-09-26 · This is a working review; current API decisions are reflected in `AUTHENTICATION.md` and `contracts/README.md`.

## Security Gates

- All API responses, including redirects, must return `Cache-Control: no-store, private` and must never be cached at the edge.
- State-changing requests validate the Origin allowlist prior to body/CSRF parsing; `Referer` does not substitute for Origin and is ignored.
- CSRF tokens must bind to the active session and automatically invalidate upon session revocation.
- Logout for an active session still requires a valid CSRF token; invalid CSRF must return `403` and retain the session. When the session is no longer valid, logout must be idempotent: return success and clear cookies, even if the client sends a stale session cookie.
- Owner is derived from session; cross-owner resources return 404 or 403 per contract without leaking entity existence.
- `relatedTransactionId` in support issues must verify ownership.

## Administration

- Do not use `INITIAL_ADMIN_GOOGLE_SUB` to automatically re-elevate roles on each callback.
- Admin role provisioning requires explicit seed/CLI commands or one-time verified bootstrapping; roles are subsequently retrieved from the database.
- Roles must follow least-privilege; support agents do not view audit logs by default, while security roles do.
- Admins must not invoke monetary mutations or alter ledger records, balances, or audit entries.
- System category/content/feature flag mutations, if needed, must use dedicated admin endpoints with reason, versioning, approvals, and audit logging.
- Incident read-only/kill-switch capabilities require dedicated operational design prior to production, rather than silent addition to MVP contracts.

## Ledger Corrections

- Public user corrections should only expose reversals unless an explicit product decision dictates otherwise.
- Correction rows inherit the transaction type of the target; clients do not supply the type.
- Only target original transactions lacking prior reversals; do not allow chaining reversals or reversing corrections.
- Reversing an income transaction must verify that wallet balance remains non-negative; transactions must roll back atomically on failure.
- Correction timestamp and report semantics must be established to prevent distorting HCMC monthly reports.
- `adjustment` and `replacement` remain internal domain commands until formal contracts and UI approvals are finalized.

## Responses and Pagination

- JSON APIs use a consistent envelope: `{ success, data, error, meta }`; 204 No Content is an exception with no body.
- Budget warnings reside in `data.budgetWarning`.
- Keyset pagination uses opaque signed/validated cursors with `hasNext` and `limit`; never return exact `total` for large ledger lists.
- Error codes must be locale-neutral; messages must never leak stack traces, provider payloads, or secrets.

## Domain Scope

- Savings does not expose `targetAmountVnd` in MVP if the domain model has not finalized it.
- No `DELETE` on categories; use disable/retire to preserve history.
- Idempotency checks precede domain existence checks to allow network retries to return stored results.
- Date filters must explicitly declare `Asia/Ho_Chi_Minh`, local date, or UTC instant; month format is `YYYY-MM`.

## Status

OpenAPI is currently a parsed and validated draft contract. Redocly still emits style/strictness warnings regarding operationId, tag descriptions, license URLs, and 2xx/4xx responses for redirect/health checks; these need hardening before considering the contract review-ready. This review does not constitute implementation or production readiness.
