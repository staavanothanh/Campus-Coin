# ADR-0001: Chỉ dùng Google OAuth trong MVP

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

MVP cần đăng nhập an toàn trong thời gian ngắn và không nên mở thêm bề mặt xử lý mật khẩu, khôi phục tài khoản hoặc liên kết danh tính. Gmail chỉ được dùng như nguồn identity và email claim do Google cung cấp.

## Quyết định

MVP chỉ dùng Google OAuth Authorization Code với state, PKCE, nonce, issuer, audience, subject, expiry và chính sách email đã xác minh. Định danh là `(provider=google, subject=sub)`. Callback tạo hoặc dùng lại user rồi tạo phiên opaque phía máy chủ.

MVP không có local password, password credential, account linking, OTP/password reset, SMS, provider OAuth khác, đọc Gmail inbox hoặc dùng credential Gmail cá nhân.

## Phương án bị loại

- **Email/mật khẩu cục bộ:** tăng phạm vi lưu trữ, hash, reset và chống enumeration.
- **Tự động merge theo email:** có nguy cơ chiếm hoặc gộp nhầm tài khoản.
- **OTP qua email/Gmail:** đòi hỏi provider email và thêm đường dẫn bảo mật không cần cho MVP.

## Hệ quả

- Người không dùng được Google nằm ngoài phạm vi MVP.
- Developer A sở hữu callback, session, CSRF/origin và IDOR.
- Không có dependency email bảo mật trên critical path.

## Rủi ro và kiểm chứng

Callback production, claims, session revoke và owner isolation phải được kiểm chứng trên domain Vercel ở Day 1. Thất bại là NO-GO.
