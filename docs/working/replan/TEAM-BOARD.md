# Bảng replan — Campus Coin

- **Ngày:** 2026-09-24
- **Điều phối:** Team Leader (người dùng)
- **Phạm vi:** Tài liệu và kế hoạch; không sửa source/SRS.

## Mục tiêu

Đưa thin-slice lên production trong 4–5 ngày với Google OAuth-only, immutable ledger, wallet/savings separation, VND, HCMC, `en`/`vi`, JEV-off/manual path và admin least privilege.
## Nhân sự

| Owner | Phạm vi | Ranh giới |
|---|---|---|
| Team Leader | Scope, contract, tích hợp, GO/NO-GO | Không giao release cho specialist |
| Developer A | OAuth/session/Vercel/owner scope | Không local auth/linking/OTP/Gmail |
| Developer B | MySQL/domain/API/restore | Không UI money math/JEV trong transaction |
| Developer C | React/i18n/report/accessibility | Không secret/balance/authorization |
| Developer D | JEV/QA/deploy/rollback | Không money authority |

## Kanban

| ID | Trạng thái | Handoff |
|---|---|---|
| RP-A | Đã hợp nhất | [`RP-A-OAUTH-VERCEL.md`](./RP-A-OAUTH-VERCEL.md) |
| RP-B | Đã hợp nhất | [`RP-B-DOMAIN-MYSQL.md`](./RP-B-DOMAIN-MYSQL.md) |
| RP-C | Đã hợp nhất | [`RP-C-REACT-I18N.md`](./RP-C-REACT-I18N.md) |
| RP-D | Đã hợp nhất | [`RP-D-JEV-QA-RELEASE.md`](./RP-D-JEV-QA-RELEASE.md) |
| RP-INT | Đã hợp nhất | [`INTEGRATION-HANDOFF.md`](./INTEGRATION-HANDOFF.md) |
| RP-REV | Đã hợp nhất | [`FINAL-REVIEW.md`](./FINAL-REVIEW.md) |

## Lịch và gate

Day 0 khóa scope/API; Day 1 kiểm chứng OAuth, MySQL, restore và JEV; Day 2 A/B khóa contract; Day 3 UI/admin/security; Day 4 smoke/restore/rollback; Day 5 GO hoặc NO-GO/defer.

Provider/region, quota, model, cost, latency, policy và RPO/RTO chưa được claim. JEV probe thất bại chỉ giữ JEV off; auth/domain/restore/security thất bại là NO-GO.

## Nguồn

[`../../adr/README.md`](../../adr/README.md), [`../../DELIVERY-PLAN.md`](../../DELIVERY-PLAN.md), [`INTEGRATION-HANDOFF.md`](./INTEGRATION-HANDOFF.md), [`FINAL-REVIEW.md`](./FINAL-REVIEW.md).
