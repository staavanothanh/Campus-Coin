# Bảng triển khai — Campus Coin

> Ngày: 2026-09-24 · Team Leader — Hiệp là integrator và người duyệt release.
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
| HUMAN-A | Developer A | Auth implementation và HTTP tests đã push | OTP/login/reset, rate-limit/session/CSRF/IDOR, auth UI và API contract; Team Leader báo register qua email đã thành công; SMTP reset/timeout/retry và staging flow còn chờ evidence |
| HUMAN-B | Developer B | Chờ CI MySQL pass và target staging | Xác nhận DB/schema test riêng, quyền create/drop cho test role, migration `0004`/`0005`, backup/restore, CA và least-privilege runtime grants; review domain routes |
| HUMAN-C | Developer C | Sẵn sàng Day 1 | UI two-locale, VND/HCMC, accessible, JEV-off |
| HUMAN-D | Developer D | Sẵn sàng Day 1 | Typed JEV probe/fallback, smoke, redacted logs, rollback |
| LEADER-INT | Team Leader | Run #5 đã chỉ ra lỗi owner budget `422`/`404` và Google test gọi redirect ra mạng; đã sửa code/test, chờ CI chạy lại | Email auth theo ADR-0008, Google tùy chọn theo ADR-0009; local typecheck/build/unit pass; chưa đánh dấu auth MySQL/owner isolation pass cho tới khi CI xác nhận; register email đã được Team Leader xác nhận |
| LEADER-REV | Team Leader | Chờ evidence | GO/NO-GO sau auth/DB/email/API/UI/CI/restore gates |

## Đường găng

- Day 0: Team Leader khóa scope; A/B/C/D chuẩn bị song song.
- Day 1: SMTP/auth/session, MySQL/restore, UI contract, OpenRouter probe.
- Day 2: A/B khóa session/domain; C/D tích hợp theo contract.
- Day 3: UI/admin/security/reconciliation/fallback.
- Day 4: integrated smoke, restore, privacy, accessibility, rollback.
- Day 5: controlled release hoặc defer; không feature expansion.

## Chặn và giả định

Launch blockers: xác minh auth brute-force/OTP/session bằng MySQL cô lập, SMTP delivery evidence, CSRF/IDOR review, Vercel env/connectivity, DB migration/restore/role, API/domain owner-isolation integration evidence, ledger/savings invariant, secret/PII leak, accessibility review, remote CI hoặc rollback failure. OpenRouter model/quota/policy chưa được claim; JEV có thể off. Custom email domain chưa phải dependency; provider gửi OTP vẫn phải được chọn và kiểm chứng.

## Chỉ mục bằng chứng

- [`working/replan/INTEGRATION-HANDOFF.md`](./working/replan/INTEGRATION-HANDOFF.md)
- [`working/replan/FINAL-REVIEW.md`](./working/replan/FINAL-REVIEW.md)
- [`working/replan/TEAM-BOARD.md`](./working/replan/TEAM-BOARD.md)
- [`adr/README.md`](./adr/README.md)
- [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md)
