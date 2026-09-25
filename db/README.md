# Campus Coin — DB MySQL (lane Developer B)

Nguồn: ADR-0003 (cloud MySQL validation gate), ADR-0005 (money immutable), ADR-0008 (runtime row-authorization boundary), `docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/contracts/openapi.yaml`.

## Cấu trúc

```text
db/
├── migrations/            # SQL versioned, forward-only, non-destructive
│   ├── 0001_initial_schema.sql
│   ├── 0002_seed_default_categories.sql
│   ├── 0003_ledger_owner_reference_index.sql
│   ├── 0004–0015 owner/idempotency/FK/check migrations
│   ├── 0016–0027 owner/projection triggers
│   └── 0028–0030 append-only database operation log
├── grants.example.sql     # Least-privilege template (chạy tay bởi DBA/provider)
└── README.md
src/
├── domain/                # money.ts (effects), period.ts (HCMC/cursor) — pure
├── infrastructure/db/     # env, pool (TLS+bounded), migration engine + ops-log CLI
├── infrastructure/persistence/  # repositories (SQL typed, owner-scope)
└── application/           # services: wallet, ledger, savings, budget, report, category
test/
└── mysql.integration.test.ts    # gated: CAMPUS_COIN_TEST_DB=1
```

## Commands

```bash
npm run typecheck     # tsc strict (erasable syntax, Node chạy TS native)
npm test                       # unit + gated suites may skip without test DB
npm run test:mysql:required    # all unit + MySQL integration/e2e must execute
npm run db:preflight  # kiểm tra read-only: env, TLS, version, charset, migration state
npm run db:status     # so khớp file migration vs schema_migrations
npm run db:migrate    # apply migration chưa chạy (GET_LOCK chống chạy song song)
npm run db:operation-log -- campus-coin staging reconcile success 812 - CHG-123 -
npm run db:datatest   # test SQL trên database tạm (xem datatest/README.md)
npm run db:reconcile  # so projection wallet/savings với ledger/transfer append-only
npm run benchmark     # local-only, tạo và drop schema benchmark cô lập
```

Test gated cần MySQL thật (Day-1 gate): `CAMPUS_COIN_TEST_DB=1`, `CAMPUS_COIN_DB_*` và test-admin credentials. `npm run test:mysql:required` ép gate bật, vì vậy thiếu DB/admin credentials sẽ làm command fail thay vì skip. CI dùng MySQL 8.0.41 service riêng cho mỗi job.

- `test/mysql.integration.test.ts` — invariant nghiệp vụ qua services trên DB tạm (wallet, insufficient, concurrent payment, idempotency, correction, savings, budget, report, pagination, owner isolation, append-only).
- `test/e2e.contract.smoke.test.ts` — critical flow + validate service responses theo `artifacts/openapi.json`; đây vẫn là contract smoke qua service, không phải browser E2E.
- `test/runtime-grants.integration.test.ts` — chạy application services và raw SQL bằng runtime principal bị giới hạn, xác nhận DDL/cross-owner bypass bị chặn.

Không có `migrate down`. Mỗi migration mới được giữ thành một DDL statement/version nhỏ để MySQL atomic DDL có thể resume ở version kế tiếp sau lỗi statement. Nếu DDL đã commit nhưng insert `schema_migrations` thất bại do mất kết nối/quyền, engine fail với cảnh báo không retry mù; DBA phải so sánh schema thực với migration rồi reconcile thủ công trước deploy. Rollback/sửa lỗi = migration mới hoặc restore. Không sửa file migration đã chạy — checksum mismatch làm `status`/`migrate` fail hard.

## Environment (identifier bắt buộc)

Xem `.env.example`; giá trị thật chỉ ở secret manager/Vercel environment.

