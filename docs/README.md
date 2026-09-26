# Campus Coin — Bản đồ tài liệu và quyết định

## 1. Mục đích

Campus Coin là ứng dụng Web song ngữ cho sinh viên ghi nhận dữ liệu tự nhập `income` và `payment`, theo dõi ví, savings, ngân sách và báo cáo. Sản phẩm không phải ngân hàng, không giữ tiền thật, không xử lý thanh toán thật, không cho vay, không BNPL và không cung cấp tư vấn tài chính được chứng nhận.

Đây là bản đồ tài liệu. Quyết định khó đảo ngược nằm trong [`adr/README.md`](./adr/README.md). Kế hoạch hiện tại nằm trong [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md). Không coi tài liệu là bằng chứng provider đã hoạt động nếu chưa có release evidence.
## 1.1. Cấu trúc thư mục

```text
docs/
├── README.md                 # Bản đồ và quy tắc ưu tiên
├── DECISIONS.md              # Bảng tra nhanh các quyết định
├── PRD.md                    # Yêu cầu sản phẩm và phạm vi
├── ARCHITECTURE.md           # Kiến trúc và boundary
├── DOMAIN-MODEL.md           # Miền dữ liệu và bất biến
├── AUTHENTICATION.md         # Xác thực và phân quyền
├── AI-JEV.md                 # Ranh giới JEV/OpenRouter
├── ADMIN-OPERATIONS.md       # Quản trị và vận hành
├── ROADMAP.md                # Lộ trình và các phần để sau
├── DELIVERY-PLAN.md          # Kế hoạch giao hàng Day 0–5
├── TEAM-BOARD.md             # Bảng triển khai human team
├── CURRENT-STATUS.md         # Quyết định, commits đã push, evidence và gate còn chờ
├── QUALITY-AND-SCORING.md    # Rubric chấm điểm và evidence cần chuẩn bị
├── DB-STAGING-TESTING.md     # Kiểm tra DB riêng, auth staging và owner scope
├── ENGINEERING-PRINCIPLES-APPLICATION.md # Câu hỏi nguyên lý và cách áp dụng vào project
├── adr/                      # Lịch sử quyết định kiến trúc, ổn định
└── working/                  # Handoff, replan và bằng chứng tạm thời
    ├── README.md             # Quy tắc và phân loại working docs
    ├── student-cashflow-research-2026-09-26.md # Đề xuất nghiên cứu, chưa chốt phạm vi
    ├── team-handoff-2026-09-26/ # DB/benchmark, UI và Vercel/SMTP tasks theo owner
    └── replan/               # Bằng chứng của lượt replan hiện tại
```

Root `docs/` là canonical product docs; `adr/` là canonical history; `working/` không được ghi đè quyết định trong ADR hoặc canonical docs.

## 2. Quyết định đã chốt

| Chủ đề | Quyết định | ADR |
|---|---|---|
| Xác thực | Email + mật khẩu + OTP; Google Sign-In tùy chọn; opaque server-side session | [ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0009](./adr/0009-optional-google-sign-in.md) |
| Phiên trình duyệt | Opaque server-side session, cookie bảo mật, owner lấy từ session | [ADR-0002](./adr/0002-opaque-browser-session.md) |
| Cơ sở dữ liệu | Cloud MySQL sau cổng kiểm chứng provider/region/free-tier/restore | [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md) |
| Triển khai/email | Domain Vercel; custom email domain không bắt buộc; SMTP gửi OTP phải được chọn/kiểm chứng | [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0008](./adr/0008-email-password-otp-auth.md) |
| Tiền | `income`/`payment` bất biến, VND nguyên trong integer an toàn, savings tách biệt, budget chỉ cảnh báo | [ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0010](./adr/0010-safe-integer-money-range.md) |
| JEV | Optional, backend-only, OpenRouter typed contract, default-off, manual fallback | [ADR-0006](./adr/0006-optional-openrouter-jev.md) |
| Giao hàng | Thin-slice 4–5 ngày, bốn developer, Team Leader quyết định GO/NO-GO | [ADR-0007](./adr/0007-five-day-thin-slice.md) |

## 3. Bản đồ tài liệu chuẩn

