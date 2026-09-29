# Authentication — Campus Coin

## 1. Governing Decisions

Campus Coin retains email/password/OTP per [ADR-0008](./adr/0008-email-password-otp-auth.en.md) and supplements with optional Google Sign-In per [ADR-0009](./adr/0009-optional-google-sign-in.en.md). Do not use personal Gmail credentials, Gmail inboxes, or Gmail APIs. The Team Leader reported successful email transmission and reception for registration/reset on staging. DevD must independently verify provider outage handling, timeout/retry behaviors, and log redaction; successful email delivery does not substitute for these checks.

```text
register → send OTP → verify-otp (does not consume code) → enter name/password → verify-registration (atomically verifies and consumes code)
forgot password → send OTP → verify-otp (does not consume code) → enter new password → reset-password (atomically verifies, consumes code, and revokes sessions)
Google Sign-In (optional) → verify OIDC → session
active session → explicitly link Google
```

ADR-0009 represents the latest governing decision resolving legacy document conflicts regarding Google. ADR-0008 continues to govern email/password/OTP; ADR-0002 continues to govern opaque session contracts. Google Sign-In displays only when the OAuth client is fully configured.

## 2. Identity and Credentials

- `User` has an immutable ID, display name, verified email, status, locale, and `Asia/Ho_Chi_Minh` timezone.
- Emails are normalized before querying; uniqueness is enforced by the database.
- Passwords are stored exclusively as server-side salt/hashes; credentials are never returned to clients.
- OTP challenges bind email to purpose (`registration` or `password_reset`), store hashes, and enforce expiration, attempt limits, resend cooldowns, and single-use consumption.
- Google identity is recognized by `provider='google'` and Google `sub` in `auth_identities`; access tokens and refresh tokens are never persisted.
- No automatic account merging by email. Linking Google to an existing account requires logging in first, then completing the explicit linking flow; the callback verifies the session matches the owner.
- Table `auth_identities` exists from migration `0001` and is used at runtime for Google identity; no new migration is required.

## 3. Registration, Login, and Recovery

1. `POST /auth/register` normalizes email, checks for conflicts, and issues a registration OTP.
2. The SMTP adapter transmits the code; the DB stores only the hashed OTP. OTPs are never emitted to responses, logs, dev fallbacks, or client storage.
3. The OTP screen accepts the code and invokes `POST /auth/verify-otp`. The API checks expiration, attempts, and rate limits without consuming the OTP; valid codes remain available for subsequent atomic consumption.
4. Following valid OTP verification, new registrations display the full name/password form. `POST /auth/verify-registration` re-verifies and consumes the code within the transaction creating `users` and `auth_credentials`.
5. `POST /auth/login` validates password, user status, email verification, and rate limits by account/IP.
6. Successful login generates an opaque server session; browsers receive a secure cookie, never raw session IDs in JSON payloads.
7. `POST /auth/forgot-password` returns a generic response to minimize account enumeration; OTPs are dispatched only when account criteria are satisfied.
8. The password reset screen requires OTP verification first; after successful `POST /auth/verify-otp`, it presents the new password form. `POST /auth/reset-password` re-verifies and consumes the OTP, updates the hash, and revokes prior sessions atomically.

Google Sign-In uses server-side Authorization Code flow with PKCE S256, `state`, `nonce`, and scopes `openid email profile`. The server verifies the ID token against audience, nonce, `sub`, and `email_verified=true`. New Google accounts are created only when the email does not collide with an existing account; colliding emails require logging in via existing credentials and explicitly linking Google. Linking flows must originate from a valid session, and callbacks must verify the initiator identity.

OAuth reads `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, and `SESSION_SECRET` from environment variables. When unconfigured, the provider is disabled, the button is hidden, and email flows remain unaffected. On 2026-09-25, the Team Leader reported a successful Google OAuth linking test; specific environments and standalone login scopes are not yet documented in current evidence.

Database or provider failures must fail closed. Email delivery failures return stable sanitized errors without leaving valid orphan OTPs. The SMTP adapter features bounded timeouts and retries; retries reuse the same active OTP to prevent multiple concurrent codes.

OTP cooldowns are evaluated before send quotas; requests rejected during cooldown periods do not deplete email or IP send quotas. Reverse proxies are untrusted by default: `TRUST_PROXY=true` is enabled only when all intermediate proxy IPs are declared in `TRUSTED_PROXY_IPS` (exact comma-separated IP list). When socket peers do not match the list, `X-Forwarded-For` is ignored. Proxies must format the forwarding chain properly to allow tracing back from the nearest proxy to the client address.

## 4. Sessions, Cookies, and CSRF

Session IDs are random opaque tokens; the DB stores hashed IDs, user IDs, issued/expiration timestamps, revocation flags, `last_seen_at`, and minimal metadata. Sessions feature expiration and revocation on logout/recovery. Cookies require `HttpOnly`, `Secure` in production (enforced when `NODE_ENV=production` or `SESSION_SECURE=true`), `SameSite=Lax` or stricter, `Path=/`, and no broad `Domain` wildcard. Never store session identifiers in localStorage or sessionStorage.

Runtime must abort startup if `OTP_SECRET`, `SESSION_SECRET`, or `AUTH_RATE_LIMIT_SECRET` are missing or shorter than 32 UTF-8 bytes. Local servers and Vercel functions share the same validator; secrets are supplied strictly via environment variables, never committed to source, docs, or logs.

All API responses, including JSON and redirects, return `Cache-Control: no-store, private`; CDNs and browsers must never cache session or personal data. All state-changing mutations validate `Origin` against an allowlist prior to processing request bodies or CSRF tokens. `Referer` does not substitute for `Origin`; requests lacking `Origin` are rejected even if `Referer` is valid. Mutations from authenticated sessions require both `Origin` and CSRF tokens, including logout. Logout with an active session and invalid CSRF returns `403` without revoking the session; if the session is expired, revoked, or absent, logout returns success and clears cookies to support repeated calls. In development, the API additionally allows local origins `http://127.0.0.1:5173` and `http://localhost:5173` to match Vite; production strictly enforces `CLIENT_ORIGIN`. Monetary mutations enforce idempotency keys. Status 401 denotes missing/expired sessions; 403 denotes authenticated without permission; errors never expose stack traces or internal diagnostics. `npm run test:auth-security` verifies invalid origins, missing CSRF, and valid mutations against a temporary MySQL instance; live staging steps are documented in [DB-STAGING-TESTING.en.md](./DB-STAGING-TESTING.en.md).

