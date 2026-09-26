# Trạng thái hiện tại — Campus Coin

> Cập nhật: 2026-09-27 · Nhánh tích hợp: `hiep`

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
- Team Leader xác nhận Phần 2 auth staging hoàn tất: đăng ký/reset email, OTP sai/hết hạn/resend và logout/session. Đây là báo cáo của Team Leader, không phải lần chạy live từ task này; SMTP/provider failure timeout/retry vẫn cần kiểm tra riêng.

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

### Bổ sung ngày 2026-09-27

- Remote được fetch lại trước khi xem xét hợp nhất: `origin/hiep=563eaae`, `origin/thien-merge=77ad3dd`, `origin/main=1a1822f`, `origin/thien=55df41e`; nhóm DB gồm `origin/database-ingest=48f8cd4`, `.2=ce984ae`, `.3=9df1c97`, `.4=053a434`. Nhánh DB là chuỗi tổ tiên theo thứ tự đến `.4`, nên `.4` đã chứa các commit của ba refs DB cũ. `hiep` là sản phẩm chính; không có merge nguyên nhánh phù hợp. Lý do và phạm vi từng repo/nhánh nằm trong [repository review](./working/repository-review-2026-09-27.md).
- Đã thêm giao diện domain sau đăng nhập: wallet setup, tổng quan, thu/chi, savings transfer, lịch sử phân trang, báo cáo tháng và ngân sách. Client dùng typed API wrapper, Idempotency-Key và giờ/ngày theo `Asia/Ho_Chi_Minh`; không tính lại authoritative balance/budget ở browser.
- CI workflow hiện có bước chạy `test/domain.format.test.ts` và `test/domain.api.test.ts`.
- Lượt kiểm tra cục bộ ngày 2026-09-27: `npm run typecheck` và `npm run build` pass; `npm run api:validate` hợp lệ với 5 warning 4xx lịch sử; domain unit tests 6/6 pass; 53 test trong các bước CI không cần MySQL pass. `npm run api:bundle` và `npm run api:types` đã sinh lại artifacts để thể hiện `wallet`, `savings`, `currentMonth` có thể là `null` trước khi khởi tạo ví. Sau push, GitHub Actions run #17 trên commit `8884687` pass job `verify` toàn workflow.
- Không chạy migration, `db:datatest`, MySQL integration, SMTP/provider staging, benchmark hoặc Vercel deploy trong lượt này. Không dùng database được cấu hình trong môi trường local.

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
- Giao diện dùng VI/EN, native controls, semantic forms/tables, nhãn trạng thái, keyboard focus và layout responsive. Giao dịch correction được đánh dấu trong lịch sử.
- Chưa có giao diện category management, correction, savings transfer history, issue/admin/preferences. Cần kiểm thử browser, responsive và screen reader thực tế; source semantics chưa thay cho evidence kiểm tra.

## Còn cần hoàn tất

1. **Hoàn thiện giao diện domain còn thiếu**: category management, correction, savings transfer history và issue/admin/preferences. Các lát cắt wallet/dashboard, income/payment/history, savings, budget và report đã nối API; owner luôn lấy từ session.
2. **Đối chiếu SRS với tính năng và test**: tạo bảng yêu cầu → màn/API → test → kết quả. Checkout hiện không có bản SRS; dùng bản có thẩm quyền của nhóm và không sửa bản gốc.
3. **Auth staging**: Team Leader xác nhận Phần 2 đã hoàn tất (register/reset email, OTP sai/hết hạn/resend, logout/session) và cung cấp ảnh Google link/login thành công. Chưa có bằng chứng độc lập cho staging CSRF/Origin hoặc SMTP/provider failure timeout/retry.
4. **Chốt DB với DevB/DB owner**: clone `campus_coin_clone`, TLS, migration state và các MySQL test đã được xác nhận theo output ngày 2026-09-26. Còn backup/restore rehearsal, runtime role least-privilege và xác nhận các target triển khai khác. Không dùng Aiven `defaultdb` cho test destructive.
5. **Kiểm tra UI/accessibility/compatibility**: bàn phím, focus, screen reader cơ bản, màn hình nhỏ và Chrome/Firefox/Edge/Opera; ghi phiên bản, viewport, ngày và kết quả.
6. **Hoàn thiện Project Report và evidence originality**: problem statement, sơ đồ, module/logic, phân công, hướng dẫn cài/chạy/kiểm tra, giới hạn, test evidence và nguồn tham khảo; thành viên cần giải thích được phần mình làm.
7. **Đóng gói cuối**: chạy CI trên commit chốt, kiểm tra demo/build, lưu commit/tag và chuẩn bị gói nộp.
8. **Preview Vercel và SMTP**: DevD cấu hình secrets/environment, chờ CI pass rồi chạy deploy workflow ở Preview; kiểm tra API/readiness, register/reset gửi và nhận email, controlled provider outage trong Preview và redacted logs. Chỉ chạy Production qua GitHub Environment có approval.

Checklist theo từng trọng số và thứ tự thực hiện nằm trong [QUALITY-AND-SCORING.md](./QUALITY-AND-SCORING.md). Các câu hỏi nguyên lý đã có câu trả lời và trạng thái áp dụng trong [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md); phần ghi trong tài liệu không đồng nghĩa mọi hạng mục đã được kiểm thử.

## Owner

- Developer A: auth, OTP/email adapter, session, CSRF/Origin và auth UI.
- Developer B: MySQL, migrations, wallet, ledger, savings, budgets, reports và DB permissions.
- Team Leader: contract, tích hợp, evidence và quyết định GO/NO-GO.
- Developer C/D: UI/accessibility và kiểm thử/release theo [TEAM-BOARD.md](./TEAM-BOARD.md).
