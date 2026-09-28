# ADR-0010: Đánh số migration auth sau domain chain

- **Ngày:** 2026-09-28
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader

## Bối cảnh

`main` hợp nhất hai migration chain và có hai file `0004` cùng hai file `0005`; migration engine từ chối duplicate version trước khi DB status/migrate có thể chạy. Trên Aiven shared, `schema_migrations` đã có `0004_email_auth.sql` và `0005_auth_rate_limits.sql`; ADR-0009 ghi rõ slot này là external, còn DDL domain `0004_idempotency_owner_key.sql` và `0005_wallet_baseline_boundary.sql` đã được DBA apply khi converge. Vì vậy phải giữ nguyên domain numbering và checksum, đồng thời đưa migration auth của local chain tới slot kế tiếp sau domain chain.

## Quyết định

1. Giữ nguyên migration domain `0004`–`0030`, nội dung/checksum và baseline external `0004`/`0005` theo ADR-0009. Không sửa hay đổi tên các migration đã commit/apply.
2. Auth DDL chưa có slot riêng trong local chain được version tiếp theo sau `0030`: `0031_email_auth.sql` và `0032_auth_rate_limits.sql`. Không đổi schema/table contract; các DDL này chỉ được apply bởi migration runner theo thứ tự.
3. Bản cũ `0004_email_auth.sql`/`0005_auth_rate_limits.sql` từ main không được giữ như migration files chạy được, vì duplicate version và sai chain. Slot external trên shared DB tiếp tục được validate theo pinned checksum; fresh DB không có row external sẽ chạy local domain migrations rồi auth migrations `0031`/`0032`.
4. Trước khi áp dụng `0031`/`0032` lên shared DB hoặc một clone có auth objects sẵn, DBA phải kiểm tra schema thực và xác nhận DDL tương đương; `CREATE TABLE IF NOT EXISTS` không chứng minh cấu trúc hiện hữu khớp. Không chạy migration lên DB shared trong thay đổi code này.
5. ADR này supersede riêng phương án numbering auth cũ trong ADR-0008 và ghi chú numbering trong ADR-0009. ADR-0009 vẫn sở hữu baseline/external checksum, fail-closed drift và quy tắc không sửa migration đã apply.

## Hệ quả

- Fresh install có một dãy migration duy nhất `0001`–`0032`; auth DDL chạy sau domain chain.
- `db/baselines.json` tiếp tục pin checksum external `0004`/`0005`; không được bỏ pin để làm CI pass.
- Shared DB có auth tables sẵn cần DBA xác minh tương đương trước khi dùng runner; không coi CI fresh-install là bằng chứng tương đương trên Aiven.
- CI phải kiểm tra migration scan, fresh install, re-run idempotent, datatest, operation-log và integration suites trên disposable MySQL.

## Rủi ro và kiểm chứng

Đổi số migration làm checksum/name history khác với các slot auth lịch sử; giảm thiểu bằng cách không đổi migration domain, pin external slot theo evidence ADR-0009 và yêu cầu DBA xác minh schema auth trên target. Tại thời điểm chấp nhận ADR này, chưa có lệnh migration chạy trên DB shared trong task.
