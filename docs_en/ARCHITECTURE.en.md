# Architecture — Campus Coin

## 1. Architectural Decisions

Campus Coin utilizes a layered architecture consisting of a single Web application and a Node API in TypeScript hosted on Vercel, connecting to cloud MySQL over TLS. The provider/region remains pending until verified via Day 1 validation gates.

```text
Browser React/TypeScript
        |
        v
Node API: validation, session, owner scope, idempotency
        |
        +--> Domain service: wallet, ledger, savings, budget, report
        |       |
        |       +--> MySQL transaction/lock/audit
        |
        +--> SMTP email adapter (OTP)
        +--> Google OIDC adapter (optional, server-side)
        +--> OpenRouter JEV adapter (optional, typed, default-off)
```

## 2. Mandatory Boundaries

- **Browser:** renders authoritative responses; never stores secrets, never calculates balances, never authorizes payments, and never calls external providers directly.
- **API:** validates schemas, sessions, CSRF/origin, roles, owner scope, categories, idempotency, and feature flags.
- **Domain:** authoritative for money logic, reporting periods, authorization, and reporting; never imports JEV SDKs.
- **Persistence:** ledger/audit tables are append-only; projections can be rebuilt; runtime DB role enforces least privilege.
- **Admin:** issue/report triage; lacks privileges to modify balances, ledgers, or audit logs.

## 3. Authentication and Sessions

Email/password/OTP authentication continues per ADR-0008. Registration and password resets use dedicated OTP screens alongside `POST /auth/verify-otp`; the API verifies codes beforehand to unlock the subsequent step while preserving the code. The completion endpoints for registration and password resets re-verify and consume the code atomically within the credential modification transaction. Google Sign-In is added as an optional method per ADR-0009 using server-side OIDC Authorization Code + PKCE S256, state, nonce, and `openid email profile` scopes. Identity relies on `(provider=google, subject=sub)`; ID tokens must be verified against audience, nonce, and `email_verified`. Both flows create opaque server-side sessions stored in secure cookies. Owner identity is invariably derived from the session.

If Google is not configured, the Google button is hidden and email login remains functional. Matching emails for existing accounts do not automatically merge; users must log in first, then explicitly link Google. Google access/refresh tokens are not stored; personal Gmail credentials, inboxes, APIs, and browser-side JWTs are prohibited. The SMTP provider must have timeouts, finite retry limits, clear error handling, and must never emit OTPs to logs or dev fallbacks.

## 4. Domain and Persistence

Logical tables: `users`, `auth_identities`, `auth_credentials`, `email_otps`, `sessions`, `wallet_accounts`, `ledger_transactions`, `categories`, `budgets`, `savings_accounts`, `savings_transfers`, `issues`, `issue_events`, `audit_events`, and masked JEV metadata where applicable.

MySQL is selected for ACID transactions, foreign keys, row locking, immutable references, and deterministic reporting. Currency is stored as integer VND or exact decimals, never floating-point. Every financial record has an owner; every query is scoped by owner.

Date of birth and gender are optional profile fields, added to `users` via additive migration. The API extracts the owner from the session, returning these fields only for the current authenticated user and omitting them from admin lists, audit details, analytics, and JEV contexts. Runtime DB grants permit updates only on the modified columns.

Payments lock the wallet and verify sufficient funds prior to insertion. Savings operations lock wallet then savings in a fixed order. OpenRouter, email adapters, or external workers are never invoked within monetary database transactions.

## 5. JEV and OpenRouter Boundary

JEV is an optional pre-submission category suggestion tool. The API transmits redacted descriptions, transaction types, opaque candidate IDs, and locales; it receives typed Choices, probabilities, and confidences; the server validates candidate membership, confidence thresholds, and explicit user confirmation. Balances, savings, ledgers, Google claims, sessions, secrets, or unnecessary PII are never transmitted.

`JEV_CATEGORY_SUGGESTION_ENABLED=false` by default. Typed endpoints, models, quotas, costs, latency, and provider privacy policies must be verified via probes. Do not replace typed contracts with chat completions and prose parsing.

## 6. Deployment and Operations

- Web/API: Vercel-provided domain. Vite builds to `dist`; route `/api/v1/*` uses a Node.js Function at `api/v1/[...path].ts`, with SPA paths rewriting to `index.html`.
- Local API runs via `src/local-server.ts`; this file does not share the Vercel entrypoint name. The Vercel adapter invokes the same `handleRequest` to prevent maintaining parallel route stacks. Platform body parsers are disabled to ensure uniform JSON parsing and payload size enforcement within API boundaries.
- On Vercel, `attachDatabasePool` handles idle MySQL connections before function suspension; connection pools remain bounded and aggregate connections must be monitored against function instance scaling.
- Deployments run manually after CI, targeting Preview or Production; Production deploys strictly from branch `hiep` via GitHub Environments with appropriate approvals.
- DB: cloud MySQL verified with TLS, bounded serverless connection pool, and tested backup/restore.
- All API responses and redirects return `Cache-Control: no-store, private`. Mutations require valid allowlisted `Origin`; `Referer` is not a fallback.
- Secrets: stored in Vercel environment variables; never logged or committed.
- Auth: rate-limit login attempts by account/IP; OTP features expiration, attempt limits, cooldowns, and single-use enforcement; sessions support expiration and revocation; owner is derived from session.
- Logs: structured and sanitized of cookies, passwords, OTPs, reset tokens, SMTP credentials, raw JEV payloads, and raw financial records.
- Migrations: versioned, non-destructive to ledger data; deployment rollbacks and data restores follow operational runbooks.
- JEV or email failures must not block the core money path.

## 7. Architectural Acceptance Criteria

1. Email/password/OTP and optional Google Sign-In use opaque sessions, CSRF, and safe owner scoping; no personal Gmail credentials or inbox access.
2. Cloud MySQL possesses verified evidence for TLS, connection pooling, and backup/restore.
3. Concurrent payments never result in negative wallet balances; savings remain segregated; ledger history can be rebuilt.
4. Clients never submit final balances; admins cannot mutate ledger records.
5. JEV typed contract is verified or remains disabled; no chat-completion substitution.
6. VND/HCMC formatting, `en`/`vi` internationalization, redaction, and rollback procedures are tested.

## 8. Out of Scope

Local production databases, microservices/event buses, banking/payment processors, lending/BNPL, interest calculations, multi-currency support, enterprise admin capabilities, custom email domains, automatic email merging, autonomous JEV actions, JEV financial engines, CSV/PDF exports, and credentials in source control.

## 9. Related ADRs

[ADR-0008](./adr/0008-email-password-otp-auth.en.md), [ADR-0009](./adr/0009-optional-google-sign-in.en.md), [ADR-0002](./adr/0002-opaque-browser-session.en.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.en.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.en.md), [ADR-0006](./adr/0006-optional-openrouter-jev.en.md).
