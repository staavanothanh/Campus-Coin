# AUTHENTICATION — Campus Coin

## 1. Mục tiêu và ranh giới

Campus Coin xác thực người dùng để bảo vệ dữ liệu do chính họ nhập. Có hai cách đăng nhập: tài khoản local bằng email/mật khẩu và Google OAuth. Người dùng có thể liên kết Google identity vào tài khoản local đã tồn tại sau khi xác nhận. Mọi cách đăng nhập đều kết thúc ở một server-side opaque session; client không được tự nhận diện user bằng số dư, email chưa xác minh hoặc dữ liệu JEV.

Đây là authentication/authorization cho một ứng dụng quản lý thu nhập và thanh toán cá nhân. Nó không phải identity/banking/payment service và không cấp quyền truy cập tài khoản ngân hàng.

## 2. Mô hình danh tính

### User và identity

- `User` là account nội bộ có ID bất biến, status (`active`, `suspended`, `closed`), email chuẩn hóa, email verification status, display name, locale `vi-VN`, timezone `Asia/Ho_Chi_Minh`.
- `PasswordCredential` lưu hash mật khẩu bằng thuật toán password hashing hiện đại có cost/parameters cấu hình; không lưu plaintext.
- `AuthIdentity` lưu provider (`google`), provider subject (`sub`) và user ID. Unique key là provider + subject; không dùng email làm định danh OAuth duy nhất.
- Một user có thể có local credential và Google identity. Phải giữ ít nhất một phương án đăng nhập/recovery hợp lệ trước khi unlink phương án còn lại.
- Session, OTP challenge, link attempt và security event có thời hạn/audit phù hợp.

## 3. Đăng ký và đăng nhập local

### Đăng ký

1. Client gửi email, mật khẩu và display name qua HTTPS.
2. API validate định dạng/độ dài, chuẩn hóa email để lookup, kiểm tra mật khẩu không nằm trong danh sách cấm phổ biến.
3. API tạo user ở trạng thái cần xác minh email nếu policy yêu cầu, lưu password hash và gửi email xác minh hoặc thông báo hướng dẫn.
4. Response không xác nhận email đã tồn tại ở màn hình đăng ký; message tiếng Việt trung tính.
5. Sau khi xác minh/đăng nhập thành công, API tạo session mới và ghi security event.

Không tạo wallet baseline hoặc transaction chỉ vì đăng ký. User phải nhập số dư ví ban đầu trong flow onboarding riêng; số dư đó không phải `income`.

### Đăng nhập

1. Rate limit theo account identifier, IP/device risk và cửa sổ thời gian.
2. So sánh hash thời gian an toàn; mọi lỗi trả message chung, không tiết lộ “email đúng nhưng mật khẩu sai”.
3. Xóa/rotate session trước khi tạo session sau đăng nhập (chống session fixation), đặt cookie `HttpOnly; Secure; SameSite=Lax`.
4. Ghi login success/failure, password change, reset, link/unlink vào audit; không ghi password/OTP/cookie.

## 4. Google OAuth

### Authorization flow

1. Người dùng bấm “Đăng nhập bằng Google” hoặc “Liên kết Google”.
2. Backend tạo state ngẫu nhiên một lần, dùng PKCE, nonce và return URL allowlist; state/nonce được lưu tạm gắn với browser/session.
3. Google callback kiểm tra state, code exchange server-side, issuer, audience/client ID, chữ ký/token claims, `sub`, expiry và `email_verified` theo policy.
4. Backend tìm `AuthIdentity(provider=google, sub)`. Nếu có, đăng nhập đúng user đó.
5. Nếu chưa có identity, luồng đăng nhập mới chỉ tạo account hoặc đề xuất bước xác nhận link; không tự động chiếm account local chỉ vì email trùng.
6. Tạo/rotate opaque session, xóa challenge đã dùng và redirect về path allowlist.

### Email trùng với account local

Nếu Google email đã trùng local account nhưng Google identity chưa link, hệ thống không tự merge. Hiển thị hướng dẫn đăng nhập local trước, sau đó dùng “Liên kết Google” với re-auth/OTP xác nhận. Chỉ sau khi user chứng minh quyền sở hữu cả hai bên mới tạo `AuthIdentity`.

### Unlink và account recovery

- Yêu cầu re-authentication/step-up, kiểm tra user còn password hoặc identity khác có thể đăng nhập.
- Không cho unlink phương án cuối cùng nếu user không thiết lập recovery.
- Revoke session của thiết bị nhạy cảm sau thay đổi identity/password; gửi security email dù notification tùy chọn đang tắt.
- Không nhận access token từ client làm chứng cứ lâu dài; token exchange/verification ở backend.

## 5. OTP đặt lại mật khẩu qua email/Gmail

### Request reset

1. Người dùng nhập email.
2. API trả response thời gian/wording giống nhau cho email tồn tại hoặc không tồn tại.
3. Với account phù hợp, tạo challenge với random code đủ entropy, hash code trong DB, `expires_at` ngắn (ví dụ 10 phút theo cấu hình), `attempt_count`, `consumed_at`, purpose và rate-limit key.
4. Gửi code qua provider email transactional/Gmail-compatible. Email chỉ nêu thông tin cần thiết, không chứa số dư, ledger, mật khẩu cũ hoặc token dài hạn.

### Verify và reset

