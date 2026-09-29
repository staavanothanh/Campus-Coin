# Roadmap — Campus Coin

## 1. Principles

Prioritize delivering a 4–5 day production thin-slice without compromising email/password/OTP per ADR-0008, optional Google Sign-In per ADR-0009, owner scoping, immutable ledger entries, wallet/savings separation, deterministic calculations, VND, `Asia/Ho_Chi_Minh` timezone, bilingual `en`/`vi` parity, and the boundary excluding banking, lending, and BNPL.

JEV never sits on the critical money path. The email provider is a mandatory dependency for registration and password resets; until verified, auth is not production-ready, and OTPs must never fall back to logs or dev outputs.

## 2. MVP Milestones

### M0 — Email/Password/OTP and Platform Foundation

React + TypeScript/TSX, Node API in TypeScript, register → verify OTP → login → session, forgot → reset, SMTP adapter, rate limiting, opaque sessions, CSRF/origin validation, owner scope, Vercel-provided domain, environment validation, TLS, and redacted logs.

**Gate:** Real email delivery, OTP/session/IDOR/rate-limiting verification, Vercel environment/connectivity, and DB candidate testing.

### M0.1 — Optional Google Sign-In

Server-side OIDC Authorization Code + PKCE; explicitly link existing accounts through authenticated sessions; no Gmail APIs and no automatic account merging by email.

**Gate:** OAuth client/callback configuration, state/nonce/audience/email verification, session ownership validation, and live callback evidence.

### M1 — Money Domain

Opening wallet baseline, immutable `income`/`payment`, atomic insufficient-wallet rejection, savings deposits/withdrawals, category lifecycle, budget warnings, deterministic reporting, and database restore evidence.

**Gate:** Concurrency/idempotency testing, reconciliation verification, HCMC boundary enforcement, zero client financial calculation authority.

### M2 — UI and Administration

Dashboard, income/payment forms, history, savings management, budget/category screens, reports with pie/bar charts and data tables, `en`/`vi` parity, VND/HCMC formatting, independent dark/light modes, accessibility, user issue reporting, and admin triage queue.

**Gate:** Functional JEV-disabled flow, mobile/keyboard/focus testing, least-privilege enforcement, and bilingual parity.

### M3 — Optional JEV

OpenRouter typed System One/Decisions backend adapter, model/endpoint probe, default-off, category suggestions only, schema/confidence/manual fallbacks, privacy/cost/latency evidence, and kill switch.

**Gate:** Full money path remains functional with JEV disabled; JEV never calculates, authorizes, or writes money records.

## 3. Five-Day Schedule

| Day | Primary Owner | Deliverable / Gate |
|---|---|---|
| 0 | Team Leader + A/B/C/D | Scope, API contracts, invariants, ownership, logging, and rollback triggers locked |
| 1 | A/B/C/D | SMTP/auth/Vercel, MySQL/restore, UI contracts, and OpenRouter probe evidence gathered |
| 2 | A/B | Session/owner and financial transactions locked; C/D consume contracts; JEV isolated from transactions |
| 3 | C + A/B/D | Bilingual UI/reports/admin; security, reconciliation, fallbacks, and redacted observability |
| 4 | All | Integrated smoke testing, concurrency, restore rehearsal, accessibility, privacy, rollback drill |
| 5 | Team Leader / D | GO or NO-GO/deferral; zero feature expansion |

## 4. Deferred Work

Automatic email merging, Gmail inboxes or personal Gmail credentials, SMS/passkeys/mandatory MFA, notifications beyond auth, automated transfers without safety gates, CSV/PDF exports, recurring transactions, financial predictions, complex AI summaries/chat, banking integrations, real payments, lending, BNPL, interest calculations, multi-currency support, enterprise administration, and custom email domains.

## 5. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| MySQL free-tier lacks backup/restore or quota | Select another verified candidate or Team Leader approves paid tier; never use local DB in production |
| SMTP/auth/session/IDOR/rate-limit failures | NO-GO |
| Wallet/savings invariant violations | NO-GO; never modify ledger via SQL |
| Vercel connection exhaustion | Bounded connection pools/connectors or change provider; never estimate balances |
| OpenRouter typed contract unclear | Keep JEV off; never parse chat prose |
| JEV quality, privacy, or cost unacceptable | Disable feature flag; manual picker remains the primary path |
| Email provider unready | Auth registration/reset withheld from release; never emit OTPs to logs or dev fallbacks |

## 6. Post-Day-1 Evidence Decisions

MySQL provider/region/free-tier/restore confirmation, OpenRouter transport ID/model/quota/cost/latency/privacy data, budget warning thresholds, and empirical backup RPO/RTO. No subsequent decision may alter transaction enums, immutable history, wallet/savings separation, VND/HCMC formatting, or no-banking boundaries.

## 7. Definition of Done

Items are marked done only when source code, focused smoke tests, migration/restore evidence, security reviews, redacted logs, rollbacks, runbooks, and documentation all pass. UI wireframes, mock model responses, or superficial deployment successes are insufficient.

## 8. Related ADRs

[ADR-0008](./adr/0008-email-password-otp-auth.en.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.en.md), [ADR-0006](./adr/0006-optional-openrouter-jev.en.md), [ADR-0007](./adr/0007-five-day-thin-slice.en.md).
