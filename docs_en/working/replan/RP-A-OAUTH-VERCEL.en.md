# RP-A — Google OAuth and Vercel Handoff

- **Human Owner:** Developer A
- **Status:** Recommendations consolidated; implementation not yet started.
- **ADRs:** [0001](../../adr/0001-google-oauth-only.en.md), [0002](../../adr/0002-opaque-browser-session.en.md).

## Decisions

MVP uses Google OAuth only. No local passwords, password credentials, account linking, OTP/reset flows, security emails, Gmail inboxes, or personal Gmail credentials.

## Flow

1. Backend OAuth start generates state, nonce, PKCE, and allowlisted return URL.
2. Challenge is one-time, short TTL, bound to browser flow.
3. Callback HTTPS exchanges code server-side; verifies state/PKCE/nonce/issuer/audience/sub/expiry/verified email.
4. Creates/reuses user by `(google, sub)`; rotates opaque server session.
5. Cookie uses `HttpOnly; Secure; SameSite=Lax`; owner resolved from session.
6. Mutations enforce CSRF/origin checks, schema validation, and idempotency.

## Day-1 Gate

Verify exact redirect on Vercel-provided domain, test accounts, claims, callback, session expiry/revocation, IDOR prevention, env validation, and redacted logs. Vercel connection pool must be bounded. No local DB in production.

## Handoff

Developer A provides session/owner/CSRF contracts to B, auth states to C, and env/rollback evidence to D. Auth/provider/DB failures must never create a ledger row. Team Leader approves gates and GO/NO-GO.
