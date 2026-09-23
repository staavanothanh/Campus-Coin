# INTEGRATION-HANDOFF — Tích hợp tài liệu Campus Coin

## Trạng thái

`merged` — điều phối viên đã đọc đủ bốn handoff specialist và tích hợp vào bộ tài liệu canonical dưới `docs/`. Phạm vi chỉ là tài liệu/kiến trúc; không sửa mã nguồn hoặc SRS gốc.

## Nguồn đã tích hợp

| Handoff | Nội dung đã dùng | Canonical đích |
|---|---|---|
| `CC-001-product-domain.md` | Vocabulary, entities, immutable ledger, wallet/savings, budget và domain invariants | `PRD.md`, `DOMAIN-MODEL.md`, `ARCHITECTURE.md`, `ROADMAP.md` |
| `CC-002-auth-security.md` | Local account, Google OAuth/OIDC + PKCE, explicit linking, OTP, Gmail notification, opaque session, threat model | `AUTHENTICATION.md`, `ARCHITECTURE.md`, `PRD.md`, `ROADMAP.md` |
| `CC-003-tech-cloud.md` | Managed MySQL/InnoDB, Vercel Node runtime, DB/auth trade-off, cloud backup/migration/observability | `ARCHITECTURE.md`, `AUTHENTICATION.md`, `ROADMAP.md` |
| `CC-004-jev-admin-ops.md` | JEV advisory boundary, sync/async, fallback, privacy/evaluation, admin least privilege/report workflow | `AI-JEV.md`, `ADMIN-OPERATIONS.md`, `PRD.md`, `ROADMAP.md` |

## Quyết định tích hợp

1. Chọn managed MySQL/InnoDB trên cloud vì transaction ACID, row lock, FK, immutable ledger, category history và SQL report/budget phù hợp hơn MongoDB authoritative.
2. Chọn opaque server-side session trong cookie `HttpOnly; Secure; SameSite` (ưu tiên `__Host-`) cho browser. Local password và Google OAuth đều kết thúc ở cùng session; JWT browser không chọn trong MVP.
3. Giữ đúng hai transaction type/API enum: `income` và `payment`; UI tiếng Việt dùng “Thu nhập” và “Thanh toán”. Không dùng expense/chi phí làm type.
4. Initial wallet balance là baseline do user nhập; mọi payment giảm ví và bị chặn atomic khi ví thiếu. Savings tách riêng; deposit/withdraw/auto transfer là internal transfer ngoài totals `income`/`payment`.
5. Ledger đã commit và audit append-only. Sửa/xóa theo SRS cũ chuyển thành reversal/adjustment/replacement record có reference/reason/actor.
6. Budget consumption chỉ tổng hợp payment theo tháng/category và warning non-blocking; budget không thay thế wallet authorization.
7. JEV chỉ phân loại/trích xuất/gợi ý/tóm tắt trên payload tối thiểu; confidence thấp, timeout, schema failure hoặc privacy concern đều fallback manual/failed status. JEV không tính tiền, authorize, mutate ledger hoặc cấp quyền.
8. Admin chủ yếu triage report/issue, status/note/content/settings với least privilege; admin không sửa ledger/balance và financial detail mặc định được mask.
9. Vercel Node runtime là target MVP; Cloudflare chỉ là phương án conditional sau compatibility spike. Secrets, provider, region, retention và JEV endpoint vẫn là deployment decisions.

## Kiểm tra merge gate

- [x] Đủ bốn handoff specialist tồn tại dưới `docs/working/` và đã được đọc.
- [x] Tám canonical docs tồn tại và có mục acceptance criteria cùng out-of-scope ở tài liệu phù hợp.
- [x] Các quyết định MySQL và opaque session nhất quán giữa README/PRD/ARCHITECTURE/AUTHENTICATION/ROADMAP.
- [x] JEV được mô tả advisory; deterministic money logic nằm ở backend/domain service.
- [x] Immutable history, wallet/savings separation và budget warning non-blocking được lặp nhất quán.
- [x] SRS gốc và mã nguồn không bị chỉnh sửa.
- [x] Không chạy formatter, linter, build hoặc test toàn dự án theo phạm vi tài liệu.

## Điểm chưa chốt nhưng không blocking

Nhà cung cấp MySQL/email/JEV, cloud region, RPO/RTO/retention, session duration, budget threshold mặc định, break-glass approval và scope CSV/PDF/recurring cần chốt ở implementation/deployment planning. Không điểm nào được phép thay đổi các invariant hoặc mở rộng sang banking/lending/BNPL.