| Biến | Vai trò | Ghi chú |
|---|---|---|
| `CAMPUS_COIN_DB_HOST` / `_PORT` / `_NAME` | kết nối | bắt buộc; port mặc định 3306 |
| `CAMPUS_COIN_DB_USER` / `_PASSWORD` | runtime role | bắt buộc; không log giá trị |
| `CAMPUS_COIN_DB_SSL` | `required` (mặc định) / `verify-ca` / `disabled` | production phải required hoặc verify-ca; `disabled` chỉ local dev |
| `CAMPUS_COIN_DB_CA_PATH` | CA bundle | bắt buộc khi `verify-ca` |
| `CAMPUS_COIN_DB_CONNECTION_LIMIT` | bounded pool | mặc định 5, max 50; chỉnh theo quota provider |
| `CAMPUS_COIN_DB_MIGRATE_USER` / `_PASSWORD` | migration role | tùy chọn; fallback runtime role cho dev |
| `CAMPUS_COIN_DB_OPS_USER` / `_PASSWORD` | CLI ops-log writer `cc_ops` | INSERT-only vào `db_operation_logs`; không cấp cho API runtime hoặc CI |
| `CAMPUS_COIN_MIGRATIONS_DIR` | thư mục migration | tùy chọn; mặc định `db/migrations` |
| `CAMPUS_COIN_CURSOR_SIGNING_KEY` | signed keyset cursor | bắt buộc khi encode/decode cursor; ít nhất 32 bytes, secret manager only |
| `CAMPUS_COIN_TEST_DB_ADMIN_USER` / `_PASSWORD` | test/benchmark admin | chỉ cho local disposable MySQL; quyền CREATE/DROP DATABASE, CREATE USER và GRANT |

Runtime role dùng table/column-level grants, không có DELETE/DDL/schema_migrations access và không được UPDATE wallet/savings projection (`available_balance_vnd`/`balance_vnd` không cấp); DB triggers cập nhật projection từ immutable ledger/transfer insert. Ngoại lệ tối thiểu duy nhất: MySQL 8 yêu cầu quyền UPDATE để chạy `SELECT ... FOR UPDATE`, nên runtime được UPDATE `wallet_accounts.updated_at`, `savings_accounts.updated_at` (timestamp, không phải money) và `ledger_transactions.description` (mọi UPDATE ledger vẫn bị append-only trigger chặn) — chỉ để lock row đúng lock order, services không UPDATE trực tiếp. Migration role DDL/trigger-definer tách biệt và phải còn tồn tại với đúng grants để trigger chạy (gồm UPDATE các cột trigger gán và SELECT base table `savings_transfers`/`issues`). Test harness tạo migration principal giới hạn và runtime principal riêng; test-admin chỉ provisioning schema/user.

`cc_runtime` dùng chung không mang trusted end-user identity. Owner-level authorization được enforce trong API/application service từ server session; trigger/FK chỉ enforce integrity, không row-level authorization. Raw SQL với runtime credential có thể chạm row owner khác trong các cột được cấp quyền và có thể insert audit row; credential chỉ được giữ ở backend. Đây là residual risk đã chốt trong [ADR-0008](./adr/0008-runtime-row-authorization-boundary.md), không được mô tả là DB-enforced tenant isolation. Pool runtime `waitForConnections`, `queueLimit=0`, timezone `Z` (UTC); kỳ HCMC tính ở application.

`db_operation_logs` là register append-only cho metadata migration/reconcile/restore. Bảng chỉ nhận alias project/environment, operation/outcome, duration, migration version, external reference và stable error code; không lưu endpoint, raw log/error, secret hoặc PII. Chỉ CLI dùng `cc_ops` được INSERT; API runtime không có access. `db:preflight` giữ read-only và CI run ID/log vẫn lưu ở GitHub Actions. Nếu database không sẵn sàng, nó không thể ghi log vào chính nó.

### MySQL local dev (không phải production — ADR-0003)

Production vẫn là cloud MySQL managed qua TLS. Local MySQL chỉ để chạy migration/preflight/test gated trước khi có cloud candidate.

