# Kế hoạch giao hàng — Campus Coin

> Cập nhật: 2026-09-28 · Owner: Team Leader — Hiệp
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

Google không cấu hình thì email flow vẫn hoạt động và provider discovery báo Google tắt. Không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API; không tự động merge theo email. Team Leader xác nhận SMTP gửi và nhận thư bình thường trong các luồng đăng ký/đặt lại mật khẩu; môi trường cụ thể không được xác định trong bằng chứng này. Controlled provider outage/recovery và log đã redact là bằng chứng sự cố riêng, chỉ cần chạy trên Preview cô lập nếu BTC yêu cầu; không thay thế hay phủ nhận luồng gửi/nhận bình thường đã được xác nhận. Không ghi OTP vào log/dev fallback.

## 2. Trạng thái hiện tại

**Ảnh chụp chỉ đọc ngày 2026-09-27 (lịch sử):** `campus_coin_clone` kết nối TLS và tồn tại, nhưng khi đó preflight/status chỉ báo checksum `0006`–`0010` khác nội dung migration của nhánh này. Kết quả mới nhất được ghi bên dưới: lần kiểm tra ngày 2026-09-28 cho thấy mismatch `0006`–`0013`. Không chạy migration/deploy lên clone trong lúc lineage chưa được DevB đối chiếu. `db:datatest` và integration suite chạy qua schema tạm riêng, không ghi vào clone.

Trước khi tạo commit ổn định ngày 2026-09-28, đã fetch `origin/hiep` và xác nhận remote cùng ở `7a89133` với `HEAD`; các refs `origin/main=e6d031c`, `origin/thien-merge=9234544` và `origin/database-ingest-0.4=a58c33e` là snapshot đã kiểm tra ngày 2026-09-27. Nhánh sản phẩm vẫn là `hiep`; không merge nguyên nhánh khi migration/architecture khác nhau. Handoff lỗi CI cũ được giữ làm lịch sử.

