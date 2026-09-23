# Xác thực — Campus Coin

## 1. Quyết định

MVP chỉ dùng Google OAuth. Gmail chỉ cung cấp identity/email claim qua Google; ứng dụng không đọc Gmail inbox, không dùng credential Gmail cá nhân và không xây security-email reset. Sau callback, mọi đăng nhập kết thúc bằng opaque server-side session.

Nguồn quyết định: [ADR-0001](./adr/0001-google-oauth-only.md) và [ADR-0002](./adr/0002-opaque-browser-session.md).

## 2. Mô hình danh tính

- `User` có ID bất biến, display name, verified email claim, status, locale và timezone `Asia/Ho_Chi_Minh`.
- `AuthIdentity` duy nhất trong MVP là `(provider=google, subject=sub)`.
- Không dùng email matching để merge hoặc takeover.
- Không có `PasswordCredential`, local registration/login, account linking, OTP challenge hoặc password reset route.

## 3. Google OAuth

1. Browser gọi backend OAuth start route.
2. Backend tạo random `state`, `nonce`, PKCE verifier/challenge và return URL allowlist.
3. Challenge được lưu server-side hoặc sealed temporary cookie, TTL ngắn, one-time use, không chứa dữ liệu tiền.
4. Callback chỉ nhận HTTPS redirect đã đăng ký và code exchange server-side.
5. Backend kiểm tra state, PKCE, nonce, issuer, audience/client ID, subject, expiry và verified email policy.
6. Server tạo/reuse user theo Google subject, rotate session và redirect tới allowlisted path.

Mismatch, replay, claim lỗi, provider outage hoặc redirect sai không tạo session, user mapping hoặc ledger row.

## 4. Session và CSRF

Session ID là random opaque; DB chỉ lưu hash ID, user, issued/expires, revoked, last_seen và metadata tối thiểu. Cookie không chứa balance, role hoặc provider token. Cookie phải `HttpOnly`, `Secure`, `SameSite=Lax` hoặc chặt hơn sau kiểm thử callback.

Mutation phải kiểm tra CSRF token hoặc Origin/Referer policy, schema và idempotency. 401 là thiếu/hết session; 403 là đã xác thực nhưng không có quyền. Expired/revoked session phải yêu cầu đăng nhập lại.

## 5. Phân quyền và owner scope

- API lấy `user_id` từ session, không nhận owner scope đáng tin từ body/query.
- User chỉ đọc/ghi dữ liệu của mình theo domain rules.
- Admin chỉ được issue/report/status/note/configuration được cấp quyền.
- Admin không sửa balance, ledger, audit hoặc bypass payment check.
- JEV không có role, session hoặc authorization.

## 6. Kiểm soát mối đe dọa

| Rủi ro | Kiểm soát |
|---|---|
| OAuth state/nonce/PKCE replay | Challenge one-time, TTL ngắn, bind browser flow |
| IDOR | Owner scope từ session và query predicate bắt buộc |
| Session theft | Opaque hash, Secure/HttpOnly cookie, expiry, revoke, không localStorage |
| CSRF | CSRF token và Origin/SameSite controls |
| Provider/DB outage | Fail closed, không guest/local fallback |
| Log/PII leak | Redact code/token/cookie/raw claim/raw JEV/financial detail |
| Account disabled | Revoke session và chặn trước khi đọc dữ liệu |

## 7. Tiêu chí chấp nhận

1. Google login validate state, PKCE, nonce, issuer, audience, expiry và verified email.
2. Cùng subject dùng lại đúng user; subject khác không truy cập user đó.
3. Session opaque rotate sau callback, có expiry/revoke và cookie flags đúng.
4. User A không đọc/mutate User B bằng cách đổi ID.
5. OAuth/DB/provider lỗi không tạo financial row.
6. Không có local password, linking, OTP hoặc reset path trong MVP.
7. Không có secret/OAuth token trong repo, response hoặc log.

## 8. Ngoài phạm vi

Local email/password, account linking, automatic merge, OTP/password reset, security-email, SMS/passkey/MFA bắt buộc, OAuth ngoài Google, Gmail inbox/contact/read/send, magic link và JWT browser session.

## 9. Cổng kiểm chứng

Developer A phải kiểm tra credential Google, exact redirect trên Vercel-provided domain, claims, callback, session revoke và IDOR ở Day 1. Thiếu evidence hoặc lỗi auth là NO-GO.
