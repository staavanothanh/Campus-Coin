# Replan Board — Campus Coin

- **Date:** 2026-09-24
- **Coordination:** Team Leader (user)
- **Scope:** Documentation and planning; no source/SRS modifications.

## Goals

Deliver a thin slice to production within 4–5 days featuring Google OAuth-only, immutable ledger, wallet/savings separation, VND, HCMC, `en`/`vi`, JEV-off/manual path, and least-privilege administration.

## Personnel

| Owner | Scope | Boundaries |
|---|---|---|
| Team Leader | Scope, contracts, integration, GO/NO-GO | Never delegate release decisions to specialists |
| Developer A | OAuth/session/Vercel/owner scope | No local auth/linking/OTP/Gmail |
| Developer B | MySQL/domain/API/restore | No UI money math/JEV in transactions |
| Developer C | React/i18n/reports/accessibility | No secrets/balance math/authorization |
| Developer D | JEV/QA/deploy/rollback | No financial authority |

## Kanban

| ID | Status | Handoff |
|---|---|---|
| RP-A | Merged | [`RP-A-OAUTH-VERCEL.en.md`](./RP-A-OAUTH-VERCEL.en.md) |
| RP-B | Merged | [`RP-B-DOMAIN-MYSQL.en.md`](./RP-B-DOMAIN-MYSQL.en.md) |
| RP-C | Merged | [`RP-C-REACT-I18N.en.md`](./RP-C-REACT-I18N.en.md) |
| RP-D | Merged | [`RP-D-JEV-QA-RELEASE.en.md`](./RP-D-JEV-QA-RELEASE.en.md) |
| RP-INT | Merged | [`INTEGRATION-HANDOFF.en.md`](./INTEGRATION-HANDOFF.en.md) |
| RP-REV | Merged | [`FINAL-REVIEW.en.md`](./FINAL-REVIEW.en.md) |

## Schedule and Gates

Day 0: scope/API lock; Day 1: verify OAuth, MySQL, restore, and JEV; Day 2: A/B lock contracts; Day 3: UI/admin/security; Day 4: smoke/restore/rollback; Day 5: GO or NO-GO/deferral.

Provider/region, quota, model, cost, latency, policy, and RPO/RTO claims are not yet made. JEV probe failures keep JEV disabled; auth/domain/restore/security failures result in NO-GO.

## Sources

[`../../adr/README.en.md`](../../adr/README.en.md), [`../../DELIVERY-PLAN.en.md`](../../DELIVERY-PLAN.en.md), [`INTEGRATION-HANDOFF.en.md`](./INTEGRATION-HANDOFF.en.md), [`FINAL-REVIEW.en.md`](./FINAL-REVIEW.en.md).
