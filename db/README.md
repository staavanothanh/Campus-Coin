# Campus Coin — DB MySQL (lane Developer B)

Nguồn: ADR-0003 (cloud MySQL validation gate), ADR-0005 (money immutable), `docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/contracts/openapi.yaml`.

## Cấu trúc

```text
db/
├── migrations/            # SQL versioned, forward-only, non-destructive
│   ├── 0001_initial_schema.sql
│   └── 0002_seed_default_categories.sql
│   ├── 0003_ledger_owner_reference_index.sql
│   ├── 0004_email_auth.sql
│   └── 0005_auth_rate_limits.sql
├── grants.example.sql     # Least-privilege template (chạy tay bởi DBA/provider)
└── README.md
src/
├── domain/                # money.ts (effects), period.ts (HCMC/cursor) — pure
├── infrastructure/db/     # env, pool (TLS+bounded), migration engine + CLI
├── infrastructure/persistence/  # repositories (SQL typed, owner-scope)
└── application/           # services: wallet, ledger, savings, budget, report, category
test/
└── mysql.integration.test.ts    # gated: CAMPUS_COIN_TEST_DB=1
```

## Commands

```bash
npm run typecheck     # tsc strict (erasable syntax, Node chạy TS native)
npm test              # unit + integration gated + e2e contract smoke gated
npm run db:preflight  # kiểm tra read-only: env, TLS, version, charset, migration state
npm run db:status     # so khớp file migration vs schema_migrations
npm run db:migrate    # apply migration chưa chạy (GET_LOCK chống chạy song song)
npm run db:datatest   # test SQL trên database tạm (xem datatest/README.md)
```

Test gated cần MySQL thật (Day-1 gate): `CAMPUS_COIN_TEST_DB=1` + `CAMPUS_COIN_DB_*`, chạy `npm test`. Gồm:

- `test/mysql.integration.test.ts` — invariant nghiệp vụ qua services trên DB tạm (wallet, insufficient, concurrent payment, idempotency, correction, savings, budget, report, pagination, owner isolation, append-only).
- `test/e2e.contract.smoke.test.ts` — critical flow + validate từng response theo `artifacts/openapi.json` (schema frontend tiêu thụ). Khi HTTP lane A và UI lane C được thêm, smoke này thành true e2e qua HTTP.

Không có `migrate down`. Rollback/sửa lỗi = migration mới hoặc restore (xem bên dưới). Không sửa file migration đã chạy — checksum mismatch làm `status`/`migrate` fail hard.

## Environment (identifier bắt buộc)

`auth_identities` trong migration `0001` được dùng cho Google identity `(provider, subject)` theo [ADR-0009](../docs/adr/0009-optional-google-sign-in.md). Không lưu Google token và không tự động liên kết theo email. Luồng email/password/OTP tiếp tục theo [ADR-0008](../docs/adr/0008-email-password-otp-auth.md). Không sửa migration đã commit; thay đổi schema tương lai cần migration mới.

Xem `.env.example`; giá trị thật chỉ ở secret manager/Vercel environment.

| Biến | Vai trò | Ghi chú |
|---|---|---|
| `CAMPUS_COIN_DB_HOST` / `_PORT` / `_NAME` | kết nối | bắt buộc; port mặc định 3306 |
| `CAMPUS_COIN_DB_USER` / `_PASSWORD` | runtime role | bắt buộc; không log giá trị |
| `CAMPUS_COIN_DB_SSL` | `required` (mặc định) / `verify-ca` / `disabled` | production phải required hoặc verify-ca; `disabled` chỉ local dev |
| `CAMPUS_COIN_DB_CA_PATH` | CA bundle | bắt buộc khi `verify-ca` |
| `CAMPUS_COIN_DB_CONNECTION_LIMIT` | bounded pool | mặc định 5, max 50; chỉnh theo quota provider |
| `CAMPUS_COIN_DB_MIGRATE_USER` / `_PASSWORD` | migration role | tùy chọn; fallback runtime role cho dev |
| `CAMPUS_COIN_MIGRATIONS_DIR` | thư mục migration | tùy chọn; mặc định `db/migrations` |

Runtime role chỉ DML (xem `db/grants.example.sql`); migration role có DDL. Pool runtime `waitForConnections`, `queueLimit=0`, timezone `Z` (UTC); kỳ HCMC tính ở application.

### MySQL local dev (không phải production — ADR-0003)

Production vẫn là cloud MySQL managed qua TLS. Local MySQL chỉ để chạy migration/preflight/test gated trước khi có cloud candidate.

Thiết lập đã kiểm chứng trên Windows (MySQL Community 8.0.41 ZIP portable, `.tmp/mysql/`, gitignored):

1. `mysqld --initialize-insecure` → `--defaults-file=.tmp/mysql/my.ini` (datadir riêng, `bind-address=127.0.0.1`, `utf8mb4/utf8mb4_0900_ai_ci`, `console`).
2. **`log-bin-trust-function-creators=1` trong `my.ini`** — bắt buộc để migration 0001 tạo trigger append-only; thiếu nó MySQL trả `ERROR 1419` (thiếu SUPER privilege khi binary logging bật).
3. Tạo DB + role theo `db/grants.example.sql` với password dev. Tài khoản `'%'` đủ dùng cho `127.0.0.1` qua TCP (`skip_name_resolve=0` vẫn resolve `127.0.0.1` → host khớp `%`); không cần thêm tài khoản `@localhost`.
4. `.env` local: `CAMPUS_COIN_DB_SSL=disabled`, `_MIGRATE_USER`/`_MIGRATE_PASSWORD` trỏ role migration.