| Hạng mục | Trạng thái | Bằng chứng / gate còn lại |
|---|---|---|
| Quyết định auth và canonical docs | Đã chốt; ADR-0008 giữ email auth, ADR-0009 thêm Google tùy chọn | Team Leader cung cấp ảnh cho thấy Google đã được liên kết và đăng nhập thành công; môi trường ảnh chưa được xác nhận là staging |
| Auth implementation | Email/OTP, Google OIDC, explicit link, opaque session, CSRF/Origin và rate-limit đã có code | Team Leader báo `auth.mysql.integration.test.ts` 8/8 và `test:auth-security` 1/1 pass trên MySQL service có clone, dùng schema test tạm; SMTP gửi/nhận bình thường được xác nhận; môi trường chạy chưa ghi rõ. SMTP outage/recovery (nếu BTC cần evidence sự cố) và CSRF/Origin staging còn chờ |
| Google Sign-In | Server-side OIDC với PKCE S256, state, nonce, verified email và Google `sub`; không lưu Google token hoặc gọi Gmail API | Ảnh Team Leader cho thấy link và login thành công. Google Test users không phải allowlist app khi chỉ xin `openid email profile`; Campus Coin hiện chưa có allowlist email riêng. Staging chưa được xác nhận độc lập |
| Migration `0004_email_auth.sql` | Trên clone `campus_coin_clone`, `npm run db:status` ngày 2026-09-26 báo `applied` | Preflight xác nhận `applied=5 pending=0`, MySQL `8.4.8` và TLS pass |
| Migration `0005_auth_rate_limits.sql` | Trên clone `campus_coin_clone`, `npm run db:status` ngày 2026-09-26 báo `applied` | Preflight xác nhận `applied=5 pending=0`, MySQL `8.4.8` và TLS pass |
| Migration `0006`–`0013` | Code/migration của `hiep` đã có trên nhánh; test chạy trên schema tạm sạch | Lần chỉ đọc ngày 2026-09-28 cho thấy `campus_coin_clone` báo `MISMATCH` cả `0006`–`0013`, gồm các migration item/cashflow mới. DevB cần đối chiếu checksums đã lưu, source migration và schema thật rồi lập phương án baseline/forward migration sau backup/restore; không sửa migration cũ hoặc chạy `db:migrate` lên clone trong lúc này |
| Aiven query access | Kết nối TLS, MySQL `8.4.8`, schema `campus_coin_clone` tồn tại | Kiểm tra chỉ đọc ngày 2026-09-28: checksum mismatch `0006`–`0013` và applied versions `0014`–`0031` không có source trong `hiep`; liveness `200`, readiness `503`. Cảnh báo charset `utf8mb4_0900_ai_ci`, pool 5 so với max 76. Không chạy migration/test ghi trên clone cho tới khi DevB đối chiếu lineage và backup/restore |
| Dùng `db:datatest` ngoài CI | Lần chạy ngày 2026-09-27 dùng schema tạm do harness tạo/xóa | `23/23 pass`, gồm assertion regression và các CHECK safe-integer; không chạy vào `campus_coin_clone` |
| SMTP/email | SMTP adapter có timeout 10 giây, tối đa hai lần gửi và lỗi fail-closed; local adapter regression kiểm tra timeout/retry bounded bằng SMTP server treo; không có fallback OTP vào log/dev | Team Leader đã xác nhận gửi/nhận SMTP bình thường. Chỉ khi BTC yêu cầu bằng chứng provider outage/recovery, DevD chạy kịch bản đó trong Preview cô lập và xác nhận `EMAIL_UNAVAILABLE`, log không lộ dữ liệu; không cần lặp lại luồng gửi bình thường nếu đã có evidence phù hợp |
| API domain | Auth/profile, wallet, ledger, savings, category, budget, report, issue/admin, cashflow plan/forecast/what-if/reflection, OCR draft và JEV category suggestion đều có route/service | Readiness thật hiện chặn data routes: preflight báo mismatch `0006`–`0013`; DevB cần đối chiếu lineage/schema trước. OCR/JEV chưa có live provider probe; lint còn 5 warning discovery/redirect/health |
| UI | Có profile/preferences, đổi mật khẩu OTP, màn bắt buộc hoàn thiện hồ sơ Google, dashboard, income/payment, savings, report, kế hoạch dòng tiền 30/90/180/365 ngày, gợi ý mặt hàng, so sánh lịch sử và draft OCR hóa đơn. VI/EN được lưu ở user và đồng bộ ở header/Settings | Item/cashflow gợi ý cần dữ liệu owner; migration chưa được áp lên clone; OCR/JEV provider default-off; browser matrix domain và screen reader evidence còn thiếu |
| Ý tưởng đã đồng ý và cách mở | Gợi ý/so sánh sản phẩm ở form payment; khoản cố định/what-if/reflection tại **Báo cáo → Kế hoạch dòng tiền**; so sánh category tại **Báo cáo** | `docs/working/student-finance-feature-proposal-2026-09-27.md` có trạng thái từng ý tưởng và giới hạn. Nếu clone chưa có migration hoặc account chưa có lịch sử, màn sẽ chỉ hiện trạng thái rỗng/hướng dẫn; không dùng số giả |
| CI | Workflow chạy typecheck/build/web/API/auth/DB trên MySQL disposable service; unit tests domain/adapter bao phủ cashflow, OCR, JEV, benchmark guard, profile và ledger validation | Commit `53034b4` run #43 phát hiện datatest chọn nhầm migration sau `0010`; commit sửa `0334b8c` giới hạn đúng chuỗi `0006`–`0010`. [CI run #45](https://github.com/staavanothanh/Campus-Coin/actions/runs/36375649522), [#51](https://github.com/staavanothanh/Campus-Coin/actions/runs/36388169695), [#53](https://github.com/staavanothanh/Campus-Coin/actions/runs/36389891077) và [#54](https://github.com/staavanothanh/Campus-Coin/actions/runs/36390717239) pass ở các commit tương ứng. Run #54 xác nhận workflow mới chạy cả `test/api-readiness-route.test.ts` và `test/vercel-readiness-gate.test.ts`. |
| Domain owner isolation qua HTTP | Test hai tài khoản bao phủ wallet, ledger, savings, category, budget, report và dashboard; request giả `userId` không đổi owner | Team Leader trước đó báo `32/32` domain, `13/13` contract smoke và `8/8` auth trên schema tạm; CI run #45 cũng pass domain MySQL integration, auth integration và HTTP contract smoke trên DB disposable. Không chạy test hoặc migration trên clone trong lượt này vì checksum mismatch `0006`–`0013` |
| Local verification không cần MySQL | Màn hình correction có reversal/adjustment/replacement, reason, CSRF/idempotency, không cho chain correction; amount correction hiển thị trung tính và summary đếm dòng để không tính sai delta; lỗi 5xx dashboard hiển thị copy VI/EN thay vì chuỗi kỹ thuật | Working tree `npm run test:web` đạt `95/95` trên 18 file; `npm test` đạt `87 pass, 3 MySQL-gated skip`; `npm run typecheck` và `npm run build` pass. Các thay đổi chưa push nên chưa có CI evidence. Lint OpenAPI còn 5 warning thiếu response 4xx ở discovery/redirect/health |
| Local/API schema gate | Local API mở cổng; liveness/provider discovery độc lập, readiness thật qua `/api/v1/health/ready`, mọi request cần DB trả `503` fail-closed khi schema chưa đạt. Vercel dùng cùng gate | Kiểm tra HTTP ngày 2026-09-28: liveness `200`, readiness `503`; `db:status` báo mismatch `0006`–`0013` và applied versions `0014`–`0031` không có source trong `hiep`. DevB phải đối chiếu tên/checksum/DDL; không sửa DDL thủ công để ép readiness. Vercel Preview chưa chạy |
| Local verification sau rà soát | Commit `2acceb2`: `npm run test:web` đạt `89/89` trên 17 file; `npm test` đạt `85 pass`, `3 MySQL-gated skip` (88 tổng; DB gate tắt); `npm run build` và `npm run verify:docs` exit `0` | CSS lỗi embedded/mobile đã push cùng regression test; [CI run #53](https://github.com/staavanothanh/Campus-Coin/actions/runs/36389891077) pass. `api:validate` còn 5 warning response 4xx ở discovery/redirect/health. Browser viewport mới chưa được đo đáng tin cậy |
| Browser viewport | Auth screen có bằng chứng đo trước ở 320×640, 375×812, 390×844, 768×1024, 1200×800 và 667×375 landscape; không có horizontal overflow tại lần đo đó | Lượt này chưa có phép đo viewport đáng tin cậy cho bản mới. Chưa đo trực tiếp dashboard/Reports/Settings do API data routes đang bị readiness chặn; cross-browser và screen-reader evidence vẫn còn thiếu |
| Hợp nhất nhánh | Giữ `hiep` làm nhánh sản phẩm; không merge nguyên nhánh có migration/architecture khác nhau | Các thay đổi ổn định được tích hợp từng phần vào `hiep`; CSS responsive đã push tại `2acceb2`, [CI run #53](https://github.com/staavanothanh/Campus-Coin/actions/runs/36389891077) pass. Refs khác là snapshot; chọn từng thay đổi theo [repository review](./working/repository-review-2026-09-27.md). Benchmark runner DB chưa chạy vì chưa có MySQL local disposable được xác nhận |
| Production/restore | Chưa có evidence | Cần backup/restore rehearsal, CA chain/role grants, TLS/connectivity, redacted logs và rollback |
| Vercel runtime/deploy | Đã thêm Node.js Function adapter, SPA/API routing, max duration 60s, MySQL pool lifecycle hook và workflow deploy thủ công Preview/Production | DevD cấu hình secrets/env và GitHub Environment; chạy Preview sau CI, xác minh app/API/readiness. Chưa có bằng chứng deploy trong task này |
| Benchmark có kiểm soát | `benchmark/runner.ts` tạo tên schema tạm, chỉ chấp nhận MySQL local và yêu cầu xác nhận tường minh; runner dọn đúng schema đã tạo trong `finally`. Các SQL thô ở `benchmark/001_setup.sql` và `003_cleanup.sql` vẫn không an toàn nếu chạy riêng. | Chưa chạy runner vì chưa có MySQL local disposable được xác nhận trong môi trường này. Chưa có số đo benchmark local hoặc cloud. Không chạy SQL thô trên DB dùng chung/cloud; sau khi có local disposable DB mới đo report/dashboard/list/payment, p50/p95, query plan và connection headroom. |

Không suy ra trạng thái DB, SMTP, cloud hoặc production từ sự tồn tại của config/file/migration hay từ health `SELECT 1`.

Team Leader chạy `npm run db:preflight` và `npm run db:status` trực tiếp trên schema `campus_coin_clone`; `db:datatest`, ba MySQL suites và `npm run test:auth-security` chạy trên cùng MySQL service nhưng tạo schema test tạm ngày 2026-09-26. Kết quả và cảnh báo môi trường được ghi tại [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md); đây là evidence do Team Leader cung cấp, không thay cho Preview/production evidence.

## 3. Gate auth/security

- Login account+IP rate-limit, OTP attempt/backoff và quota đã có trong MySQL; OTP resend cooldown không trừ quota gửi; auth MySQL integration pass ở CI run #6. `X-Forwarded-For` chỉ được tin khi socket peer khớp `TRUSTED_PROXY_IPS`; unit test bao phủ header giả mạo.
- OTP expiry, max attempts, resend cooldown và single-use được Team Leader xác nhận Auth MySQL 8/8 trên schema test tạm cùng MySQL service có clone; CI run #17 trên commit `8884687` cũng pass toàn workflow. Team Leader xác nhận SMTP gửi/nhận bình thường và cung cấp ảnh Google link/login thành công; không có bằng chứng SMTP outage hoặc CSRF/Origin staging trong lượt này.
- Cookie `HttpOnly`, `Secure` production, `SameSite`, expiry, revoke, logout và reset-password revoke session cũ đã có code; CI auth integration bao phủ.
- CSRF/Origin có test integration riêng và đã được thêm vào CI; contract hiện chốt chỉ dùng Origin, Referer không thay thế. Response API/redirect dùng `Cache-Control: no-store, private`. Logout của session sống từ chối CSRF sai; logout session đã hết hạn/thu hồi vẫn clear cookie idempotently. Kiểm tra CSRF/Origin staging, SMTP outage thật và các production gates vẫn cần evidence; API error envelope được kiểm tra trong integration/contract tests.
- Email: adapter SMTP provider thật, timeout, retry giới hạn, cùng một mã trong retry, lỗi rõ; không fallback OTP vào log/dev. Team Leader đã kiểm tra gửi/nhận bình thường; chỉ outage/recovery provider thật còn cần test nếu BTC yêu cầu evidence này.
- UI: register/verify/resend/login/forgot/reset, loading/error/success/expired/locked, VI/EN, keyboard/focus/ARIA, chống double-submit.

## 4. DB handoff và migration

Trước khi chạy migration cần xác nhận chủ sở hữu/mục đích database, môi trường không phải production ngoài scope, backup/restore khả dụng và migration status. `db:datatest` và MySQL integration tạo/xóa database tạm, chỉ chạy trên DB/service cô lập có quyền create/drop.

Team Leader đã xác nhận schema clone `campus_coin_clone` trên MySQL service Aiven. Kết nối TLS và schema tồn tại. Lần kiểm tra chỉ đọc ngày 2026-09-28 trên nhánh `hiep` báo checksum mismatch `0006`–`0013` và các version `0014`–`0031` không có source trong nhánh này; liveness local trả `200` nhưng `/api/v1/health/ready` trả `503 SERVICE_UNAVAILABLE`. Không chạy migration, seed hoặc test ghi lên clone cho tới khi DevB/DB owner đối chiếu lineage. URI ban đầu có suffix `/defaultdb`; suffix đó không biến `defaultdb` thành schema test. Các test tạo/xóa dữ liệu chỉ chạy qua harness trên schema tạm được DB owner cho phép. Runtime không dùng `avnadmin`; cần role least-privilege.

## 5. API/domain integration

Route chỉ validate/authenticate/authorize/serialize; business đi qua application services/repositories. `user_id` chỉ lấy từ server session. Các path wallet, ledger, savings, categories, budgets, reports, issues/admin, cashflow plans/forecast/what-if/reflection, OCR draft và JEV category suggestion đã có trong contract/source. CI phải xác nhận response/status và owner isolation. Provider OCR/JEV vẫn cần secret môi trường, live probe và privacy/cost gate trước khi bật.

## 6. CI/verification gate

CI tối thiểu chạy:

```bash
npm run typecheck
npm run build
npm run test:web
npm run api:validate
npm run api:bundle
npm run api:types
git diff --exit-code -- artifacts/openapi.json artifacts/api.d.ts
node --import tsx --test test/domain.format.test.ts test/domain.api.test.ts
node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts test/env.test.ts tests/api-cache-header.test.ts
node --import tsx --test tests/vercel-adapter.test.ts tests/mail.test.ts
node --import tsx --test test/api-readiness-route.test.ts test/vercel-readiness-gate.test.ts
node --import tsx --test tests/db-test-guard.test.ts tests/datatest-sql-file.test.ts tests/db-clone-script.test.ts
npm run db:datatest
npm run test:auth-security
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/mysql.integration.test.ts
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/e2e.contract.smoke.test.ts
CAMPUS_COIN_TEST_DB=1 node --import tsx --test test/auth.mysql.integration.test.ts
```

Các MySQL tests chỉ chạy trên disposable MySQL do CI tạo hoặc test service được DB owner xác nhận, không dùng Aiven `defaultdb` hay database dùng chung. `test:auth-security` kiểm tra Origin/CSRF và mutation hợp lệ. `db:verify-clone` hiện hard-code `campus_coin_done`; không dùng script đó với clone `campus_coin_clone`. Xem quy trình đúng tên clone trong `DB-STAGING-TESTING.md`. Auth MySQL E2E bao phủ flow, cookie/session, CSRF/IDOR, OTP expiry/attempts, rate-limit và provider/database failure bằng email adapter giả lập; adapter giả không chứng minh email provider thật. Chỉ báo pass cho job thật đã chạy.

## 7. Evidence đã chạy trong phiên 2026-09-24 đến 2026-09-26

Các bullet lịch sử phía dưới ghi kết quả tại thời điểm chạy; trạng thái hiện hành và kết quả mới nhất nằm ở bảng §2 và `CURRENT-STATUS.md`.

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
- Origin-only và `Cache-Control: no-store, private` được đồng bộ trong auth/API docs và OpenAPI. Test cục bộ cho các thay đổi này đã pass; CI chưa chạy cho working tree hiện tại.

### Bổ sung evidence miền tiền ngày 2026-09-26

- Thêm giới hạn `Number.MAX_SAFE_INTEGER` cho amount, balance, budget và tổng report; ledger nhập lùi ngày bị từ chối nếu làm opening/closing của một tháng HCMC không thể biểu diễn chính xác.
- `npm run db:datatest`: `23/23` pass trên các schema tạm của MySQL service thử nghiệm.
- `node --import tsx --test test/mysql.integration.test.ts`: `31/31` pass; gồm backdated report range, rollback, owner isolation và budget update đồng thời.
- `node --import tsx --test test/e2e.contract.smoke.test.ts`: `13/13` pass.
- `node --import tsx --test test/auth.mysql.integration.test.ts`: `8/8` pass.
- Migration `0006`–`0010` đã được kiểm tra khi harness tạo schema tạm, nhưng chưa apply lên clone dùng chung/staging. Kết quả trên chưa thay thế CI cho working tree hiện tại.

### Bổ sung ngày 2026-09-27

- Đối chiếu lại remote trước khi thay đổi: `origin/hiep=563eaae`, `origin/thien-merge=77ad3dd`, `origin/main=1a1822f`, `origin/thien=55df41e`; nhóm DB là chuỗi `origin/database-ingest=48f8cd4` → `.2=ce984ae` → `.3=9df1c97` → `.4=053a434`. Giữ `hiep`; không merge nguyên nhánh có auth/session hoặc migration chain xung đột. Không chạy benchmark trong lượt này; runner của nhánh DB ingest tạo schema tạm local nhưng migration chain không khớp và file SQL fixture không an toàn nếu chạy riêng.
- Đọc metadata/README/license của cả 23 repo trong danh sách; deep-review source/example/test của nhóm repo UI, chart, AI eval và reporting. Kết luận theo từng repo ở [repository review](./working/repository-review-2026-09-27.md). Không cài dependency hoặc sao chép code từ checkout tham khảo.
- Đã nối lát cắt UI cho wallet setup, dashboard, income/payment, savings, transaction history, monthly report và budget. Client gửi idempotency key; server vẫn quyết định số dư, kết quả và cảnh báo budget. Các test mới bao phủ HCMC month/date-time, định dạng VND và Idempotency-Key.
- Lượt xác minh cục bộ: `npm run typecheck`, `npm run build`, `npm run api:validate`, 53 test trong các bước CI không cần MySQL, OpenAPI artifact generation/check và `git diff --check` đều pass. `api:validate` hợp lệ nhưng còn 5 warning 4xx lịch sử ở discovery/redirect/health. Kết quả cụ thể nằm trong `CURRENT-STATUS.md`.
- Không chạy MySQL integration, migration, benchmark, SMTP/staging hoặc deploy trong lượt này. MySQL tests trong CI dùng MySQL disposable; các kết quả test DB do Team Leader cung cấp ngày 2026-09-26 vẫn là evidence trước lượt code mới.

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

GO chỉ khi auth/session/owner scope, miền tiền, API contract/domain, UI, MySQL TLS/role, email delivery, CI, backup/restore và rollback có evidence tương ứng. JEV giữ default-off cho đến khi typed provider probe/privacy/cost/quality gate đạt. Quyết định auth đã chốt không thay thế các gate triển khai này.

## 10. ADR liên quan

[ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0009](./adr/0009-optional-google-sign-in.md), [ADR-0002](./adr/0002-opaque-browser-session.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md), [ADR-0007](./adr/0007-five-day-thin-slice.md).
