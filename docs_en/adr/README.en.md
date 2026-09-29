# Architecture Decision Records

This is the canonical historical source for hard-to-reverse decisions in Campus Coin. Each ADR documents context, decision, rejected alternatives, consequences, and risks. `docs/README.md` is the documentation map; `docs/DELIVERY-PLAN.md` is the execution status and delivery plan.

| ADR | Title | Status | Date |
|---|---|---|---|
| [0001](0001-google-oauth-only.en.md) | Use Google OAuth Only in MVP | Superseded by ADR-0008; Google re-added as optional in ADR-0009 | 2026-09-24 |
| [0002](0002-opaque-browser-session.en.md) | Server-Side Opaque Session for Browser | Accepted | 2026-09-24 |
| [0003](0003-cloud-mysql-validation-gate.en.md) | Cloud MySQL via Validation Gate | Accepted | 2026-09-24 |
| [0004](0004-vercel-domain-no-custom-email.en.md) | Use Vercel Domain, No Custom Email Domain Yet | Accepted; condition prohibiting email auth/reset superseded by ADR-0008 | 2026-09-24 |
| [0005](0005-immutable-money-domain.en.md) | Immutable Money Domain and Separate Savings | Accepted | 2026-09-24 |
| [0006](0006-optional-openrouter-jev.en.md) | Optional JEV via OpenRouter | Conditionally Accepted | 2026-09-24 |
| [0007](0007-five-day-thin-slice.en.md) | Five-Day Thin-Slice Scope and Ownership | Accepted | 2026-09-24 |
| [0008](0008-email-password-otp-auth.en.md) | Email, Password, and OTP Authentication | Accepted; email flow remains effective | 2026-09-24 |
| [0009](0009-optional-google-sign-in.en.md) | Google Sign-In as Supplemental Method | Accepted by Team Leader; adds Google to ADR-0008 | 2026-09-24 |
| [0008](0008-runtime-row-authorization-boundary.md) | Owner Authorization Boundary and Runtime DB Role | Accepted | 2026-09-25 |
| [0009](0009-shared-database-migration-baselines.en.md) | Migration Convergence Baselines on Shared Database | Accepted | 2026-09-25 |
| [0010](0010-optional-profile-details.en.md) | Optional User Profile Fields | Accepted by Team Leader | 2026-09-28 |

**Unresolved auth conflict:** ADR-0001 specifies Google OAuth-only; ADR-0008 (A) accepts email/password/OTP and ADR-0009 (A) adds Google; B maintains ADR-0001 Google-only. The auth decisions across the two branches should not be considered merged or having unified precedence.
**Note:** ADR-0008 and ADR-0009 share the same numbers across the two branches but have different contents. The auth rows from A and the DB/authorization rows from B are retained to avoid losing decisions; numbering and precedence must be unified before any ADR is considered canonical. The current index still describes auth according to A; the Google Sign-In section in ADR-0009 (A) stands in contrast with ADR-0009 migration baselines (B), and must be renumbered/rerouted during the next ADR processing pass.
