# CC-005 — Đề xuất đăng nhập email của Dev A

Trạng thái: đang làm trên nhánh `hiep`. Team Leader chưa duyệt thay Google OAuth-only trong ADR-0001, nên không coi đây là quyết định của cả nhóm.

## Phần giữ theo nhóm

- React + TypeScript/TSX cho giao diện; Node + TypeScript cho API.
- MySQL cloud qua TLS; dữ liệu tài chính vẫn thuộc Developer B.
- API `/api/v1`, session cookie `HttpOnly`, kiểm tra Origin và CSRF.
- Giao diện tiếng Việt và tiếng Anh; một file CSS chung cho bản thử Dev A.

## Phần Hiệp đề xuất thay đổi

- Đăng ký bằng email, nhận OTP, rồi nhập mã, họ tên và mật khẩu để tạo tài khoản.
- Đăng nhập bằng email và mật khẩu. Không yêu cầu OTP mỗi lần đăng nhập.
- Quên mật khẩu: email → OTP → mật khẩu mới.
- Không dùng Google OAuth trong bản thử này.

## Luồng theo thư mục

```text
src/app/App.tsx
  → src/features/auth/auth.api.ts
  → src/routes/api.ts
  → src/features/auth/auth.service.ts
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
| `auth_credentials` | migration `0004` của Dev A | Hash và salt mật khẩu |
| `email_otps` | migration `0004` của Dev A | Hash OTP, mục đích, hạn dùng, số lần sai |

`0004` mới là đề xuất trên nhánh, chưa chạy trên MySQL dùng chung. Không chạy `db:migrate` trước khi Team Leader và Developer B đồng ý. `.env.example` chỉ liệt kê tên biến; không chứa mật khẩu hoặc secret.

## Kiểm chứng và giới hạn

- `npm run build`: kiểm tra TypeScript và build giao diện.
- `npm test`: test logic và HTTP không cần MySQL; các test MySQL thật chỉ chạy khi có cấu hình thử nghiệm riêng.
- Chưa xác nhận đăng ký/OTP/đăng nhập đầu-cuối với MySQL và SMTP thật.
- Chưa tích hợp phần auth này vào toàn bộ ứng dụng tài chính hoặc Vercel runtime.
- Tài liệu kiến trúc/ADR của nhóm còn Google OAuth-only; cần quyết định chung trước khi nhập `main`.
