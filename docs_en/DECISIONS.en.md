# Campus Coin — Decision Index

> Standardized: 2026-09-24 · Decider: Team Leader (user) · Original SRS unmodified.

Detailed decisions are standardized in Architecture Decision Records under [`adr/README.en.md`](./adr/README.en.md). This file serves as a quick reference index, not a duplicate repository of detailed rationale.

| ADR | Decision | Status | Primary Consequence |
|---|---|---|---|
| [0001](./adr/0001-google-oauth-only.en.md) | Google OAuth only | Superseded by ADR-0008; Google re-added as optional in ADR-0009 | Retained as historical record of previous decision |
| [0002](./adr/0002-opaque-browser-session.en.md) | Opaque browser session | Accepted | Owner resolved from session; browser JWTs rejected for MVP |
| [0003](./adr/0003-cloud-mysql-validation-gate.en.md) | Cloud MySQL | Conditionally Accepted | Provider/region/free-tier/restore must be verified on Day 1 |
| [0004](./adr/0004-vercel-domain-no-custom-email.en.md) | Vercel domain, no custom email domain | Accepted | Domain decision remains effective; email/OTP auth governed by ADR-0008 |
| [0005](./adr/0005-immutable-money-domain.en.md) | Immutable money domain | Accepted | `income`/`payment`, integer VND, savings separated, budgets warning-only |
| [0006](./adr/0006-optional-openrouter-jev.en.md) | Optional JEV via OpenRouter | Conditionally Accepted | Default-off, typed probe, manual fallback, no monetary authority |
| [0007](./adr/0007-five-day-thin-slice.en.md) | 4–5 day thin-slice | Accepted | Four developers; Team Leader owns integration and GO/NO-GO |
| [0008](./adr/0008-email-password-otp-auth.en.md) | Email + password + OTP | Accepted by Team Leader on 2026-09-24 | Email flows remain active; production verification gates remain open |
| [0009](./adr/0009-optional-google-sign-in.en.md) | Optional Google Sign-In | Accepted by Team Leader on 2026-09-24 | Adds Google OIDC; no Gmail API; no automatic email merging |
| [0010](./adr/0010-optional-profile-details.en.md) | Optional birth date and gender in profile | Accepted by Team Leader on 2026-09-28 | Nullable; self-service only; omitted from admin lists and JEV |

## Decision Governance

Changes to authentication modes, ledger invariants, JEV authority, providers/domains, or scope reductions require a new or superseding ADR. Provider capabilities, models, quotas, costs, SLAs, backup/RPO/RTO metrics, and latency are only treated as facts after evidence is gathered from accounts, documentation, or runtime tests. Current authentication retains email/password/OTP per ADR-0008 supplemented with optional Google Sign-In per ADR-0009. Personal Gmail credentials, Gmail inboxes/APIs, and automatic merging by email remain prohibited.
