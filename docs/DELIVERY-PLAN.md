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

**Cập nhật 2026-09-25 (xử lý tồn đọng):** `0011` được repair (tách `ALTER TABLE` thành columns/UNIQUE trước, FK sau, DROP FK cũ cuối; giữ nguyên tên constraint/index và semantics) vì self-FK không nhận parent index tạo trong cùng `ALTER` (lỗi 1828). Repair đổi checksum file `0011`; được chấp nhận vì chưa có shared DB nào apply thành công `0011` (Aiven applied=3, CI disposable luôn fresh, không financial row nào phụ thuộc). Fresh migration `0001`–`0030` đã xanh trên MySQL 8.0.41 portable local. Full gate local: `typecheck` pass, `test:mysql:required` 106 pass / 0 fail / 0 skip (gồm domain integration 24, migration concurrency, runtime grants, contract smoke 13 và toàn bộ unit), `db:datatest` 30/30 pass, `api:validate` pass (5 ignore có chủ đích cho OAuth redirect/liveness), `git diff --check` sạch. CI workflow chưa re-run (cần push, chưa được ủy quyền) nên run `36087720681` vẫn là kết quả CI mới nhất. Aiven không bị đụng: chưa chạy migration, chưa restore; preflight/TLS/restore/reconcile/grants production vẫn là evidence do operator thực hiện theo runbook.
> **Cập nhật sau push `c96e653`:** CI run `36100878978` success — đủ 15 steps xanh gồm `npm ci`, `typecheck`, `npm test`, cả bốn suite MySQL (domain integration, migration concurrency, runtime grants, contract smoke) và `Validate OpenAPI` trên service MySQL 8.0.41 disposable.

Read-only `npm run db:preflight` đã chạy trên Aiven ngày 2026-09-25, tại revision có 27 migration: connect/TLS handshake và cipher pass; MySQL `8.4.8`; database tồn tại; `schema_migrations` báo applied=3, pending=24/27. Charset/collation check và pool-vs-`max_connections` được đánh dấu WARN; giá trị đo được là `utf8mb4/utf8mb4_0900_ai_ci` và pool 5 so với max 76. Không ghi endpoint vào tài liệu. Preflight không xác nhận CA provenance/mode chính xác, DB principal/grants, trigger `DEFINER`, backup/restore hoặc reconcile. Từ lần đó chưa chạy migration; source hiện có thêm `0028`–`0030` cho operations log nhưng chưa được preflight/test trên Aiven.

Local `test:mysql:required` sau repair (MySQL 8.0.41 portable): 106 pass, 0 fail, 0 skip; `db:datatest` 30/30 pass; `typecheck`, `api:validate` (5 ignore có chủ đích cho OAuth redirect/liveness, không còn 49 warning cũ) và `verify:docs` pass; `git diff --check` sạch. File test `mysql-primitives` dư thừa (trùng BIGINT SUM/ops-log đã có, sai env) đã xóa để `typecheck` xanh. `openingWalletBalanceVnd` vẫn `MoneyVnd` (minimum 0): opening = initial (≥ 0) + delta có dấu trước kỳ, và invariant wallet không âm giữ opening không âm (có regression test tháng sau kỳ chi vượt thu). `/admin/audit-logs` đã đồng bộ: OpenAPI (`x-required-role: security`, 403 cho user/admin, 405 cho write) khớp implementation (chỉ role security, forged write 405 không chạm DB).