Thiết lập đã kiểm chứng trên Windows (MySQL Community 8.0.41 ZIP portable, `.tmp/mysql/`, gitignored):

1. `mysqld --initialize-insecure` → `--defaults-file=.tmp/mysql/my.ini` (datadir riêng, `bind-address=127.0.0.1`, `utf8mb4/utf8mb4_0900_ai_ci`, `console`).
2. **`log-bin-trust-function-creators=1` trong `my.ini`** — cần xác minh theo quyền/setting server khi tạo trigger; thiếu quyền trigger phù hợp sẽ làm migration fail và version không được ghi.
3. Tạo DB + role theo `db/grants.example.sql` với password dev. Tài khoản `'%'` đủ dùng cho `127.0.0.1` qua TCP (`skip_name_resolve=0` vẫn resolve `127.0.0.1` → host khớp `%`); không cần thêm tài khoản `@localhost`.
4. `.env` local: `CAMPUS_COIN_DB_SSL=disabled`, `_MIGRATE_USER`/`_MIGRATE_PASSWORD` trỏ role migration. Với test/benchmark, cấu hình test-admin riêng trên local disposable MySQL.

Chạy: `npm run db:preflight` → `npm run db:migrate` → `npm run test:mysql:required` → `npm run db:datatest` → `npm run db:reconcile`.

## Invariant đã mã hóa

- Tiền: `BIGINT UNSIGNED` integer VND; CHECK `amount > 0`; wallet/savings CHECK `>= 0`; không floating point. Ledger/savings trigger cập nhật projections trong transaction; runtime không được UPDATE projection trực tiếp.
- Append-only: trigger chặn UPDATE/DELETE trên `ledger_transactions`, `savings_transfers`, `audit_events`, `issue_events`; financial inserts tạo idempotency claim đúng owner/scope.
- Ledger correction: row mới có `reference_id` + `reason`; composite FK buộc cùng `user_id` và target `original`; unique owner/reference giới hạn một correction/target.
- Owner scope: composite FK issue→ledger và idempotency→financial row; insert trigger chặn ledger/budget category cross-owner hoặc sai type; query antijoin correction dùng unique `uq_ledger_user_reference`.
- Projection authority: runtime chỉ insert baseline/ledger/savings transfer; triggers tạo savings account và cập nhật wallet/savings projection atomic. Runtime principal không có UPDATE projection privilege; `db:reconcile` đối chiếu projection với immutable rows.
- Idempotency: `mutation_idempotency` claim trước (placeholder) + response sau trong cùng transaction; retry cùng key+body → replay, khác body → `IDEMPOTENCY_CONFLICT`.
- Lock order: payment/income lock wallet `FOR UPDATE`; savings lock wallet rồi savings (cố định); correction lock wallet rồi target/category để tránh chu trình lock.
- Migration: `GET_LOCK('campus_coin.migrations')`, ghi `schema_migrations` (version, checksum), forward-only.
- SQL datatest chạy trên schema/user tạm; runtime integration harness kiểm tra bằng principal runtime và không cần cấp CREATE/DROP DATABASE cho role ứng dụng.

## Policy report/budget (chú giải quyết định)

