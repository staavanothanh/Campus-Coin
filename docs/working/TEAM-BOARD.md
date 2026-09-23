# Bảng điều phối tài liệu — Campus Coin

- **Ngày:** 2026-09-24
- **Điều phối:** Team Leader (người dùng)
- **Phạm vi:** Chỉ lập kế hoạch/tài liệu; không sửa source/SRS.

## Quy tắc

Specialist chỉ viết handoff riêng; không sửa canonical docs và không duyệt release. Team Leader là integrator, quyết định scope và GO/NO-GO. Mỗi workstream có một human owner.

## Workstream

| ID | Owner | Trạng thái | Sản phẩm | Gate |
|---|---|---|---|---|
| RP-A | Developer A | Đã hợp nhất | Google OAuth, session, Vercel | Callback/claims/IDOR/env |
| RP-B | Developer B | Đã hợp nhất | MySQL, ledger, savings, budget | Transaction/restore/invariant |
| RP-C | Developer C | Đã hợp nhất | React, i18n, accessibility | Hai locale/JEV-off |
| RP-D | Developer D | Đã hợp nhất | JEV, QA, deploy, rollback | Typed probe/fallback/smoke |
| RP-INT | Team Leader | Đã hợp nhất | [`INTEGRATION-HANDOFF.md`](./INTEGRATION-HANDOFF.md) | Canonical docs nhất quán |
| RP-REV | Team Leader | Đã hợp nhất | [`FINAL-REVIEW.md`](./FINAL-REVIEW.md) | Evidence và GO/NO-GO còn mở |

## Critical path

Day 0 khóa scope; Day 1 kiểm chứng OAuth/MySQL/OpenRouter; Day 2 A/B khóa contract; Day 3 UI/admin/security; Day 4 integrated smoke/restore/rollback; Day 5 release hoặc defer.

## Blocker

OAuth/Vercel callback, MySQL provider/region/restore, domain invariant, owner isolation, secret/PII, accessibility và rollback là launch gates. OpenRouter chưa xác minh thì JEV off; email notification và custom domain không chặn launch.

## Nguồn

Xem [`replan/TEAM-BOARD.md`](./replan/TEAM-BOARD.md), [`../adr/README.md`](../adr/README.md) và [`../DELIVERY-PLAN.md`](../DELIVERY-PLAN.md).
