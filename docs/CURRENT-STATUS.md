# Trạng thái hiện tại — Campus Coin

> Cập nhật: 2026-09-28 · Nhánh tích hợp: `hiep`

Tài liệu này giúp thành viên mới nắm quyết định hiện hành, phần đã triển khai và cổng còn chờ. Chi tiết quyết định thuộc ADR; hướng dẫn kiểm tra ở [DB-STAGING-TESTING.md](./DB-STAGING-TESTING.md); trạng thái giao hàng ở [DELIVERY-PLAN.md](./DELIVERY-PLAN.md).

## Quyết định hiện hành

- Đăng ký và khôi phục tài khoản dùng email, mật khẩu và OTP. Google Sign-In là lựa chọn bổ sung. Xem [ADR-0008](./adr/0008-email-password-otp-auth.md) và [ADR-0009](./adr/0009-optional-google-sign-in.md).
- Google OIDC chạy phía server, xác minh state/PKCE/nonce/audience/email verified; không dùng Gmail credential, inbox hoặc Gmail API, không lưu Google token và không tự gộp tài khoản theo email.
- Browser dùng opaque server-side session trong cookie. Owner của mọi request lấy từ session.
- Database là MySQL qua TLS; transaction tài chính append-only; số tiền là integer VND. Không dùng tài khoản quản trị làm runtime role.
- JEV tùy chọn, backend-only, mặc định tắt; không có quyền quyết định hoặc ghi dữ liệu tiền.
- Code cần dễ đọc, thẳng luồng và đủ đơn giản để thành viên giải thích được. Chỉ thêm abstraction khi codebase có nhu cầu thực tế.
- Rubric chấm điểm và thứ tự ưu tiên nằm trong [QUALITY-AND-SCORING.md](./QUALITY-AND-SCORING.md).

## Đã push lên `hiep`

> Các commit và GitHub Actions liệt kê trong mục này là lịch sử trước đợt hoàn thiện hiện tại. Trạng thái mới nhất nằm ở mục “Sửa readiness, auth test và trạng thái giao diện” và [DELIVERY-PLAN.md](./DELIVERY-PLAN.md).

