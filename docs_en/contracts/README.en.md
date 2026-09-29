# API Contract — Campus Coin

## Source of Truth

[`openapi.yaml`](../../docs/contracts/openapi.yaml) is the single canonical HTTP contract for the MVP. Do not maintain independent payload schemas in prose, mocks, or manual frontend/backend types.

## Generated Artifacts

Files under `artifacts/` are generated from OpenAPI and must not be edited manually:

- `artifacts/openapi.json`: Resolved OpenAPI bundle.
- `artifacts/api.d.ts`: TypeScript types generated from OpenAPI.

Regenerate:

```text
npm run api:validate
npm run api:bundle
npm run api:types
```

## Mandatory Boundaries

- Prefix `/api/v1`.
- Browser uses opaque server-side session cookies for email/password/OTP and optional Google Sign-In per ADR-0009.
- Google OIDC runs server-side with `openid email profile`, PKCE/state/nonce; no Gmail API/token storage and no auto-linking by email.
- Email OTP passes through the SMTP server adapter; do not use personal Gmail credentials, inboxes, or APIs.
- State-changing requests require Origin/CSRF enforcement. Logout for an active session requires a valid Origin and matching CSRF token; if the session has expired, been revoked, or is absent, the endpoint still returns success and clears cookies to support repeated calls.
- All mutations require `Origin` in allowlist; `Referer` is not a fallback. API responses and redirects use `Cache-Control: no-store, private`.
- Monetary mutations require `Idempotency-Key`; retrying with the same body returns the previous result, while a different body returns a conflict.
- Money is represented as integer VND; ledger types are strictly `income` or `payment`; savings transfers are separated.
- Large listings use opaque keyset cursors and do not require exact `total`.
- JEV currently has no runtime endpoint in OpenAPI; maintain default-off until typed adapter/provider probes and fallbacks are verified.
- Error codes are locale-neutral; displayed messages are controlled by client localization.

## Non-Architectural Implementation Details

API details requiring implementation review that must not alter ADRs unilaterally include: admin role provisioning, least-privilege role list, CSRF token transport mechanism, internal vs user-facing correction commands, read-only incident kill-switches, and idempotency retention policies. When finalizing hard-to-reverse decisions, create separate ADRs following the established procedure.
