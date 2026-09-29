# Documentation Integration Handoff

- **Date:** 2026-09-24
- **Status:** Documentation integrated; implementation/release awaits human gates.
- **Scope:** Docs-only, no source or SRS modifications.

## Sources Reviewed

Reviewed four specialized handoffs `CC-001` through `CC-004`, canonical docs under `docs/`, and the replan suite under [`replan/`](./replan/). Canonical ADRs and Team Leader decisions take precedence; handoffs are advisory only.

## Consolidated Decisions

1. Google OAuth-only, identity `(google, sub)`, opaque server sessions; no local passwords/linking/OTP/Gmail.
2. Ledger is strictly `income`/`payment`, integer VND, immutable; savings separated; budgets are warning-only.
3. Backend/domain/MySQL is the source of truth; browser never submits final balances or self-authorizes.
4. Vercel-provided domain; cloud MySQL verified through Day 1 validation gate.
5. JEV is optional/default-off/backend-only/typed with manual fallbacks; no monetary authority.
6. Team Leader approves contracts, evidence, and GO/NO-GO.

## Dependencies

```text
Team Leader scope lock
  ├─> A: OAuth/session/platform
  ├─> B: domain/API/MySQL
  ├─> C: UI/i18n (consumes A/B contract)
  └─> D: JEV-off/QA/deploy (consumes A/B contract)
A+B -> C/D integration -> Day-4 smoke -> Team Leader Day-5 decision
```

## Gates

- Day 1: OAuth/Vercel, MySQL/restore, API contract, OpenRouter probe.
- Day 2: session/domain/idempotency/atomicity.
- Day 3: UI dual locale, admin, accessibility, fallbacks.
- Day 4: integrated smoke, privacy, restore, rollback.
- Day 5: GO or NO-GO/deferral; no scope expansion.

## Conclusion

The plan is consistent at the decision level. Provider/model/backup/RPO/RTO/cost/latency are not yet claimed. Canonical details reside in [`docs/adr/README.en.md`](../adr/README.en.md), [`DELIVERY-PLAN.en.md`](../DELIVERY-PLAN.en.md), and [`replan/FINAL-REVIEW.en.md`](./replan/FINAL-REVIEW.en.md).

## DevB Integration Reactivation — 2026-09-26

- **Owner:** DevBIntegrationTeam · **Branch:** `integration/devb-database-ingest-0.3` · **Worktree:** `.agents/worktrees/integration-devb-database-ingest-0.3`.
- **Base:** `9df1c97bf610faad0330a9428b43a36758f0aaa1` (remote `database-ingest-0.3`).
- Migration engine targeted unit gate: `node --test test/migration-engine.test.ts` — 20 passed, 0 failed, 0 skipped. This is local-only evidence for migration planning/checksum/baseline behavior; it is not evidence of shared DB state or restore success.
- Reviewed forward-only migration handling: each version executes then records its checksum; partial DDL/history failure stops without automatic retry, and requires DBA inspection/reconciliation (see `db/README.md`).
- **Still hard-gated, not verified in this reactivation:** shared MySQL 0004/0005 baseline convergence and exact schema state; deployed grants and trigger `DEFINER` privileges; provider TLS/CA; runtime least-privilege behavior against an isolated database; restore/reconcile/read-only smoke rehearsal. No database connection, migration, grant change, or restore was attempted.
- Prior historical Aiven/CI/local evidence described elsewhere in `DELIVERY-PLAN.md` is inherited documentation, not re-executed evidence for this branch or this reactivation. Do not infer these gates passed from the unit test.
- Bounded API/domain issue to retain for integration planning: `docs/DELIVERY-PLAN.md` §12 `BLK-API-01` says production host mount, trusted auth/session adapter and distributed rate-limit integration remain external A+B work; route unit tests alone do not close these.
- Branch scope remains B-owned. No cross-team route/session contract changes were made.
