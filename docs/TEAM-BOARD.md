# Bảng triển khai — Campus Coin

> Ngày: 2026-09-25 · Team Leader — Hiệp là integrator và người duyệt release.
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
| HUMAN-A | Developer A | Auth implementation và HTTP tests đã push; Team Leader xác nhận auth staging Phần 2 hoàn tất và báo Google OAuth đã kết nối; test CSRF/Origin tự động đã thêm | SMTP/provider failure timeout/retry và CSRF/Origin staging còn chờ evidence; môi trường Google OAuth và việc thử riêng login/connect account chưa nêu; CI cho commit mới đang pending |
| HUMAN-B | Developer B | CI MySQL disposable đã pass; schema `campus_coin` có migrations `0001`–`0005`; clone `campus_coin_done` chưa truy cập được bằng app config | Xác nhận đúng DB/service/grants và migration chain; cho phép test role tạo/xóa schema tạm, xác nhận backup/restore, CA và least-privilege runtime grants; review domain routes |
| HUMAN-C | Developer C | Auth UI đã có; domain UI còn thiếu | Wallet/dashboard, income/payment/history, savings, category/budget, report/issue; hai ngôn ngữ, responsive và accessible |
| HUMAN-D | Developer D | JEV giữ default-off; smoke/release QA còn chờ evidence | Chỉ làm typed JEV probe/fallback nếu feature được bật; phối hợp redacted logs, smoke và rollback theo release scope |
| LEADER-INT | Team Leader | Commit `dd90c11` đã push; [run #10](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117665453) pass toàn workflow; run #6 pass code và ba MySQL suites | Email auth theo ADR-0008, Google tùy chọn theo ADR-0009; owner integration pass trên MySQL CI cô lập; Team Leader xác nhận staging Phần 2 hoàn tất; SMTP/provider failure và production gates vẫn chờ evidence |
| LEADER-REV | Team Leader | Chờ evidence | GO/NO-GO sau auth/DB/email/API/UI/CI/restore gates |

## Đường găng

- Day 0: Team Leader khóa scope; A/B/C/D chuẩn bị song song.
- Day 1: SMTP/auth/session, MySQL/restore, UI contract, OpenRouter probe.
- Day 2: A/B khóa session/domain; C/D tích hợp theo contract.
- Day 3: UI/admin/security/reconciliation/fallback.
- Day 4: integrated smoke, restore, privacy, accessibility, rollback.
- Day 5: controlled release hoặc defer; không feature expansion.

## Chặn và giả định

Launch blockers: xác minh auth brute-force/OTP/session bằng MySQL cô lập, kiểm tra SMTP/provider failure timeout/retry, CSRF/IDOR review, Vercel runtime/env/connectivity, DB migration/restore/role, API/domain owner-isolation integration evidence, ledger/savings invariant, secret/PII leak, accessibility review, remote CI hoặc rollback failure. OpenRouter model/quota/policy chưa được claim; JEV có thể off. Custom email domain chưa phải dependency.

## Chỉ mục bằng chứng

- [`working/replan/INTEGRATION-HANDOFF.md`](./working/replan/INTEGRATION-HANDOFF.md)
- [`working/replan/FINAL-REVIEW.md`](./working/replan/FINAL-REVIEW.md)
- [`working/replan/TEAM-BOARD.md`](./working/replan/TEAM-BOARD.md)
- [`adr/README.md`](./adr/README.md)
- [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md)
