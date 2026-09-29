# CC-002 — Authentication and Security Handoff

- **Human Owner:** Developer A
- **Status:** Recommendations integrated; do not reopen legacy local auth.
- **Decisions:** [ADR-0001](../adr/0001-google-oauth-only.en.md), [ADR-0002](../adr/0002-opaque-browser-session.en.md).

## Finalized Scope

MVP strictly uses Google OAuth Authorization Code + PKCE. Identity is `(google, sub)`. Callback verifies state, nonce, PKCE, issuer, audience, expiry, and verified email, then establishes an opaque server-side session.

No local registration/passwords, password credentials, account linking, OTP/password resets, Gmail inboxes, Gmail API read/send access, or security emails.

## Controls

- One-time challenges, short TTL, bound to browser flow.
- Session ID generated via CSPRNG; DB persists hash, user, expiry, revocation status, and minimal metadata.
- Cookies use `HttpOnly`, `Secure`, `SameSite=Lax`; no tokens in localStorage or URLs.
- Mutations validate CSRF or Origin, schema, and idempotency.
- `user_id` is invariably derived from session; 401 and 403 are strictly segregated.
- Provider and DB failures fail closed, preventing financial row creation.
- Logs must not contain OAuth codes/tokens, cookies, secrets, raw claims, raw JEV payloads, or complete ledger records.

## Acceptance

1. Callback mismatches, replays, or claim errors never create a session or user mapping.
2. User A cannot view or mutate User B's resources by substituting IDs.
3. Session expiration, revocation, or user disabling blocks API access prior to data read.
4. Admins cannot mutate ledgers, balances, or audit trails.
5. OAuth/DB failures return safe bilingual error responses in `en`/`vi`.

## Handoff

Developer A supplies session owner context and CSRF verification results to B; auth states to C; and environment, redirect, and rollback evidence to D. Team Leader approves production callbacks and GO/NO-GO. Canonical details reside in `AUTHENTICATION.md`.
