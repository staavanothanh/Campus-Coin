# Hướng dẫn DB, staging và kiểm tra owner

Tài liệu này mô tả cách kiểm chứng ba phần: DB test cô lập, auth/email trên staging và owner isolation của API domain.

## 1. DB test cô lập

### Quy tắc an toàn

- `npm run db:datatest` và MySQL integration tạo schema tạm, chạy migration/test rồi xóa schema tạm.
- `npm run db:verify-clone` chỉ đọc `campus_coin_done` ở bước preflight/status; sau đó chạy các test trên schema tạm có tên ngẫu nhiên.
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

### Phân biệt schema ứng dụng và máy chủ test

- `CAMPUS_COIN_DB_NAME` trong `.env` là schema mà `db:status`, `db:preflight` và `db:migrate` sử dụng. Trước khi chạy các lệnh đó, xác nhận nó đang là schema clone được phép thử nghiệm, ví dụ `campus_coin_done`.
- Service URI Aiven được cung cấp có phần database `/defaultdb`. `CAMPUS_COIN_DB_NAME=campus_coin_done` chỉ đổi schema app yêu cầu trên cùng host/port; nó không tự tạo clone, đổi server hay cấp quyền. Preflight bằng cấu hình hiện tại phải xác nhận clone truy cập được trước khi chạy test.
- Khi chạy `db:datatest` hoặc MySQL integration, biến môi trường `CAMPUS_COIN_DB_NAME=campus_coin_test_<tên>` chỉ là chốt xác nhận. Harness kết nối bằng host/port/test credential trong `.env`, tự tạo schema tạm có tên ngẫu nhiên, chạy migration/test rồi xóa schema tạm. Nó không chạy trong schema `campus_coin_done`.
- Vì vậy, việc đổi riêng tên database không đổi MySQL service. Host/port và tài khoản trong `.env` vẫn phải trỏ tới service test mà DevB cho phép tạo/xóa schema tạm.

### Chạy bộ kiểm tra clone

Trên PowerShell, chọn clone làm target cho hai bước chỉ đọc rồi chạy lệnh:

```powershell
$env:CAMPUS_COIN_DB_NAME = "campus_coin_done"
npm run db:verify-clone
```

Script dừng nếu tên database không đúng, target không tồn tại/không truy cập được, có checksum mismatch, migration còn `pending` hoặc output không xác nhận được migration state. Chỉ khi `db:status` có ít nhất một migration và tất cả đều `applied`, script mới đổi nhãn test thành `campus_coin_test_verify` và chạy `db:datatest` cùng ba MySQL integration suite.

Các bước integration không ghi vào hoặc xóa `campus_coin_done`. Chúng tạo và xóa các schema test mới trên **cùng MySQL server** lấy từ `.env`, nên chỉ chạy khi DevB xác nhận server này dành cho test và test credentials được phép tạo/xóa schema. Nếu không có quyền phù hợp, dừng và nhờ DevB chuẩn bị MySQL local/CI riêng; không tăng quyền trên DB dùng chung.

### Chạy trên Windows PowerShell

Trước tiên tạo hoặc cấp một target dùng riêng, ví dụ `campus_coin_test_local`, rồi cấu hình `.env` cục bộ bằng test credentials và TLS/CA tương ứng. Không commit `.env` hoặc CA file.

```powershell
$env:CAMPUS_COIN_TEST_DB = "1"
$env:CAMPUS_COIN_DB_NAME = "campus_coin_test_local"

npm run db:datatest
node --env-file-if-exists=.env --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts
```

`CAMPUS_COIN_DB_NAME` ở đây là nhãn xác nhận ý định chạy test; harness mở kết nối tới server và tạo schema tạm mang prefix test. Nó không dùng schema `campus_coin_test_local` để ghi dữ liệu. Harness tự chạy toàn bộ migration trong `db/migrations/`. `npm run test:auth-security` chạy riêng test HTTP kiểm tra Origin sai, thiếu CSRF và request hợp lệ sau đó; lệnh này cũng cần MySQL test cô lập có quyền tạo/xóa schema tạm. Không chạy `db:migrate` trên `defaultdb` để chuẩn bị test. Khi xong, bỏ override ở terminal:

```powershell
Remove-Item Env:CAMPUS_COIN_TEST_DB
Remove-Item Env:CAMPUS_COIN_DB_NAME
```

Các lệnh sẽ dừng trước khi kết nối nếu thiếu `CAMPUS_COIN_TEST_DB=1` hoặc tên DB không có prefix test. CI dùng MySQL service riêng và prefix `campus_coin_test_ci`.

## 2. Auth và email thật trên staging