| ID | Blocker | Owner | Điều kiện đóng |
|---|---|---|---|
| `BLK-OWNER-01` | Migrations `0011`/`0013`/`0014` thêm composite FK và `0018`/`0020`/`0023` chặn cross-owner/type SQL trực tiếp | B | `db:datatest` 30/30 pass trên MySQL 8.0.41 portable local (sau repair `0011`); chờ CI re-run rồi Team Leader chốt |
| `BLK-IDEMP-01` | Helper dùng DB được truyền vào; category/budget claim/replay/conflict cùng body hash và audit atomically | B | Unit/typecheck pass; concurrency/replay/integration đã xanh local (MySQL 8.0.41), chờ CI re-run |
| `BLK-API-01` | Fetch-compatible handlers cho core/issue routes, validation, origin/CSRF port và envelope đã có | A + B | Chờ host mount, auth/session adapter và distributed rate-limit thật; route unit test không thay thế OAuth/session integration |
| `BLK-ISSUE-01` | Issue service/repository owner scope, related transaction ownership, atomic event/audit và admin role checks đã có | B | Gated MySQL (issue owner/update/events) đã xanh local; admin role phải đến từ trusted session adapter (chưa có integration OAuth/session thật) |
| `BLK-MIG-01` | `cmdUp` khóa trước khi load/re-plan; có MySQL concurrency integration test | B | Unit + concurrency integration đã xanh local (MySQL 8.0.41), chờ CI re-run |
| `BLK-MIG-02` | MySQL 8.0.41 fresh migration fail ở `0011` (self-FK không nhận index cùng `ALTER`); đã repair bằng cách tách thứ tự DDL, giữ nguyên objects/semantics | B + Team Leader | Repair đi cùng PR #1 đã merge theo quyết định Team Leader; nhánh `database-ingest-0.2` mang phần còn lại: apply `0004`–`0030` lên cloud, review grants/trigger `DEFINER` bằng đúng principal, restore rehearsal + reconcile (operator-gated) |
| `BLK-HARNESS-01` | Harness dùng shared `sslOption`, migration principal riêng làm trigger `DEFINER`, runtime principal table/column grants | B | Đã sửa hai gap lộ ra sau `0011`: definer thiếu UPDATE cột trigger gán + SELECT base table (`savings_transfers`, `issues`), runtime thiếu UPDATE tối thiểu cho locking read (`wallet`/`savings`.`updated_at`, `ledger`.`description`); trigger `DEFINER` = migration principal đã verify local; Aiven CA provenance/mode/role còn pending |
| `BLK-MATH-01` | Checked arithmetic và exact DB integer parsing được thêm cho money/report/projection paths | B | Focused unit + toàn bộ gated MySQL suite đã xanh local (gồm BIGINT SUM và reconcile); chờ CI re-run |
| `BLK-CURSOR-01` | Cursor HMAC-SHA256 versioned, key bắt buộc khi dùng, limit/length bound | A + B | Focused tamper/boundary tests pass; key rotation/production secret provisioning còn là deploy gate |
| `BLK-GRANT-01` | ADR-0008 chốt row-level authorization ở service; DB enforce integrity, append-only và column grants | B + Team Leader | Kiến trúc đã chốt; negative tests (service/API cross-owner category/issue/budget, forged audit 405, DEFINER, projection denial, direct cross-owner SQL) đã xanh local; direct SQL bằng runtime credential là residual risk đã ghi trong ADR-0008; production grants/TLS/restore chờ evidence operator |
| `BLK-AUDIT-01` | Category update và audit insert phải commit/rollback cùng transaction | B | `updateUserCategory` đã bọc transaction; unit rollback + integration (audit insert bị từ chối → category giữ nguyên) đã xanh local; chờ CI re-run |
| `BLK-CI-01` | Workflow chia unit, bốn MySQL suite và OpenAPI validation riêng; MySQL service disposable | B + D | Run `36100878978` (sau repair): success, đủ 15 steps xanh gồm cả bốn suite MySQL + validation trên MySQL 8.0.41 disposable; run `36087720681` (code trước repair) đã lỗi thời |
| `BLK-RECON-01` | `db:reconcile` đối chiếu wallet/savings projection từ immutable rows; `/health/ready` ping DB | B | Đã sửa bug alias camelCase khiến reconcile luôn throw trên MySQL thật; reconcile pass trong suite integration local; restore rehearsal và reconciliation trên restored cloud target vẫn chờ operator (runbook `docs/DB-RESTORE-RUNBOOK.md`) |
| `BLK-OPSLOG-01` | Migrations `0028`–`0030` tạo `db_operation_logs` append-only; CLI writer dùng `cc_ops` INSERT-only; CI records stay in GitHub | B | DDL + CLI INSERT + UPDATE/DELETE guards đã pass trong full migration chain local (`0001`–`0030` fresh + suite runtime-grants); chưa áp dụng lên Aiven (operator-gated) |

### Dọn trước khi merge

- [x] Sửa `docs/working/aiven-handoff.md`: không claim CA/endpoint/admin user chưa xác minh; không dùng admin user cho runtime.
- [x] Benchmark tạo schema unique local-only và drop schema; không DELETE append-only history.
- [x] Có `test:mysql:required`; `npm test` mặc định vẫn có thể skip suite DB và không được dùng làm evidence MySQL.
- [ ] Giữ PR #1 không merge cho tới khi Team Leader ack repair `0011` (BLK-MIG-02), CI re-run xanh từng suite MySQL, API validation đạt và restore evidence hoàn tất (runbook `docs/DB-RESTORE-RUNBOOK.md`, evidence lưu ngoài repo).

### Thứ tự merge đề xuất

1. Owner isolation + idempotency.
2. API routes/envelopes + issue/admin boundary.
3. TLS harness và migration/restore/reconcile.
4. Overflow + signed cursor.
5. Integration/e2e gate chạy với MySQL thật.
6. Dọn handoff/benchmark và mở PR sau khi CI MySQL thật xanh; hiện chưa có CI result.

Các blocker cũ về OAuth/IDOR, provider/region/restore, domain invariant, secret/PII, accessibility và rollback vẫn là launch gate. OpenRouter chưa được claim; JEV có thể giữ off.

## 13. ADR liên quan

[ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0007](./adr/0007-five-day-thin-slice.md), [ADR-0008](./adr/0008-runtime-row-authorization-boundary.md).
