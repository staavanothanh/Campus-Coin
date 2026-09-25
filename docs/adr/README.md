# Hồ sơ quyết định kiến trúc

Đây là nguồn lịch sử chuẩn cho các quyết định khó đảo ngược của Campus Coin. Mỗi ADR ghi bối cảnh, quyết định, phương án bị loại, hệ quả và rủi ro. `docs/README.md` là bản đồ tài liệu; `docs/DELIVERY-PLAN.md` là trạng thái và kế hoạch thực thi.

| ADR | Tiêu đề | Trạng thái | Ngày |
|---|---|---|---|
| [0001](0001-google-oauth-only.md) | Chỉ dùng Google OAuth trong MVP | Đã chấp nhận | 2026-09-24 |
| [0002](0002-opaque-browser-session.md) | Phiên opaque phía máy chủ cho trình duyệt | Đã chấp nhận | 2026-09-24 |
| [0003](0003-cloud-mysql-validation-gate.md) | Cloud MySQL qua cổng kiểm chứng | Đã chấp nhận | 2026-09-24 |
| [0004](0004-vercel-domain-no-custom-email.md) | Dùng domain Vercel, chưa dùng email domain riêng | Đã chấp nhận | 2026-09-24 |
| [0005](0005-immutable-money-domain.md) | Miền tiền bất biến và tách savings | Đã chấp nhận | 2026-09-24 |
| [0006](0006-optional-openrouter-jev.md) | JEV tùy chọn qua OpenRouter | Đã chấp nhận có điều kiện | 2026-09-24 |
| [0007](0007-five-day-thin-slice.md) | Phạm vi thin-slice năm ngày và quyền sở hữu | Đã chấp nhận | 2026-09-24 |

Mọi thay đổi đối với phương thức xác thực, bất biến tiền, quyền của JEV, nền tảng triển khai hoặc phạm vi MVP phải tạo ADR mới hoặc đánh dấu ADR cũ bị thay thế. Không sửa lịch sử để che giấu quyết định trước đó.
