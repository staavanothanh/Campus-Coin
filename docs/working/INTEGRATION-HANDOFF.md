# Handoff tích hợp tài liệu

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã tích hợp tài liệu; implementation/release vẫn chờ human gate.
- **Phạm vi:** Docs-only, không sửa source hoặc SRS.

## Nguồn đã đọc

Đã đọc bốn handoff `CC-001` đến `CC-004`, canonical docs trong `docs/`, và bộ replan tại [`replan/`](./replan/). Canonical ADR và quyết định Team Leader có quyền ưu tiên; handoff chỉ là tư vấn.

## Quyết định hợp nhất

1. Google OAuth-only, identity `(google, sub)`, opaque server session; không local password/linking/OTP/Gmail.
2. Ledger chỉ `income`/`payment`, integer VND, immutable; savings tách biệt; budget warning-only.
3. Backend/domain/MySQL là nguồn sự thật; browser không gửi final balance hoặc tự authorize.
4. Vercel-provided domain; cloud MySQL qua cổng kiểm chứng Day 1.
5. JEV optional/default-off/backend-only/typed/manual fallback; không có money authority.
6. Team Leader duyệt contract, evidence, GO/NO-GO.

## Dependency

```text
Team Leader scope lock
  ├─> A: OAuth/session/platform
  ├─> B: domain/API/MySQL
  ├─> C: UI/i18n (dùng contract A/B)
  └─> D: JEV-off/QA/deploy (dùng contract A/B)
A+B -> C/D integration -> Day-4 smoke -> Team Leader Day-5 decision
```

## Gate

- Day 1: OAuth/Vercel, MySQL/restore, API contract, OpenRouter probe.
- Day 2: session/domain/idempotency/atomicity.
- Day 3: UI hai locale, admin, accessibility, fallback.
- Day 4: integrated smoke, privacy, restore, rollback.
- Day 5: GO hoặc NO-GO/defer; không mở scope.

## Kết luận

Kế hoạch nhất quán ở mức quyết định. Provider/model/backup/RPO/RTO/cost/latency chưa được claim. Chi tiết chính thức ở [`docs/adr/README.md`](../adr/README.md), [`DELIVERY-PLAN.md`](../DELIVERY-PLAN.md) và [`replan/FINAL-REVIEW.md`](./replan/FINAL-REVIEW.md).

## DevB integration reactivation — 2026-09-26

- **Owner:** DevBIntegrationTeam · **Branch:** `integration/devb-database-ingest-0.3` · **Worktree:** `.agents/worktrees/integration-devb-database-ingest-0.3`.
- **Base:** `9df1c97bf610faad0330a9428b43a36758f0aaa1` (remote `database-ingest-0.3`).
- Migration engine targeted unit gate: `node --test test/migration-engine.test.ts` — 20 passed, 0 failed, 0 skipped. This is local-only evidence for migration planning/checksum/baseline behavior; it is not evidence of shared DB state or restore success.
- Reviewed forward-only migration handling: each version executes then records its checksum; partial DDL/history failure stops without automatic retry, and requires DBA inspection/reconciliation (see `db/README.md`).
- **Still hard-gated, not verified in this reactivation:** shared MySQL 0004/0005 baseline convergence and exact schema state; deployed grants and trigger `DEFINER` privileges; provider TLS/CA; runtime least-privilege behavior against an isolated database; restore/reconcile/read-only smoke rehearsal. No database connection, migration, grant change, or restore was attempted.
- Prior historical Aiven/CI/local evidence described elsewhere in `DELIVERY-PLAN.md` is inherited documentation, not re-executed evidence for this branch or this reactivation. Do not infer these gates passed from the unit test.
- Bounded API/domain issue to retain for integration planning: `docs/DELIVERY-PLAN.md` §12 `BLK-API-01` says production host mount, trusted auth/session adapter and distributed rate-limit integration remain external A+B work; route unit tests alone do not close these.
- Branch scope remains B-owned. No cross-team route/session contract changes were made.
