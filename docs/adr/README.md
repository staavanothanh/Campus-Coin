# Hồ sơ quyết định kiến trúc

Đây là nguồn lịch sử chuẩn cho các quyết định khó đảo ngược của Campus Coin. Mỗi ADR ghi bối cảnh, quyết định, phương án bị loại, hệ quả và rủi ro. `docs/README.md` là bản đồ tài liệu; `docs/DELIVERY-PLAN.md` là trạng thái và kế hoạch thực thi.

| ADR | Tiêu đề | Trạng thái | Ngày |
|---|---|---|---|
| [0001](0001-google-oauth-only.md) | Chỉ dùng Google OAuth trong MVP | Bị ADR-0008 thay thế; Google được thêm lại tùy chọn tại ADR-0009 | 2026-09-24 |
| [0002](0002-opaque-browser-session.md) | Phiên opaque phía máy chủ cho trình duyệt | Đã chấp nhận | 2026-09-24 |
| [0003](0003-cloud-mysql-validation-gate.md) | Cloud MySQL qua cổng kiểm chứng | Đã chấp nhận | 2026-09-24 |
| [0004](0004-vercel-domain-no-custom-email.md) | Dùng domain Vercel, chưa dùng email domain riêng | Đã chấp nhận; điều kiện không dùng email auth/reset được ADR-0008 thay thế | 2026-09-24 |
| [0005](0005-immutable-money-domain.md) | Miền tiền bất biến và tách savings | Đã chấp nhận | 2026-09-24 |
| [0006](0006-optional-openrouter-jev.md) | JEV tùy chọn qua OpenRouter | Đã chấp nhận có điều kiện | 2026-09-24 |
| [0007](0007-five-day-thin-slice.md) | Phạm vi thin-slice năm ngày và quyền sở hữu | Đã chấp nhận | 2026-09-24 |
| [0008](0008-email-password-otp-auth.md) | Email, mật khẩu và OTP | Đã chấp nhận; luồng email tiếp tục có hiệu lực | 2026-09-24 |
| [0009](0009-optional-google-sign-in.md) | Google Sign-In là phương thức bổ sung | Đã chấp nhận bởi Team Leader; bổ sung Google vào ADR-0008 | 2026-09-24 |
| [0008](0008-runtime-row-authorization-boundary.md) | Ranh giới owner authorization và runtime DB role | Đã chấp nhận | 2026-09-25 |
| [0009](0009-shared-database-migration-baselines.md) | Baseline hội tụ migration trên database shared | Đã chấp nhận | 2026-09-25 |
**Xung đột auth chưa giải quyết:** ADR-0001 ghi Google OAuth-only, ADR-0008 (A) chấp nhận email/password/OTP và ADR-0009 (A) thêm Google; B giữ ADR-0001 Google-only. Không coi các quyết định auth trên hai nhánh là đã được hợp nhất hay có precedence thống nhất.
**Lưu ý:** ADR-0008 và ADR-0009 có cùng số hiệu trên hai nhánh nhưng nội dung khác. Các dòng auth của A và các dòng DB/authorization của B được giữ để không làm mất quyết định; số hiệu và precedence cần được hợp nhất trước khi bất kỳ ADR nào được coi là canonical. Mục lục hiện hành vẫn mô tả auth theo A; phần Google Sign-In tại ADR-0009 (A) đối lập với ADR-0009 migration baselines (B), và cần được đánh số/định tuyến lại trong lần xử lý ADR tiếp theo.
