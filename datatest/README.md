# datatest — test SQL trực tiếp trên MySQL

Kiểm tra invariant ở lớp database (schema, seed, trigger append-only, CHECK, UNIQUE, FK) bằng SQL thuần, tách khỏi application code. Chạy trên database tạm được migrate mới — không đụng dữ liệu thật.

## Chạy

```bash
# Cần CAMPUS_COIN_DB_* giống db:preflight (xem db/README.md và .env.example)
npm run db:datatest
```

Runner (Node + mysql2):

1. Tạo database tạm `campus_coin_datatest_<pid>_<ts>`.
2. Apply migrations `db/migrations/` (0001 schema + 0002 seed).
3. Chạy từng file trong `datatest/sql/` theo thứ tự tên.
4. Drop database tạm; exit code = 0 khi toàn bộ PASS.

Cũng có thể chạy tay từng file qua mysql CLI vào một database đã migrate.

## Quy ước file

### File thường (phải thành công)

Assert idiom — mỗi dòng kiểm tra một điều kiện, sai là error:

```sql
SET SESSION sql_mode = CONCAT(@@session.sql_mode, ',ERROR_FOR_DIVISION_BY_ZERO');
SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND applies_to = 'income');
DO 1 / (@n = 4);   -- đúng: 1/1; sai: chia 0 → error → test fail
```

Cần `ERROR_FOR_DIVISION_BY_ZERO` (dòng đầu) để `1/0` thành error thay vì warning. MySQL phải ≥ 8.0.16 (CHECK enforced — `db:preflight` đã kiểm tra).

### File expect-error (phải lỗi)

Header `-- expect-error: <chuỗi>` và **đúng 1 statement**. Runner kiểm tra statement phải error và message chứa chuỗi khai báo (cho phép dùng tên constraint/trigger làm chuỗi).

```sql
-- expect-error: append-only
DELETE FROM ledger_transactions WHERE id = 1;
```

## Danh sách file

| File | Loại | Kiểm tra |
|---|---|---|
| `000_fixtures.sql` | positive | dữ liệu mẫu (users, wallet, ledger, savings, audit, issue, idempotency, budget) |
| `001_schema_and_seed.sql` | positive | migrations applied, bảng tồn tại, seed 4+7 category, trigger, CHECK, wallet 1/user |
| `010_insert_valid_money.sql` | positive | dữ liệu hợp lệ không bị CHECK chặn nhầm; correction hợp lệ; budget upsert; audit append |
| `020_ledger_update_blocked.sql` | expect-error | trigger chặn UPDATE ledger |
| `021_ledger_delete_blocked.sql` | expect-error | trigger chặn DELETE ledger |
| `022_savings_transfer_delete_blocked.sql` | expect-error | trigger chặn DELETE savings_transfers |
| `023_audit_delete_blocked.sql` | expect-error | trigger chặn DELETE audit_events |
| `024_issue_events_update_blocked.sql` | expect-error | trigger chặn UPDATE issue_events |
| `030_zero_amount_ledger.sql` | expect-error | CHECK amount > 0 |
| `031_correction_missing_reference.sql` | expect-error | CHECK correction phải có reference + reason |
| `032_wallet_balance_negative.sql` | expect-error | giá trị âm bị chặn ở cột UNSIGNED (CHECK `>= 0` là defense-in-depth) |
| `033_dup_custom_category.sql` | expect-error | UNIQUE (owner, applies_to, name_en) |
| `034_budget_invalid_month.sql` | expect-error | CHECK month YYYY-MM |
| `035_foreign_key_missing_category.sql` | expect-error | FK category tồn tại |
| `036_dup_idempotency.sql` | expect-error | UNIQUE (user, scope, idempotency_key) |

## Giới hạn

- Đây là test tầng database cho invariant DB. Test nghiệp vụ tổng hợp (lock, concurrency, idempotency replay, owner scope qua service) nằm ở `test/mysql.integration.test.ts`; smoke phối hợp contract nằm ở `test/e2e.contract.smoke.test.ts`.
- Không thay thế `db:preflight` (kiểm tra TLS/version/charset/trạng thái migration trước khi chạy lên môi trường thật).