Automation kiểm tra flow auth qua email sender giả. Team Leader xác nhận Phần 2 staging đã hoàn tất (register/reset email, OTP sai/hết hạn/resend, logout/session); đây là báo cáo của Team Leader, không phải lần chạy live từ task này. SMTP/provider failure timeout/retry vẫn là gate riêng.

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
8. Thử Origin lạ/thiếu CSRF trên mutation theo hướng dẫn chi tiết bên dưới. Thử đọc resource của account test thứ hai; xác nhận không xem được.
9. Khi staging SMTP cố ý không khả dụng trong môi trường test, xác nhận timeout/retry có giới hạn, lỗi trả envelope tổng quát và không lộ provider detail/OTP.

Ghi kết quả theo thời điểm, staging release/commit, luồng và pass/fail. Chỉ ghi email đã mask; không chụp hoặc lưu OTP/cookie.

### Thử Origin và CSRF thủ công bằng Postman

Chỉ dùng staging và tài khoản thử nghiệm. Cookie session và CSRF token là thông tin phiên; không gửi chúng cho người khác hoặc dán vào issue/chat.

1. Tạo request `POST https://<staging-host>/api/v1/auth/login`. Thêm header `Origin` bằng chính origin giao diện staging, ví dụ `https://<staging-host>`; gửi email/password của tài khoản thử nghiệm trong body JSON. Để Postman giữ cookie `Set-Cookie` trong cookie jar và lấy `data.csrfToken` từ response.
2. Tạo request `POST https://<staging-host>/api/v1/auth/logout`, để cookie jar gửi session cookie tự động và đặt `Origin` đúng như bước 1. **Không gửi** `X-CSRF-Token`. Kết quả cần là HTTP `403` với `error.code = CSRF_INVALID`. Gọi `GET /api/v1/auth/session`; kết quả vẫn phải là `200`, chứng minh request bị từ chối không kết thúc session.
3. Gửi lại `POST /api/v1/auth/logout`, lần này đặt `X-CSRF-Token` bằng token từ bước 1 nhưng đổi `Origin` thành `https://attacker.invalid`. Kết quả cần là HTTP `403` với `error.code = ORIGIN_INVALID`. Gọi lại `/api/v1/auth/session`; vẫn cần trả `200`.
4. Với cookie jar Postman đang dùng, gửi `POST /api/v1/auth/logout` lần cuối với `Origin` hợp lệ và `X-CSRF-Token` đúng. Kết quả cần là HTTP `200`; sau đó `GET /api/v1/auth/session` phải trả HTTP `401`. Nếu muốn kiểm tra nút đăng xuất UI, đăng nhập riêng trong browser rồi đăng xuất ở đó.

CSRF token cũ/sai trên session còn hiệu lực phải bị từ chối và không được thu hồi session. “Logout idempotent” chỉ áp dụng khi session đã hết hạn/bị thu hồi hoặc không có session: khi đó server trả thành công và xóa cookie. Test MySQL integration bao phủ cả hai trường hợp.

Nếu Postman không giữ cookie tự động, kiểm tra cookie jar của đúng staging host. Không chụp ảnh có cookie/token. Test tự động riêng `npm run test:auth-security` gửi Origin giả và bỏ CSRF token trên `POST /api/v1/wallet/baseline`; cả hai request phải trả `403` với mã lỗi tương ứng. Sau đó test gửi request hợp lệ và xác nhận số dư đúng, để chứng minh hai request bị từ chối không tạo ví.

### Kiểm tra Google Sign-In trên staging

Google Sign-In là tùy chọn. Team Leader báo đã kết nối OAuth thành công nhưng chưa nêu môi trường hoặc flow đã thử. Trên staging, kiểm tra riêng hai flow này:

1. Gọi `GET /api/v1/auth/providers`; `data.google` phải là `true`.
2. Đăng nhập bằng email/password vào account thử nghiệm, chọn kết nối Google và xác nhận callback quay về đúng account.
3. Đăng xuất rồi đăng nhập bằng chính Google account vừa kết nối. Xác nhận session mở đúng account Campus Coin cũ.

