# Trạng thái hiện tại — Campus Coin

> Cập nhật: 2026-09-25 · Nhánh tích hợp: `hiep`

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

- `4bbdb61` — cập nhật trạng thái nhánh, rubric, cách áp dụng nguyên lý web và checklist phối hợp.
- `3bf6c0c` — ghi nhận kết quả Auth MySQL integration và CI run #7.
- `5ee8858` — sửa hai lỗi CI về owner budget trả `404 NOT_FOUND` và kiểm tra Google redirect mà không gọi hostname giả.
- `e9a40d4` — áp dụng semantic HTML/native validation và cập nhật evidence cho auth form.
- `586a7ce` — chỉnh cooldown/quota OTP, chỉ tin IP proxy đã cấu hình, bổ sung test, cập nhật OpenAPI/artifacts và trạng thái tài liệu.
- `36ed519` — thêm guard cho MySQL destructive tests và test owner-scope qua HTTP với hai tài khoản.
- `be7aac6` — tách MySQL suites để CI cô lập lỗi.
- Chốt DB test không chạy trên `defaultdb`. CI tạo MySQL riêng cho job; test harness tạo schema tạm có tên rõ ràng rồi xóa schema đó sau khi chạy.
- Câu hỏi nguyên lý và cách áp dụng được ghi tại [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md); nội dung không khẳng định các gate staging hoặc sản phẩm còn thiếu đã pass.
- SMTP register đã được Team Leader báo gửi/nhận thành công. Đây là evidence cho đăng ký; reset-password và tình huống provider lỗi chưa được xác nhận bằng SMTP thật.

