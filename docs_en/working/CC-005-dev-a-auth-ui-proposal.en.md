# CC-005 — Developer A's Email Authentication Handoff

Status: email/password/OTP retained per ADR-0008; Team Leader — Hiệp supplemented with optional Google Sign-In per [ADR-0009](../adr/0009-optional-google-sign-in.en.md) on 2026-09-24. This document is an implementation handoff, not a source of canonical decisions.

## Team Conventions Retained

- React + TypeScript/TSX for UI; Node + TypeScript for API.
- Cloud MySQL over TLS; financial data remains owned by Developer B.
- API prefix `/api/v1`, session cookies `HttpOnly`, with Origin and CSRF validation.
- Bilingual Vietnamese and English interface; single shared CSS file for Developer A's trial prototype.

## Finalized Flows

- Register with email, receive OTP, then enter code, full name, and password to create account.
- Sign in with email and password. No OTP required on routine logins.
- Forgot password: email → OTP → new password.
- Optional Google Sign-In; existing users explicitly link Google after login. Do not use Gmail credentials/inbox/API, and do not auto-link accounts by email.

## Flow by Directory

```text
src/app/App.tsx
  → src/features/auth/auth.api.ts
  → src/routes/api.ts
  → src/features/auth/auth.service.ts
  → src/infrastructure/google-oauth.ts → Google OIDC (only when configured)
  → src/infrastructure/db.ts → src/infrastructure/db/pool.ts → MySQL
  → src/infrastructure/mail.ts → SMTP (only when sending OTP)
```

`src/features/auth/security.ts` hashes passwords, OTPs, and session tokens. `src/app/text.ts` contains Vietnamese and English strings. `src/styles/main.css` holds general styles.

### Registration

1. `App.tsx` sends email to `POST /auth/register`.
2. `register()` checks email is not in `users`; `issueOtp()` stores hashed code in `email_otps` and sends email.
3. At this stage, **neither `users` nor `auth_credentials` are created**.
4. User enters OTP, full name, and password in `App.tsx`; form calls `POST /auth/verify-registration`.
5. `verifyRegistration()` validates the code. If valid, creates `users` then `auth_credentials` within the same transaction. If invalid, increments attempt counter.

This pattern avoids needing to delete `users` if SMTP delivery fails, preventing foreign key complications from `auth_credentials`. Codes expire in 5 minutes, allowing a maximum of 5 failed attempts; resend has a 60-second cooldown.

### Login and Forgot Password

- `login()` reads `users` and `auth_credentials`, validates password, `active` status, and verified email; creates `sessions` and sets cookie.
- `getSession()` reads cookie on page refresh. `logout()` revokes session and clears cookie.
- `resendOtp()` accepts `purpose`: `registration` or `password_reset` matching OpenAPI.
- `forgotPassword()` sends reset OTP for valid emails but consistently returns a generic response to prevent email enumeration.
- `resetPassword()` verifies OTP, updates password, and revokes prior sessions.

## MySQL Tables

| Table | Source | Role |
|---|---|---|
| `users` | Developer B migration `0001` | Accounts, roles, status |
| `sessions` | Developer B migration `0001` | Active sessions |
| `auth_identities` | Developer B migration `0001` | Google `sub` mapped to user per ADR-0009 |
| `auth_credentials` | Migration `0032` | Password hash and salt |
| `email_otps` | Migration `0032` | Hashed OTP, purpose, expiration, failed attempts |
| `auth_rate_limits` | Migration `0033` | HMAC buckets by account/IP, attempt counts, lockout expiry |

Files `0031_create_oauth_challenges.sql`, `0032_email_auth.sql`, and `0033_auth_rate_limits.sql` exist in the repository; `0031` matches the OAuth row applied on the target, while `0032`/`0033` are not yet applied. Do not run `db:migrate` until the Campus Coin target, owner, backup/restore, and migration status are confirmed per `LUNA_HANDOFF_PROMPT.md`. `.env.example` only lists variable names without passwords or secrets.

## Verification and Limitations

- Local `npm run typecheck`, `npm run build`, API validation, and 14 unit/readiness tests pass in the worktree; comprehensive evidence is in [`DELIVERY-PLAN.en.md`](../DELIVERY-PLAN.en.md).
- Auth MySQL E2E and MySQL test suites have been added but have not executed against an isolated database in this session. Migrations `0032`/`0033` are unconfirmed on the target DB.
- Account/IP rate limiting, OTP expiry/attempts/cooldown/single-use, SMTP adapter timeout/retry, session/CSRF/IDOR, and response handling are coded. DB behaviors must be verified via MySQL CI jobs.
- Google OIDC start/callback/link, state cookies, PKCE, nonce, verified email, and provider discovery are coded; requires targeted unit tests and live callback testing once the owner configures the OAuth client.
- A live SMTP provider has not been chosen/verified; integration tests use a simulated email adapter, which does not prove live OTP delivery.
- Auth UI has screens for register/verify/resend/login/forgot/reset and request states; browser/keyboard/screen-reader E2E evidence is pending.
- Domain routes for wallet, ledger, savings, categories, budgets, reports, issues, and admin are wired to application services per OpenAPI; MySQL owner-isolation E2E and Developer B's integration review await CI/evidence.
- Disposable MySQL CI workflow is added but has not executed remotely. Backup/restore rehearsals, DB roles/CAs, and production evidence are pending.
