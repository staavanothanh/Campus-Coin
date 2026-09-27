# Bảng triển khai — Campus Coin

> Ngày: 2026-09-26 · Team Leader — Hiệp là integrator và người duyệt release.
> Quyết định auth: email theo [ADR-0008](./adr/0008-email-password-otp-auth.md), Google bổ sung theo [ADR-0009](./adr/0009-optional-google-sign-in.md).

## Quy tắc

Specialist chỉ cung cấp phân tích; không thay thế bốn developer và không duyệt release. Mỗi workstream có một human owner. Bảng này ghi phân công và gate; trạng thái triển khai phải có evidence ở `docs/DELIVERY-PLAN.md`.

## Vai trò

| Owner | Phạm vi | Ranh giới |
|---|---|---|
| Team Leader | Scope, contract, tích hợp, evidence, GO/NO-GO | Không ủy quyền release |
| Developer A | Email/password/OTP, SMTP adapter, Google OIDC tùy chọn, session, CSRF/origin, owner scope, Vercel | Không Gmail credential/inbox/API; không tự động merge account theo email |
| Developer B | MySQL, ledger, wallet/savings/budget, report, restore | Không UI money math/JEV transaction |
| Developer C | React, i18n, dashboard/report/admin, accessibility | Không secret/balance/authorization |
| Developer D | JEV tùy chọn, QA, smoke, deploy, rollback | Không domain authority/JEV money authority |

## Kanban

| ID | Owner | Trạng thái | Acceptance/gate |
|---|---|---|---|
| HUMAN-A | Developer A | Auth implementation; Vercel Function adapter, DB pool hook, Origin/cache contract, session activity tracking và owner regression đã thêm vào nhánh sản phẩm | Chờ CI mới xác nhận test; SMTP/provider failure và Vercel Preview/deploy evidence do DevD chạy |
| HUMAN-B | Developer B | CI MySQL disposable đã pass; schema `campus_coin` có migrations `0001`–`0005`; clone `campus_coin_done` chưa truy cập được bằng app config | Xác nhận đúng DB/service/grants và migration chain; cho phép test role tạo/xóa schema tạm, xác nhận backup/restore, CA và least-privilege runtime grants; review domain routes |
| HUMAN-C | Developer C | Auth UI đã có; domain UI còn thiếu | Wallet/dashboard, income/payment/history, savings, category/budget, report/issue; hai ngôn ngữ, responsive và accessible |
| HUMAN-D | Developer D | JEV giữ default-off; Vercel deploy workflow đã có, Preview/staging smoke còn chờ | Chạy CI trước, deploy Preview, xác nhận SMTP outage/restore và redacted logs; chỉ deploy Production từ `hiep` qua GitHub Environment có approval. Xem [handoff](./working/team-handoff-2026-09-26/DEV-D-VERCEL-SMTP.md) |
| LEADER-INT | Team Leader | Commit `5bc7185` đã push; [run #11](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) pass toàn workflow; run #6 pass code và ba MySQL suites | Email auth theo ADR-0008, Google tùy chọn theo ADR-0009; owner integration pass trên MySQL CI cô lập; Team Leader xác nhận staging Phần 2 hoàn tất; SMTP/provider failure và production gates vẫn chờ evidence |
| LEADER-REV | Team Leader | Chờ evidence | GO/NO-GO sau auth/DB/email/API/UI/CI/restore gates |

## Đường găng

- Day 0: Team Leader khóa scope; A/B/C/D chuẩn bị song song.
- Day 1: SMTP/auth/session, MySQL/restore, UI contract, OpenRouter probe.
- Day 2: A/B khóa session/domain; C/D tích hợp theo contract.
- Day 3: UI/admin/security/reconciliation/fallback.
- Day 4: integrated smoke, restore, privacy, accessibility, rollback.
- Day 5: controlled release hoặc defer; không feature expansion.

## Chặn và giả định

Launch blockers: CI mới cho owner regression/adapter/SMTP timeout, SMTP/provider failure trên Preview, Vercel env/connectivity, DB migration/restore/role, backup/rollback, accessibility và API/domain evidence. Vercel handler/config/deploy workflow đã có trong source; việc đó chưa chứng minh đã deploy. OpenRouter model/quota/policy chưa được claim; JEV có thể off. Custom email domain chưa phải dependency.

## Chỉ mục bằng chứng

- [`working/replan/INTEGRATION-HANDOFF.md`](./working/replan/INTEGRATION-HANDOFF.md)
- [`working/replan/FINAL-REVIEW.md`](./working/replan/FINAL-REVIEW.md)
- [`working/replan/TEAM-BOARD.md`](./working/replan/TEAM-BOARD.md)
- [`adr/README.md`](./adr/README.md)
- [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md)