Chạy: `npm run db:preflight` → `db:migrate` → `npm test` với `CAMPUS_COIN_TEST_DB=1` → `npm run db:datatest`.

## Invariant đã mã hóa

- Tiền: `BIGINT UNSIGNED` integer VND; CHECK `amount > 0`; wallet/savings CHECK `>= 0`; không floating point.
- Append-only: trigger chặn UPDATE/DELETE trên `ledger_transactions`, `savings_transfers`, `audit_events`, `issue_events`.
- Ledger correction: row mới có `reference_id` + `reason`; CHECK chặn original có reference; service chặn chain (target phải original, một correction duy nhất).
- Owner scope: mọi query có `user_id` predicate; category custom scope theo owner; system category `user_id NULL`. Antijoin correction trong report/budget phải kèm `c.user_id = t.user_id` (index `idx_ledger_user_reference`) — thiếu predicate đó khiến MySQL dò `DISTINCT reference_id` toàn bảng, chi phí theo tổng tenant thay vì theo owner, và dữ liệu tenant khác lọt vào đường tính tiền.
- Idempotency: `mutation_idempotency` claim trước (placeholder) + response sau trong cùng transaction; retry cùng key+body → replay, khác body → `IDEMPOTENCY_CONFLICT`.
- Lock order: payment/income lock wallet `FOR UPDATE`; savings lock wallet rồi savings (cố định); correction lock target rồi wallet.
- Migration: `GET_LOCK('campus_coin.migrations')`, ghi `schema_migrations` (version, checksum), forward-only.

## Policy report/budget (chú giải quyết định)

- **Effective row** = `role <> 'reversal'` và không bị correction nào tham chiếu. Reversal tự bằng 0 và loại target; replacement/adjustment đóng góp theo amount mới. Đây chính là "tổng payment gốc còn hiệu lực" ở `docs/DOMAIN-MODEL.md` §3.
- **Correction timestamp**: row correction lấy `occurred_at = occurred_at của target` (đảo ngược trong cùng kỳ). API-REVIEW ghi rõ correction timestamp/report semantics chưa chốt — đây là default hiện tại, chờ Team Leader; thay đổi chỉ ảnh hưởng query report, không làm hỏng dữ liệu.
- **Monthly report**: `closing = opening + income − payment` (không gồm savings); `opening = initial_balance + effect trước kỳ`. Savings không vào income/payment/budget.
- **Cursor**: opaque base64url JSON `{v,id}`. Chưa ký HMAC; mọi query vẫn scope owner nên sửa cursor chỉ ảnh hưởng list của chính user. API-REVIEW đề xuất signed cursor — gắn với secrets lane A khi chốt.

## Day-1 verification (cổng ADR-0003)

1. `npm run db:preflight` → env, connect+TLS cipher, MySQL >= 8.0.16, utf8mb4, database tồn tại, migration state, pool vs `max_connections`.
2. Backup/export/restore provider + rehearsl restore: restore vào DB cô lập rồi chạy test integration (`CAMPUS_COIN_TEST_DB=1`) và reconcile:
   - `wallet.available_balance` khớp effect từ ledger (opening + income − payment − deposit + withdraw);
   - `savings.balance` khớp `sum(deposit) − sum(withdraw)`;
   - FK không lỗi; ledger/audit không có row bị sửa/xóa (append-only); idempotency không trùng response.
3. Reconcile fail → fail closed, mở incident, không mở write path (xem `docs/ADMIN-OPERATIONS.md`).

## Đưa lên cloud (Aiven MySQL free tier + Vercel)

Nguồn: Aiven docs — free tier (1 node, 1 CPU, 1 GB RAM, 1 GB disk, `max_connections=76`, có backup, không static IP/VPC/integration, không SLA), TLS certificates (project CA riêng), MySQL backups (full daily + binlog → PITR). Đây là **kế hoạch**, chưa có evidence nào được đo trên Aiven — mọi mục ở §Day-1 verification phải chạy thật rồi mới ghi nhận.

### Bước 1 — Provision (thủ công, cần tài khoản Aiven của Team Leader)

1. Tạo project → service **Aiven for MySQL**, free plan. Chọn cloud/region gần Việt Nam (Singapore `ap-southeast-1` là candidate; không chốt khi chưa đo latency).
2. Lấy thông tin kết nối từ **Overview → Connection information**; mặc định `defaultdb` không chứng minh đó là database Campus Coin.
3. **Tải CA certificate** (Overview → CA Certificate). Bắt buộc: Aiven MySQL dùng project CA riêng, không phải CA hệ điều hành.
4. Chỉ tạo/chọn database `campus_coin` và role theo `db/grants.example.sql` sau khi owner xác nhận service/database đúng môi trường. Tách `cc_migrate` và `cc_runtime`; không dùng tài khoản quản trị Aiven làm runtime.
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
