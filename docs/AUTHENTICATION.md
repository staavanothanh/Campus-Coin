# Xác thực — Campus Coin

## 1. Quyết định hiện hành

Campus Coin giữ email/password/OTP theo [ADR-0008](./adr/0008-email-password-otp-auth.md) và bổ sung Google Sign-In tùy chọn theo [ADR-0009](./adr/0009-optional-google-sign-in.md). Không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API. Team Leader đã báo register/reset gửi và nhận email thành công trên staging. DevD còn cần xác minh riêng provider outage, timeout/retry và log đã redact; kết quả gửi email thành công không thay cho các kiểm tra đó.

```text
register → verify OTP → login → session
forgot password → reset password
Google Sign-In (tùy chọn) → xác minh OIDC → session
đang đăng nhập → chủ động kết nối Google
```

ADR-0009 là quyết định mới nhất khi tài liệu cũ mâu thuẫn về Google. ADR-0008 tiếp tục sở hữu email/password/OTP; ADR-0002 tiếp tục sở hữu contract session opaque. Google Sign-In chỉ hiện khi OAuth client đã cấu hình đủ.

## 2. Danh tính và credential

- `User` có ID bất biến, display name, email đã xác minh, status, locale và timezone `Asia/Ho_Chi_Minh`.
- Email được chuẩn hóa trước khi truy vấn; tính duy nhất do database bảo đảm.
- Mật khẩu chỉ lưu dưới dạng hash/salt phía server; không trả credential cho client.
- OTP gắn email và purpose (`registration` hoặc `password_reset`), lưu hash, có expiry, giới hạn attempts, resend cooldown và single-use.
- Google identity được nhận diện bằng `provider='google'` và Google `sub` trong `auth_identities`; không lưu access token hoặc refresh token.
- Không tự động merge account theo email. Muốn kết nối Google vào account hiện hữu phải đăng nhập trước rồi hoàn tất flow kết nối; callback kiểm tra session đúng owner.
- Bảng `auth_identities` đã có trong migration `0001`, được runtime dùng cho danh tính Google; không cần migration mới.

## 3. Đăng ký, đăng nhập và khôi phục

1. `POST /auth/register` chuẩn hóa email, từ chối xung đột phù hợp và tạo OTP registration.
2. SMTP adapter gửi mã; DB chỉ lưu OTP đã hash. Không đưa OTP vào response, log, fallback dev hoặc client storage.
3. `POST /auth/verify-registration` xác minh mã đúng hạn/chưa dùng/chưa vượt attempts rồi tạo `users` và `auth_credentials` atomic.
4. `POST /auth/login` kiểm tra password, trạng thái user, email verified và rate limit theo account/IP.
5. Login hợp lệ tạo opaque server session; browser nhận cookie, không nhận session ID qua JSON.
6. `POST /auth/forgot-password` luôn trả thông báo chung để hạn chế account enumeration; OTP chỉ được gửi khi điều kiện account hợp lệ.
7. `POST /auth/reset-password` xác minh OTP, đổi hash và thu hồi session cũ trong cùng transaction.

Google Sign-In dùng Authorization Code phía server, PKCE S256, `state`, `nonce` và scope `openid email profile`. Server kiểm tra ID token theo client audience, nonce, `sub` và `email_verified=true`. Google account mới chỉ được tạo khi email chưa có account; email trùng cần người dùng đăng nhập phương thức hiện tại và kết nối Google rõ ràng. Kết nối chỉ được bắt đầu từ session hợp lệ và callback xác nhận cùng user.