Không tự gộp account chỉ vì email trùng. Nếu một trong hai flow chưa được thử, hãy thử riêng flow còn thiếu. Nếu provider bị tắt, người quản lý Google Cloud cần tạo OAuth web client và đăng ký callback URI khớp tuyệt đối với `GOOGLE_OAUTH_REDIRECT_URI`, theo dạng `https://<staging-host>/api/v1/auth/google/callback` nếu API cùng host giao diện. Sau đó đặt `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` và `SESSION_SECRET` trong secret settings, bảo đảm `CLIENT_ORIGIN` đúng, rồi redeploy. Không đặt secret trong browser, `.env` đã commit hoặc chat. Xem [hướng dẫn OAuth cho web server](https://developers.google.com/identity/protocols/oauth2/web-server).

## 3. Kiểm tra API domain và owner isolation

`test/auth.mysql.integration.test.ts` có test HTTP mới tạo hai user/session riêng. User A tạo wallet, category, income/payment, savings transfer và budget; request có gửi thử `userId` của B trong body để xác nhận server vẫn lấy owner từ session. User B không được:

- đọc số dư, giao dịch hoặc savings của A;
- đọc category/budget riêng của A hoặc ghi budget vào category của A;
- nhìn thấy report/dashboard/recent transaction của A;
- lấy giao dịch A theo ID.

CI chạy test này cùng MySQL integration trên schema tạm. Các endpoint được kiểm tra gồm wallet, ledger, savings, categories, budgets, monthly report và dashboard. Test issue/IDOR hiện có tiếp tục kiểm tra riêng.

Workflow [#6 trên commit `5ee8858`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) pass `db:datatest`, MySQL domain integration, HTTP contract smoke và Auth MySQL integration trên database CI cô lập. Workflow [#7 trên commit `3bf6c0c`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113725073), [#8 trên commit `4bbdb61`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36116299740), [#9 trên commit `ed62986`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117022485), [#10 trên commit `dd90c11`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117665453) và [#11 trên commit `5bc7185`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) pass toàn workflow. Run #11 bao gồm test CSRF/Origin/logout regression trên MySQL CI cô lập. Test owner hai tài khoản xác nhận budget của category ngoài owner trả `404 NOT_FOUND`; Google OAuth redirect được kiểm tra trong response và không gọi mạng. Đây là evidence CI trên DB tạm, không thay cho staging SMTP hoặc production test.

### Điều kiện để đánh dấu hoàn tất

- DB: chỉ đánh dấu đạt khi `db:datatest` và ba MySQL integration suite pass trên service/schema test riêng.
- Auth staging: chỉ đánh dấu đạt khi register và reset đều nhận email thật; OTP/session/CSRF/logout được xác nhận qua UI/API.
- Owner: chỉ đánh dấu đạt khi HTTP integration pass với hai user/session và session B không đọc hoặc sửa được dữ liệu A.
- Khi một bước chưa chạy vì chưa có staging/service/mailbox, ghi là `pending` cùng lý do; không gắn nhãn pass dựa trên test mock.

## Evidence môi trường do Team Leader cung cấp ngày 2026-09-25

- `npm run db:status` báo migration `0001`–`0005` đã apply, không có mismatch.
- `npm run db:preflight` xác định schema đang kiểm tra là `campus_coin`, MySQL `8.4.8`, TLS đã thương lượng và `applied=5 pending=0`. Đây chưa phải bằng chứng cho schema clone `campus_coin_done`; cần chạy lại hai lệnh chỉ đọc với `CAMPUS_COIN_DB_NAME=campus_coin_done`.
- Service URI Aiven được cung cấp kết thúc bằng `/defaultdb`; suffix này không xác nhận clone `campus_coin_done` tồn tại hoặc app/test account truy cập được.
- Lần chạy chỉ đọc với `CAMPUS_COIN_DB_NAME=campus_coin_done` qua cấu hình ứng dụng hiện tại trả `Unknown database 'campus_coin_done'`. Cần DevB xác nhận schema chính xác, target/service và quyền của app/test account; danh sách database trong DBeaver chưa chứng minh credential mà ứng dụng dùng truy cập được schema đó.
- `npm run db:verify-clone` cũng dừng tại bước preflight chỉ đọc với cùng lỗi. Vì vậy `db:status`, `db:datatest` và các MySQL integration suite phía sau chưa chạy; script chưa tạo hay xóa schema nào.
- Preflight ghi hai dòng `WARN` cho charset và pool; chi tiết lần chạy là `utf8mb4/utf8mb4_0900_ai_ci` và pool `5` so với `max_connections=76`.
- Lần `db:datatest` đầu đạt `3/15`. Mười hai file `expect-error` bị runner hiểu nhầm thành file phải chạy thành công vì parser giữ ký tự `\r` ở dòng header CRLF. Parser đã được sửa và có regression test; cần chạy lại `db:datatest` trên MySQL service test được DevB xác nhận. Lần chạy cũ không được ghi là pass.
- Team Leader xác nhận Phần 2 auth staging đã hoàn tất: register/reset email, thử OTP sai/hết hạn/resend và logout/session. Đây là báo cáo của Team Leader; chưa có staging URL/evidence chi tiết trong task để tái kiểm tra độc lập. Kiểm thử SMTP/provider failure timeout/retry vẫn là trường hợp riêng.
- Team Leader báo ngày 2026-09-25 rằng kết nối Google OAuth đã thành công; môi trường chưa được nêu. Ảnh cũ cho thấy provider chưa cấu hình là trạng thái trước đó. Chưa ghi nhận riêng Google login và connect-account nếu chưa thử cả hai.
