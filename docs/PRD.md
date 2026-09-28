# PRD — Campus Coin

## 1. Tóm tắt

Campus Coin là ứng dụng Web song ngữ cho sinh viên ghi nhận `income` và `payment` do chính người dùng nhập, theo dõi wallet, savings, budget và báo cáo. Sản phẩm không phải ngân hàng, không giữ tiền thật, không xử lý thanh toán thật, không cho vay, không BNPL và không tư vấn tài chính được chứng nhận.

Mục tiêu là giúp người dùng nhìn thấy dòng tiền của mình bằng số liệu deterministic. Backend/domain là nguồn sự thật; browser không tính số dư và JEV không có quyền tài chính.

## 2. Người dùng và nguyên tắc

- Sinh viên có thể đăng ký/xác minh qua email OTP và đăng nhập bằng email/mật khẩu hoặc Google Sign-In tùy chọn; chỉ xem/sửa dữ liệu của chính mình.
- Admin giới hạn chỉ xử lý report/issue, nội dung được cấp quyền và audit; không sửa ledger hay số dư.
- Locale `en`/`vi` chỉ thay đổi copy/formatting. Currency là VND. Kỳ báo cáo dùng `Asia/Ho_Chi_Minh`.

## 3. Phạm vi MVP 4–5 ngày

### 3.1 Xác thực và phiên

- Đăng ký bằng email → OTP; chỉ tạo user/credential sau khi mã hợp lệ.
- Đăng nhập bằng email/password; thành công tạo opaque server-side session với cookie bảo mật.
- Quên mật khẩu bằng email OTP; reset thu hồi các session cũ.
- Login rate-limit theo account/IP; OTP expiry, maximum attempts, resend cooldown và single-use.
- Google Sign-In dùng OIDC server-side; user đăng nhập email có thể chủ động kết nối Google trong session.
- Tài khoản Google thiếu mật khẩu email hoặc tên hiển thị phải hoàn tất hồ sơ trước khi dùng API domain. Người dùng tự đặt tên và tạo mật khẩu email; hệ thống không tự nối account theo email.
- Trong Cài đặt, người dùng có thể yêu cầu mã OTP để tạo/đổi mật khẩu email; xác nhận thành công thu hồi session cũ và yêu cầu đăng nhập lại.
- Không tự động merge account theo email; không dùng Gmail credential cá nhân, Gmail inbox hoặc Gmail API.
- Gửi email qua SMTP server adapter; provider cụ thể cần được chọn và kiểm chứng.

### 3.2 Wallet, ledger và savings

- User nhập opening wallet balance; baseline không phải income.
- Ledger chỉ có `income` và `payment`, amount là số nguyên VND dương trong miền integer an toàn của API, tối đa `9007199254740991`.
- Ledger đã commit immutable; correction là row append-only có reason/reference/audit.
- Payment chỉ commit khi wallet đủ tiền tại transaction commit; payment thiếu tiền bị từ chối atomic.
- Savings deposit/withdraw là internal transfer atomic, tách khỏi income/payment/budget.
- Payment có thể lưu `itemName` riêng với `description`; form gợi ý tối đa 10 mặt hàng owner đã mua thường xuyên và so sánh số tiền/khoảng cách ngày khi đủ lịch sử. Gợi ý chỉ dùng payment của chính user, không tạo catalogue toàn cục.
- Form thu/chi cho phép chọn ngày giao dịch theo `Asia/Ho_Chi_Minh`, mặc định là ngày hiện tại. Có thể ghi giao dịch nhập lùi ngày; ngày tương lai bị từ chối ở giao diện và API. Ngày chọn được gửi thành `occurredAt` tại đầu ngày HCMC để tính kỳ báo cáo nhất quán.

### 3.3 Category, budget và report

- Category có `applies_to=income|payment`; category disabled không nhận bản ghi mới nhưng history vẫn đọc được.
- Budget chỉ tính payment theo user/category/local month. Vượt budget là warning, không chặn wallet-sufficient payment.
- Dashboard/report do backend tính deterministic; có bảng tương đương biểu đồ.
- Report cho so tổng payment theo danh mục của tháng đang xem với tháng liền trước; nếu tháng trước rỗng, giao diện báo thiếu dữ liệu thay vì tạo phần trăm gây hiểu nhầm.

### 3.4 UI và admin

- Onboarding wallet, dashboard, income/payment, history, savings, category/budget, report và user report.
- Admin queue tối thiểu: triage, status, priority, note; server enforce least privilege.
- Có `en`/`vi`, VND, HCMC, pie/bar, dark/light độc lập, keyboard/focus/loading/error/accessibility states.

### 3.5 JEV tùy chọn

