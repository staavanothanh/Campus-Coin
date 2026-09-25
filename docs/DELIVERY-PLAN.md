# Kế hoạch giao hàng — Campus Coin

> Ngày: 2026-09-24 · Owner: Team Leader (người dùng) · Bốn developer + Team Leader
> Đây là kế hoạch thực thi, không phải claim provider/model đã được xác minh.

## 1. Định nghĩa hoàn thành

Chỉ gọi là production-ready khi Google OAuth/session/owner scope, immutable `income`/`payment`, payment thiếu tiền bị chặn, savings tách biệt, budget warning-only, report deterministic VND/HCMC, `en`/`vi`, dark/light, admin least privilege, Vercel và cloud MySQL restore/rollback đều có evidence. JEV có thể tắt; money path phải chạy khi tắt.

## 2. Sở hữu và ranh giới

| Owner | Trách nhiệm | Không làm |
|---|---|---|
| Team Leader | Scope, contract, evidence, GO/NO-GO, release/rollback | Không ủy quyền quyết định release |
| Developer A | Google OAuth, session, CSRF/origin, owner scope, Vercel/env | Không local auth/linking/OTP/Gmail |
| Developer B | MySQL, schema/migration, ledger, wallet/savings/budget, report, restore | Không client money math; không JEV trong transaction |
| Developer C | React, UI state, `en`/`vi`, VND/HCMC, accessibility, admin UI | Không secret, provider call, balance/authorization |
| Developer D | OpenRouter/JEV tùy chọn, QA, smoke, logs, deploy/rollback | Không đổi domain invariant; không trao JEV money authority |

## 3. Day 0 — khóa scope và contract

Team Leader xác nhận Google-only, opaque session, hai ledger type, immutable history, savings separation, warning-only budget, VND/HCMC, JEV-off/manual path, owner và scope cut. A/B/C/D thống nhất session/read/mutation/error/period/JEV-off contract và dữ liệu synthetic.

**Stop:** boundary chưa rõ hoặc feature mới đụng invariant.

## 4. Day 1 — kiểm chứng dependency

- **A:** Google credentials, exact Vercel callback, claims, session/revoke, env không log secret.
- **B:** MySQL candidate/region, quota, connection, TLS, Vercel connectivity, backup/export/restore, migration/lock/idempotency.
- **C:** shell, route, i18n key, auth state, locale/theme độc lập; không client money math.
- **D:** OpenRouter typed endpoint/model, quota, timeout, cost, privacy; nếu không đạt thì flag off; chuẩn bị JEV-off smoke, health, rollback.

**Gate:** thiếu OAuth production evidence, MySQL connectivity/restore viability hoặc security evidence là NO-GO. Thiếu JEV evidence chỉ chặn enablement JEV.

## 5. Day 2 — vertical slice

A hoàn thiện callback/session/authorization và IDOR/expiry. B hoàn thiện wallet baseline, immutable ledger, atomic payment, savings, category/history, budget warning và report. C tích hợp API authoritative; D thêm adapter interface ngoài money transaction và failure matrix.

**Gate:** không endpoint nào nhận owner/final balance từ client; idempotency, lock order và JEV-off path review được.

## 6. Day 3 — user/admin slice

A security pass OAuth/session/CSRF/CORS/cookie. B HCMC boundary, category lifecycle, reconciliation và restore rehearsal. C savings/category/budget/report, pie/bar + table, VND, hai locale, theme, keyboard/focus và admin queue. D JEV-off/success/invalid/timeout/quota fallback, redacted logs và release candidate.

**Gate:** synthetic flow hai locale, owner isolation, admin least privilege và JEV-off đều đạt.

## 7. Day 4 — smoke adversarial

Kiểm tra OAuth failure/expiry/revoke, IDOR, wallet/payment/concurrency/idempotency, savings atomicity, budget warning, category history, deterministic report, chart/table, locale/theme, admin 403/masking, JEV fallback, TLS/pool, migration/restore, redacted logs, health và rollback.

**Gate:** bất kỳ lỗi critical/high về auth, invariant, data loss, destructive migration, secret/PII, connection hoặc core flow là NO-GO.

## 8. Day 5 — release có kiểm soát

Nếu Day 4 xanh, D deploy artifact/migration đã biết tốt; A kiểm tra OAuth production; B xác nhận DB/restore; C smoke hai locale; Team Leader ghi GO hoặc NO-GO/defer. JEV chỉ bật khi probe/privacy/cost/quality đạt; manual picker được chấp nhận khi launch. Không mở feature mới.

## 9. Scope cut

Không nằm trên critical path: local auth, linking, OTP/reset, Gmail inbox/cá nhân, security-email, notification, auto-transfer chưa chứng minh, CSV/PDF, recurring, prediction, complex AI, chat, custom domain, banking, payment thật, lending, BNPL, multi-currency và enterprise admin.

## 10. Acceptance checklist

- [ ] Scope và deferred list được Team Leader khóa.
- [ ] OAuth callback/state/PKCE/nonce/claims/owner scope đạt.
- [ ] Vercel env, TLS, cloud MySQL, pool, backup/restore đạt.
- [ ] Ledger/wallet/payment/savings/budget/category/report đạt invariant.
- [ ] UI `en`/`vi`, VND/HCMC, accessibility, chart/table và theme đạt.
- [ ] Admin không mutate ledger; log được mask.
- [ ] JEV default-off/manual fallback và JEV-off smoke đạt.
- [ ] Rollback/restore và production smoke được diễn tập.
- [ ] Team Leader ghi GO/NO-GO.

## 11. Rollback và incident

Trigger gồm OAuth bypass/IDOR, wallet/savings invariant, destructive migration, DB data loss, secret/PII leak hoặc deploy-wide failure. Tắt JEV trước nếu liên quan; deploy known-good; restore/reconcile từ immutable ledger; không xóa/sửa ledger. Team Leader quyết định resume/read-only/rollback.

## 12. Blocker hiện tại

Chưa có blocker cho việc lập kế hoạch. Launch vẫn bị chặn bởi Day-1/Day-4 evidence về Google OAuth/Vercel, MySQL provider/region/restore, domain/security, UI/release và production smoke. OpenRouter chưa được claim; JEV có thể giữ off.

## 13. ADR liên quan

[ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0007](./adr/0007-five-day-thin-slice.md).