On each valid session usage, the server touches `sessions.last_seen_at` if the recorded value is older than one minute or unset. This throttle reduces database writes while maintaining fresh activity records.

## 5. Authorization and Owner Scope

- The API derives `user_id` strictly from the session, never trusting owner IDs from request bodies or query parameters.
- All financial read and write operations are scoped to the authenticated owner at the server/repository layer.
- No endpoints allow users to select or impersonate another session owner.
- Admins only perform authorized issue/report/status/note operations; admins cannot alter balances, ledgers, or audit logs.
- JEV has no roles, sessions, or authorization capabilities.

## 6. Threat Mitigations

| Threat | Required Mitigation |
|---|---|
| Password brute-force | Durable rate limits by account and IP; temporary lockouts/backoffs; generic error messages that do not disclose which credential failed |
| OTP brute-force / replay | Expiration, maximum attempts, resend cooldowns, and rate limits; separate verification step does not consume code, while final operation re-checks and consumes single-use code in transaction; constant-time hash comparison |
| Email enumeration | Forgot-password returns consistent generic response; registration discloses conflicts only within approved contract boundaries |
| Session theft | Opaque hash, HttpOnly/Secure/SameSite cookies, expiration/revocation, no browser storage |
| CSRF / cross-origin | Origin allowlist for public auth; Origin + CSRF token for authenticated mutations, including logout |
| IDOR | Owner scope derived from session with mandatory query predicates |
| DB / SMTP outages | Fail closed; sanitized public errors; bounded timeouts and retries |
| Log / PII leakage | Never log passwords, OTPs, reset tokens, cookies, secrets, or raw credentials |
| Locked / disabled accounts | Revoke active sessions, reject new logins, and block domain access |
| OAuth login CSRF / spoofed callbacks | Signed flow cookies, state, nonce, PKCE S256, 10-minute TTL, and fixed callback URLs |
| Mislinked / hijacked accounts | Linking permitted only from authenticated sessions; no auto-linking by email; unique Google `sub` bound to single user |
| Exposed Google tokens / claims | Server-side verification only; never store Google tokens; never log codes, tokens, cookies, or raw claims |

## 7. Production Acceptance Criteria

1. Register/email OTP verification/details/final consumption/login/session and forgot/email OTP verification/new password/final consumption succeed against isolated DB with verified email provider.
2. Correct, incorrect, expired, exceeded-attempts, resend cooldown, and single-use OTP scenarios tested.
3. Failed logins trigger durable account/IP rate limits; lockout/backoff is time-bounded and not isolated to a single API process memory space.
4. Session cookies, expiration, revocation, logout, and invalidation of prior sessions on password reset tested.
5. CSRF/Origin/IDOR safeguards, owner isolation, provider/DB failure handling, and standardized error envelopes tested.
6. SMTP timeouts and retries are bounded; no OTPs emitted to logs or dev fallbacks.
7. Bilingual `en`/`vi` support, loading/error/success/expired/locked states, keyboard/focus management, and aria/live-region updates pass accessibility criteria.
8. Zero secrets, passwords, OTPs, reset tokens, or raw credentials present in source repositories, API responses, or server logs.
9. Google live login/linking is marked passed only following real callback verification; when OAuth secrets are unconfigured, email login remains functional and provider discovery reports Google disabled. Required environment variables and callback settings are documented in [DB-STAGING-TESTING.en.md](./DB-STAGING-TESTING.en.md).

These criteria constitute mandatory release gates; recording decisions in ADR-0008 does not imply they have been satisfied.

## 8. Out of Authentication Scope

Automatic account merging by email, Gmail inbox/contact reading/sending/APIs, SMS, passkeys/mandatory MFA, magic links, and browser-side JWT sessions.
