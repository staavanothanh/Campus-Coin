# Kế hoạch giao hàng — Campus Coin

> Cập nhật: 2026-09-26 · Owner: Team Leader — Hiệp
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

Google không cấu hình thì email flow vẫn hoạt động và provider discovery báo Google tắt. Không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API; không tự động merge theo email. Team Leader xác nhận đăng ký/reset email staging đã hoạt động; lỗi provider, timeout và retry vẫn cần kiểm tra riêng. Không ghi OTP vào log/dev fallback.

## 2. Trạng thái hiện tại

| Hạng mục | Trạng thái | Bằng chứng / gate còn lại |
|---|---|---|
| Quyết định auth và canonical docs | Đã chốt; ADR-0008 giữ email auth, ADR-0009 thêm Google tùy chọn | Team Leader báo kết nối Google OAuth thành công; môi trường và việc login/link cả hai flow chưa được nêu |
| Auth implementation | Email/OTP flow, Google OIDC start/callback, explicit link, provider discovery, opaque session, CSRF/Origin và login rate-limit đã có code | Auth MySQL integration pass trên DB CI disposable; Team Leader xác nhận staging Phần 2 (register/reset email, OTP sai/hết hạn/resend, logout/session) hoàn tất; SMTP failure và kiểm tra CSRF/Origin staging còn chờ |
| Google Sign-In | SDK server-side, PKCE S256, state, nonce, verified email, Google `sub`; không lưu Google token hoặc gọi Gmail API | Team Leader báo connect thành công; chưa có evidence tách riêng Google login và connect account, hoặc CI run mới cho thay đổi này |
| Migration `0004_email_auth.sql` | `npm run db:status` ngày 2026-09-25 báo đã apply trên schema `campus_coin` đang cấu hình | Chưa có evidence cho `campus_coin_done`; credential/config hiện tại trả `Unknown database` khi kiểm tra target clone; DevB cần xác nhận service/schema/grants và migration history |
| Migration `0005_auth_rate_limits.sql` | `npm run db:status` ngày 2026-09-25 báo đã apply trên schema `campus_coin` đang cấu hình | Chưa có evidence cho `campus_coin_done`; credential/config hiện tại trả `Unknown database` khi kiểm tra target clone; DevB cần xác nhận service/schema/grants và migration history |
| Aiven query access | `.env` hiện kết nối được schema `campus_coin`; MySQL 8.4.8, TLS pass, 5 migration đã apply | `campus_coin_done` chưa truy cập được bằng cấu hình ứng dụng (`Unknown database`); xác nhận target bằng `SELECT DATABASE()`, không chạy migration/test trước khi resolve |
| Dùng `db:datatest` ngoài CI | Team Leader chạy bộ test trên MySQL Aiven và nhận `3/15` do 12 file negative test bị phân loại sai | Parser xử lý CRLF đã sửa; regression test pass trong nhóm 20 unit tests, typecheck/build pass. Chưa chạy lại database suite trên target clone |
| SMTP/email | SMTP adapter có timeout 10 giây, tối đa hai lần gửi và lỗi fail-closed; local adapter regression kiểm tra timeout/retry bounded bằng SMTP server treo; không có fallback OTP vào log/dev | DevD chạy controlled outage trong Preview cô lập, xác nhận `EMAIL_UNAVAILABLE`, log không lộ dữ liệu, rồi khôi phục và thử gửi/nhận register/reset |
| API domain | Auth, preferences, wallet, ledger, savings, category, budget, report, issue và admin routes đã nối application services; client hỗ trợ GET/POST/PUT/PATCH/DELETE | OpenAPI đã khai báo `403` cho Origin ở auth mutation; lint còn 5 warning không chặn validate cho discovery/redirect/health; cần integration review với Developer B |
| UI | Auth UI có validation/accessibility cơ bản và hai ngôn ngữ; sau login hiện chỉ có chào user, kết nối Google và logout | Chưa có giao diện wallet onboarding, dashboard, income/payment/history, savings, category/budget, report và issue/admin; đây là phần chức năng/UI lớn cần hoàn thiện |
| CI | Workflow có MySQL disposable service; chạy typecheck, build, API validate/artifacts, auth/schema/Google/client-IP tests, DB-test guard, `db:datatest` và ba suite MySQL | [Workflow run #11 trên commit `5bc7185`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) pass toàn workflow, gồm kiểm thử CSRF/Origin/logout mới; [run #6 trên commit code `5ee8858`](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) pass `db:datatest` và cả ba suite MySQL riêng |
| Domain owner isolation qua HTTP | Test hai tài khoản bao phủ wallet, ledger, savings, category, budget, report và dashboard; request giả `userId` không đổi owner | Auth MySQL integration pass ở run #6; category ngoài owner trả `404 NOT_FOUND` và không thể tạo budget |
| Hợp nhất nhánh DB | Giữ `hiep` làm nhánh sản phẩm; chưa merge nguyên nhánh nào | `origin/thien` đưa `node_modules/` và `dist/` vào Git; `database-ingest-0.2` có 22 xung đột mô phỏng với `hiep` và dùng lại số migration `0004`/`0005`. DevB/DB owner cần xác nhận lịch sử apply/restore trước khi review port chọn lọc |
| Production/restore | Chưa có evidence | Cần backup/restore rehearsal, CA chain/role grants, TLS/connectivity, redacted logs và rollback |
| Vercel runtime/deploy | Đã thêm Node.js Function adapter, SPA/API routing, max duration 60s, MySQL pool lifecycle hook và workflow deploy thủ công Preview/Production | DevD cấu hình secrets/env và GitHub Environment; chạy Preview sau CI, xác minh app/API/readiness. Chưa có bằng chứng deploy trong task này |
| Cloud benchmark | Chỉ có số tham chiếu MySQL local trong `db/README.md`; chưa có phép đo cloud hoặc harness tái chạy. Pool hook hỗ trợ đóng idle connection khi function suspend nhưng không chứng minh capacity | Sau khi DB clone và runtime được xác nhận, đo report/dashboard/list/payment; ghi môi trường, tải, p50/p95, connection headroom và query plan; không dùng dữ liệu thật |

Không suy ra trạng thái DB, SMTP, cloud hoặc production từ sự tồn tại của config/file/migration hay từ health `SELECT 1`.

## 3. Gate auth/security

- Login account+IP rate-limit, OTP attempt/backoff và quota đã có trong MySQL; OTP resend cooldown không trừ quota gửi; auth MySQL integration pass ở CI run #6. `X-Forwarded-For` chỉ được tin khi socket peer khớp `TRUSTED_PROXY_IPS`; unit test bao phủ header giả mạo.
- OTP expiry, max attempts, resend cooldown và single-use có auth MySQL test đã pass trong CI. Team Leader xác nhận staging Phần 2 (register/reset email, OTP sai/hết hạn/resend, logout/session) hoàn tất; đây là báo cáo của Team Leader, không phải live run của task này. Team Leader báo kết nối Google OAuth thành công; môi trường và việc thử riêng login/connect account chưa nêu. SMTP/provider failure timeout/retry vẫn cần kiểm tra.
- Cookie `HttpOnly`, `Secure` production, `SameSite`, expiry, revoke, logout và reset-password revoke session cũ đã có code; CI auth integration bao phủ.
- CSRF/Origin có test integration riêng và đã được thêm vào CI; contract hiện chốt chỉ dùng Origin, Referer không thay thế. Response API/redirect dùng `Cache-Control: no-store, private`. Logout của session sống từ chối CSRF sai; logout session đã hết hạn/thu hồi vẫn clear cookie idempotently. Kiểm tra CSRF/Origin staging, SMTP outage thật và các production gates vẫn cần evidence; API error envelope được kiểm tra trong integration/contract tests.
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
node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts test/env.test.ts tests/api-cache-header.test.ts
node --import tsx --test tests/vercel-adapter.test.ts tests/mail.test.ts
node --import tsx --test tests/db-test-guard.test.ts tests/datatest-sql-file.test.ts tests/db-clone-script.test.ts
npm run db:datatest
npm run test:auth-security
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/mysql.integration.test.ts
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/e2e.contract.smoke.test.ts
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/auth.mysql.integration.test.ts
```

Các test MySQL chỉ dùng disposable MySQL do CI tạo riêng, không Aiven `defaultdb` hoặc database dùng chung. `test:auth-security` là test riêng để chạy nhanh hai tình huống CSRF/Origin và kiểm tra mutation hợp lệ sau đó. `db:verify-clone` là lệnh hỗ trợ local: chỉ preflight/status trên `campus_coin_done`, rồi tạo/xóa schema test tạm trên cùng server. Auth MySQL E2E bao phủ luồng, cookie/session, CSRF/IDOR, OTP expiry/attempts, rate-limit và provider/database failure bằng email adapter giả lập; adapter giả không chứng minh email provider thật. Chỉ báo pass cho job thật đã chạy.

## 7. Evidence đã chạy trong phiên 2026-09-24 đến 2026-09-26

Các bullet lịch sử dưới đây ghi trạng thái tại thời điểm chạy; evidence hiện hành nằm ở [CURRENT-STATUS.md](./CURRENT-STATUS.md). CI run #6 xác nhận ba MySQL suites pass trên DB disposable; run #7, #8, #9 và #10 xác nhận toàn workflow tại các commit `3bf6c0c`, `4bbdb61`, `ed62986` và `dd90c11`.

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm run api:validate`: exit 0, schema hợp lệ; 5 lint warnings yêu cầu 4xx cho `/auth/providers`, `/auth/google/start`, `/auth/google/callback`, `/health` và `/health/ready`. Đây là các endpoint discovery/redirect/callback/health không dùng 4xx cho behavior hiện tại; không khai báo response 4xx giả chỉ để xóa warning.
- `npm run api:bundle` và `npm run api:types`: pass; artifacts đã được sinh lại từ `docs/contracts/openapi.yaml`.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts`: 21 tests pass; bao gồm Google config, PKCE S256, state, chữ ký cookie, callback cancel và TTL 10 phút. Nonce được gửi trong authorization request và dùng khi xác minh ID token; live token exchange chưa chạy.
- `node --import tsx --test test/mysql.integration.test.ts test/e2e.contract.smoke.test.ts test/auth.mysql.integration.test.ts`: 3 suite gated bị skip vì chưa bật MySQL cô lập; auth test có thêm case yêu cầu explicit link khi email đã tồn tại.
- `npm run db:datatest` và gated MySQL integration chưa chạy trong evidence trước đó; cần disposable MySQL riêng, không suy ra kết quả từ migration status.
- Historical snapshot trước báo cáo kết nối mới: Google OAuth live callback chưa chạy vì chưa có evidence cấu hình/kiểm chứng OAuth client và callback URL. Trạng thái này được bổ sung bằng báo cáo kết nối thành công của Team Leader bên dưới; môi trường và flow được thử chưa nêu.
- Aiven target riêng chưa được xác nhận. Team Leader báo register/reset email staging thành công; kiểm thử SMTP/provider failure timeout/retry, backup/restore và CI cho commit mới vẫn cần evidence.

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
- Trạng thái tại ghi chú trước: Team Leader đã xác nhận đăng ký qua email. Cập nhật sau đó cùng ngày: Team Leader xác nhận Phần 2 staging hoàn tất gồm register/reset email, OTP sai/hết hạn/resend và logout/session. Đây là kết quả được Team Leader báo, chưa được chạy lại độc lập trong task này; SMTP/provider failure timeout/retry còn pending.
- Không chạy `npm run db:datatest` hoặc MySQL integration trên Aiven `defaultdb`: hai bộ này tạo/xóa database tạm, còn target này chưa được xác nhận là DB test cô lập.
- Ghi chú tại thời điểm trước khi run #9 hoàn tất: chưa có kết quả workflow GitHub mới hơn lần chạy được liên kết ở bảng trên; run #9 sau đó đã pass toàn workflow như ghi ở bảng trạng thái hiện hành.

### Thay đổi code ngày 2026-09-26

- Thêm `api/v1/[...path].ts`, `vercel.json` và workflow deploy thủ công. Production chỉ deploy từ `hiep`; Vercel secrets, project settings và deployment chưa được kiểm tra trong lượt này.
- Vercel adapter tắt platform body parser để API tiếp tục giới hạn/parse body theo cùng quy tắc Node; Vercel Function gọi lại `handleRequest` hiện có.
- `@vercel/functions` gắn MySQL pool trong Vercel runtime để đóng idle connections khi function sắp suspend; không thay thế benchmark capacity theo số instance.
- Khi `verify-ca` chạy trên serverless, DB adapter nhận CA PEM từ `CAMPUS_COIN_DB_CA_BASE64`; không cần commit `ca.pem`.
- `getSession()` cập nhật `last_seen_at` khi giá trị chưa có hoặc cũ ít nhất một phút.
- Bổ sung owner regression cho foreign correction, foreign category PATCH và `relatedTransactionId` thuộc owner khác.
- Thêm local SMTP adapter timeout/retry test bằng SMTP server treo; đây không phải SMTP staging/provider test.
- Origin-only và `Cache-Control: no-store, private` được đồng bộ trong auth/API docs và OpenAPI. Các test mới cần CI chạy trước khi ghi nhận pass.

## 8. Phối hợp Developer B

Quy trình chi tiết và điều kiện không chạy destructive test trên DB dùng chung nằm trong [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md).

- Đồng bộ migration `0004` và DB handoff; không sửa migration đã chạy.
- Xác nhận target/schema, preflight/status, backup/restore và grants trên DB cô lập.
- Role runtime least privilege; không dùng `avnadmin` trong runtime.
- Phân phối CA Aiven qua secret environment; runtime hỗ trợ `CAMPUS_COIN_DB_CA_BASE64` cho function serverless. Không commit CA file hoặc certificate vào source.
- Nối route domain với services, chạy test trên DB cô lập và cung cấp evidence cho Team Leader.

### Kết quả bổ sung ngày 2026-09-25

- Team Leader báo `db:status`/`db:preflight` trên schema cấu hình `campus_coin`: migration `0001`–`0005` applied, TLS pass, MySQL `8.4.8`, `applied=5 pending=0`; preflight có WARN về pool `5/76` và dòng charset `utf8mb4/utf8mb4_0900_ai_ci`.
- Read-only preflight khi override tên schema thành `campus_coin_done` trả `Unknown database`. Chưa áp migration lên clone.
- Lần `db:datatest` của Team Leader đạt `3/15`; nguyên nhân là parser không bỏ `\r` trong header CRLF của file expect-error. Parser đã được sửa, có regression test CRLF pass; chạy lại full `db:datatest` còn chờ target MySQL clone được xác nhận.
- Team Leader báo kết nối Google OAuth đã thành công sau ảnh trước đó cho thấy provider chưa cấu hình. Môi trường chưa nêu; không suy rộng thành cả login và connect-account đã được thử nếu chưa có kết quả riêng.
- Test `auth-security: reject invalid Origin and missing CSRF` đã được tách riêng, có lệnh `npm run test:auth-security` và CI step riêng. Test xác nhận hai request trái phép trả đúng mã `403`, rồi request hợp lệ mới tạo ví. Workflow run #11 pass trên MySQL CI cô lập; local clone preflight vẫn trả `Unknown database`, nên chưa chạy bộ này trên Aiven clone.
- `npm run db:verify-clone` đã được thêm: preflight/status chỉ đọc `campus_coin_done`, sau đó mới tạo/xóa schema tạm để chạy datatest và ba integration suite. Lần thử hiện tại dừng tại preflight; không chạy thao tác ghi/xóa.
- Sau thay đổi, `npm run typecheck`, `npm run build`, 36 unit tests liên quan, kiểm tra cú pháp script và `git diff --check` đều pass. Commit `5bc7185` đã push; workflow run #11 pass toàn workflow. DB clone Aiven và kiểm tra CSRF/Origin staging vẫn pending.

## 9. GO/NO-GO

| ID | Blocker | Owner | Điều kiện đóng |
|---|---|---|---|
| `BLK-OWNER-01` | Migrations `0011`/`0013`/`0014` thêm composite FK và `0018`/`0020`/`0023` chặn cross-owner/type SQL trực tiếp | B | `db:datatest` 30/30 pass trên MySQL 8.0.41 portable local (sau repair `0011`); chờ CI re-run rồi Team Leader chốt |
| `BLK-IDEMP-01` | Helper dùng DB được truyền vào; category/budget claim/replay/conflict cùng body hash và audit atomically | B | Unit/typecheck pass; concurrency/replay/integration đã xanh local (MySQL 8.0.41), chờ CI re-run |
| `BLK-API-01` | Fetch-compatible handlers cho core/issue routes, validation, origin/CSRF port và envelope đã có | A + B | Chờ host mount, auth/session adapter và distributed rate-limit thật; route unit test không thay thế OAuth/session integration |
| `BLK-ISSUE-01` | Issue service/repository owner scope, related transaction ownership, atomic event/audit và admin role checks đã có | B | Gated MySQL (issue owner/update/events) đã xanh local; admin role phải đến từ trusted session adapter (chưa có integration OAuth/session thật) |
| `BLK-MIG-01` | `cmdUp` khóa trước khi load/re-plan; có MySQL concurrency integration test | B | Unit + concurrency integration đã xanh local (MySQL 8.0.41), chờ CI re-run |
| `BLK-MIG-02` | MySQL 8.0.41 fresh migration fail ở `0011` (self-FK không nhận index cùng `ALTER`); đã repair bằng cách tách thứ tự DDL, giữ nguyên objects/semantics | B + Team Leader | Repair đi cùng PR #1 đã merge theo quyết định Team Leader; nhánh `database-ingest-0.2` mang phần còn lại (xem phát hiện Aiven 2026-09-25 bên dưới) |
| `BLK-HARNESS-01` | Harness dùng shared `sslOption`, migration principal riêng làm trigger `DEFINER`, runtime principal table/column grants | B | Đã sửa hai gap lộ ra sau `0011`: definer thiếu UPDATE cột trigger gán + SELECT base table (`savings_transfers`, `issues`), runtime thiếu UPDATE tối thiểu cho locking read (`wallet`/`savings`.`updated_at`, `ledger`.`description`); trigger `DEFINER` = migration principal đã verify local; Aiven CA provenance/mode/role còn pending |
| `BLK-MATH-01` | Checked arithmetic và exact DB integer parsing được thêm cho money/report/projection paths | B | Focused unit + toàn bộ gated MySQL suite đã xanh local (gồm BIGINT SUM và reconcile); chờ CI re-run |
| `BLK-CURSOR-01` | Cursor HMAC-SHA256 versioned, key bắt buộc khi dùng, limit/length bound | A + B | Focused tamper/boundary tests pass; key rotation/production secret provisioning còn là deploy gate |
| `BLK-GRANT-01` | ADR-0008 chốt row-level authorization ở service; DB enforce integrity, append-only và column grants | B + Team Leader | Kiến trúc đã chốt; negative tests (service/API cross-owner category/issue/budget, forged audit 405, DEFINER, projection denial, direct cross-owner SQL) đã xanh local; direct SQL bằng runtime credential là residual risk đã ghi trong ADR-0008; production grants/TLS/restore chờ evidence operator |
| `BLK-AUDIT-01` | Category update và audit insert phải commit/rollback cùng transaction | B | `updateUserCategory` đã bọc transaction; unit rollback + integration (audit insert bị từ chối → category giữ nguyên) đã xanh local; chờ CI re-run |
| `BLK-CI-01` | Workflow chia unit, bốn MySQL suite và OpenAPI validation riêng; MySQL service disposable | B + D | Run `36100878978` (sau repair): success, đủ 15 steps xanh gồm cả bốn suite MySQL + validation trên MySQL 8.0.41 disposable; run `36087720681` (code trước repair) đã lỗi thời |
| `BLK-RECON-01` | `db:reconcile` đối chiếu wallet/savings projection từ immutable rows; `/health/ready` ping DB | B | Đã sửa bug alias camelCase khiến reconcile luôn throw trên MySQL thật; reconcile pass trong suite integration local; restore rehearsal và reconciliation trên restored cloud target vẫn chờ operator (runbook `docs/DB-RESTORE-RUNBOOK.md`) |
| `BLK-OPSLOG-01` | Migrations `0028`–`0030` tạo `db_operation_logs` append-only; CLI writer dùng `cc_ops` INSERT-only; CI records stay in GitHub | B | DDL + CLI INSERT + UPDATE/DELETE guards đã pass trong full migration chain local (`0001`–`0030` fresh + suite runtime-grants); chưa áp dụng lên Aiven (operator-gated) |

### Phát hiện Aiven 2026-09-25 (probe read-only, nhánh `database-ingest-0.2`)
- Service từng auto-sleep (free tier) gây NXDOMAIN; đã wake tay và kết nối lại bình thường.
- DB `campus_coin` là **shared**: có tables chain khác (`app_log`, `auth_credentials`, `auth_rate_limits`, `email_otps`) và `schema_migrations` ghi `0004_email_auth.sql` + `0005_auth_rate_limits.sql` (applied 2026-09-24) — **trùng version với `0004`/`0005` của chain mình** nên engine fail-closed là đúng.
- Objects `0004`/`0005` của chain mình (unique/idempotency DDL) **không tồn tại** trên Aiven; `0001`/`0003` khớp intent hiện tại ở DDL đã kiểm tra.
- Test data chain mình: users `999001`/`999002`, ledger 60 rows, savings_transfers 20 rows (toàn `original`), categories giữ đúng 11 seeds; `wallet_accounts` 0 rows, triggers mới chỉ có 8 append-only của `0001` (DEFINER `avnadmin@%`), chưa có boundary/projection triggers.
- Chưa provision `cc_migrate`/`cc_runtime`; credential hiện tại là provider admin (chỉ DBA dùng).
- Team Leader chọn **hội tụ trên DB shared**; test data được dọn có kiểm soát, giữ seeds và tables chain khác.
- **Phase 1 done 2026-09-25** (đã duyệt từng lệnh): DROP 8 append-only triggers của `0001` → DELETE `savings_transfers` 20 + `ledger_transactions` 60 + `users` 2 (scope `999001`/`999002`, verify không owner lạ) → tạo lại triggers y hệt → verify seeds 11, counts 0, guards 8, chain khác nguyên vẹn (`0/0/2/1`).
- Hội tụ DDL, re-baseline, provision roles và apply xem các mục Converge/Migrate done bên dưới.
- **Converge done 2026-09-25** (đã duyệt): DBA apply tay đúng nội dung file `0004`/`0005` (tables trống, verify objects vắng mặt trước, verify tồn tại sau: unique + cột + FK). `db:status`/`db:preflight` trên Aiven hết FAIL: `0001`–`0003` applied sạch (xác minh file LF khớp checksum đã ghi; historical pins đã gỡ), `0004`/`0005` external, pending `0006`–`0030` (25 files). ADR-0009 đã được Team Leader chấp nhận chính thức.
- **Bài học line-ending 2026-09-25**: checkout với `core.autocrlf=true` đã flip working tree sang CRLF, làm vỡ checksum file (báo mismatch `0002` giả) trong khi blob và Aiven đều LF đúng. Đã pin `.gitattributes` (`eol=lf` cho sql/ts/mjs/json/yaml/md) và rewrite working tree khớp blob; historical pins `0001`/`0003` được gỡ vì file LF khớp checksum đã ghi từng byte (giữ pin sẽ che flip tương lai thay vì fail-closed).
- **Migrate + roles done 2026-09-25** (đã duyệt): provision `cc_migrate`/`cc_runtime` đúng `db/grants.example.sql` theo 2 phase (cột phụ thuộc migration sau cấp sau khi migrate; verify runtime không DELETE/DDL/TRIGGER/SUPER); `migrate up` bằng `cc_migrate` apply `0006`–`0030` (25 files) trên MySQL 8.4.8; `db:status` sạch (applied 28, pending 0); trigger DEFINER: 8 guards cũ `avnadmin@%`, 14 triggers mới `cc_migrate@%`; `db:reconcile` pass (0 users).
- **Clone cho team 2026-09-25** (đã duyệt): tạo `campus_coin_clone` cùng service + copy 19 tables (số rows mỗi bảng đã verify), 22 triggers (definer avnadmin do Aiven chặn SET_ANY_DEFINER), 28 FKs (tạo lại sau copy vì CREATE TABLE LIKE không mang FK). User `cc_tester` chỉ DML trên clone, verify login + bị từ chối DB gốc. Lưu ý team: service free tier auto-sleep (DBeaver NXDOMAIN khi ngủ), kiểm tra IP allowlist cho từng member.
- **Review fixes 2026-09-25** (nhánh `database-ingest-0.2`, đã verify local): (1) `db/grants.example.sql` bổ sung UPDATE cột trigger gán cho migration role (khớp harness; template cũ thiếu gây ER_COLUMNACCESS_DENIED khi provision đúng); (2) CI thêm 3 gates — `db:datatest:ci`, ops-log writer integration, CLI migrate fresh/idempotent (`scripts/ci-migrate-gate.mjs`); `datatest` nới guard password trống cho disposable loopback như harness và chuẩn hóa CRLF khi parse; (3) dispatcher chấp nhận prefix `/api/v1` tùy chọn đúng một lần (`src/api/handler.ts` + `test/api-handler.test.ts`), host rewrite qua mạng và distributed rate-limit vẫn chờ proof hạ tầng. Full gate local: 116 pass / 0 fail, datatest 30/30.
- Còn mở (vận hành/quyết định, không phải code): app chuyển `.env` sang `cc_runtime` + smoke/reconcile bằng đúng principal; restore rehearsal (có sẵn `campus_coin_clone` làm target tham khảo); mở PR từ nhánh `0.2`/`0.3` để 3 CI gates mới chạy thực tế; merge vào `main` khi Team Leader quyết (`main` hiện ở revert, CI trên đó đỏ là đúng vì thiếu fix).

### Dọn trước khi merge

- [x] Sửa `docs/working/aiven-handoff.md`: không claim CA/endpoint/admin user chưa xác minh; không dùng admin user cho runtime.
- [x] Benchmark tạo schema unique local-only và drop schema; không DELETE append-only history.
- [x] Có `test:mysql:required`; `npm test` mặc định vẫn có thể skip suite DB và không được dùng làm evidence MySQL.
- [x] PR #1 đã merge sau khi CI xanh (runs `36100878978`, `36101142911`) rồi revert theo yêu cầu Team Leader (chỉ push nhánh); `main` hiện thiếu fix nên CI trên đó đỏ là đúng.
- [ ] BLK-MIG-02 production leg còn lại: app chuyển `.env` sang `cc_runtime` + smoke/reconcile đúng principal; restore rehearsal; mở PR từ `0.2`/`0.3` để CI chạy 3 gates mới; merge vào `main` khi Team Leader quyết.

### Thứ tự merge đề xuất

1. Owner isolation + idempotency.
2. API routes/envelopes + issue/admin boundary.
3. TLS harness và migration/restore/reconcile.
4. Overflow + signed cursor.
5. Integration/e2e gate chạy với MySQL thật.
6. Nhánh `database-ingest-0.2`/`0.3` mang BLK-MIG-02 production leg; CI MySQL đã xanh trên run `36100878978`/`36101142911`, 3 gates mới chờ chạy trên PR tiếp theo.

Các blocker cũ về OAuth/IDOR, provider/region/restore, domain invariant, secret/PII, accessibility và rollback vẫn là launch gate. OpenRouter chưa được claim; JEV có thể giữ off.

## 13. ADR liên quan

[ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0007](./adr/0007-five-day-thin-slice.md), [ADR-0008](./adr/0008-runtime-row-authorization-boundary.md).
