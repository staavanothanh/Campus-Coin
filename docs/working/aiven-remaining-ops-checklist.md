# Checklist vận hành Aiven còn lại — lane DB

- **Owner:** Developer B (lane MySQL/database).
- **Loại:** working artifact (checklist thực thi + evidence), không phải nguồn quyết định.
- **Nguồn canonical:** [`docs/DELIVERY-PLAN.md`](../DELIVERY-PLAN.md), [`docs/DB-RESTORE-RUNBOOK.md`](../DB-RESTORE-RUNBOOK.md), [`db/README.md`](../../db/README.md), [`db/grants.example.sql`](../../db/grants.example.sql), [`docs/adr/0009-shared-database-migration-baselines.md`](../adr/0009-shared-database-migration-baselines.md).
- **Blocker liên quan:** `BLK-OPSLOG-01`, `BLK-HARNESS-01`, `BLK-MIG-02` (runtime principal), version drift MySQL `8.4.8`.
- **Trạng thái:** cập nhật 2026-09-26; mục A đã thực hiện read-only trên Aiven. Các mục còn lại vẫn operator/secret-manager gated.

Không thay thế runbook. Mọi thao tác trên Aiven đều **operator-gated**; checklist này chỉ liệt kê bước, lệnh và bằng chứng cần thu.

## 0. Quy tắc an toàn

- Chạy **read-only trước**; không `db:migrate`/restore nếu chưa có phê duyệt riêng.
- Không ghi host/port/endpoint, password, token, CA bytes hoặc PII vào repo/checklist/evidence.
- Không dùng provider admin cho runtime/migration lâu dài; dùng `cc_migrate`/`cc_runtime`/`cc_ops`.
- Không sửa file migration đã apply; không UPDATE tay `schema_migrations` (ADR-0009).

## A. Xác minh `0028`–`0030` đã apply (read-only)

Bằng principal DBA/migration:

- [x] `SELECT version, name FROM schema_migrations WHERE version IN ('0028','0029','0030');`
  - Kỳ vọng: đủ 3 row.
- [x] `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'db_operation_logs';`
  - Kỳ vọng: 1 row.
- [x] `SELECT TRIGGER_NAME, EVENT_MANIPULATION, DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME IN ('trg_db_operation_logs_no_update','trg_db_operation_logs_no_delete');`
  - Kỳ vọng: 2 trigger; `DEFINER` = migration principal đã provision.
- [x] Append-only smoke (read-only check cấu trúc, không cần ghi): xác nhận trigger là BEFORE UPDATE/DELETE và `ACTION_STATEMENT` chứa `SIGNAL`.

Evidence 2026-09-26: `0028`, `0029`, `0030` đều có trong `schema_migrations`; bảng `db_operation_logs` tồn tại; hai trigger có `SIGNAL` và `DEFINER=cc_migrate@%`. Không lưu endpoint, credential hoặc raw payload.

## B. CA provenance / mode TLS (`BLK-HARNESS-01`)

- [x] Xác nhận runtime env hiện đặt `CAMPUS_COIN_DB_SSL=verify-ca` và `CAMPUS_COIN_DB_CA_PATH` có file CA. Việc xác nhận file là project CA của Aiven vẫn pending provider/secret-manager provenance.
- [ ] Xác nhận CA lấy từ provider console/secret manager, không commit; ghi lại provenance + ngày tải.
- [x] `npm run db:preflight` (read-only): TLS handshake/cipher pass, MySQL `8.4.8`, applied `28`, pending `0` với `0004`/`0005` external.
- [ ] Ghi owner cho CA rotation (lane B) và kênh nhận thông báo khi provider xoay CA.

## C. Provision `cc_ops` (INSERT-only) (`BLK-OPSLOG-01`)

- [ ] Chạy phần `cc_ops` trong `db/grants.example.sql` (CREATE USER + `GRANT INSERT ON campus_coin.db_operation_logs`, password từ secret manager).
- [ ] `SHOW GRANTS FOR 'cc_ops'@'%';` — kỳ vọng chỉ INSERT trên `db_operation_logs`; không SELECT/UPDATE/DELETE/DDL.
- [ ] Smoke ghi log qua CLI:
  ```bash
  npm run db:operation-log -- campus-coin production migration success <duration-ms> 0030 - -
  ```
- [ ] Xác nhận `cc_ops` không đọc/sửa/xóa được (UPDATE/DELETE bị append-only trigger chặn).

## D. Chuyển runtime sang `cc_runtime` + smoke (`BLK-MIG-02`)

- [ ] Đặt `CAMPUS_COIN_DB_USER=cc_runtime` + password từ secret manager (Vercel Production tách khỏi Preview; preview không dùng DB production). Local env hiện vẫn là provider admin `avnadmin`; không log password và không tự thay secret.
- [x] `SHOW GRANTS` read-only xác nhận `cc_runtime` đã tồn tại, không có `DELETE`, DDL, `TRIGGER`, `SUPER` hoặc `GRANT OPTION`.
- [ ] `npm run db:status` (read-only) — kỳ vọng không drift.
- [ ] `npm run db:reconcile` bằng `cc_runtime` — kỳ vọng `status=pass`, mismatch = 0.
- [ ] Readiness smoke `SELECT 1` qua pool từ đúng network/runtime path.
- [ ] Xác nhận provider admin không còn dùng cho runtime.

## E. Version drift MySQL `8.4.8`

CI/local hiện chạy `8.0.41`, Aiven là `8.4.8`.

- [ ] Trên một target disposable chạy MySQL `8.4.x`, apply fresh `0001`–`0030` và chạy `test:mysql:required` + `db:datatest`. Docker hiện không khả dụng trên workspace; chưa claim evidence này.
- [ ] Ghi version chính xác + kết quả; nếu chỉ có `8.0.41`, ghi rõ drift còn mở, không claim `8.4.8` đã kiểm chứng.

## F. Evidence tối thiểu

| Evidence | Nội dung cần ghi | Đã có? |
|---|---|---|
| Apply `0028`–`0030` | `schema_migrations` 3 row; table + 2 trigger; `DEFINER=cc_migrate@%` | [x] |
| TLS/CA | mode, cipher, CA provenance/ngày, rotation owner | [ ] |
| `cc_ops` | `SHOW GRANTS` (redacted), CLI log smoke | [ ] |
| Runtime principal | `SHOW GRANTS` đã xác nhận role; `db:status`, `db:reconcile`, readiness smoke bằng `cc_runtime` | [ ] |
| Version drift | MySQL version đã test + kết quả; hoặc ghi rõ còn mở | [ ] |

## G. Điều kiện dừng

- TLS/CA, checksum, trigger DEFINER hoặc grants không khớp cấu hình đã duyệt.
- `db:reconcile` mismatch hoặc DB error.
- Cần sửa/xóa ledger/audit hoặc UPDATE tay `schema_migrations` để "cho qua".
