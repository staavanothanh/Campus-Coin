# Campus Coin — Bảng điều phối nhóm chuyên gia

> Phiên bản: 2026-09-23
> Chủ sở hữu điều phối: `CampusCoinOrchestrator`
> Phạm vi: phân tích sản phẩm/kiến trúc và tài liệu; **không sửa mã nguồn hoặc SRS gốc**.

## Mục tiêu và định nghĩa hoàn thành

Từ SRS tiếng Việt và các quyết định sản phẩm mới, tạo bộ tài liệu tiếng Việt nhất quán dưới `docs/`, bao gồm bản đồ tài liệu, PRD, kiến trúc, mô hình miền, xác thực, JEV, vận hành quản trị và lộ trình. Mọi tài liệu phải giữ đúng các bất biến: chỉ có `income` và `payment`; tiền tệ VND; múi giờ `Asia/Ho_Chi_Minh`; lịch sử giao dịch bất biến; ví tách khỏi tiền tiết kiệm; cảnh báo ngân sách không chặn thanh toán; không định vị như ngân hàng, cho vay hoặc BNPL.

## Quy tắc làm việc chung

- Mỗi thẻ có một chủ sở hữu chịu trách nhiệm và một tệp handoff bền vững.
- Chuyên gia chỉ ghi vào tệp handoff riêng được giao trong `docs/working/`; không ghi vào tệp handoff của thẻ khác, tài liệu chuẩn dưới `docs/`, mã nguồn hoặc SRS gốc.
- Handoff phải nêu phạm vi đã xem xét, quyết định đề xuất, bất biến/tiêu chí chấp nhận, rủi ro, câu hỏi mở và các điểm cần tích hợp.
- Không chạy formatter, linter, build hoặc test toàn dự án. Kiểm tra tài liệu tập trung do điều phối viên thực hiện sau tích hợp.

## Bảng Kanban

| ID | Work item | Owner | State | Scope / worktree | Handoff | Acceptance | Merge gate |
|---|---|---|---|---|---|---|---|
| CC-001 | Phân tích sản phẩm, miền và sổ cái bất biến | `ProductDomain` | `merged` | Chỉ tạo `docs/working/CC-001-product-domain.md`; không sửa mã/SRS | `docs/working/CC-001-product-domain.md` | Vocabulary, income/payment, ví/savings, budget, append-only/reversal/audit, invariants và AC đầy đủ | Handoff tồn tại/đã đọc; grep vocabulary; miền tích hợp vào canonical |
| CC-002 | Xác thực, Gmail/Google OAuth, OTP và thông báo | `AuthSecurity` | `merged` | Chỉ tạo `docs/working/CC-002-auth-security.md`; không sửa mã/SRS | `docs/working/CC-002-auth-security.md` | Local/OAuth/linking/OTP/Gmail opt-in, threat model, session/JWT và AC đầy đủ | Handoff tồn tại/đã đọc; security review; auth tích hợp vào canonical |
| CC-003 | Tech stack, cloud, DB và triển khai | `TechCloud` | `merged` | Chỉ tạo `docs/working/CC-003-tech-cloud.md`; không sửa mã/SRS | `docs/working/CC-003-tech-cloud.md` | MySQL/MongoDB, session/JWT/hybrid, Vercel/Cloudflare, backup/migration/observability và AC đầy đủ | Handoff tồn tại/đã đọc/sửa malformed text; trade-off + quyết định tích hợp |
| CC-004 | JEV pipeline và vận hành admin/report/issue | `JevAdminOps` | `merged` | Chỉ tạo `docs/working/CC-004-jev-admin-ops.md`; không sửa mã/SRS | `docs/working/CC-004-jev-admin-ops.md` | JEV advisory sync/async/fallback/privacy/evaluation; admin least privilege/report workflow và AC đầy đủ | Handoff tồn tại/đã đọc; privacy/ops review; nội dung tích hợp vào canonical |
| CC-INT | Tích hợp tài liệu chuẩn | `CampusCoinOrchestrator` | `merged` | Tạo/cập nhật 8 tài liệu canonical dưới `docs/` sau khi 4 handoff review | `docs/working/INTEGRATION-HANDOFF.md` | 8 tài liệu chuẩn đầy đủ, liên kết đúng, quyết định/giả định nhất quán, acceptance + out-of-scope rõ | Đủ 4 handoff; đọc nội dung; consistency scan; link/heading/file checks |
| CC-REV | Review cuối và đóng bảng | `CampusCoinOrchestrator` | `merged` | Chỉ kiểm tra tài liệu và cập nhật board; không mã/SRS | `docs/working/FINAL-REVIEW.md` | Terminology/chính sách không mâu thuẫn; câu hỏi mở ghi nhận; evidence lưu | File checks + consistency scan + agent/process check pass |

### Trạng thái chuyển đổi

- Bốn specialist cards: `ready → running → review → merged`; mỗi card có handoff bền vững và specialist đã hoàn tất.
- CC-INT: `backlog → running → review → merged` sau khi canonical docs được tạo và kiểm tra.
- CC-REV: `backlog → running → review → merged` sau final review; không còn blocker thuộc phạm vi tài liệu.

### Hợp đồng tích hợp

1. `CC-001` là nguồn miền cho `DOMAIN-MODEL.md`, các phần nghiệp vụ của `PRD.md` và ràng buộc `ARCHITECTURE.md`.
2. `CC-002` và `CC-003` được đối chiếu khi viết `AUTHENTICATION.md`/`ARCHITECTURE.md`; phương án bảo thủ (opaque session) được chọn.
3. `CC-004` cung cấp ranh giới JEV cho `AI-JEV.md` và quyền/workflow cho `ADMIN-OPERATIONS.md`.
4. Không work item nào mở rộng thành ngân hàng, cho vay, BNPL, lãi suất hoặc tư vấn tài chính.
5. Tất cả handoff và canonical docs đã được điều phối viên đọc trước khi đóng thẻ.

## Theo dõi blocker

Không có blocker sản phẩm thật sự. Các điểm chưa quyết định được ghi ở `docs/ROADMAP.md` và `docs/working/INTEGRATION-HANDOFF.md`; chúng không được phép thay đổi invariant hoặc mở rộng phạm vi.

## Evidence / cập nhật

- Board được tạo trước khi dispatch: tất cả thẻ có owner, scope, acceptance và merge gate.
- Đủ 4 handoff specialist: CC-001 (343 dòng), CC-002 (201 dòng), CC-003 (đã sửa và đọc lại), CC-004 (338 dòng).
- Đã tạo và đọc canonical docs: `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DOMAIN-MODEL.md`, `AUTHENTICATION.md`, `AI-JEV.md`, `ADMIN-OPERATIONS.md`, `ROADMAP.md`.
- Không sửa mã nguồn hoặc SRS gốc; không chạy formatter/linter/build/test toàn dự án.
- Kiểm tra cuối được ghi tại `docs/working/FINAL-REVIEW.md`; tích hợp được ghi tại `docs/working/INTEGRATION-HANDOFF.md`.

