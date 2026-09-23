# PRD — Campus Coin

## 1. Tóm tắt

Campus Coin là ứng dụng Web song ngữ cho sinh viên ghi nhận `income` và `payment` do chính người dùng nhập, theo dõi wallet, savings, budget và báo cáo. Sản phẩm không phải ngân hàng, không giữ tiền thật, không xử lý thanh toán thật, không cho vay, không BNPL và không tư vấn tài chính được chứng nhận.

Mục tiêu là giúp người dùng nhìn thấy dòng tiền của mình bằng số liệu deterministic. Backend/domain là nguồn sự thật; browser không tính số dư và JEV không có quyền tài chính.

## 2. Người dùng và nguyên tắc

- Sinh viên dùng Google OAuth và chỉ xem/sửa dữ liệu của chính mình.
- Admin giới hạn chỉ xử lý report/issue, nội dung được cấp quyền và audit; không sửa ledger hay số dư.
- Locale `en`/`vi` chỉ thay đổi copy/formatting. Currency là VND. Kỳ báo cáo dùng `Asia/Ho_Chi_Minh`.

## 3. Phạm vi MVP 4–5 ngày

### 3.1 Xác thực và phiên

- Chỉ đăng nhập bằng Google OAuth.
- Tạo hoặc dùng lại user theo `(provider=google, subject=sub)`.
- Kiểm tra state, PKCE, nonce, issuer, audience, expiry và verified email.
- Callback tạo opaque server-side session với cookie bảo mật.
- Không có local password, password credential, account linking, OTP/password reset, Gmail inbox hoặc Gmail cá nhân.

### 3.2 Wallet, ledger và savings

- User nhập opening wallet balance; baseline không phải income.
- Ledger chỉ có `income` và `payment`, amount là số nguyên VND dương.
- Ledger đã commit immutable; correction là row append-only có reason/reference/audit.
- Payment chỉ commit khi wallet đủ tiền tại transaction commit; payment thiếu tiền bị từ chối atomic.
- Savings deposit/withdraw là internal transfer atomic, tách khỏi income/payment/budget.

### 3.3 Category, budget và report

- Category có `applies_to=income|payment`; category disabled không nhận bản ghi mới nhưng history vẫn đọc được.
- Budget chỉ tính payment theo user/category/local month. Vượt budget là warning, không chặn wallet-sufficient payment.
- Dashboard/report do backend tính deterministic; có bảng tương đương biểu đồ.

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

## 4. Tiêu chí chấp nhận

1. Google callback lỗi không tạo session hoặc financial row; user A không truy cập được user B.
2. Ledger chỉ nhận `income`/`payment`, VND nguyên dương, category đúng loại.
3. Payment thiếu wallet bị reject atomic, không tạo row, wallet không âm; retry idempotency không duplicate.
4. Savings atomic và không vào income/payment/budget totals.
5. Category history không hỏng khi disable; report deterministic theo HCMC.
6. Budget warning không chặn payment khi wallet đủ.
7. JEV off vẫn chạy toàn bộ money path; JEV on chỉ trả suggestion cần user confirmation.
8. UI có `en`/`vi`, VND, HCMC, chart/table, dark/light độc lập và trạng thái accessible.
9. Cloud MySQL/Vercel chỉ release sau evidence TLS, connectivity, quota, backup/restore, auth và rollback.

## 5. Ngoài phạm vi MVP

Local auth, linking, OTP/reset, Gmail inbox/Gmail cá nhân, security-email, ngân hàng, payment thật, ví thật, lending, BNPL, lãi suất, đầu tư, multi-currency, enterprise admin, CSV/PDF, recurring, prediction, chat, complex AI summary, autonomous action, custom email domain và auto-transfer chưa qua safety gate.

## 6. Cổng kiểm chứng

- MySQL provider/region/free-tier, TLS, connection, Vercel connectivity và restore: kiểm chứng Day 1; không dùng local DB production.
- OpenRouter key, typed endpoint/model, quota, cost, latency và privacy: kiểm chứng Day 1; thất bại thì JEV off.
- Team Leader quyết định GO/NO-GO sau auth, domain, restore, security, UI, rollback và production smoke evidence.

## 7. Nguồn quyết định

Xem [ADR-0001](./adr/0001-google-oauth-only.md), [ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md) và [ADR-0007](./adr/0007-five-day-thin-slice.md).
