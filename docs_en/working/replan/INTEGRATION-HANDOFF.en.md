# Replan Integration Handoff

- **Date:** 2026-09-24
- **Status:** Documentation consolidated; implementation and release await human gates.

## Sources

Reviewed RP-A through RP-D, replan board, and canonical docs. ADRs and Team Leader decisions represent authoritative sources. This handoff provides recommendations only; legacy auth/email assumptions are superseded by Google OAuth-only.

## A/B/C/D Plan

- **A:** OAuth callback, claims, opaque session, CSRF/origin, owner scope, Vercel/env.
- **B:** MySQL, schema/migration, immutable ledger, wallet/savings/budget/category, report/restore.
- **C:** React, route/state, `en`/`vi`, VND/HCMC, charts/tables, accessibility/admin.
- **D:** OpenRouter JEV optional, typed probe, fallback, QA, observability, deploy/rollback.
- **Team Leader:** Scope, contracts, provider/model evidence, integration, and GO/NO-GO.

## Dependencies

```text
Day 0 Team Leader locks scope/API
  ├─> A OAuth/session
  ├─> B domain/MySQL
  ├─> C UI (consumes A/B contract)
  └─> D JEV-off/QA (consumes A/B contract)
A+B -> C/D -> Day-4 smoke -> Day-5 GO/NO-GO
```

## Gates

Day 1 verifies OAuth/Vercel, MySQL/restore, API, and typed JEV. Day 2 tests sessions, transactions, idempotency, and atomicity. Day 3 tests UI/admin/security/fallbacks. Day 4 integrated smoke, privacy, restore, rollback. Day 5 release or deferral.

## Blockers

MySQL/provider/restore, OAuth/IDOR, domain invariants, secret/PII protection, accessibility, rollback, and production smoke are launch gates. Unverified JEV only blocks JEV enablement; maintain flag off. Make no provider/model/cost/SLA/RPO/RTO claims without concrete evidence.
