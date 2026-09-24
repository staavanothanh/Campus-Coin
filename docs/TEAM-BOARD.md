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
| HUMAN-A | Developer A | Đã có code; chờ DB/provider evidence | OTP/login/reset, rate-limit/session/CSRF/IDOR, auth UI và API contract; MySQL E2E/SMTP thật còn chờ |
| HUMAN-B | Developer B | Cần phối hợp | Xác nhận DB target, migration `0004`/`0005`, backup/restore, CA và least-privilege grants; review API/domain integration |
| HUMAN-C | Developer C | Sẵn sàng Day 1 | UI two-locale, VND/HCMC, accessible, JEV-off |
| HUMAN-D | Developer D | Sẵn sàng Day 1 | Typed JEV probe/fallback, smoke, redacted logs, rollback |
| LEADER-INT | Team Leader | Canonical docs/API contract đã cập nhật theo ADR-0009 | Email auth giữ theo ADR-0008; Google là phương thức tùy chọn; DB/SMTP/CI/live-OAuth evidence còn chờ |
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
