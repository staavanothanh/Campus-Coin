# Developer D — Vercel Preview, SMTP và release

## 1. Cấu hình GitHub/Vercel

Vercel adapter/config và workflow đã có trong nhánh `hiep`:

- `api/v1/[...path].ts` gọi API handler đang dùng chung.
- `vercel.json` cấu hình `dist`, SPA rewrite, API function và thời gian tối đa 60 giây.
- `.github/workflows/vercel-deploy.yml` chỉ chạy bằng `workflow_dispatch` sau khi CI đã pass.
- `package.json` chốt Node.js `24.x`; Vercel build chạy `npm ci`, typecheck, production build và OpenAPI validation.

Thiết lập GitHub Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Tạo GitHub Environment `preview` và `production`; bắt buộc reviewer cho `production`. Chỉ deploy Production từ `hiep`.

Trong Vercel Project, tạo environment riêng cho Preview và Production. Đặt secret/value tại Vercel, không đưa vào GitHub log hoặc chat:

- MySQL: `CAMPUS_COIN_DB_HOST`, `CAMPUS_COIN_DB_PORT`, `CAMPUS_COIN_DB_NAME`, `CAMPUS_COIN_DB_USER`, `CAMPUS_COIN_DB_PASSWORD`, `CAMPUS_COIN_DB_SSL`, `CAMPUS_COIN_DB_CA_BASE64` nếu `verify-ca` trên Vercel (hoặc `CAMPUS_COIN_DB_CA_PATH` nếu runtime có file), `CAMPUS_COIN_DB_CONNECTION_LIMIT`.
- Auth: `OTP_SECRET`, `SESSION_SECRET`, `AUTH_RATE_LIMIT_SECRET`, `CLIENT_ORIGIN`.
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_TIMEOUT_MS`, `EMAIL_FROM`.
- Google (nếu dùng ở environment đó): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`; callback phải khớp Google Console và host hiện tại.

Preview phải dùng DB clone/staging riêng, không dùng database Production. Cùng DevB chọn function region gần DB sau khi xác nhận region và đo latency; chưa đặt region đoán mò trong config.

## 2. Deploy Preview và smoke

1. Chờ CI xanh trên đúng commit `hiep`.
2. Chạy workflow **Deploy Campus Coin to Vercel** với `target=preview`.
3. Kiểm tra trang gốc, `/api/v1/health`, `/api/v1/health/ready`, auth session cookie, Origin/CSRF và domain API cơ bản.
4. Dùng account test riêng, xác nhận register và reset password đều nhận email đúng; không gửi email cá nhân của người khác.
5. Ghi commit, preview URL đã được phép chia sẻ, timestamp và status/checklist. Không ghi OTP, password, cookie hoặc email test đầy đủ vào docs.

## 3. SMTP failure trên Preview cô lập

Chỉ thử trong Preview có DB và email test riêng. Không làm gián đoạn SMTP Production.

1. Lưu cấu hình Preview hiện tại ở Vercel secret manager.
2. Tạm thời trỏ Preview tới SMTP test endpoint có thể chủ động timeout/reject; endpoint phải không chuyển thư thật. Redeploy Preview.
3. Gửi một request đăng ký/reset với account test. Xác nhận response là lỗi `EMAIL_UNAVAILABLE`, không trả OTP, raw exception, host nội bộ hoặc credential.
4. Xem runtime logs đã redact; xác nhận không có password, OTP, reset token, session cookie hoặc SMTP credential.
5. Xác nhận retry/timeout hữu hạn bằng server test có thể đếm connection hoặc provider test logs. Local regression hiện chỉ chứng minh Nodemailer timeout và tối đa hai lần thử với server local treo.
6. Khôi phục secret SMTP Preview, redeploy và gửi/nhận một email test thành công. Ghi thời gian, environment Preview, status/error code và evidence đã che dữ liệu.

Không lấy việc register/reset thành công trước đây làm bằng chứng outage/retry đã được xác minh.

## 4. Production release

Chỉ chạy `target=production` từ `hiep` sau CI, Preview smoke, SMTP outage/restore, DB clone/restore review, runtime env review và GitHub Environment approval. Sau deploy, ghi deployment ID/commit và kiểm tra readiness/rollback path. Handoff này không tự cấp approval production.
