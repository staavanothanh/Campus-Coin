# Kế hoạch giao hàng — Campus Coin

> Cập nhật: 2026-09-24 · Owner: Team Leader — Hiệp
> Nguồn quyết định auth: [ADR-0008](./adr/0008-email-password-otp-auth.md) và phần Google bổ sung tại [ADR-0009](./adr/0009-optional-google-sign-in.md)

Tài liệu này ghi trạng thái/gate. Team Leader đã chốt giữ email/password/OTP và thêm Google Sign-In tùy chọn; production readiness là trạng thái riêng, chỉ ghi đạt khi có evidence.

## 1. Luồng sản phẩm đã chốt

```text
register → verify OTP → login → session
forgot password → reset password
Google Sign-In (tùy chọn) → xác minh OIDC → session
đang đăng nhập → chủ động kết nối Google
```

Google không cấu hình thì email flow vẫn hoạt động và provider discovery báo Google tắt. Không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API; không tự động merge theo email. SMTP provider cụ thể cần được chọn/kiểm chứng; không ghi OTP vào log/dev fallback.

## 2. Trạng thái hiện tại

| Hạng mục | Trạng thái | Bằng chứng / gate còn lại |
|---|---|---|
| Quyết định auth và canonical docs | Đã chốt; ADR-0008 giữ email auth, ADR-0009 thêm Google tùy chọn | ADR-0001/0007 được giữ làm lịch sử; live Google callback còn cần client config |
| Auth implementation | Email/OTP flow, Google OIDC start/callback, explicit link, provider discovery, opaque session, CSRF/Origin và login rate-limit đã có code | Chạy unit và auth MySQL integration trên disposable DB; Google secrets/provider live và production evidence còn chờ |
| Google Sign-In | SDK server-side, PKCE S256, state, nonce, verified email, Google `sub`; không lưu Google token hoặc gọi Gmail API | Owner cấu hình OAuth client/callback và chạy thử login/link trên environment an toàn |
| Migration `0004_email_auth.sql` | Chưa có evidence áp dụng trên DB đích hiện được xác nhận | Phải xác minh DB Campus Coin, backup/restore, preflight/status và chỉ `0004` pending trước khi chạy |
| Migration `0005_auth_rate_limits.sql` | Có migration và schema readiness check | Chưa có evidence áp dụng trên DB đích; CI disposable MySQL phải xác minh |
| Aiven query access | Có thông tin endpoint và database `defaultdb`; chưa xác nhận thuộc Campus Coin | Chỉ dùng DBeaver với credential user tự nhập để chạy read-only queries; không migration/seed/DDL/DML |
| SMTP/email | Adapter SMTP có trong source | Chưa có evidence email OTP thật; phải chọn provider, cấu hình timeout/retry và xác nhận nhận thư trên DB cô lập |
| API domain | Auth, preferences, wallet, ledger, savings, category, budget, report, issue và admin routes đã nối application services; owner lấy từ session | JEV endpoint chưa mở; CI phải xác nhận response/status và service assumptions với Developer B |
| UI auth | Có register/verify/resend/login/forgot/reset; nút Google theo provider discovery và explicit account link; message en/vi | Cần kiểm tra bằng keyboard/screen reader và hai locale; chưa có browser E2E evidence |
| CI | Workflow MySQL disposable service và gate lint/typecheck/build/auth/readiness/database đã thêm; unit test OAuth được thêm | Workflow chưa được thực thi từ CI trong phiên này; local DB gates chưa chạy |
| Production/restore | Chưa có evidence | Cần backup/restore rehearsal, CA chain/role grants, TLS/connectivity, redacted logs và rollback |

Không suy ra trạng thái DB, SMTP, cloud hoặc production từ sự tồn tại của config/file/migration hay từ health `SELECT 1`.

## 3. Gate auth/security

- Login account+IP rate-limit, OTP attempt/backoff và quota đã có trong MySQL; CI integration phải xác nhận hành vi block và thời hạn.
- OTP expiry, max attempts, resend cooldown và single-use đã có code; CI auth MySQL integration bao phủ; SMTP thật chưa kiểm chứng.
- Cookie `HttpOnly`, `Secure` production, `SameSite`, expiry, revoke, logout và reset-password revoke session cũ đã có code; CI auth integration bao phủ.
- CSRF/Origin, IDOR, owner isolation, lỗi provider/DB, 401/403/404/409/422/429/5xx và response envelope.
- Email: adapter SMTP provider thật, timeout, retry giới hạn, cùng một mã trong retry, lỗi rõ; không fallback OTP vào log/dev.
- UI: register/verify/resend/login/forgot/reset, loading/error/success/expired/locked, VI/EN, keyboard/focus/ARIA, chống double-submit.

