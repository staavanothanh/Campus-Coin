# Kế hoạch giao hàng — Campus Coin

> Cập nhật: 2026-09-25 · Owner: Team Leader — Hiệp
> Nguồn quyết định auth: [ADR-0008](./adr/0008-email-password-otp-auth.md) và phần Google bổ sung tại [ADR-0009](./adr/0009-optional-google-sign-in.md)

Tài liệu này ghi trạng thái/gate. Team Leader đã chốt giữ email/password/OTP và thêm Google Sign-In tùy chọn; production readiness là trạng thái riêng, chỉ ghi đạt khi có evidence.

Hướng dẫn chi tiết cho MySQL test cô lập, auth/email staging và kiểm tra owner nằm trong [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md). Rubric và evidence lấy điểm nằm trong [QUALITY-AND-SCORING.md](./QUALITY-AND-SCORING.md); câu hỏi nguyên lý và cách áp dụng nằm trong [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md); quyết định và trạng thái hiện tại nằm trong [CURRENT-STATUS.md](./CURRENT-STATUS.md).

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
| Migration `0004_email_auth.sql` | `npm run db:status` ngày 2026-09-25 báo đã apply trên DB mà CLI hiện cấu hình | Chưa có evidence riêng cho DB disposable CI, staging hoặc mọi cloud target; DevB cần xác nhận đúng target và backup/restore |
| Migration `0005_auth_rate_limits.sql` | `npm run db:status` ngày 2026-09-25 báo đã apply trên DB mà CLI hiện cấu hình | Chưa có evidence riêng cho DB disposable CI, staging hoặc mọi cloud target; DevB cần xác nhận đúng target và backup/restore |
| Aiven query access | Có thông tin endpoint và database `defaultdb`; chưa xác nhận thuộc Campus Coin | Chỉ dùng DBeaver với credential user tự nhập để chạy read-only queries; không migration/seed/DDL/DML |
| SMTP/email | SMTP adapter có timeout 10 giây, tối đa hai lần gửi và lỗi fail-closed; không có fallback OTP vào log/dev | Team Leader xác nhận đã đăng ký thành công bằng email; luồng reset password và timeout/retry khi provider lỗi vẫn cần kiểm chứng riêng |
| API domain | Auth, preferences, wallet, ledger, savings, category, budget, report, issue và admin routes đã nối application services; client hỗ trợ GET/POST/PUT/PATCH/DELETE | OpenAPI đã khai báo `403` cho Origin ở auth mutation; lint còn 5 warning không chặn validate cho discovery/redirect/health; cần integration review với Developer B |
| UI auth | Có đủ màn auth; validation theo field khi blur/submit, OTP chỉ nhận sáu chữ số, mật khẩu mặc định ẩn và tự ẩn khi rời ô; lỗi có VI/EN và submit chống lặp | Đã kiểm tra browser thủ công; keyboard/screen reader E2E và flow OTP thật còn chờ |
| CI | Workflow có MySQL disposable service. Local typecheck/build/OpenAPI/auth/client-IP tests pass trong evidence bên dưới | [Workflow run #3 trên commit `36ed519`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36111118954) đã qua các bước đến `db:datatest`; command gộp MySQL integration/E2E trả exit 1. Annotation công khai không nêu test lỗi. Email owner test có dấu cách đã được sửa; chờ run kế tiếp xác nhận |
| Domain owner isolation qua HTTP | Đã thêm test hai tài khoản ở `test/auth.mysql.integration.test.ts` cho wallet, ledger, savings, category, budget, report và dashboard; kiểm tra body `userId` giả không đổi owner | Test được đưa vào command MySQL đang fail ở run #3; email test invalid đã sửa, cần run mới pass trước khi xác nhận behavior |
| Production/restore | Chưa có evidence | Cần backup/restore rehearsal, CA chain/role grants, TLS/connectivity, redacted logs và rollback |

Không suy ra trạng thái DB, SMTP, cloud hoặc production từ sự tồn tại của config/file/migration hay từ health `SELECT 1`.

## 3. Gate auth/security

- Login account+IP rate-limit, OTP attempt/backoff và quota đã có trong MySQL; OTP resend cooldown không trừ quota gửi; regression test register/reset đã thêm nhưng chưa chạy trên MySQL cô lập. `X-Forwarded-For` chỉ được tin khi socket peer khớp `TRUSTED_PROXY_IPS`; unit test bao phủ header giả mạo và pass trong lượt này.
- OTP expiry, max attempts, resend cooldown và single-use đã có code và auth MySQL test; CI command gần nhất thất bại nhưng chưa xác định test lỗi; SMTP thật chưa kiểm chứng.
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
- `npm run api:validate`: exit 0, schema hợp lệ; 5 lint warnings yêu cầu 4xx cho `/auth/providers`, `/auth/google/start`, `/auth/google/callback`, `/health` và `/health/ready`. Đây là các endpoint discovery/redirect/callback/health không dùng 4xx cho behavior hiện tại; không khai báo response 4xx giả chỉ để xóa warning.
- `npm run api:bundle` và `npm run api:types`: pass; artifacts đã được sinh lại từ `docs/contracts/openapi.yaml`.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts`: 21 tests pass; bao gồm Google config, PKCE S256, state, chữ ký cookie, callback cancel và TTL 10 phút. Nonce được gửi trong authorization request và dùng khi xác minh ID token; live token exchange chưa chạy.
- `node --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts`: 3 suite gated bị skip vì chưa bật MySQL cô lập; auth test có thêm case yêu cầu explicit link khi email đã tồn tại.
- `npm run db:datatest` và gated MySQL integration chưa chạy trong evidence trước đó; cần disposable MySQL riêng, không suy ra kết quả từ migration status.
- Google OAuth live callback chưa chạy vì owner chưa cấu hình/kiểm chứng OAuth client secrets và callback URL trong environment.
- Aiven target riêng chưa được xác nhận; SMTP provider, backup/restore và remote CI result chưa được kiểm chứng.

### Bổ sung ngày 2026-09-25

- `npm run db:status`: DB mà CLI hiện cấu hình báo `0001`–`0005` đều `applied`. Kết quả này chỉ xác nhận target hiện tại, không xác nhận DB CI, staging hoặc production.
- `node --import tsx --test tests/auth.test.ts`: 15 tests pass, gồm Origin local development; `node --import tsx --test tests/client-ip.test.ts`: 4 tests pass, gồm header `X-Forwarded-For` giả mạo.
- `npm run typecheck`, `npm run build` và `git diff --check`: pass. `npm run api:validate`: exit 0, còn 5 warnings đã liệt kê ở trên.
- Browser local: email sai hiện lỗi tại trường; password mặc định ẩn, nút `Hiện` bật tạm thời và password tự ẩn khi focus rời nhóm trường. Không gửi OTP trong lần kiểm tra này.
- Health/readiness trả `pass`; probe auth với body rỗng qua `http://127.0.0.1:5173` qua được Origin rồi dừng ở `422 VALIDATION_ERROR`, trước khi truy cập DB hoặc email sender.
- Tại thời điểm lượt kiểm tra trước, chưa chạy `db:datatest`, auth MySQL integration, SMTP send/receive, Google OAuth live hoặc backup/restore.

### Bổ sung kiểm tra và xác nhận của Team Leader ngày 2026-09-25

- `npm run typecheck`, `npm run build`, `npm run api:bundle` và `npm run api:types`: pass.
- `npm run api:validate`: exit 0; OpenAPI hợp lệ với 5 warning đã mô tả. Contract hiện khai báo `403 ORIGIN_INVALID` cho auth mutation bị thiếu.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts`: 27 tests pass.
- Team Leader xác nhận đã hoàn tất đăng ký qua email. Đây là evidence được báo cáo cho luồng register; reset email, timeout/retry SMTP thật và lỗi provider vẫn chưa được kiểm chứng riêng.
- Không chạy `npm run db:datatest` hoặc MySQL integration trên Aiven `defaultdb`: hai bộ này tạo/xóa database tạm, còn target này chưa được xác nhận là DB test cô lập.
- Chưa xác minh kết quả workflow GitHub mới hơn lần chạy được liên kết ở bảng trên.

## 8. Phối hợp Developer B

Quy trình chi tiết và điều kiện không chạy destructive test trên DB dùng chung nằm trong [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md).

- Đồng bộ migration `0004` và DB handoff; không sửa migration đã chạy.
- Xác nhận target/schema, preflight/status, backup/restore và grants trên DB cô lập.
- Role runtime least privilege; không dùng `avnadmin` trong runtime.
- Phân phối CA từ Aiven theo cách bảo mật; CA local không commit, không đưa vào repo.
- Nối route domain với services, chạy test trên DB cô lập và cung cấp evidence cho Team Leader.

## 9. GO/NO-GO

GO chỉ khi auth/session/owner scope, miền tiền, API contract/domain, UI, MySQL TLS/role, email delivery, CI, backup/restore và rollback có evidence tương ứng. JEV giữ default-off cho đến khi typed provider probe/privacy/cost/quality gate đạt. Quyết định auth đã chốt không thay thế các gate triển khai này.

## 10. ADR liên quan

[ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0009](./adr/0009-optional-google-sign-in.md), [ADR-0002](./adr/0002-opaque-browser-session.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md), [ADR-0007](./adr/0007-five-day-thin-slice.md).