- JEV chỉ gợi ý category trước submit từ tập ứng viên giới hạn.
- Backend gọi OpenRouter typed System One/Decisions; không gọi từ browser.
- Feature flag mặc định tắt; transport model/endpoint phải qua Day-1 probe.
- User phải xác nhận; timeout/quota/schema/privacy/low-confidence dùng manual picker.
- JEV không tính tiền, không authorize và không ghi ledger.

### 3.6 Kế hoạch dòng tiền

- Người dùng có thể khai báo khoản phải trả hoặc khoản thu dự kiến một lần/hàng tháng; khoản định kỳ chỉ tạo nhắc lịch, không tự tạo giao dịch.
- Mặc định xem 30 ngày; người dùng có thể chọn 90, 180 (xấp xỉ sáu tháng) hoặc 365 ngày để xem xa hơn. Chỉ kế hoạch do người dùng khai báo được đưa vào, không tự suy ra lịch học hay ngày nhận tiền.
- Lịch nhắc và dự báo hiện tại cập nhật ngay theo trạng thái bật/tắt mà người dùng chọn. Khi đối chiếu tháng đã qua, hệ thống dùng trạng thái đầu ngày HCMC; thay đổi đúng ngày đến hạn bắt đầu có hiệu lực trong phần đối chiếu từ ngày tiếp theo.
- Nhắc khoản đến hạn trong 10 ngày. Khoản phải trả có lựa chọn tính trước trong dự báo; lựa chọn này không trừ wallet, không ghi `payment` và không tăng mức đã dùng của budget.
- Cho xem dự báo và mô phỏng một `payment` giả định trong cùng khoảng xem. Kết quả advisory, không phải số dư ngân hàng, quyết định khả năng thanh toán hay quyền ghi giao dịch.
- Sau khi tháng kết thúc, cho so sánh tổng kế hoạch với tổng `income`/`payment` đã ghi, không chấm điểm và chưa ghép từng kế hoạch với từng giao dịch; thiếu bản ghi được giữ là chưa ghi nhận, không coi là 0.

### 3.7 Nhận diện hóa đơn

- Người dùng có thể chụp/tải JPEG hoặc PNG và chủ động đồng ý gửi ảnh tới OCR provider. OCR chỉ điền bản nháp số tiền và mô tả; người dùng kiểm tra rồi mới ghi `payment` bằng flow hiện có.
- Ảnh không được lưu bởi Campus Coin; nhập tay luôn dùng được khi OCR/provider lỗi. Feature flag tắt mặc định cho tới khi cấu hình provider, quota/chi phí và kiểm tra quyền riêng tư.

## 4. Tiêu chí chấp nhận

1. Register/verify/login/session và forgot/reset đạt auth security gates; user A không truy cập được user B.
2. Ledger chỉ nhận `income`/`payment`, VND nguyên dương không vượt `9007199254740991`, category đúng loại.
3. Payment thiếu wallet bị reject atomic, không tạo row, wallet không âm; retry idempotency không duplicate.
4. Savings atomic và không vào income/payment/budget totals.
5. Category history không hỏng khi disable; report deterministic theo HCMC.
6. Budget warning không chặn payment khi wallet đủ.
7. JEV off vẫn chạy toàn bộ money path; JEV on chỉ trả suggestion cần user confirmation.
8. UI có `en`/`vi`, VND, HCMC, chart/table, dark/light độc lập và trạng thái accessible.
9. Tài khoản Google chưa hoàn chỉnh không đọc/ghi domain cho tới khi có tên hiển thị và mật khẩu email; đổi mật khẩu qua Settings phải dùng OTP và revoke session cũ.
10. Kế hoạch và OCR không thay đổi authoritative wallet/ledger nếu người dùng chưa xác nhận giao dịch thật.
11. Cloud MySQL/Vercel chỉ release sau evidence TLS, connectivity, quota, backup/restore, auth và rollback.

## 5. Ngoài phạm vi MVP

Gmail inbox/Gmail credential cá nhân, tự động merge account theo email, SMS/passkey/MFA bắt buộc, ngân hàng, payment thật, ví thật, lending, BNPL, lãi suất, đầu tư, multi-currency, enterprise admin, CSV/PDF, tự động tạo giao dịch định kỳ, dự đoán chưa khai báo, chat, complex AI summary, autonomous action, custom email domain và auto-transfer chưa qua safety gate.

## 6. Cổng kiểm chứng

- MySQL provider/region/free-tier, TLS, connection, Vercel connectivity và restore: kiểm chứng Day 1; không dùng local DB production.
- OpenRouter key, typed endpoint/model, quota, cost, latency và privacy: kiểm chứng Day 1; thất bại thì JEV off.
- Team Leader quyết định GO/NO-GO sau auth, domain, restore, security, UI, rollback và production smoke evidence.

## 7. Nguồn quyết định

Xem [ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0009](./adr/0009-optional-google-sign-in.md), [ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md) và [ADR-0007](./adr/0007-five-day-thin-slice.md).