- Code dùng một lần; so sánh hash constant-time; giới hạn số lần thử và số request/email/IP.
- Khi thành công: mark consumed atomically, yêu cầu mật khẩu mới, thay password hash, revoke session cũ và ghi audit/security event.
- OTP hết hạn, sai quá số lần hoặc đã dùng thì không được reuse. Retry gửi code cũ không làm kéo dài challenge cũ nếu policy không cho.
- Không trả lỗi phân biệt email không tồn tại, code sai hay account bị khóa ở endpoint công khai; log nội bộ có mã sự kiện không chứa bí mật.
- Tạo password reset session ngắn hạn sau khi OTP hợp lệ; không biến OTP thành session bình thường nếu chưa đổi mật khẩu.

## 6. Gmail notification

Notification tùy chọn gồm insight tháng, nhắc ngân sách, thông báo vận hành và email sản phẩm đã đồng ý. User có setting riêng `gmail_notifications_enabled`/loại thông báo, mặc định bảo thủ và có unsubscribe rõ ràng.

- Email bảo mật bắt buộc (đổi mật khẩu, link/unlink, đăng nhập rủi ro, reset) không bị tắt bởi setting marketing/insight.
- Không gửi raw ledger, access token, OTP vào log; email insight chỉ chứa mức tổng hợp tối thiểu và link yêu cầu đăng nhập để xem chi tiết.
- Mỗi email có idempotency key, trạng thái queued/sent/failed và retry bounded; lỗi email không rollback hay thay đổi `income`/`payment`/savings.
- Tôn trọng consent, unsubscribe và retention; không bán/chia sẻ email hoặc dữ liệu tài chính cho bên thứ ba.

## 7. Session và CSRF

Session là random opaque ID; DB chỉ lưu hash ID, user, issued/expires, revoked, last_seen, device metadata tối thiểu. Cookie:

- `HttpOnly`: JavaScript không đọc được.
- `Secure`: chỉ HTTPS ở production.
- `SameSite=Lax` hoặc `Strict` theo flow OAuth; callback phải được kiểm thử.
- Domain/path hẹp nhất có thể; rotate khi login/step-up.

Các request thay đổi state (`income`, `payment`, savings, budget, link identity, password) yêu cầu session hợp lệ, CSRF token/double-submit hoặc cơ chế same-site tương đương, kiểm tra Origin/Referer theo policy và idempotency key ở mutation nhạy cảm. CORS chỉ allowlist origin, không `*` khi gửi credentials.

JWT không được dùng làm browser session MVP. Nếu tương lai có service-to-service token, phải tách issuer/audience, expiry/revocation và threat model khỏi session user.

## 8. Authorization và phân quyền

- Mọi resource query theo `user_id` từ session, không theo user ID tùy ý trong body.
- `user` chỉ đọc/ghi dữ liệu của mình qua domain rules; không được sửa/xóa ledger history.
- `admin` chỉ được đọc/tạo report operations, status/note và content/settings được cấp; xem financial detail tối thiểu, không sửa balance/ledger.
- Correction flow là use case riêng, có reason, quyền, audit và vẫn append-only; admin không được raw SQL chỉnh history.
- JEV không có session/role/authorization và không được gọi mutation money.

## 9. Threat model và kiểm soát

| Rủi ro | Kiểm soát tối thiểu |
|---|---|
| Account enumeration | Response chung, timing gần nhau, rate limit, audit |
| Password stuffing | Argon2id/bcrypt cấu hình tốt, rate limit, lock/challenge theo risk, thông báo bảo mật |
| OAuth CSRF/account linking attack | state + PKCE + nonce, exact redirect, re-auth khi link, không merge bằng email |
| Session fixation/theft | rotate/revoke, HttpOnly/Secure/SameSite, TLS, expiry, không log cookie |
| OTP brute force/replay | hash-at-rest, expiry, single-use atomic consume, attempt/request limit |
| CSRF | SameSite + CSRF token + Origin check cho mutation |
| XSS | React escaping, sanitize rich text nếu có, CSP/headers, không render raw JEV/description |
| Email/provider compromise | secret manager, scoped credential, không gửi dữ liệu dư thừa, audit provider failures |
| Broken access control | server-side owner scope, deny-by-default role checks, test IDOR |
| PII/financial leak logs | structured redaction, sampling an toàn, retention và access review |
| Recovery account takeover | re-auth, verified email/Google claims, revoke sessions, security notifications |

## 10. Acceptance criteria

1. Local login, Google login và link Google đều tạo cùng loại opaque server session.
2. Google callback từ state/PKCE/nonce không hợp lệ bị từ chối; email trùng không tự merge.
3. Password reset response không enumerate account; OTP hash-only, expiry/single-use/attempt limit được enforce atomically.
4. Reset thành công đổi password hash, revoke session cũ và gửi security notification.
5. Tắt notification tùy chọn không tắt email security bắt buộc; insight/marketing tôn trọng opt-out.
6. User A không thể đọc/mutate dữ liệu user B chỉ bằng đổi ID request.
7. Session cookie không chứa VND balance, `income`, `payment`, role hoặc token provider.
8. Mọi mutation financial yêu cầu CSRF/origin protection và validation; auth/provider failure không tạo ledger row.
9. Không có secret/credential thật trong repository hoặc handoff.

## 11. Out-of-scope

- Đăng nhập bằng SMS/phone, SSO trường học, passkey hoặc MFA bắt buộc trong MVP.
- Google Workspace admin console hoặc Gmail mailbox scraping.
- Dùng Gmail để gửi tiền, xác minh thanh toán hoặc đọc sao kê.
- Tự động hợp nhất nhiều account chỉ bằng email matching.
- JWT browser session mặc định, password plaintext, OTP qua log hoặc link reset không hết hạn.
