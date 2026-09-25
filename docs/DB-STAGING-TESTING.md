# Hướng dẫn DB, staging và kiểm tra owner

Tài liệu này mô tả cách kiểm chứng ba phần: DB test cô lập, auth/email trên staging và owner isolation của API domain.

## 1. DB test cô lập

### Quy tắc an toàn

- `npm run db:datatest` và MySQL integration tạo schema tạm, chạy migration rồi xóa schema tạm.
- Chỉ chạy trên MySQL local/CI dành riêng cho test hoặc một service/schema test được DB owner xác nhận không có dữ liệu dùng chung.
- Không dùng `defaultdb`, database production, staging có dữ liệu thật hoặc user runtime ít quyền làm nơi chạy destructive test.
- Tài khoản migration/test cần quyền tạo và xóa schema thử nghiệm; tài khoản runtime vẫn giữ quyền thấp nhất cần thiết.
- Test runner tự tạo tên kiểu `campus_coin_test_<process>_<id>`. `CAMPUS_COIN_DB_NAME` phải bắt đầu bằng `campus_coin_test_` để xác nhận ý định chạy test; điều đó không tự chứng minh server đã cô lập, DB owner vẫn phải xác nhận môi trường.

### Xác nhận trong DBeaver

Kết nối vào target thử nghiệm rồi chạy các câu chỉ đọc:

```sql
SELECT 1 AS connection_ok;
SELECT DATABASE() AS selected_database, CURRENT_USER() AS db_account;
SELECT VERSION() AS mysql_version;
SHOW TABLES;
```

Xác nhận `selected_database` là schema test và DevB/DB owner đã xác nhận host không phải DB dùng chung. Query này kiểm tra kết nối; nó không tự xác nhận quyền sở hữu hay tính cô lập.

### Chạy trên Windows PowerShell

Trước tiên tạo hoặc cấp một target dùng riêng, ví dụ `campus_coin_test_local`, rồi cấu hình `.env` cục bộ bằng test credentials và TLS/CA tương ứng. Không commit `.env` hoặc CA file.

```powershell
$env:CAMPUS_COIN_TEST_DB = "1"
$env:CAMPUS_COIN_DB_NAME = "campus_coin_test_local"

npm run db:datatest
node --env-file-if-exists=.env --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts
```

`CAMPUS_COIN_DB_NAME` ở đây là nhãn xác nhận ý định chạy test; harness mở kết nối tới server và tạo schema tạm mang prefix test. Nó không dùng schema `campus_coin_test_local` để ghi dữ liệu. Harness tự chạy toàn bộ migration trong `db/migrations/`. Không chạy `db:migrate` trên `defaultdb` để chuẩn bị test. Khi xong, bỏ override ở terminal:

```powershell
Remove-Item Env:CAMPUS_COIN_TEST_DB
Remove-Item Env:CAMPUS_COIN_DB_NAME
```

Các lệnh sẽ dừng trước khi kết nối nếu thiếu `CAMPUS_COIN_TEST_DB=1` hoặc tên DB không có prefix test. CI dùng MySQL service riêng và prefix `campus_coin_test_ci`.

## 2. Auth và email thật trên staging

Automation hiện kiểm tra flow auth qua email sender giả, còn xác nhận SMTP thật phải chạy trên staging đã cấu hình SMTP. Kết quả đăng ký thành công do Team Leader xác nhận ngày 2026-09-25; reset-password và provider failure vẫn là gate riêng.

### Chuẩn bị

- Dùng staging hostname, staging DB và test mailbox do nhóm kiểm soát. Không dùng production account/database.
- SMTP credentials, OTP/session secrets và DB credentials chỉ đặt trong secret settings của staging. Không ghi chúng vào source/docs/chat.
- Đảm bảo staging log đã redact email đầy đủ, password, OTP, reset token, cookie và SMTP credential.

### Luồng cần chạy

1. Đăng ký test mailbox; xác nhận thư tới, dùng OTP đúng và vào được tài khoản.
2. Nhập OTP sai; xác nhận lỗi chung, không tạo account.
3. Gửi lại ngay trong cooldown; xác nhận bị giới hạn. Sau cooldown, resend và xác nhận mã mới dùng được; mã cũ không còn dùng được.
4. Tạo nhiều lần xác minh sai đến ngưỡng; xác nhận mã bị khóa và phản hồi có thời gian retry.
5. Đăng nhập đúng/sai; kiểm tra rate-limit theo tài khoản/IP.
6. Đăng nhập, gọi forgot-password; xác nhận email reset tới. Dùng mã sai/hết hạn và mã đúng; xác nhận password cũ không dùng được, password mới đăng nhập được.
7. Trước khi reset, giữ session cũ; sau reset xác nhận session đó không còn truy cập được. Logout session mới và xác nhận cookie bị xóa, request tiếp theo trả 401.
8. Thử Origin lạ/thiếu CSRF trên mutation; xác nhận bị từ chối. Thử đọc resource của account test thứ hai; xác nhận không xem được.
9. Khi staging SMTP cố ý không khả dụng trong môi trường test, xác nhận timeout/retry có giới hạn, lỗi trả envelope tổng quát và không lộ provider detail/OTP.

Ghi kết quả theo thời điểm, staging release/commit, luồng và pass/fail. Chỉ ghi email đã mask; không chụp hoặc lưu OTP/cookie.

## 3. Kiểm tra API domain và owner isolation

`test/auth.mysql.integration.test.ts` có test HTTP mới tạo hai user/session riêng. User A tạo wallet, category, income/payment, savings transfer và budget; request có gửi thử `userId` của B trong body để xác nhận server vẫn lấy owner từ session. User B không được:

- đọc số dư, giao dịch hoặc savings của A;
- đọc category/budget riêng của A hoặc ghi budget vào category của A;
- nhìn thấy report/dashboard/recent transaction của A;
- lấy giao dịch A theo ID.

CI chạy test này cùng MySQL integration trên schema tạm. Các endpoint được kiểm tra gồm wallet, ledger, savings, categories, budgets, monthly report và dashboard. Test issue/IDOR hiện có tiếp tục kiểm tra riêng.

Workflow [#6 trên commit `5ee8858`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) pass `db:datatest`, MySQL domain integration, HTTP contract smoke và Auth MySQL integration trên database CI cô lập. Workflow [#7 trên commit `3bf6c0c`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113725073) và [#8 trên commit `4bbdb61`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36116299740) cũng pass toàn workflow. Test owner hai tài khoản xác nhận budget của category ngoài owner trả `404 NOT_FOUND`; Google OAuth redirect được kiểm tra trong response và không gọi mạng. Đây là evidence CI trên DB tạm, không thay cho staging SMTP hoặc production test.

### Bằng chứng hoàn tất

- DB: `db:datatest` pass và ba MySQL integration suites pass trên service/schema test riêng.
- Auth staging: register và reset đều nhận email thật; OTP/session/CSRF/logout được xác nhận qua UI/API.
- Owner: HTTP integration pass với hai user/session; mọi request dùng session B đều không đọc hoặc sửa được dữ liệu A.
- Khi một bước chưa chạy vì chưa có staging/service/mailbox, ghi là `pending` cùng lý do; không gắn nhãn pass dựa trên test mock.