Danh sách Test users trong Google Auth Platform không phải allowlist của Campus Coin. Ứng dụng hiện chỉ xin `openid email profile`; theo [quy định Audience của Google](https://support.google.com/cloud/answer/15549945?hl=en), với các scope định danh cơ bản này, tài khoản có thể authorize dù không nằm trong danh sách Test users. Khi ứng dụng có User type `External` và ở trạng thái In production, Google cho phép mọi tài khoản Google, trừ khi có chính sách tổ chức giới hạn thêm. Campus Coin hiện không có allowlist email riêng: danh tính Google đã xác minh có thể tạo user mới nếu email chưa có account; email đã tồn tại phải được kết nối chủ động. Nếu nhóm muốn giới hạn người được vào Campus Coin, cần thêm policy allowlist ở server.

OAuth đọc `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` và `SESSION_SECRET` từ environment. Khi chưa đủ cấu hình, provider bị tắt, nút không hiển thị, luồng email không bị ảnh hưởng. Ngày 2026-09-26, Team Leader cung cấp ảnh Campus Coin hiển thị Google đã kết nối và đăng nhập Google thành công. Đây là bằng chứng được Team Leader cung cấp; môi trường staging/production chưa được xác nhận.

Database/provider failure phải fail closed. Email send failure trả lỗi ổn định, không để lại OTP dùng được nếu mail không được chấp nhận. SMTP có timeout và số retry hữu hạn; retry dùng cùng OTP để tránh nhiều mã khác nhau đang hiệu lực.

Cooldown OTP được kiểm tra trước quota gửi; yêu cầu bị từ chối trong cooldown không trừ quota gửi theo email hoặc IP. Proxy IP mặc định không được tin: chỉ bật `TRUST_PROXY=true` khi đã khai báo toàn bộ IP proxy trong chuỗi forwarding vào `TRUSTED_PROXY_IPS` (danh sách IP chính xác, phân tách bằng dấu phẩy). Khi socket peer không khớp danh sách, server bỏ qua `X-Forwarded-For`. Proxy phải ghi hoặc append chuỗi forwarding theo chuẩn để server lần ngược từ proxy gần nhất tới địa chỉ client.

## 4. Session, cookie và CSRF

Session ID là random opaque; DB chỉ lưu hash ID, user, issued/expires, revoked, last_seen và metadata tối thiểu. Session có expiry và logout/recovery revoke. Cookie phải `HttpOnly`, `Secure` trong production, `SameSite=Lax` hoặc chặt hơn sau kiểm thử, `Path=/`, và không có `Domain` rộng. Không lưu session trong localStorage/sessionStorage.

Mọi API response, gồm JSON và redirect, gửi `Cache-Control: no-store, private`; CDN/browser không được lưu session hoặc dữ liệu cá nhân. Mọi mutation kiểm tra `Origin` theo allowlist trước khi xử lý body hoặc CSRF. `Referer` không thay thế `Origin`; request thiếu Origin bị từ chối ngay cả khi Referer hợp lệ. Mutation của session đã xác thực kiểm tra cả Origin và CSRF token, kể cả logout. Logout với session còn hiệu lực và CSRF token sai trả `403` mà không thu hồi session; nếu session đã hết hạn/bị thu hồi hoặc không tồn tại, logout trả thành công và xóa cookie để hỗ trợ gọi lặp. Ở development, API cho phép thêm hai origin local `http://127.0.0.1:5173` và `http://localhost:5173` để khớp Vite; production chỉ nhận đúng `CLIENT_ORIGIN`. Money mutation có idempotency khi có thể retry. 401 là thiếu/hết session; 403 là đã xác thực nhưng không có quyền; lỗi không trả stack hoặc nội dung nội bộ. `npm run test:auth-security` kiểm tra Origin sai, thiếu CSRF và mutation hợp lệ trên MySQL tạm; các bước live trên staging nằm trong [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md).

Mỗi lần dùng session hợp lệ, server cập nhật `sessions.last_seen_at` nếu giá trị cũ hơn một phút hoặc chưa từng được đặt. Khoảng cách này giảm lượt ghi DB nhưng vẫn ghi nhận hoạt động gần đây.

## 5. Phân quyền và owner scope

- API lấy `user_id` từ session, không tin owner ID từ body/query.
- Mọi financial read/write phải scope theo owner tại server/repository.
- Không có endpoint cho phép user chọn session owner khác.
- Admin chỉ thực hiện issue/report/status/note được cấp quyền; không sửa balance, ledger hoặc audit.
- JEV không có role, session hoặc authorization.

## 6. Kiểm soát mối đe dọa

| Rủi ro | Kiểm soát cần có |
|---|---|
| Brute force password | Rate limit bền vững theo account và IP; lockout/backoff có thời hạn; trả lỗi không tiết lộ credential nào sai |
| OTP brute force/replay | Expiry, maximum attempts, resend cooldown, single-use và rate limit; so sánh hash an toàn |
| Email enumeration | Forgot-password trả cùng response; đăng ký chỉ lộ conflict trong contract đã duyệt |
| Session theft | Opaque hash, cookie HttpOnly/Secure/SameSite, expiry/revoke, không browser storage |
| CSRF/cross-origin | Origin allowlist cho public auth; Origin + CSRF token cho mutation có session, kể cả logout |
| IDOR | Owner scope lấy từ session và predicate bắt buộc |
| DB/SMTP outage | Fail closed; lỗi public đã sanitize; timeout và retry bounded |
| Log/PII leak | Không log password, OTP, reset token, cookie, secret hoặc raw credential |
| Tài khoản bị khóa | Revoke/deny session và chặn truy cập domain |
| OAuth login CSRF/callback giả | Cookie flow có chữ ký, state, nonce, PKCE S256, TTL 10 phút và callback cố định |
| Kết nối nhầm hoặc chiếm account | Chỉ kết nối khi đã đăng nhập; không auto-link theo email; unique Google `sub` chỉ thuộc một user |
| Google token/claim bị lộ | Chỉ xác minh tại server; không lưu Google token; không log code, token, cookie hoặc raw claim |

## 7. Tiêu chí chấp nhận production

1. Register/verify/login/session và forgot/reset chạy qua DB cô lập cùng email provider đã xác nhận.
2. OTP đúng/sai/hết hạn/quá attempts/resend/single-use được kiểm tra.
3. Login sai bị rate-limit theo account/IP; lockout/backoff có thời hạn và không phụ thuộc một API instance.
4. Session cookie, expiry, revoke, logout và session cũ sau reset được kiểm tra.
5. CSRF/Origin/IDOR, owner isolation, provider/DB failure và API error envelope được kiểm tra.
6. SMTP timeout/retry có giới hạn; không có OTP trong log/dev fallback.
7. en/vi, loading/error/success/expired/locked states, keyboard/focus và aria/live-region đạt.
8. Không có secret/password/OTP/reset token/raw credential trong repo, response hoặc log.
9. Google live login/link chỉ được ghi đạt sau callback thật; nếu OAuth secrets chưa cấu hình thì email login vẫn chạy và provider discovery báo Google tắt. Biến môi trường và callback cần thiết được ghi trong [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md).

Các tiêu chí trên là gate; ghi quyết định trong ADR-0008 không chứng minh chúng đã đạt.

## 8. Ngoài phạm vi auth

Tự động merge account theo email, Gmail inbox/contact/read/send/API, SMS, passkey/MFA bắt buộc, magic link và JWT browser session.
