# Bảng triển khai — Campus Coin

> Ngày: 2026-09-24 · Team Leader (người dùng) là integrator và người duyệt release.
> Handoff chi tiết: [`working/replan/`](./working/replan/).

## Quy tắc

Specialist chỉ cung cấp phân tích; không thay thế bốn developer và không duyệt release. Mỗi workstream có một human owner. Không sửa source/SRS trong lượt chuẩn hóa tài liệu.

## Vai trò

| Owner | Phạm vi | Ranh giới |
|---|---|---|
| Team Leader | Scope, contract, tích hợp, evidence, GO/NO-GO | Không ủy quyền release |
| Developer A | Google OAuth, session, CSRF/origin, owner scope, Vercel | Không local auth/linking/OTP/Gmail |
| Developer B | MySQL, ledger, wallet/savings/budget, report, restore | Không UI money math/JEV transaction |
| Developer C | React, i18n, dashboard/report/admin, accessibility | Không secret/balance/authorization |
| Developer D | JEV tùy chọn, QA, smoke, deploy, rollback | Không domain authority/JEV money authority |

## Kanban

| ID | Owner | Trạng thái | Acceptance/gate |
|---|---|---|---|
| HUMAN-A | Developer A | Sẵn sàng Day 1 | OAuth callback/claims/session/IDOR/revoke |
| HUMAN-B | Developer B | Sẵn sàng Day 1 | MySQL evidence, ledger/savings/budget invariant, restore |
| HUMAN-C | Developer C | Sẵn sàng Day 1 | UI two-locale, VND/HCMC, accessible, JEV-off |
| HUMAN-D | Developer D | Sẵn sàng Day 1 | Typed JEV probe/fallback, smoke, redacted logs, rollback |
| LEADER-INT | Team Leader | Đang điều phối | Contract và docs thống nhất |
| LEADER-REV | Team Leader | Chờ evidence | GO/NO-GO sau Day-1/Day-4 gates |

## Đường găng

- Day 0: Team Leader khóa scope; A/B/C/D chuẩn bị song song.
- Day 1: OAuth/Vercel, MySQL/restore, UI contract, OpenRouter probe.
- Day 2: A/B khóa session/domain; C/D tích hợp theo contract.
- Day 3: UI/admin/security/reconciliation/fallback.
- Day 4: integrated smoke, restore, privacy, accessibility, rollback.
- Day 5: controlled release hoặc defer; không feature expansion.

## Chặn và giả định

Launch blockers: OAuth/IDOR, Vercel env/connectivity, MySQL provider/region/restore, ledger/savings invariant, secret/PII leak, inaccessible core UI hoặc rollback failure. OpenRouter model/quota/policy chưa được claim; JEV có thể off. Email notification và custom domain không chặn launch.

## Chỉ mục bằng chứng

- [`working/replan/INTEGRATION-HANDOFF.md`](./working/replan/INTEGRATION-HANDOFF.md)
- [`working/replan/FINAL-REVIEW.md`](./working/replan/FINAL-REVIEW.md)
- [`working/replan/TEAM-BOARD.md`](./working/replan/TEAM-BOARD.md)
- [`adr/README.md`](./adr/README.md)
- [`DELIVERY-PLAN.md`](./DELIVERY-PLAN.md)
