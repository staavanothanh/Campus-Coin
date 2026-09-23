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
