# Campus Coin — Chỉ mục quyết định

> Ngày chuẩn hóa: 2026-09-24 · Người quyết định: Team Leader (người dùng) · SRS gốc không sửa.

Các quyết định chi tiết được chuẩn hóa theo ADR trong [`docs/adr/README.md`](./adr/README.md). File này là bảng tra nhanh, không phải bản sao thứ hai của toàn bộ lý do.

| ADR | Quyết định | Trạng thái | Hệ quả chính |
|---|---|---|---|
| [0001](./adr/0001-google-oauth-only.md) | Chỉ Google OAuth | Bị ADR-0008 thay thế; Google được thêm lại tùy chọn tại ADR-0009 | Giữ nguyên làm lịch sử quyết định cũ |
| [0002](./adr/0002-opaque-browser-session.md) | Opaque browser session | Đã chấp nhận | Owner lấy từ session; JWT browser không dùng trong MVP |
| [0003](./adr/0003-cloud-mysql-validation-gate.md) | Cloud MySQL | Đã chấp nhận có điều kiện | Provider/region/free-tier/restore phải được kiểm chứng Day 1 |
| [0004](./adr/0004-vercel-domain-no-custom-email.md) | Domain Vercel, không custom email domain | Đã chấp nhận | Domain decision còn hiệu lực; auth email/OTP theo ADR-0008 |
| [0005](./adr/0005-immutable-money-domain.md) | Miền tiền bất biến | Đã chấp nhận | `income`/`payment`, VND nguyên, savings tách riêng, budget warning-only |
| [0006](./adr/0006-optional-openrouter-jev.md) | JEV tùy chọn qua OpenRouter | Đã chấp nhận có điều kiện | Default-off, typed probe, manual fallback, không money authority |
| [0007](./adr/0007-five-day-thin-slice.md) | Thin-slice 4–5 ngày | Đã chấp nhận | Bốn developer; Team Leader sở hữu tích hợp và GO/NO-GO |
| [0008](./adr/0008-email-password-otp-auth.md) | Email + mật khẩu + OTP | Đã chấp nhận bởi Team Leader ngày 2026-09-24 | Luồng email tiếp tục hoạt động; production gates vẫn mở |
| [0009](./adr/0009-optional-google-sign-in.md) | Google Sign-In tùy chọn | Đã chấp nhận bởi Team Leader ngày 2026-09-24 | Thêm Google OIDC; không Gmail API; không tự động gộp theo email |
| [0010](./adr/0010-safe-integer-money-range.md) | Miền integer an toàn cho tiền VND | Đã chấp nhận ngày 2026-09-26 | Application, OpenAPI và MySQL đều chặn số tiền vượt `9007199254740991` |

## Quản trị quyết định

Thay đổi auth mode, ledger invariant, JEV authority, provider/domain hoặc scope cut phải có ADR mới hoặc ADR thay thế. Provider, model, quota, cost, SLA, backup/RPO/RTO và latency chỉ là sự thật sau khi có evidence từ account/docs/runtime. Auth hiện hành giữ email/password/OTP theo ADR-0008 và bổ sung Google Sign-In tùy chọn theo ADR-0009. Không dùng Gmail credential cá nhân, Gmail inbox/API hoặc tự động liên kết theo email.