- `8884687` — thêm domain dashboard và test client/format; [GitHub Actions run #17](https://github.com/staavanothanh/Campus-Coin/actions/runs/36269420560) pass toàn workflow.
- `6cc27dc` — thêm Vercel Function adapter, cấu hình routing và deploy workflow; GitHub Actions run #14 pass toàn workflow.
- `4bbdb61` — cập nhật trạng thái nhánh, rubric, cách áp dụng nguyên lý web và checklist phối hợp.
- `3bf6c0c` — ghi nhận kết quả Auth MySQL integration và CI run #7.
- `5ee8858` — sửa hai lỗi CI về owner budget trả `404 NOT_FOUND` và kiểm tra Google redirect mà không gọi hostname giả.
- `e9a40d4` — áp dụng semantic HTML/native validation và cập nhật evidence cho auth form.
- `586a7ce` — chỉnh cooldown/quota OTP, chỉ tin IP proxy đã cấu hình, bổ sung test, cập nhật OpenAPI/artifacts và trạng thái tài liệu.
- `36ed519` — thêm guard cho MySQL destructive tests và test owner-scope qua HTTP với hai tài khoản.
- `be7aac6` — tách MySQL suites để CI cô lập lỗi.
- Chốt DB test không chạy trên `defaultdb`. CI tạo MySQL riêng cho job; test harness tạo schema tạm có tên rõ ràng rồi xóa schema đó sau khi chạy.
- Câu hỏi nguyên lý và cách áp dụng được ghi tại [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md); nội dung không khẳng định các gate staging hoặc sản phẩm còn thiếu đã pass.
- Team Leader xác nhận các luồng SMTP gửi và nhận email qua đăng ký/đặt lại mật khẩu đã hoạt động chuẩn. Bằng chứng này xác nhận gửi thư bình thường; không suy rộng thành thử nghiệm sự cố provider/outage.

## Evidence kiểm tra gần nhất

- Team Leader xác nhận DB clone `campus_coin_clone` truy cập qua TLS; MySQL `8.4.8`, migrations `0001`–`0005` đều `applied`, `pending=0`. Preflight có cảnh báo charset `utf8mb4_0900_ai_ci` và pool 5 so với `max_connections=76`; không có lỗi kết nối.
- Trên MySQL service có clone `campus_coin_clone`, `npm run db:datatest` đạt `15/15`; `test/mysql.integration.test.ts` đạt `22/22`; `test/e2e.contract.smoke.test.ts` đạt `13/13`; `test/auth.mysql.integration.test.ts` đạt `8/8`; `npm run test:auth-security` đạt `1/1`. Đây là output Team Leader cung cấp ngày 2026-09-26; các harness ghi vào schema test tạm, không ghi trực tiếp vào `campus_coin_clone`.
- [Workflow run #14](https://github.com/staavanothanh/Campus-Coin/actions/runs/36169562394) trên commit `6cc27dc` pass toàn workflow. GitHub hiển thị cảnh báo tương lai về Node.js 20 của actions và Ubuntu runner image; không làm run thất bại.
- Ảnh Team Leader cung cấp ngày 2026-09-26 cho thấy giao diện báo Google đã kết nối và đăng nhập Google thành công. Môi trường staging chưa được xác nhận độc lập; Google OAuth chỉ xin `openid email profile`, nên Test users của Google không phải allowlist truy cập của Campus Coin.
- `npm run typecheck`: pass.
- `npm run build`: pass.
- `node --import tsx --test tests/db-test-guard.test.ts`: 3/3 pass.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts`: 27/27 pass.
- `npm run api:validate`: pass; còn 5 lint warnings về response 4xx ở endpoint discovery, redirect/callback và health.
- Bộ unit test liên quan auth/schema/client-IP/DB guard/parser/clone script: 36/36 pass trong lần kiểm tra sau commit code.
- [Workflow run #11](https://github.com/staavanothanh/Campus-Coin/actions/runs/36158404035) trên commit `5bc7185` pass toàn workflow, gồm CSRF/Origin và logout regression tests trên MySQL CI cô lập.
- Run #11 hoàn tất trước thay đổi ngày 2026-09-26; đây là evidence lịch sử, không xác nhận Vercel adapter, SMTP timeout regression hoặc ba owner regression mới.
- [Workflow run #10](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117665453) trên commit `dd90c11` pass toàn workflow sau cập nhật evidence trong tài liệu nhóm.
- [Workflow run #9](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117022485) trên commit `ed62986` pass toàn workflow sau cập nhật quy ước cộng tác trong repository.
- [Workflow run #8](https://github.com/staavanothanh/Campus-Coin/actions/runs/36116299740) trên commit `4bbdb61` pass toàn workflow và xác nhận cập nhật tài liệu nhánh/rubric.
- [Workflow run #7](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113725073) trên commit `3bf6c0c` pass toàn workflow trước lần cập nhật hiện tại.
- [Workflow run #6](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) trên commit code `5ee8858` pass typecheck, build, API validation/artifacts, unit tests, `db:datatest`, MySQL domain integration, HTTP contract smoke và Auth MySQL integration trên MySQL cô lập. Run #7 xác nhận lại toàn workflow sau cập nhật docs.
- Trước đó CI tìm ra budget của category ngoài owner trả `422` thay vì `404` và Google integration test tự theo redirect đến hostname giả. Đã sửa budget thành `404 NOT_FOUND`, giữ redirect ở response trong test; run #6 xác nhận auth/owner integration pass.

### Hoàn thiện và kiểm tra trước push ngày 2026-09-27

- Giữ `hiep` làm nhánh sản phẩm. Trước khi tạo commit, `HEAD` và `origin/hiep` đều là `5945ab7`; đã fetch lại remote và xác nhận `origin/main` có các commit khác, không merge nguyên nhánh vì kiến trúc/migration khác.
- Remote refs lần fetch này: `origin/main=e6d031c`, `origin/thien-merge=9234544`, `origin/database-ingest-0.4=a58c33e`. `origin/main` có thay đổi CI/test setup sau snapshot cũ; workflow `hiep` chạy test schema riêng bằng cặp `CAMPUS_COIN_DB_MIGRATE_USER/PASSWORD` mà harness đang đọc, còn ref không được merge nguyên nhánh.
- Giao diện domain chạy từ `src/web/main.tsx`; entrypoint cũ `src/app/main.tsx` được bỏ để không có hai ứng dụng cạnh tranh. `Campus-Coin-Start.bat` mở API/Web local và trình duyệt; cửa sổ khởi chạy tự đóng sau khi sẵn sàng, còn hai cửa sổ dịch vụ giữ log.
- CI bổ sung `npm run test:web`; workflow dùng `CAMPUS_COIN_DB_MIGRATE_USER/PASSWORD` để tạo schema thử nghiệm cô lập. Hướng dẫn DevC được sửa theo đường dẫn source thật; [bộ query DBeaver](./working/DBEAVER-REVIEW-QUERIES.sql) mặc định chỉ đọc dữ liệu của một tài khoản demo được chọn, giới hạn số dòng và bỏ các cột bí mật.
- `npm run typecheck`: pass; `npm run build`: pass; `npm run test:web`: 33/33 pass; `npm run api:validate`: hợp lệ, còn 5 cảnh báo 4xx ở discovery/redirect/health. API bundle/types được sinh lại và `git diff --exit-code -- artifacts/openapi.json artifacts/api.d.ts` pass.
- Nhóm unit/adapter/guard không dùng MySQL đạt 52/52 pass; nhóm MySQL domain/contract/auth đạt 53/53 pass; `npm run db:datatest` đạt 23/23 pass. Đây là các lượt kiểm tra local trên harness/schema tạm, không phải kết quả CI mới.
- Ba MySQL suite trên schema tạm: `test/mysql.integration.test.ts` 32/32, `test/e2e.contract.smoke.test.ts` 13/13, `test/auth.mysql.integration.test.ts` 8/8. Regression dựng trigger trong schema tạm để xác nhận income, reversal, deposit và withdraw không cập nhật ví/savings hai lần.
- Góp ý ở trang trợ giúp nay gửi vào issue API với CSRF và idempotency; FAQ mô tả đúng email/OTP cùng Google tùy chọn. Báo cáo bỏ qua phản hồi tháng cũ; có thể mở form ngân sách cả khi danh mục chưa có giao dịch. Theme lưu như tùy chọn giao diện trong trình duyệt; toast tự ẩn và được đọc bởi công nghệ hỗ trợ.
- Các kết quả trên là local evidence trước push. GitHub Actions chưa chạy trên commit mới; CI sẽ được theo dõi sau khi push. SMTP gửi/nhận bình thường đã được Team Leader xác nhận; SMTP outage/recovery thật, Vercel Preview, backup/restore, benchmark cloud và đánh giá browser/accessibility vẫn cần evidence riêng.

## Cập nhật kiểm tra và tích hợp ngày 2026-09-25–26

Các ghi chú lỗi `campus_coin_done`, `3/15` và chờ MySQL test bên dưới là snapshot trước khi DevB cấp clone `campus_coin_clone`; kết quả mới hơn ở mục Evidence kiểm tra gần nhất thay thế trạng thái pending đó.

- Team Leader chạy `db:status` và `db:preflight`: target mà `.env` đang chọn là `campus_coin`; migration `0001`–`0005` đã apply, MySQL `8.4.8`, TLS pass, `applied=5 pending=0`.
- Service URI Aiven được cung cấp dùng cùng host/port đã kiểm tra nhưng có suffix `/defaultdb`; biến `CAMPUS_COIN_DB_NAME` chỉ chọn schema trên host đó, không tự xác nhận hoặc tạo `campus_coin_done`.
- Chạy read-only với `CAMPUS_COIN_DB_NAME=campus_coin_done` bằng credential/config hiện tại trả `Unknown database`. Lần chạy `npm run db:verify-clone` cũng dừng đúng tại preflight; không chạy `db:datatest` hay MySQL integration và không ghi/xóa schema nào.
- Lần `db:datatest` đầu đạt `3/15`; các file `expect-error` dùng CRLF bị parser hiểu như file phải thành công. Đã sửa parser và thêm regression test CRLF; bộ database test trên service clone cần được chạy lại sau khi target được xác nhận.
- Ngày 2026-09-25, Team Leader báo kết nối Google OAuth thành công; môi trường thực hiện chưa được nêu. Cần ghi rõ Google login và connect account có cả hai được thử hay chỉ một flow trước khi đánh dấu cả hai gate hoàn tất.
- CSRF/Origin được tách thành test chạy riêng `npm run test:auth-security`; test kiểm tra `ORIGIN_INVALID`, `CSRF_INVALID`, logout với CSRF sai và mutation hợp lệ. Workflow run #11 trên MySQL CI cô lập đã pass; kiểm tra thủ công trên staging vẫn pending.
- Logout với CSRF token sai khi session còn hiệu lực bị chặn bằng `403 CSRF_INVALID`; test MySQL integration đã bổ sung regression case. Logout khi session đã hết hạn/bị thu hồi vẫn clear cookie và trả thành công, đây là semantics gọi lặp.
- Đã thêm Vercel Node.js Function adapter `api/v1/[...path].ts`, `vercel.json` cho `dist`/SPA/API routing và workflow deploy thủ công `vercel-deploy.yml`. Production workflow chỉ nhận nhánh `hiep`; Vercel project settings/secrets, Preview deployment và Production deployment chưa được kiểm tra.
- Vercel adapter tắt body parser để giữ API giới hạn/parse body hiện có, gắn MySQL pool lifecycle hook bằng `@vercel/functions`, và hỗ trợ CA qua base64 environment khi chọn `verify-ca`. Cần DevB xác nhận vùng DB/runtime và đo pool capacity trước khi kết luận hiệu năng/capacity.
- API chỉ chấp nhận `Origin` đúng allowlist cho mutation; `Referer` không thay thế Origin. Mọi JSON response và redirect trả `Cache-Control: no-store, private`.
- `getSession()` cập nhật `sessions.last_seen_at` khi chưa từng được đặt hoặc giá trị cũ ít nhất một phút. Auth MySQL integration bao gồm negative owner cases cho correction, category PATCH và issue `relatedTransactionId`; Team Leader xác nhận suite trên schema test tạm của MySQL service có clone đạt `8/8` ngày 2026-09-26. CI run #14 thuộc commit cũ `6cc27dc`, không kiểm tra thay đổi của lượt này.
- Local SMTP adapter test mới mô phỏng greeting timeout và kiểm tra retry có giới hạn trên Nodemailer tới server local. Nó không thay cho kiểm tra SMTP provider/outage trên staging.
- Snapshot kiểm tra local ngày 2026-09-26: `npm run typecheck`, `npm run build` pass; bộ unit/regression 47/47 pass, gồm kiểm tra OpenAPI khai báo `Cache-Control` trên mọi response; `npm run api:validate` pass với 5 cảnh báo 4xx đã liệt kê. Tại thời điểm snapshot, owner regression chưa chạy trên MySQL local và đang chờ CI; kết quả mới hơn nằm ở Evidence kiểm tra gần nhất.
- Kiểm tra trước đó: 36 unit tests liên quan, `node --check` cho hai script DB clone và `git diff --check` pass. Workflow run #11 nêu trên thuộc commit cũ.
- `db:datatest` và ba MySQL integration suites đã chạy trên server có clone `campus_coin_clone`; kết quả chi tiết ở Evidence kiểm tra gần nhất. Backup/restore rehearsal, SMTP outage/recovery thật, CSRF/Origin trên staging và deployment Vercel vẫn pending.

## Kiểm tra nhánh và quyết định hợp nhất

Snapshot remote `2026-09-27`: giữ `hiep` làm nhánh sản phẩm theo quyết định Team Leader. Các refs và quan hệ tổ tiên được ghi trong [repository review](./working/repository-review-2026-09-27.md): `origin/hiep=563eaae`, `origin/thien-merge=77ad3dd`, `origin/main=1a1822f`, `origin/thien=55df41e` và chuỗi `origin/database-ingest=48f8cd4` → `.2=ce984ae` → `.3=9df1c97` → `.4=053a434`. Kiến trúc/auth/session và migration chain của các nhánh không tương thích. Hiep có các SQL benchmark thô dùng schema `campus_coin`, ID user cố định và cleanup không xóa lịch sử ledger/transfer; không chạy các file này. Runner của nhánh DB ingest tạo schema tạm local và dọn schema trong `finally`, nhưng dùng migration chain riêng nên không dùng được trực tiếp cho Aiven hoặc `hiep`; lượt này không chạy benchmark.

## Giao diện domain hiện có

- Sau đăng nhập, người dùng có thể khởi tạo wallet, xem số dư và tóm tắt tháng, ghi `income`/`payment`, chuyển savings, xem lịch sử phân trang và báo cáo tháng với ngân sách.
- Client gửi `Idempotency-Key` cho mutation, giữ nội dung form khi request lỗi, khóa nút khi đang gửi và đọc số dư/tổng tiền/budget từ API server.
- Giao diện dùng VI/EN, native controls, semantic forms/tables, nhãn trạng thái, keyboard focus và layout responsive. Giao dịch correction được đánh dấu trong lịch sử; màn Giao dịch có modal reversal/adjustment/replacement, yêu cầu reason và gửi CSRF/idempotency. Correction row không tạo correction tiếp theo trong UI; backend vẫn quyết định quyền và điều kiện cuối cùng.
- Giao diện category management có trong Cài đặt; savings transfer history và issue/admin/preferences có màn hoặc khu vực riêng theo phạm vi hiện tại. Cần kiểm thử browser, responsive và screen reader thực tế; component/source semantics chưa thay cho evidence kiểm tra.

## Còn cần hoàn tất

1. **Hoàn thiện giao diện domain còn thiếu**: correction UI đã có source và component tests; xác nhận đủ phạm vi issue/admin theo SRS. Category management có UI/API source; migration clone và luồng provider còn cần kiểm chứng.
2. **Đối chiếu SRS với tính năng và test**: tạo bảng yêu cầu → màn/API → test → kết quả. Checkout hiện không có bản SRS; dùng bản có thẩm quyền của nhóm và không sửa bản gốc.
3. **Auth staging**: Team Leader xác nhận đã thử và gửi/nhận SMTP bình thường thành công trong luồng tài khoản, đồng thời cung cấp ảnh Google link/login thành công. Chưa có bằng chứng độc lập cho SMTP provider outage/recovery hoặc staging CSRF/Origin; kiểm tra outage chỉ cần nếu BTC yêu cầu evidence sự cố, và không phủ nhận luồng gửi/nhận đã xác nhận.
4. **Chốt DB với DevB/DB owner**: `campus_coin_clone` kết nối TLS nhưng lần đọc mới nhất báo checksum mismatch `0006`–`0013` và các version applied `0014`–`0031` không có source trong nhánh `hiep`. Một số remote refs có file ở các version đó nhưng migration `0006`–`0013` dùng nội dung khác; đây chưa phải bằng chứng ref nào khớp với checksum đã lưu. DevB phải đối chiếu lineage trước khi migration/deploy. Còn backup/restore rehearsal, runtime role least-privilege và xác nhận các target triển khai khác. Không dùng Aiven `defaultdb` cho test destructive.
5. **Kiểm tra UI/accessibility/compatibility**: bàn phím, focus, screen reader cơ bản, màn hình nhỏ và Chrome/Firefox/Edge/Opera; ghi phiên bản, viewport, ngày và kết quả.
6. **Hoàn thiện Project Report và evidence originality**: problem statement, sơ đồ, module/logic, phân công, hướng dẫn cài/chạy/kiểm tra, giới hạn, test evidence và nguồn tham khảo; thành viên cần giải thích được phần mình làm.
7. **Đóng gói cuối**: CI run #54 đã pass cho commit `1c2c814`, gồm regression readiness local/Vercel mới thêm vào workflow. Còn rà demo/build, lưu commit/tag và chuẩn bị gói nộp.
8. **Preview Vercel và SMTP**: CI đã pass; DevD cần cấu hình secrets/environment rồi chạy deploy workflow ở Preview. Kiểm tra API/readiness; chỉ chạy controlled provider outage/recovery và rà log đã redact nếu BTC yêu cầu evidence sự cố. SMTP gửi/nhận bình thường đã được Team Leader xác nhận; chỉ lặp lại trên Preview nếu cần evidence đúng môi trường. Chỉ chạy Production qua GitHub Environment có approval.

## Bổ sung xác nhận ngày 2026-09-28

- Team Leader nhắc lại SMTP đã được cấu hình và đã thử gửi/nhận email thành công trong các luồng cần thiết. Đây là xác nhận của Team Leader; ghi nhận thành công luồng gửi bình thường, không gắn nhầm là kiểm tra SMTP outage hoặc production readiness.
- Giao diện auth cục bộ đã được đo ở 320×720, 390×844, 768×1024, 1280×800 và 667×375 landscape. Sau khi bỏ `min-width: 320px` gây tràn tại viewport CSS 305px, các màn login, nhập email đăng ký và quên mật khẩu không còn tràn ngang; nút ngôn ngữ, hiện mật khẩu và hành động dạng chữ có vùng bấm tối thiểu 44px. Đây là kiểm tra trên một browser local, không thay cho ma trận Chrome/Firefox/Edge/Opera hoặc screen reader.
- Các kết quả kiểm tra auth không gửi email, không submit biểu mẫu có email thật và không đăng nhập vào tài khoản của Team Leader.

### Cập nhật code, kiểm tra và push ngày 2026-09-28

- Header language switch và lưu lựa chọn trong Settings cập nhật chung `session.user.locale`; regression test kiểm tra cả hai hướng. SMTP không được gọi lại trong lượt này vì Team Leader đã xác nhận các luồng email gửi/nhận bình thường.
- Settings có tạo/đổi mật khẩu bằng OTP và yêu cầu đăng nhập lại sau khi reset. Tài khoản Google thiếu tên hoặc mật khẩu email bị server chặn khỏi domain cho tới khi hoàn tất profile; đặt mật khẩu đầu tiên dùng Google identity đã xác minh.
- Giao diện Reports có lịch khoản phải trả/thu dự kiến, nhắc trong 10 ngày, tùy chọn tính trước trong forecast, bộ chọn forecast 30/90/180/365 ngày, what-if và reflection tổng tháng. Mọi con số là kế hoạch/ước tính; không tự tạo payment, trừ wallet hoặc gắn một kế hoạch vào giao dịch cụ thể.
- Gợi ý top 10 item và so sánh số tiền/khoảng cách lịch sử được owner-scope; form giải thích trạng thái chưa có lịch sử thay vì hiện dữ liệu giả. Báo cáo so category theo tháng trước. Source có migrations `0011`–`0013`; không apply lên `campus_coin_clone` vì checksum `0006`–`0013` lệch và bảng ghi nhận thêm applied versions `0014`–`0031` chưa được DevB đối chiếu.
- Cài đặt có giao diện quản lý danh mục cá nhân: tạo danh mục thu/chi với tên VI/EN, tạm ẩn và bật lại danh mục cá nhân; danh mục mặc định chỉ đọc, lịch sử giao dịch không bị xóa. Form tạo danh mục tách riêng khỏi form lưu hồ sơ nên không submit nhầm thay đổi cá nhân; nút ẩn/bật đọc được kèm tên danh mục. Form payment có trạng thái nhóm thu/chi cho công nghệ hỗ trợ và nêu rõ nhịp mua lần này ngắn/dài hơn nhịp trước bao nhiêu ngày. Các thao tác này có component/regression tests; chưa có kiểm chứng MySQL trên clone hiện tại.
- Form thu/chi cho phép nhập ngày phát sinh theo `Asia/Ho_Chi_Minh`; API chỉ nhận timestamp ISO-8601 có múi giờ, ngày/tháng hợp lệ và không ở tương lai. Khi nhập lùi trước lần mua gần nhất, form ẩn so sánh để không dùng dữ liệu xảy ra sau giao dịch đang nhập. Kế hoạch dòng tiền đã có thể bật lại sau khi tắt; thao tác được ghi audit.
- Sau khi user báo không thấy thay đổi, đã cập nhật đường dùng rõ trong product proposal và sửa nút bật lại kế hoạch để khớp API/service (trước đó UI có nút nhưng service từ chối).
- JEV/OpenRouter gợi ý category và OCR hóa đơn có route/UI, consent, quota/timeout và fallback nhập tay; hai feature flag mặc định tắt. Chưa có live provider probe, key/quota/cost evidence hoặc privacy review. Cấu hình secret phải ở server environment, không gửi qua chat.
- Xác minh cục bộ ngày 2026-09-28: `npm run test:web` đạt `70/70` trên 16 file; `npm test` đạt `72 pass, 3 MySQL-gated skip` (75 test tổng); `npm run build` pass. `npm run api:bundle`, `npm run api:types` và `npm run verify:docs` pass sau đồng bộ contract.
- Browser local đo màn đăng nhập ở 320×640, 375×812, 390×844, 768×1024, 1200×800 và 667×375 landscape; cả sáu phép đo không có horizontal overflow. Browser đang đăng xuất nên không đi qua dashboard/Reports/Settings để đo trực tiếp; các màn có component tests. Chưa chạy ma trận Chrome/Firefox/Edge/Opera hoặc screen reader.
- Kiểm tra lại ngày 2026-09-28: local browser mở trang Campus Coin và render form đăng nhập; GET `/api/v1/health` trả `200`, GET `/api/v1/auth/session` không có cookie trả `401` như yêu cầu. Phiên browser vẫn đăng xuất nên chưa thể kiểm tra trực tiếp payment form/Reports trong phiên này.
- Không chạy MySQL migration/integration, cloud benchmark, Preview deploy hoặc live AI/OCR provider trong vòng này. Clone `campus_coin_clone` vẫn có checksum mismatch `0006`–`0010`; không chạy write test hoặc migrations `0011`–`0013` lên clone. Benchmark runner chỉ cho MySQL local disposable và chưa có target local được xác nhận.
- Vòng bổ sung ngày 2026-09-28: `CategoryManagementPanel` cho phép tạo, tạm ẩn và bật lại danh mục cá nhân trong Settings; form payment diễn giải nhịp mua ngắn/dài hơn lần trước bằng số ngày; nhóm chọn thu/chi có trạng thái `aria-pressed`; kiểu API cho phép bật lại kế hoạch dòng tiền. Regression tests xác nhận tạo danh mục không submit thay đổi hồ sơ chưa lưu và giao diện tiếng Anh báo đúng khi nhịp mua bằng nhịp trước. `npm run test:web` đạt `79/79` trên 17 file; `npm run typecheck`, `npm run build` và `npm run verify:docs` exit 0. `npm run api:validate` báo 5 warning thiếu phản hồi 4xx ở endpoint discovery/redirect/health; lệnh này nằm trong `verify:docs` và không làm command thất bại. Đây là source/component-test evidence; chưa phải xác minh MySQL hay browser đã đăng nhập.
- Browser local ở trạng thái đăng xuất: trang login không tràn ngang tại 320×640 và 768×1024. Settings/payment form không được mở trực tiếp vì cần phiên đăng nhập; test component bao phủ các phần sửa trong lượt này. Không nhập tài khoản hay mật khẩu trong browser.
- Lượt rà mới khẳng định rõ các ý tưởng: item suggestions/compare chỉ có dữ liệu sau khi owner ghi payment có `itemName`; khoản cố định/what-if/reflection nằm trong **Báo cáo → Kế hoạch dòng tiền**; so sánh danh mục nằm ở trang **Báo cáo**. Ba hướng mở rộng đã được Team Leader đồng ý nhưng phần tuần chi tiết, ghép từng khoản với payment và gắn nguyên nhân chênh lệch vẫn chưa có.
- Changeset được push lên `origin/hiep` qua commit `53034b4`. GitHub Actions run #43 thất bại tại `db:datatest`: bộ lọc migration safe-integer nhận nhầm cả `0011`–`0013`. Commit sửa `0334b8c` giới hạn suite đó ở `0006`–`0010`; [CI run #45](https://github.com/staavanothanh/Campus-Coin/actions/runs/36375649522) hoàn tất thành công, gồm datatest và các MySQL integration chạy trên DB disposable của CI.
- Lượt hoàn thiện rubric ngày 2026-09-28 đồng bộ OpenAPI patch kế hoạch để cho phép cả disable/reactivate; query history chấp nhận mốc from/to tương lai trong miền UTC của MySQL `DATETIME(3)`; server chặn timestamp giao dịch sai định dạng, ngày không hợp lệ, độ chính xác trên milli giây hoặc UTC ngoài miền. Parser chấp nhận `t`/`z` viết thường theo RFC3339. Unit/contract regression pass; CI run #45 xác nhận MySQL integration, gồm luồng bật lại plan. Không kết nối DB hoặc chạy migration lên clone vì checksum cần DevB đối chiếu.

### Rà soát bổ sung trước và sau push ngày 2026-09-28

- Chạy lại trên working tree: `npm run test:web` — 86/86 trên 17 file; `npm test` với `CAMPUS_COIN_TEST_DB=0` — 77 pass, 3 MySQL-gated skip trên 80 test; `npm run build` và `npm run verify:docs` — pass. `api:bundle` và `api:types` pass ở lượt kiểm tra trước. OpenAPI còn 5 warning thiếu response 4xx cho discovery/redirect/health. `verify:docs` chạy `git diff --check`.
- Mở local app trong browser khi chưa đăng nhập. Login hiển thị tại 1280×720, document width 1280; bước đăng ký hiển thị `Xác minh email`, cùng chiều rộng, không tràn ngang. Không gửi form, không dùng mật khẩu, không gửi email/OTP và không xem session storage. Đây không phải browser matrix hay kiểm tra trang domain có dữ liệu.
- Mở và tương tác trực tiếp với Bencho: magnetic selection tự đổi theo con trỏ, time scrubber cập nhật tiến trình, eye-tracker chỉ trang trí, inline confirm đổi `Delete` thành `Deleted` rồi đưa ra `Undo`. Nguyên tắc phù hợp và giới hạn đã ghi tại [interaction review](./working/INTERACTION-QUALITY-2026-09-27.md); không đưa animation hoặc thao tác xóa ledger vào Campus Coin.
- Migration `0013_cashflow_plan_status_history.sql` lưu lịch sử bật/tắt theo owner và plan để reflection tháng cũ không mất khoảng thời gian kế hoạch đã tắt. Kế hoạch đến hạn hôm nay vẫn hiện trong lịch; forecast/what-if không cộng/trừ những khoản đó lần nữa trên số dư ví hiện tại. API assumption và ghi chú VI/EN giải thích rằng hoạt động hôm nay chưa ghi thành giao dịch có thể chưa được phản ánh. Unit và integration regression đã được thêm.
- OAuth callback chỉ thông báo đăng nhập/kết nối thành công sau khi `/auth/session` xác nhận session; nội dung dùng locale lưu trong tài khoản. Không có session hoặc Google chưa được liên kết sẽ hiện lỗi chung với thông báo trợ năng phù hợp. Lỗi hồ sơ được xóa khi người dùng sửa trường liên quan, trường sai nhận focus và được đánh dấu trực quan. Lịch nhắc/dự báo phản ánh trạng thái kế hoạch hiện tại ngay; đối chiếu tháng đã qua dùng trạng thái đầu ngày HCMC, nên thay đổi đúng ngày đến hạn có hiệu lực trong lịch sử từ ngày kế tiếp.
- JEV adapter hủy response stream ngay khi vượt 16 KB; CI gọi thêm unit tests domain/adapters mới. Ba lượt review độc lập kiểm tra auth/UI, domain/DB/CI và release/docs; không còn phát hiện P0/P1/P2 trong phạm vi rà soát.
- Không chạy migration lên clone, `db:benchmark`, live OCR/JEV, controlled SMTP outage, staging test hoặc Vercel deployment. Clone còn checksum mismatch `0006`–`0010`; provider/runtime cần DevB/DevD cấu hình và evidence riêng. CI run #45 đã xác minh migration và MySQL integration trên DB disposable của GitHub Actions.
- Commit code `0334b8c` đã push lên `origin/hiep`; hai file trạng thái này được cập nhật để ghi nhận kết quả CI #45. Chi tiết rubric và evidence còn thiếu nằm trong [QUALITY-AND-SCORING.md](./QUALITY-AND-SCORING.md).

### Xử lý lỗi `HTTP_502` và rà soát hiện tại — 2026-09-28

- Ảnh Team Leader gửi cho thấy dashboard nhận `HTTP_502`. Khi rà local, cổng API `3000` không trả lời trong khi Vite `5173` đang chạy; Vite vì vậy hiện lỗi proxy. Nguyên nhân là API kết thúc trước khi mở cổng khi schema chưa sẵn sàng. Ô đăng nhập trống trong ảnh là trạng thái ban đầu của biểu mẫu, chưa phải lỗi xác thực.
- Metadata probe chỉ đọc trên DB clone cho thấy migration khác checksum với nhánh hiện tại và thiếu cột `ledger_transactions.item_name`, cột mà repository hiện dùng. Bảng cashflow cũng là một điều kiện readiness. Không chạy ghi giao dịch hoặc migration lên clone khi chưa thống nhất lineage và có phương án backup/restore.
- Local API và Vercel dùng chung schema gate: local vẫn mở cổng cho liveness/provider discovery, còn mọi request cần DB nhận `503 SERVICE_UNAVAILABLE` nếu readiness chưa đạt. `/api/v1/health/ready` gọi schema check thật. Readiness so checksum migration, bảng và cột ví/ledger trọng yếu; DDL thủ công ngoài migration không được hỗ trợ. Probe schema dùng một query migration và một query gộp metadata bảng/cột yêu cầu. Local HTTP regression xác nhận readiness trả 503 khi checker lỗi, 200 khi checker đạt, các route độc lập vẫn hoạt động và route cần DB bị chặn. Chưa chạy Vercel Preview.
- Lần đo viewport trước đó ghi nhận màn đăng nhập không tràn ngang ở 320×640, 375×812, 390×844, 768×1024, 1200×800 và 667×375 landscape. Không đo lại ở lượt này vì công cụ Windows không xác định được URL Chrome đủ chắc chắn và dừng thao tác; chưa xác minh dashboard đã đăng nhập, giao dịch hay báo cáo trên clone.
- Sửa markup đăng nhập/đặt lại mật khẩu để nút hiện/ẩn mật khẩu không nằm trong `label`, gắn nhãn input bằng `htmlFor`, và giữ viền focus bàn phím nhìn thấy. Bổ sung regression cho nút hiện mật khẩu và chuyển focus sang tiêu đề khi đổi bước auth.
- `vercel.json` bundle migration SQL để readiness có thể đọc nguồn migration khi deploy; cấu hình chưa được xác minh bằng Vercel Preview.
- Kiểm tra code ngày 2026-09-28: `npm run test:web` — 89/89 trên 17 file; `npm test` — 85 đạt, 3 MySQL-gated bỏ qua (88 tổng), DB gate không bật; gồm 5 unit test readiness, 3 HTTP readiness test local và 2 Vercel gate test. `npm run typecheck`, `npm run build` và `npm run verify:docs` đạt. `verify:docs` còn 5 warning OpenAPI về 4xx ở discovery/redirect/health.
- Không chạy migration, test ghi MySQL, SMTP outage, AI/OCR provider hay deploy. DevB cần đối chiếu checksum `0006`–`0010`, xác nhận các cột/bảng/trigger và schema target, rồi chuẩn bị backup/restore trước khi cấp DB phù hợp để demo. Chưa xác minh đăng nhập/dashboard đã có dữ liệu trên clone; hiện trạng này không được xem là hoàn tất review live.

Checklist theo từng trọng số và thứ tự thực hiện nằm trong [QUALITY-AND-SCORING.md](./QUALITY-AND-SCORING.md). Các câu hỏi nguyên lý đã có câu trả lời và trạng thái áp dụng trong [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md); phần ghi trong tài liệu không đồng nghĩa mọi hạng mục đã được kiểm thử.

### Sửa readiness, auth test và trạng thái giao diện — 2026-09-28

- Ba commit đã push trên `hiep`: `7ebbd50` giữ API mở cổng và trả lỗi `503` rõ ràng khi schema chưa sẵn sàng; `5f942fe` cô lập auth unit tests khỏi database bằng checker stub trong test; `0a970d1` cập nhật auth MySQL regression theo semantics readiness `503`. [GitHub Actions run #51](https://github.com/staavanothanh/Campus-Coin/actions/runs/36388169695) trên `0a970d1` hoàn tất thành công toàn workflow.
- Auth MySQL integration đã chạy trên schema thử nghiệm tạm do harness tạo/xóa: `10/10` pass. Không ghi/xóa dữ liệu của `campus_coin_clone` hoặc `campus_coin_test_devb`.
- Ảnh dashboard có `HTTP_502` được tái hiện về bản chất: API data route không thể phục vụ vì readiness của schema chưa đạt. Sau thay đổi, API giữ cổng hoạt động và trả `503 SERVICE_UNAVAILABLE`; lỗi 502 do proxy không kết nối được đã được xử lý, nhưng dữ liệu chưa khả dụng cho tới khi schema clone được DevB đối chiếu. Kiểm tra local mới nhất `/api/v1/health/ready` vẫn trả `503`.
- Commit `2acceb2` đã push thu gọn trạng thái lỗi khi nhúng trong dashboard và cho phép tiêu đề/nội dung trạng thái hẹp xuống trong màn hình nhỏ; regression test nằm cùng thay đổi. CI [run #53](https://github.com/staavanothanh/Campus-Coin/actions/runs/36389891077) pass. Local: `npm run test:web` đạt `89/89`; `npm test` đạt `85 pass`, `3 MySQL-gated skip` (88 tổng); `npm run build` và `npm run verify:docs` exit `0`. Lint OpenAPI còn 5 warning 4xx đã biết.
- Lượt phản biện cuối phát hiện workflow trước chưa gọi `test/api-readiness-route.test.ts` và `test/vercel-readiness-gate.test.ts`. Đã bổ sung bước CI riêng; lệnh chính xác `node --import tsx --test test/api-readiness-route.test.ts test/vercel-readiness-gate.test.ts` đạt `5/5` local. [CI run #54](https://github.com/staavanothanh/Campus-Coin/actions/runs/36390717239) pass trên commit `1c2c814`.
- Chưa có bằng chứng viewport mới cho bản sửa, trang dashboard có phiên đăng nhập, Reports/Settings, Vercel Preview, SMTP outage, live JEV/OCR hoặc benchmark database trong lượt này. Không ghi các mục này là đã kiểm thử.
- Bencho được áp dụng có chọn lọc: trạng thái hover/press và selected, xác nhận tại chỗ cho thao tác có thể hoàn tác, focus/keyboard, `aria` và `prefers-reduced-motion`; không sao chép eye-tracker/magnetic cursor hay biến thao tác ledger không thể đảo ngược thành animation xác nhận. Danh sách chi tiết và lý do nằm trong [interaction review](./working/INTERACTION-QUALITY-2026-09-27.md); một số hiệu ứng phụ thuộc dữ liệu sẽ chỉ xuất hiện sau khi DB sẵn sàng.

### Xác minh vì sao giao diện còn báo “Hệ thống đang bận” — 2026-09-28

- Trước các chỉnh sửa trong working tree, `HEAD` và `origin/hiep` cùng ở `d097740`.
- Chạy lại hai lệnh chỉ đọc `npm run db:preflight` và `npm run db:status` trên cấu hình hiện tại. Host kết nối TLS được, MySQL `8.4.8`, schema `campus_coin_clone` tồn tại; checksum `0006`–`0013` lệch (`0001`–`0005` vẫn `applied`) và database còn ghi nhận applied versions `0014`–`0031` không có migration file trong nhánh này. Đây là evidence mới hơn các snapshot ghi mismatch `0006`–`0010`.
- Kiểm tra HTTP local ngay sau các lệnh DB: process tại `127.0.0.1:3000` trả `200` cho `/api/v1/health` và `503 SERVICE_UNAVAILABLE` cho `/api/v1/health/ready`, body `Database schema chưa sẵn sàng`. API trả lời được nhưng readiness gate chặn route cần DB; kết quả này không chứng minh database server đã dừng.
- Không chạy migration, datatest, MySQL integration hoặc câu lệnh ghi lên clone. `db:status`/`db:preflight` chỉ đọc; DevB/DB owner phải đối chiếu `schema_migrations` và schema thật, rồi đề xuất cách khôi phục tương thích sau backup/restore. Không sửa checksum lịch sử để ép readiness qua.
- Sau các thay đổi local: `npm run typecheck`, `npm run build`, `npm run test:web` (90/90), `npm test` (87 pass, 3 MySQL-gated skip), migration-engine tests (10/10) và `npm run verify:docs` đều exit 0. API lint còn 5 cảnh báo OpenAPI 4xx đã biết. Đây chưa phải kết quả CI của commit mới.

### Làm rõ thông báo “Hệ thống đang bận” và thêm correction UI — 2026-09-28

- Kiểm tra trực tiếp lại: `npm run db:status` trả `applied` cho `0001`–`0005`, `MISMATCH` cho `0006`–`0013`, và `UNKNOWN` cho các version `0014`–`0031`; `/api/v1/health` trả `200`, còn `/api/v1/health/ready` trả `503 SERVICE_UNAVAILABLE`. Vì vậy API còn sống nhưng chủ động chặn các route cần DB. “Hệ thống đang bận” là lỗi chung để không trả nội bộ DB ra browser; đây không phải bằng chứng máy chủ quá tải.
- Đối chiếu các Git refs cục bộ cho thấy `origin/thien-merge` và các nhánh `database-ingest` có migration files mang version `0014`–`0031`, nhưng chuỗi `0006`–`0013` khác nội dung với nhánh `hiep`. Đây chỉ là ứng viên lineage, chưa xác nhận bằng checksum đã lưu. Không chạy migration, seed, datatest hay test ghi trên clone; DevB cần đối chiếu migration name/checksum và DDL thật, rồi lập kế hoạch backup/restore.
- Màn dashboard hiện ánh xạ transport error và HTTP 5xx sang copy theo locale thay vì hiển thị `HTTP_502` hoặc câu tiếng Việt thô của API khi locale là English. Đây chỉ sửa cách giải thích lỗi; dữ liệu vẫn chờ DB lineage được khớp.
- Màn Giao dịch bổ sung correction reversal, adjustment và replacement; amount là số nguyên dương, reason bắt buộc, danh mục mới là tùy chọn với replacement. Form gọi endpoint correction cùng CSRF/idempotency; backend giữ ledger append-only, từ chối correction chaining và vẫn kiểm tra owner, wallet, category, số dư. Dòng correction hiển thị số tiền được ghi như một khoản đính chính trung tính, không gán dấu income/payment; tổng trên trang là số dòng đang hiển thị, tránh cộng sai delta khi chưa có target trong trang.
- Commit `dc08a2f` đã push lên `hiep`. Kiểm tra local: `npm run test:web` đạt `95/95` trên 18 file; `npm test` đạt `87 pass`, `3 MySQL-gated skip` (90 tổng); `npm run typecheck`, `npm run build` và `npm run verify:docs` pass; OpenAPI lint có 5 warning response 4xx đã biết. GitHub Actions [run #57](https://github.com/staavanothanh/Campus-Coin/actions/runs/36395906288) trên SHA `dc08a2f` pass.
- CI dùng disposable MySQL; không khôi phục readiness của `campus_coin_clone`. Chưa xác minh dashboard có dữ liệu trên clone, Vercel Preview hoặc ma trận browser đã đăng nhập.

## Owner

- Developer A: auth, OTP/email adapter, session, CSRF/Origin và auth UI.
- Developer B: MySQL, migrations, wallet, ledger, savings, budgets, reports và DB permissions.
- Team Leader: contract, tích hợp, evidence và quyết định GO/NO-GO.
- Developer C/D: UI/accessibility và kiểm thử/release theo [TEAM-BOARD.md](./TEAM-BOARD.md).
