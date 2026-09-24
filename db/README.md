# Campus Coin — DB MySQL (lane Developer B)

Nguồn: ADR-0003 (cloud MySQL validation gate), ADR-0005 (money immutable), `docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/contracts/openapi.yaml`.

## Cấu trúc

```text
db/
├── migrations/            # SQL versioned, forward-only, non-destructive
│   ├── 0001_initial_schema.sql
│   └── 0002_seed_default_categories.sql
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

## Invariant đã mã hóa

- Tiền: `BIGINT UNSIGNED` integer VND; CHECK `amount > 0`; wallet/savings CHECK `>= 0`; không floating point.
- Append-only: trigger chặn UPDATE/DELETE trên `ledger_transactions`, `savings_transfers`, `audit_events`, `issue_events`.
- Ledger correction: row mới có `reference_id` + `reason`; CHECK chặn original có reference; service chặn chain (target phải original, một correction duy nhất).
- Owner scope: mọi query có `user_id` predicate; category custom scope theo owner; system category `user_id NULL`.
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

## Restore/incident

- Restore dữ liệu theo runbook provider (mysqldump/export tool của provider, thời điểm đã chọn); sau restore luôn chạy reconcile bước 2 ở trên.
- Không xóa/sửa ledger để "sửa lỗi"; correction chỉ qua domain command append-only có reason + audit.
- Migration lỗi giữa chừng: dừng ngay, báo rõ file + error; sửa bằng migration mới.