- **Effective row** = `role <> 'reversal'` và không bị correction nào tham chiếu. Reversal tự bằng 0 và loại target; replacement/adjustment đóng góp theo amount mới. Đây chính là "tổng payment gốc còn hiệu lực" ở `docs/DOMAIN-MODEL.md` §3.
- **Correction timestamp**: row correction lấy `occurred_at = occurred_at của target` (đảo ngược trong cùng kỳ). API-REVIEW ghi rõ correction timestamp/report semantics chưa chốt — đây là default hiện tại, chờ Team Leader; thay đổi chỉ ảnh hưởng query report, không làm hỏng dữ liệu.
- **Monthly report**: `closing = opening + income − payment` (không gồm savings); `opening = initial_balance + effect trước kỳ`. Savings không vào income/payment/budget.
- **Cursor**: base64url payload có version và HMAC-SHA256; `CAMPUS_COIN_CURSOR_SIGNING_KEY` phải là secret riêng, tối thiểu 32 bytes. Input cursor tối đa 512 ký tự, mọi list vẫn owner-scoped.
- **Reconcile**: `npm run db:reconcile` đối chiếu wallet với baseline + effective ledger delta + savings transfer delta, và savings balance với tổng deposit−withdraw. Mismatch trả exit code fail, chỉ in số lượng mismatch, không in amount/PII; chạy lại sau restore trước khi mở write path.

## Day-1 verification (cổng ADR-0003)

1. `npm run db:preflight` → env, connect+TLS cipher, MySQL >= 8.0.16, utf8mb4, database tồn tại, migration state, pool vs `max_connections`.
2. Backup/export/restore provider: restore vào DB/service cô lập, sau đó chạy `db:preflight`, `db:status`, kiểm tra grants/trigger `DEFINER`, `db:reconcile` và read-only application smoke theo [`docs/DB-RESTORE-RUNBOOK.md`](../docs/DB-RESTORE-RUNBOOK.md):
    - `wallet.available_balance` khớp effect từ ledger (opening + income − payment − deposit + withdraw);
    - `savings.balance` khớp `sum(deposit) − sum(withdraw)`;
    - FK không lỗi; ledger/audit không có row bị sửa/xóa (append-only); idempotency không trùng response.
   `test:mysql:required` tạo schema mới và không kiểm tra dữ liệu trong restored target; dùng riêng làm disposable migration/domain gate.
3. Reconcile fail → fail closed, mở incident, không mở write path (xem `docs/ADMIN-OPERATIONS.md`).

## Đưa lên cloud (Aiven MySQL free tier + Vercel)

Nguồn: Aiven docs — free tier (1 node, 1 CPU, 1 GB RAM, 1 GB disk, `max_connections=76`, có backup, không static IP/VPC/integration, không SLA), TLS certificates (project CA riêng), MySQL backups (full daily + binlog → PITR). Đây là **kế hoạch**, chưa có evidence nào được đo trên Aiven — mọi mục ở §Day-1 verification phải chạy thật rồi mới ghi nhận.

### Bước 1 — Provision (thủ công, cần tài khoản Aiven của Team Leader)

1. Tạo project → service **Aiven for MySQL**, free plan. Chọn cloud/region gần Việt Nam (Singapore `ap-southeast-1` là candidate; không chốt khi chưa đo latency).
2. Ghi lại `host`, `port`, `user` (`avnadmin`), `password`, `database` (mặc định `defaultdb`) từ **Overview → Connection information**.
3. **Tải CA certificate** (Overview → CA Certificate). Bắt buộc: Aiven MySQL dùng project CA riêng, không phải CA hệ điều hành.
4. Tạo database `campus_coin` (`CREATE DATABASE campus_coin CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`) và 2 role theo `db/grants.example.sql`: `cc_migrate` (DDL + DML), `cc_runtime` (chỉ DML). Không dùng `avnadmin` cho runtime.
5. IP filter: free tier **không có static IP**, còn Vercel serverless không có egress IP cố định. Hai lựa chọn — chọn có ý thức, không im lặng:
   - Mở `0.0.0.0/0` (đơn giản, mặc định Aiven) và dựa vào TLS + credential mạnh; hoặc
   - Vercel Secure Compute / static egress (paid) rồi allowlist CIDR — ghi rõ đây là scope cut nếu bỏ.

### Bước 2 — Repo phải sửa trước khi trỏ lên Aiven

