# datatest — test SQL trực tiếp trên MySQL

Kiểm tra invariant ở lớp database (schema, seed, trigger append-only, CHECK, UNIQUE, FK) bằng SQL thuần, tách khỏi application code. Chạy trên database tạm được migrate mới — không đụng dữ liệu thật.

## Chạy

```bash
# Cần CAMPUS_COIN_TEST_DB=1, CAMPUS_COIN_DB_NAME=campus_coin_test_<tên> và CAMPUS_COIN_DB_*.
# Chỉ chạy trên MySQL test cô lập; runner tạo rồi xóa database tạm.
npm run db:datatest
```

Runner (Node + mysql2):

1. Tạo database tạm `campus_coin_datatest_<pid>_<ts>`.
2. Apply `0001`–`0005`, nạp fixture đại diện cho schema cũ, rồi apply `0006`–`0010` để kiểm tra nâng cấp và giữ nguyên row có sẵn.
3. Chạy từng file trong `datatest/sql/` theo thứ tự tên.
4. Drop database tạm; exit code = 0 khi toàn bộ PASS.

Runner từ chối chạy nếu chưa bật `CAMPUS_COIN_TEST_DB=1` hoặc `CAMPUS_COIN_DB_NAME` không bắt đầu bằng `campus_coin_test_`. Prefix là chốt chống thao tác nhầm tên DB; DB owner vẫn phải xác nhận host/service thực sự cô lập trước khi cấp quyền create/drop.

Cũng có thể chạy tay từng file qua mysql CLI vào một database đã migrate.

## Quy ước file

### File thường (phải thành công)

`001_schema_and_seed.sql` tạo bảng tạm với `CHECK`. Mỗi assertion thêm một hàng có kết quả true; kết quả false làm MySQL trả lỗi thật:

```sql
CREATE TEMPORARY TABLE _datatest_assertions (
  assertion_name VARCHAR(100) PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  CONSTRAINT chk_datatest_assertion_passed CHECK (passed = 1)
);
SET @n = (SELECT COUNT(*) FROM categories WHERE is_default = 1 AND applies_to = 'income');
INSERT INTO _datatest_assertions (assertion_name, passed) VALUES ('income seed', @n = 4);
```

Không dùng chia cho 0 làm assertion vì MySQL có thể chỉ trả `NULL`/warning cho biểu thức đó. File `015_failed_assertion_detected.sql` xác nhận điều kiện sai thực sự bị MySQL chặn. MySQL phải ≥ 8.0.16 để enforce `CHECK`.

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
| `015_failed_assertion_detected.sql` | expect-error | kiểm chứng assertion false thực sự gây lỗi CHECK |
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
| `037_wallet_initial_too_large.sql` | expect-error | CHECK chặn opening balance vượt integer an toàn |
| `038_wallet_available_too_large.sql` | expect-error | CHECK chặn available balance vượt integer an toàn |
| `039_ledger_amount_too_large.sql` | expect-error | CHECK chặn amount ledger vượt integer an toàn |
| `040_budget_limit_too_large.sql` | expect-error | CHECK chặn budget limit vượt integer an toàn |
| `041_savings_balance_too_large.sql` | expect-error | CHECK chặn savings balance vượt integer an toàn |
| `042_savings_transfer_too_large.sql` | expect-error | CHECK chặn transfer amount vượt integer an toàn |

Migrations `0006`–`0010` giới hạn từng bảng trong từng migration riêng. Nếu row cũ vượt giới hạn, migration của bảng đó dừng trước khi thêm constraint và chưa được ghi là applied; các migration trước đó đã hoàn tất được giữ nguyên, không xóa/sửa row tài chính để chạy tiếp.

## Giới hạn

- Đây là test tầng database cho invariant DB. Test nghiệp vụ tổng hợp (lock, concurrency, idempotency replay, owner scope qua service) nằm ở `test/mysql.integration.test.ts`; smoke phối hợp contract nằm ở `test/e2e.contract.smoke.test.ts`.
- Không thay thế `db:preflight` (kiểm tra TLS/version/charset/trạng thái migration trước khi chạy lên môi trường thật).
