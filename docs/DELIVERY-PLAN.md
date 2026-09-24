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

## 12. Trạng thái và blocker DevB

Đã có schema MySQL và migrations `0001`–`0027`, các service/repository wallet, ledger, savings, budget, report, unit tests, gated MySQL tests và contract smoke tests. Migration owner/projection được chia thành một DDL statement mỗi version để resume sau lỗi statement-level. Branch local đang ahead 5/behind 0 so với `main`; chưa có PR hoặc CI result. Workflow MySQL thật và lệnh gate bắt buộc đã được thêm nhưng chưa chạy trong môi trường này. Source/test pass chưa đồng nghĩa DB/restore/provider đã được xác minh.

| ID | Blocker | Owner | Điều kiện đóng |
|---|---|---|---|
| `BLK-OWNER-01` | Migrations `0011`/`0013`/`0014` thêm composite FK và `0018`/`0020`/`0023` chặn cross-owner/type SQL trực tiếp | B | Chờ migrations + datatest thực thi trên MySQL 8 thật; không đóng trước đó |
| `BLK-IDEMP-01` | Helper dùng DB được truyền vào; category/budget claim/replay/conflict cùng body hash và audit atomically | B | Unit/typecheck đã pass; chờ gated MySQL concurrency/replay test |
| `BLK-API-01` | Fetch-compatible handlers cho core/issue routes, validation, origin/CSRF port và envelope đã có | A + B | Chờ host mount, auth/session adapter và distributed rate-limit thật; route unit test không thay thế OAuth/session integration |
| `BLK-ISSUE-01` | Issue service/repository owner scope, related transaction ownership, atomic event/audit và admin role checks đã có | B | Chờ gated MySQL tests; admin role phải đến từ trusted session adapter |
| `BLK-MIG-01` | `cmdUp` khóa trước khi load/re-plan; có MySQL concurrency integration test | B | Unit test pass; chờ concurrency test MySQL thật |
| `BLK-MIG-02` | Filename, duplicate/gap, SQL rỗng/statement header và DB-only/out-of-order versions fail-closed | B | Unit tests pass; cú pháp đầy đủ được xác minh bằng fresh migration trên MySQL; DDL failure có thể để lại partial schema, chưa ghi version |
| `BLK-HARNESS-01` | Harness dùng shared `sslOption`, admin test account riêng và runtime principal table/column grants | B | Chờ chạy `verify-ca` test thật trên disposable cloud candidate; local CI dùng MySQL riêng |
| `BLK-MATH-01` | Checked arithmetic và exact DB integer parsing được thêm cho money/report/projection paths | B | Focused unit tests pass; chờ toàn bộ gated MySQL suite |
| `BLK-CURSOR-01` | Cursor HMAC-SHA256 versioned, key bắt buộc khi dùng, limit/length bound | A + B | Focused tamper/boundary tests pass; key rotation/production secret provisioning còn là deploy gate |
| `BLK-GRANT-01` | Grants chuyển từ schema-wide DML sang table/column scope; wallet/savings projections chỉ cập nhật qua trigger-definer; runtime grant test đã có | B + Team Leader | Chờ test bằng MySQL principal thật. Shared runtime DB identity không cung cấp row-level user identity; nếu acceptance yêu cầu cấm cả arbitrary SQL update issue/custom category ngoài service, cần chốt DB command/credential boundary trước khi đóng blocker |
| `BLK-CI-01` | `test:mysql:required` ép gate và GitHub workflow MySQL 8.0.41 đã thêm | B + D | Workflow/check chưa chạy; cần CI result xanh trên PR |
| `BLK-RECON-01` | `db:reconcile` đối chiếu wallet/savings projection từ immutable rows; `/health/ready` ping DB | B | Unit tests pass; restore rehearsal và reconciliation trên restored DB còn mở |

### Dọn trước khi merge

- [x] Sửa `docs/working/aiven-handoff.md`: không claim CA/endpoint/admin user chưa xác minh; không dùng admin user cho runtime.
- [x] Benchmark tạo schema unique local-only và drop schema; không DELETE append-only history.
- [x] Có `test:mysql:required`; `npm test` mặc định vẫn có thể skip suite DB và không được dùng làm evidence MySQL.
- [ ] Chỉ mở PR sau khi diff, secret/PII, migration, restore, owner scope và test evidence được review.

### Thứ tự merge đề xuất

1. Owner isolation + idempotency.
2. API routes/envelopes + issue/admin boundary.
3. TLS harness và migration/restore/reconcile.
4. Overflow + signed cursor.
5. Integration/e2e gate chạy với MySQL thật.
6. Dọn handoff/benchmark và mở PR sau khi CI MySQL thật xanh; hiện chưa có CI result.

Các blocker cũ về OAuth/IDOR, provider/region/restore, domain invariant, secret/PII, accessibility và rollback vẫn là launch gate. OpenRouter chưa được claim; JEV có thể giữ off.

## 13. ADR liên quan

[ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0007](./adr/0007-five-day-thin-slice.md).