- `CAMPUS_COIN_DB_SSL=verify-ca` + `CAMPUS_COIN_DB_CA_PATH=<ca.pem>`. Chế độ `required` trong code hiện tại verify bằng system CA → **sẽ fail với Aiven**. Đường `verify-ca` đã có code nhưng **chưa từng chạy thật lần nào**; đây là rủi ro chính, phải test trước.
- `CAMPUS_COIN_DB_CONNECTION_LIMIT`: Aiven free `max_connections=76`. Giữ pool nhỏ (5) — Vercel có nhiều instance serverless, pool per-instance nhân lên nhanh. `db:preflight` cảnh báo nếu vượt.
- CA rotation: Aiven xoay project CA định kỳ và gửi email; CA bundle phải cập nhật theo, nếu không connection fail. Ghi owner cho việc này (lane B).

### Bước 3 — Chạy migration lên cloud

Migration chạy từ máy dev/DBA (không phải từ serverless runtime) bằng role `cc_migrate`:

1. `npm run db:preflight` — phải pass với `verify-ca` (đây là cổng quan trọng nhất).
2. `npm run db:status` → `npm run db:migrate`.
3. Lưu ý Aiven: backup dùng `--lock-ddl`, nên DDL (`ALTER TABLE`) có thể gặp **"Waiting for backup lock"** trong cửa sổ backup — retry, không coi là lỗi migration.

### Bước 4 — Verify từ Vercel

- Đặt `CAMPUS_COIN_DB_*` trong Vercel Project Environment (Production tách khỏi Preview; preview **không** dùng DB production). CA bundle: dán nội dung PEM vào env hoặc file trong deployment — kiểm tra cách `readFileSync(caPath)` hoạt động trên filesystem serverless trước khi chốt.
- Health check gọi `SELECT 1` qua pool để xác nhận connectivity thật từ deployment.
- Đo latency Vercel → Aiven (region xa làm mỗi round-trip đắt: write path hiện 13 round-trip/giao dịch, xem mục benchmark bên dưới).

### Bước 5 — Backup/restore rehearsal (Day-4 gate, chưa làm)

Aiven có full backup hằng ngày + binlog (PITR), nhưng **restore phải được diễn tập thật**: restore vào service cô lập → chạy `CAMPUS_COIN_TEST_DB=1 npm test` + reconcile (wallet/savings/FK/append-only/idempotency) → chỉ mở write path khi reconcile sạch. Aiven không cho forking ở free tier, nên cần phương án restore riêng (service tạm hoặc `mysqldump` ra máy rồi restore vào DB cô lập).

## Benchmark local (MySQL 8.0.41, chỉ để tham chiếu — không phải số của cloud)

Đo trên bảng `ledger_transactions` ~101.000 row / 21 tenant:

| Thao tác | p50 | p95 |
|---|---|---|
| `monthlyReport` (tháng hiện tại) | 4.6 ms | 6.9 ms |
| `dashboard` | 5.3 ms | 6.7 ms |
| `listTransactions` page 1 | 2.0 ms | 2.3 ms |
| `createTransaction` payment (có budget check) | 8.7 ms | 62 ms |
| 20 payment song song | 240 ms (≈83 tx/s) | — |

Ghi chú: trần ghi ~176 write/s là chi phí fsync của ổ đĩa local (`flush=1, sync_binlog=1`), không phải giới hạn của schema. User có 120.000 row/1 owner cho `monthlyReport` ~370 ms — report tính từ ledger immutable không projection (ADR-0005); nếu cần nhanh hơn ở quy mô đó thì phải thiết kế projection, không tự thêm.

## Restore/incident

- Restore dữ liệu theo runbook provider (mysqldump/export tool của provider, thời điểm đã chọn); sau restore luôn chạy reconcile bước 2 ở trên.
- Không xóa/sửa ledger để "sửa lỗi"; correction chỉ qua domain command append-only có reason + audit.
- Migration lỗi giữa chừng: dừng ngay, báo rõ file + error; sửa bằng migration mới.
