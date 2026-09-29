# Documentation Coordination Board — Campus Coin

- **Date:** 2026-09-24
- **Coordination:** Team Leader (user)
- **Scope:** Planning and documentation only; no source or SRS modifications.

## Rules

Specialists only author their assigned handoffs; do not modify canonical docs and do not approve releases. The Team Leader acts as integrator, decides scope, and determines GO/NO-GO. Each workstream has a designated human owner.

## Workstreams

| ID | Owner | Status | Deliverable | Gate |
|---|---|---|---|---|
| RP-A | Developer A | Merged | Google OAuth, session, Vercel | Callback/claims/IDOR/env |
| RP-B | Developer B | Merged | MySQL, ledger, savings, budget | Transactions/restore/invariants |
| RP-C | Developer C | Merged | React, i18n, accessibility | Dual locale/JEV-off |
| RP-D | Developer D | Merged | JEV, QA, deploy, rollback | Typed probe/fallback/smoke |
| RP-INT | Team Leader | Merged | [`INTEGRATION-HANDOFF.en.md`](./INTEGRATION-HANDOFF.en.md) | Canonical docs consistency |
| RP-REV | Team Leader | Merged | [`FINAL-REVIEW.en.md`](./FINAL-REVIEW.en.md) | Evidence and GO/NO-GO remain open |

## Critical Path

Day 0: scope lock; Day 1: verify OAuth/MySQL/OpenRouter; Day 2: A/B lock contracts; Day 3: UI/admin/security; Day 4: integrated smoke/restore/rollback; Day 5: release or deferral.

## Blockers

OAuth/Vercel callback, MySQL provider/region/restore, domain invariants, owner isolation, secrets/PII protection, accessibility, and rollback are launch gates. If OpenRouter is unverified, keep JEV off; notification emails and custom domains do not block launch.

## Sources

See [`replan/TEAM-BOARD.en.md`](./replan/TEAM-BOARD.en.md), [`../adr/README.en.md`](../adr/README.en.md), and [`../DELIVERY-PLAN.en.md`](../DELIVERY-PLAN.en.md).