## 4. DB handoff và migration

Trước khi chạy migration cần xác nhận chủ sở hữu/mục đích database, môi trường không phải production ngoài scope, backup/restore khả dụng và migration status. `db:datatest` và MySQL integration tạo/xóa database tạm, chỉ chạy trên DB/service cô lập có quyền create/drop.

Thông tin kết nối Aiven hiện được đưa ra chọn `defaultdb`; tên này chưa chứng minh DB là `campus_coin`. Không trỏ `db:migrate`, `db:datatest`, CI harness hoặc seed vào database này. Chỉ chạy query đọc như `SELECT 1`, `SELECT DATABASE()`, `SELECT VERSION()`, `SHOW TABLES` đến khi Team Leader/DB owner xác nhận đúng target. Runtime không dùng `avnadmin`; cần role least-privilege.

## 5. API/domain integration

Route chỉ validate/authenticate/authorize/serialize; business đi qua application services/repositories. `user_id` chỉ lấy từ server session. Các path wallet, ledger, savings, categories, budgets, reports, issues và admin đã được nối theo `docs/contracts/openapi.yaml`. CI phải xác nhận response/status và owner isolation; JEV chưa có runtime route.

## 6. CI/verification gate

CI tối thiểu chạy:

```bash
npm run typecheck
npm run build
npm run api:validate
npm run api:bundle
npm run api:types
git diff --exit-code -- artifacts/openapi.json artifacts/api.d.ts
node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts
npm run db:datatest
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts
```

Hai lệnh DB chỉ dùng disposable MySQL do CI tạo riêng, không Aiven `defaultdb` hoặc database dùng chung. Auth MySQL E2E bao phủ luồng, cookie/session, CSRF/IDOR, OTP expiry/attempts, rate-limit và provider/database failure bằng email adapter giả lập; adapter giả không chứng minh email provider thật. Chỉ báo pass cho job thật đã chạy.

## 7. Evidence đã chạy trong phiên 2026-09-24 và 2026-09-25

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm run api:validate`: exit 0, schema hợp lệ; 5 lint warnings yêu cầu 4xx cho `/auth/providers`, `/auth/google/start`, `/auth/google/callback`, `/health` và `/health/ready`. Ba OAuth endpoint là discovery/redirect/callback và xử lý lỗi theo contract tương ứng; hai health endpoint hiện chỉ trả 200/500 và 200/503. Không khai báo response 4xx giả chỉ để xóa warning.
- `npm run api:bundle` và `npm run api:types`: pass; artifacts đã được sinh lại từ `docs/contracts/openapi.yaml`.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts`: 21 tests pass; bao gồm Google config, PKCE S256, state, chữ ký cookie, callback cancel và TTL 10 phút. Nonce được gửi trong authorization request và dùng khi xác minh ID token; live token exchange chưa chạy.
- `node --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts`: 3 suite gated bị skip vì chưa bật MySQL cô lập; auth test có thêm case yêu cầu explicit link khi email đã tồn tại.
- `npm run db:datatest` chưa chạy trong phiên này để không đọc/sử dụng cấu hình DB local chưa xác nhận; CI workflow cấu hình MySQL service riêng nhưng chưa được chạy từ xa trong phiên này.
- Google OAuth live callback chưa chạy vì owner chưa cấu hình/kiểm chứng OAuth client secrets và callback URL trong environment.
- Aiven connection/query, migration apply, SMTP provider, backup/restore và remote CI result chưa được kiểm chứng.

## 8. Phối hợp Developer B

- Đồng bộ migration `0004` và DB handoff; không sửa migration đã chạy.
- Xác nhận target/schema, preflight/status, backup/restore và grants trên DB cô lập.
- Role runtime least privilege; không dùng `avnadmin` trong runtime.
- Phân phối CA từ Aiven theo cách bảo mật; CA local không commit, không đưa vào repo.
- Nối route domain với services, chạy test trên DB cô lập và cung cấp evidence cho Team Leader.

## 9. GO/NO-GO

GO chỉ khi auth/session/owner scope, miền tiền, API contract/domain, UI, MySQL TLS/role, email delivery, CI, backup/restore và rollback có evidence tương ứng. JEV giữ default-off cho đến khi typed provider probe/privacy/cost/quality gate đạt. Quyết định auth đã chốt không thay thế các gate triển khai này.

## 10. ADR liên quan

[ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0009](./adr/0009-optional-google-sign-in.md), [ADR-0002](./adr/0002-opaque-browser-session.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md), [ADR-0007](./adr/0007-five-day-thin-slice.md).
