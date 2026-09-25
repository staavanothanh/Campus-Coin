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

- `586a7ce` — chỉnh cooldown/quota OTP, chỉ tin IP proxy đã cấu hình, bổ sung test, cập nhật OpenAPI/artifacts và trạng thái tài liệu.
- `36ed519` — thêm chốt để MySQL destructive tests yêu cầu bật cờ và tên DB có prefix `campus_coin_test_`; thêm test kiểm tra owner-scope qua HTTP cho hai tài khoản.
- Bổ sung hiện tại — form dùng `fieldset`/`legend`, giữ native validation và một `submit` handler; sửa email test owner để luôn hợp lệ; câu hỏi nguyên lý và cách áp dụng được ghi ở [ENGINEERING-PRINCIPLES-APPLICATION.md](./ENGINEERING-PRINCIPLES-APPLICATION.md).
- Chốt DB test không chạy trên `defaultdb`. CI tạo MySQL riêng cho job; test harness tạo schema tạm có tên rõ ràng rồi xóa schema đó sau khi chạy.
- SMTP register đã được Team Leader báo gửi/nhận thành công. Đây là evidence cho đăng ký; reset-password và tình huống provider lỗi chưa được xác nhận bằng SMTP thật.

## Evidence kiểm tra gần nhất

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `node --import tsx --test tests/db-test-guard.test.ts`: 3/3 pass.
- `node --import tsx --test tests/auth.test.ts tests/client-ip.test.ts`: 19/19 pass.
- `npm run api:validate`: pass; còn 5 lint warnings về response 4xx ở endpoint discovery, redirect/callback và health.
- `db:datatest` đã qua trong run #3 trên MySQL CI cô lập. MySQL integration/E2E chưa pass: command của run #3 thất bại và chưa có log nêu test cụ thể.
- CI gần nhất cho commit `36ed519` là [workflow run #3](https://github.com/staavanothanh/Campus-Coin/actions/runs/36111118954): typecheck, build, API checks, unit tests và `db:datatest` chạy trước đó thành công; command gộp MySQL integration/E2E thất bại. GitHub chỉ trả annotation `exit code 1`, chưa cho biết test cụ thể. Mã test owner từng tạo email có dấu cách; đã sửa sang địa chỉ hợp lệ và cần workflow kế tiếp xác nhận.

## Còn cần hoàn tất

1. Kiểm tra workflow mới sau khi push; MySQL integration/E2E chỉ được đánh dấu pass khi command chạy thành công trên MySQL disposable.
2. Trên staging đã cấu hình SMTP, xác minh register và reset-password gửi thư thật; thử OTP sai/hết hạn/resend, logout và session bị thu hồi. Không ghi mã OTP/token/email đầy đủ vào log hoặc tài liệu evidence.
3. DevB/DB owner xác nhận DB thử nghiệm tách biệt, quyền create/drop schema, TLS/CA và role runtime least-privilege. Không chạy test destructive trên Aiven `defaultdb` hoặc DB dữ liệu chung.
4. Nếu CI phát hiện route/domain lỗi, sửa theo contract rồi chạy lại workflow. Nếu staging chưa có hostname hoặc SMTP test mailbox, ghi gate là đang chờ cấu hình staging, không gọi đó là pass.
5. Cập nhật kết quả, ngày, commit và link workflow ở [DELIVERY-PLAN.md](./DELIVERY-PLAN.md).

## Owner

- Developer A: auth, OTP/email adapter, session, CSRF/Origin và auth UI.
- Developer B: MySQL, migrations, wallet, ledger, savings, budgets, reports và DB permissions.
- Team Leader: contract, tích hợp, evidence và quyết định GO/NO-GO.
- Developer C/D: UI/accessibility và kiểm thử/release theo [TEAM-BOARD.md](./TEAM-BOARD.md).