## Evidence kiểm tra gần nhất

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `node --import tsx --test tests/db-test-guard.test.ts`: 3/3 pass.
- `node --import tsx --test tests/auth.test.ts test/schema-readiness.test.ts tests/google-oauth.test.ts tests/client-ip.test.ts`: 27/27 pass.
- `npm run api:validate`: pass; còn 5 lint warnings về response 4xx ở endpoint discovery, redirect/callback và health.
- [Workflow run #10](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117665453) trên commit `dd90c11` pass toàn workflow sau cập nhật evidence trong tài liệu nhóm.
- [Workflow run #9](https://github.com/staavanothanh/Campus-Coin/actions/runs/36117022485) trên commit `ed62986` pass toàn workflow sau cập nhật quy ước cộng tác trong repository.
- [Workflow run #8](https://github.com/staavanothanh/Campus-Coin/actions/runs/36116299740) trên commit `4bbdb61` pass toàn workflow và xác nhận cập nhật tài liệu nhánh/rubric.
- [Workflow run #7](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113725073) trên commit `3bf6c0c` pass toàn workflow trước lần cập nhật hiện tại.
- [Workflow run #6](https://github.com/staavanothanh/Campus-Coin/actions/runs/36113454931) trên commit code `5ee8858` pass typecheck, build, API validation/artifacts, unit tests, `db:datatest`, MySQL domain integration, HTTP contract smoke và Auth MySQL integration trên MySQL cô lập. Run #7 xác nhận lại toàn workflow sau cập nhật docs.
- Trước đó CI tìm ra budget của category ngoài owner trả `422` thay vì `404` và Google integration test tự theo redirect đến hostname giả. Đã sửa budget thành `404 NOT_FOUND`, giữ redirect ở response trong test; run #6 xác nhận auth/owner integration pass.

## Kiểm tra nhánh và quyết định hợp nhất

> Snapshot refs được đối chiếu ngày 2026-09-25 trên baseline `origin/hiep=4bbdb61`; đây là mốc so sánh trước thay đổi tài liệu trong lượt hiện tại.

- `hiep` là nhánh sản phẩm chính theo quyết định Team Leader.
- `origin/main` ở `e4c68fc`; `origin/thien` ở `2d54823` và đi sau `main` đúng 2 commit. Commit đầu đưa source riêng lên `thien`; commit kế tiếp thêm `node_modules/` và `dist/` đã build. Không nhập nguyên `thien` vào nhánh sản phẩm.
- `origin/thiên` (`af2beba`) còn trong remote-tracking refs cục bộ nhưng không xuất hiện trong danh sách nhánh GitHub được kiểm tra; xem đây là ref cũ, không phải nhánh sản phẩm hiện hành.
- `origin/database-ingest-0.2` (`0d34c88`) là nhánh mới hơn và chứa lịch sử của `origin/database-ingest` (`48f8cd4`) cùng 7 commit bổ sung, tiếp tục migration tới `0030`. Nếu cần port phần DB, review `database-ingest-0.2` thay vì xử lý cả hai nhánh.
- Tại baseline `4bbdb61`, `hiep` có 11 commit riêng so với các nhánh remote; các nhánh có commit riêng lần lượt là: `main` 21, `thien` 23, `database-ingest` 13 và `database-ingest-0.2` 20. `main` là tổ tiên trực tiếp của `thien`; hai nhánh này không cùng tip.
- Đã chạy kiểm tra merge mô phỏng tại baseline `4bbdb61`, không thay đổi working tree: `hiep` với `main` có 17 xung đột; `hiep` với `database-ingest-0.2` có 22 xung đột.
- Không merge tự động: cả hai nhánh đặt migration khác nhau dưới cùng số `0004` và `0005`. Trong `hiep`, chúng là auth credential/OTP và auth rate limit; trong nhánh DB, chúng là idempotency owner key và wallet boundary. Tên file khác nhau nên cần đối chiếu migration runner/schema, không chỉ dựa vào xung đột Git.
- Bước cần DevB/DB owner xác nhận: branch/schema đang được dùng, migration/checksum và schema state trên từng môi trường, quyền test và backup/restore. Lập kế hoạch tương thích theo state thực tế trước khi port; không chỉ lấy số migration lớn nhất, không sửa migration đã chạy và không đưa `defaultdb` vào destructive test.

## Phạm vi giao diện còn thiếu

- Backend API có các route domain và owner-scope integration đã pass trên MySQL CI cô lập.
- Frontend hiện mới có luồng auth và màn hình sau đăng nhập ở mức chào user, kết nối Google và đăng xuất. Chưa có màn hình sản phẩm cho wallet onboarding, dashboard, income/payment, history, savings, category/budget, report hoặc issue/admin. Vì vậy các API domain chưa tạo thành trải nghiệm MVP hoàn chỉnh cho sinh viên.

## Còn cần hoàn tất

1. **Làm lát cắt giao diện domain đầu tiên**: wallet/dashboard, income/payment và lịch sử; sau đó savings, category/budget, report và issue/admin. Nối API hiện có, owner luôn lấy từ session. DevB có thể chuẩn bị DB song song.
2. **Đối chiếu SRS với tính năng và test**: tạo bảng yêu cầu → màn/API → test → kết quả. Checkout hiện không có bản SRS; dùng bản có thẩm quyền của nhóm và không sửa bản gốc.
3. **Kiểm chứng staging auth**: đăng ký/OTP, reset password, mã sai/hết hạn/resend, logout/session revoke và lỗi SMTP; cấu hình và thử Google Sign-In/link thật theo ADR-0009. Chưa có staging URL hoặc mailbox test được cung cấp trong handoff này, nên chưa thể chạy các bước live.
4. **Chốt DB với DevB/DB owner**: xác nhận test DB riêng, migration/checksum/schema state từng target, quyền create/drop, TLS/CA, runtime role least-privilege và backup/restore. Không dùng Aiven `defaultdb` cho test destructive.
5. **Kiểm tra UI/accessibility/compatibility**: bàn phím, focus, screen reader cơ bản, màn hình nhỏ và Chrome/Firefox/Edge/Opera; ghi phiên bản, viewport, ngày và kết quả.
6. **Hoàn thiện Project Report và evidence originality**: problem statement, sơ đồ, module/logic, phân công, hướng dẫn cài/chạy/kiểm tra, giới hạn, test evidence và nguồn tham khảo; thành viên cần giải thích được phần mình làm.
7. **Đóng gói cuối**: chạy CI trên commit chốt, kiểm tra demo/build, lưu commit/tag và chuẩn bị gói nộp.

Checklist theo từng trọng số và thứ tự thực hiện nằm trong [QUALITY-AND-SCORING.md](./QUALITY-AND-SCORING.md). Các câu hỏi nguyên lý đã có câu trả lời và trạng thái áp dụng trong [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md); phần ghi trong tài liệu không đồng nghĩa mọi hạng mục đã được kiểm thử.

## Owner

- Developer A: auth, OTP/email adapter, session, CSRF/Origin và auth UI.
- Developer B: MySQL, migrations, wallet, ledger, savings, budgets, reports và DB permissions.
- Team Leader: contract, tích hợp, evidence và quyết định GO/NO-GO.
- Developer C/D: UI/accessibility và kiểm thử/release theo [TEAM-BOARD.md](./TEAM-BOARD.md).
