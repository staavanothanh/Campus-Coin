# CC-005 — Handoff đăng nhập email của Dev A

Trạng thái: email/password/OTP giữ theo ADR-0008; Team Leader — Hiệp bổ sung Google Sign-In tùy chọn theo [ADR-0009](../adr/0009-optional-google-sign-in.md) ngày 2026-09-24. Tài liệu này là handoff triển khai, không phải nguồn quyết định.

## Phần giữ theo nhóm

- React + TypeScript/TSX cho giao diện; Node + TypeScript cho API.
- MySQL cloud qua TLS; dữ liệu tài chính vẫn thuộc Developer B.
- API `/api/v1`, session cookie `HttpOnly`, kiểm tra Origin và CSRF.
- Giao diện tiếng Việt và tiếng Anh; một file CSS chung cho bản thử Dev A.

## Luồng đã chốt

- Đăng ký bằng email, nhận OTP, rồi nhập mã, họ tên và mật khẩu để tạo tài khoản.
- Đăng nhập bằng email và mật khẩu. Không yêu cầu OTP mỗi lần đăng nhập.
- Quên mật khẩu: email → OTP → mật khẩu mới.
- Google Sign-In tùy chọn; user hiện hữu chủ động kết nối sau khi đăng nhập. Không dùng Gmail credential/inbox/API, không auto-link theo email.

## Luồng theo thư mục

```text
src/app/App.tsx
  → src/features/auth/auth.api.ts
  → src/routes/api.ts
  → src/features/auth/auth.service.ts
  → src/infrastructure/google-oauth.ts → Google OIDC (chỉ khi bật cấu hình)
  → src/infrastructure/db.ts → src/infrastructure/db/pool.ts → MySQL
  → src/infrastructure/mail.ts → SMTP (chỉ lúc gửi OTP)
```

`src/features/auth/security.ts` băm mật khẩu, OTP và session token. `src/app/text.ts` chứa chữ tiếng Việt/tiếng Anh. `src/styles/main.css` chứa kiểu dáng chung.

### Đăng ký

1. `App.tsx` gửi email đến `POST /auth/register`.
2. `register()` kiểm tra email chưa có trong `users`; `issueOtp()` lưu hash mã trong `email_otps` và gửi email.
3. Lúc này **chưa tạo** `users` hoặc `auth_credentials`.
4. Người dùng nhập OTP, họ tên, mật khẩu tại `App.tsx`; form gọi `POST /auth/verify-registration`.
5. `verifyRegistration()` kiểm tra mã. Nếu đúng, tạo `users` rồi `auth_credentials` trong cùng một transaction. Nếu sai, tăng số lần thử.

Cách này tránh phải xóa `users` khi SMTP lỗi, nên không vướng khóa ngoại từ `auth_credentials`. Mã có hạn 5 phút, tối đa 5 lần nhập sai; gửi lại mã có khoảng chờ 60 giây.

### Đăng nhập và quên mật khẩu

- `login()` đọc `users` và `auth_credentials`, kiểm tra mật khẩu, trạng thái `active` và email đã xác minh; tạo `sessions` rồi đặt cookie.
- `getSession()` đọc cookie sau F5. `logout()` thu hồi session và xóa cookie.
- `resendOtp()` nhận `purpose`: `registration` hoặc `password_reset` đúng như OpenAPI.
- `forgotPassword()` gửi OTP đặt lại cho email hợp lệ nhưng luôn trả câu chung để không lộ email đã đăng ký.
- `resetPassword()` kiểm tra OTP, đổi mật khẩu và thu hồi các session cũ.

## Bảng MySQL

| Bảng | Nguồn | Vai trò |
|---|---|---|
| `users` | migration `0001` của Developer B | Tài khoản, vai trò, trạng thái |
| `sessions` | migration `0001` của Developer B | Phiên đăng nhập |
| `auth_identities` | migration `0001` của Developer B | Google `sub` gắn với user theo ADR-0009 |
| `auth_credentials` | migration `0004` | Hash và salt mật khẩu |
| `email_otps` | migration `0004` | Hash OTP, mục đích, hạn dùng, số lần sai |
| `auth_rate_limits` | migration `0005` | Bucket HMAC theo account/IP, số lần thử và thời hạn chặn |

File `0004` tồn tại trong repository; việc apply trên DB hiện tại chưa được xác minh. Không chạy `db:migrate` cho đến khi target Campus Coin, owner, backup/restore và migration status được xác nhận theo `LUNA_HANDOFF_PROMPT.md`. `.env.example` chỉ liệt kê tên biến; không chứa mật khẩu hoặc secret.

## Kiểm chứng và giới hạn

- Local `npm run typecheck`, `npm run build`, API validation và 14 unit/readiness tests đã pass trong worktree; bằng chứng đầy đủ nằm ở [`DELIVERY-PLAN.md`](../DELIVERY-PLAN.md).
- Auth MySQL E2E và các suite MySQL đã được thêm, nhưng chưa chạy với database cô lập trong phiên này. `0004`/`0005` chưa được xác nhận apply trên DB đích.
- Account/IP rate-limit, OTP expiry/attempts/cooldown/single-use, SMTP adapter timeout/retry, session/CSRF/IDOR và response handling đã có code. Hành vi DB phải được xác minh bằng job MySQL CI.
- Google OIDC start/callback/link, state cookie, PKCE, nonce, verified email và provider discovery đã có code; cần test hẹp và live callback sau khi owner cấu hình OAuth client.
- SMTP provider thật chưa được chọn/kiểm chứng; integration test dùng email adapter giả lập, không chứng minh gửi/nhận OTP thật.
- Auth UI đã có các màn register/verify/resend/login/forgot/reset và trạng thái request; chưa có browser/keyboard/screen-reader E2E evidence.
- Các route domain wallet, ledger, savings, categories, budgets, reports, issues và admin đã được nối với application services theo OpenAPI; MySQL owner-isolation E2E và review tích hợp Developer B còn chờ CI/evidence.
- CI disposable MySQL workflow đã thêm nhưng chưa chạy từ xa. Backup/restore rehearsal, DB role/CA và production evidence chưa có.
