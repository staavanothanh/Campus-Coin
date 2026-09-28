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
| [0008](0008-runtime-row-authorization-boundary.md) | Ranh giới owner authorization và runtime DB role | Đã chấp nhận | 2026-09-25 |
| [0009](0009-shared-database-migration-baselines.md) | Baseline hội tụ migration trên database shared | Đã chấp nhận; numbering được bổ sung bởi ADR-0010 | 2026-09-25 |
| [0010](0010-auth-migration-numbering.md) | Đánh số migration auth sau DB chain | Đã chấp nhận | 2026-09-28 |
| [0011](0011-guidance-only-cashflow-plans.md) | Kế hoạch dòng tiền chỉ mang tính hướng dẫn | Đề xuất, chờ Team Leader xác nhận | 2026-09-28 |
| [0009](0009-optional-google-sign-in.md) | Google Sign-In là phương thức bổ sung | Đã chấp nhận; bổ sung Google vào ADR-0008 | 2026-09-24 |

Số hiệu ADR-0008 và ADR-0009 xuất hiện ở nhiều file do hai nhánh độc lập; tiêu đề và đường dẫn xác định nội dung. Không đổi nội dung hoặc lịch sử đã chấp nhận. ADR-0010 chỉ supersede phần thứ tự/versioning migration auth của ADR-0008; các quyết định auth khác giữ nguyên.

Mọi thay đổi đối với phương thức xác thực, bất biến tiền, quyền của JEV, nền tảng triển khai hoặc phạm vi MVP phải tạo ADR mới hoặc đánh dấu ADR cũ bị thay thế. Không sửa lịch sử để che giấu quyết định trước đó.