| Tài liệu | Vai trò |
|---|---|
| [`PRD.md`](./PRD.md) | Mục tiêu, phạm vi MVP, acceptance và scope cut |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Luồng lớp, boundary, triển khai và dependency |
| [`DOMAIN-MODEL.md`](./DOMAIN-MODEL.md) | Thực thể, công thức, invariant và transaction |
| [`AUTHENTICATION.md`](./AUTHENTICATION.md) | Email/password/OTP, Google Sign-In, session, CSRF, owner scope và threat controls |
| [`AI-JEV.md`](./AI-JEV.md) | Boundary OpenRouter/JEV, probe, privacy và fallback |
| [`ADMIN-OPERATIONS.md`](./ADMIN-OPERATIONS.md) | Least privilege, issue workflow, audit và incident |
| [`ROADMAP.md`](./ROADMAP.md) | Mốc MVP, deferred work, risk và gate |
| [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md) | Kế hoạch Day 0–5, owner, checklist và rollback |
| [`DECISIONS.md`](./DECISIONS.md) | Chỉ mục quyết định tương thích ADR; chi tiết chuẩn ở `docs/adr/` |
| [`TEAM-BOARD.md`](./TEAM-BOARD.md) | Bảng sở hữu và trạng thái triển khai của human team |
| [`CURRENT-STATUS.md`](./CURRENT-STATUS.md) | Quyết định hiện hành, commits đã push, evidence và gate còn chờ |
| [`QUALITY-AND-SCORING.md`](./QUALITY-AND-SCORING.md) | Trọng số chấm điểm, thứ tự ưu tiên và evidence |
| [`DB-STAGING-TESTING.md`](./DB-STAGING-TESTING.md) | Quy trình DB test an toàn, auth/email staging và owner checks |
| [`ENGINEERING-PRINCIPLES-APPLICATION.md`](./ENGINEERING-PRINCIPLES-APPLICATION.md) | Câu hỏi–trả lời kỹ thuật và thay đổi áp dụng vào code |
| [`working/team-handoff-2026-09-26/`](./working/team-handoff-2026-09-26/README.md) | Hướng dẫn theo owner cho DB/benchmark, UI/accessibility và Vercel/SMTP/release |
| [`working/student-cashflow-research-2026-09-26.md`](./working/student-cashflow-research-2026-09-26.md) | Nghiên cứu advisory về weekly cashflow, what-if, personal benchmark và nguồn tham khảo |

## 4. Thứ tự ưu tiên khi mâu thuẫn

1. Yêu cầu hiện hành và quyết định trực tiếp của Team Leader.
2. ADR đã chấp nhận.
3. Invariant trong `DOMAIN-MODEL.md` và `AUTHENTICATION.md`.
4. PRD, architecture, delivery plan và roadmap.
5. Handoff trong `docs/working/` chỉ là bằng chứng tư vấn, không được mở lại quyết định đã chốt.

## 5. Thuật ngữ bắt buộc

- Dùng `income` và `payment` cho enum/API/domain; UI dịch thành “Thu nhập” và “Thanh toán”.
- Không dùng `expense` hoặc “chi phí” làm transaction type.
- “Ví” là wallet; “savings” là aggregate tiết kiệm riêng; savings transfer không phải ledger transaction.
- “JEV” luôn là advisory; không phải authority tài chính.
- `en`/`vi` chỉ thay đổi trình bày, không thay đổi enum, công thức, audit hoặc authorization.

## 6. Quy tắc cập nhật và sở hữu nguồn

| Nhóm sự thật | Nguồn duy nhất | Không ghi bản sao quyết định ở |
|---|---|---|
| Quyết định khó đảo ngược | [`adr/`](./adr/) | Handoff, roadmap, board |
| Yêu cầu/phạm vi/acceptance | [`PRD.md`](./PRD.md) | ADR trừ phần lý do/quyết định |
| Bất biến và công thức tiền | [`DOMAIN-MODEL.md`](./DOMAIN-MODEL.md) | UI/handoff |
| Auth/session/owner scope | [`AUTHENTICATION.md`](./AUTHENTICATION.md) | Handoff cũ |
| Trạng thái/gate hiện tại | [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md) | ADR |
| Rubric và evidence chấm điểm | [`QUALITY-AND-SCORING.md`](./QUALITY-AND-SCORING.md) | ADR |
| DB/staging test procedure | [`DB-STAGING-TESTING.md`](./DB-STAGING-TESTING.md) | `.env`/handoff chứa secret |
| Nguyên lý giao diện, API, React và dữ liệu | [`ENGINEERING-PRINCIPLES-APPLICATION.md`](./ENGINEERING-PRINCIPLES-APPLICATION.md) | Quyết định nghiệp vụ chuẩn ở ADR/domain docs |
| Bằng chứng quy trình | [`working/`](./working/) | Canonical decision |

Thay đổi auth phải cập nhật ADR-0008/0009/0002, `AUTHENTICATION.md`, `ARCHITECTURE.md` và acceptance liên quan. ADR-0001/0007 được giữ nguyên làm lịch sử. Thay đổi money invariant phải cập nhật ADR-0005/0010, `DOMAIN-MODEL.md`, `PRD.md` và delivery gate. Thay đổi JEV phải cập nhật ADR-0006 và `AI-JEV.md`. Không ghi secret, token, raw PII hoặc claim provider chưa kiểm chứng.
