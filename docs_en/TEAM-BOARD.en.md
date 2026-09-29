# Execution Board — Campus Coin

> Date: 2026-09-26 · Team Leader — Hiệp is the integrator and release authority.
> Auth decisions: email per [ADR-0008](./adr/0008-email-password-otp-auth.en.md), optional Google supplemented per [ADR-0009](./adr/0009-optional-google-sign-in.en.md).

## Rules

Specialists provide analysis only; they do not substitute for the four developers and do not approve releases. Each workstream has a designated human owner. This board tracks task allocations and gates; implementation status must be substantiated by evidence in `docs/DELIVERY-PLAN.md`.

## Roles

| Owner | Scope | Boundary |
|---|---|---|
| Team Leader | Scope, contracts, integration, evidence, GO/NO-GO | Never delegate release decisions |
| Developer A | Email/password/OTP, SMTP adapter, optional Google OIDC, sessions, CSRF/origin, owner scope, Vercel | No Gmail credentials/inbox/API; no auto-linking accounts by email |
| Developer B | MySQL, ledger, wallet/savings/budget, reports, restore | No UI financial math / no JEV in transactions |
| Developer C | React, i18n, dashboard/report/admin, accessibility | No secrets/balance math/authorization |
| Developer D | Optional JEV, QA, smoke tests, deployments, rollbacks | No domain authority / no JEV financial authority |

## Kanban

| ID | Owner | Status | Acceptance / Gate |
|---|---|---|---|
| HUMAN-A | Developer A | Auth implementation; Vercel Function adapter, DB pool hook, Origin/cache contracts, session activity tracking, and owner regression coverage added to product branch | Awaiting fresh CI to confirm tests; SMTP/provider failure and Vercel Preview/deploy evidence executed by DevD |
| HUMAN-B | Developer B | Disposable MySQL CI passed; schema `campus_coin` has migrations `0001`–`0005`; clone `campus_coin_done` not yet reachable via app config | Confirm correct DB/service/grants and migration chain; allow test role to create/drop temporary schemas, confirm backup/restore, CA, and least-privilege runtime grants; review domain routes |
| HUMAN-C | Developer C | Auth UI implemented; domain UI pending | Wallet/dashboard, income/payment/history, savings, category/budget, reports/issues; bilingual parity, responsiveness, and accessibility |
| HUMAN-D | Developer D | JEV maintained default-off; Vercel deployment workflow added; Preview/staging smoke tests pending | Run CI first, deploy Preview, verify SMTP outage/restore handling and redacted logs; deploy Production strictly from `hiep` via GitHub Environment with approval. See [Handoff](./working/team-handoff-2026-09-26/DEV-D-VERCEL-SMTP.md) |
| LEADER-INT | Team Leader | Commit `5bc7185` pushed; [run #11](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) passed entire workflow; run #6 passed code and three MySQL suites | Email auth per ADR-0008, optional Google per ADR-0009; owner integration passed on isolated CI MySQL; Team Leader confirms Part 2 staging complete; SMTP/provider failure and production gates await evidence |
| LEADER-REV | Team Leader | Awaiting evidence | GO/NO-GO determination following auth/DB/email/API/UI/CI/restore gates |

## Critical Path

- Day 0: Team Leader locks scope; A/B/C/D prepare in parallel.
- Day 1: SMTP/auth/session, MySQL/restore, UI contract, OpenRouter probe.
- Day 2: A/B lock session/domain; C/D integrate per contract.
- Day 3: UI/admin/security/reconciliation/fallbacks.
- Day 4: integrated smoke, restore, privacy, accessibility, rollback drills.
- Day 5: controlled release or deferral; zero feature expansion.

## Blockers and Assumptions

Launch blockers: Fresh CI run for owner regression/adapter/SMTP timeouts, SMTP/provider failure verification on Preview, Vercel environment/connectivity, DB migration/restore/roles, backup/rollback, accessibility, and API/domain evidence. Vercel handlers/config/deploy workflows exist in source; this does not prove active deployment. OpenRouter model/quota/policy remain unclaimed; JEV can stay disabled. Custom email domains are not a release dependency.

## Evidence Index

- [`working/replan/INTEGRATION-HANDOFF.en.md`](./working/replan/INTEGRATION-HANDOFF.en.md)
- [`working/replan/FINAL-REVIEW.en.md`](./working/replan/FINAL-REVIEW.en.md)
- [`working/replan/TEAM-BOARD.en.md`](./working/replan/TEAM-BOARD.en.md)
- [`adr/README.en.md`](./adr/README.en.md)
- [`DELIVERY-PLAN.en.md`](./DELIVERY-PLAN.en.md)
