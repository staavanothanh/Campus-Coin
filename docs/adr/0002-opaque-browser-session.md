# ADR-0002: Phiên opaque phía máy chủ cho trình duyệt

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

Campus Coin là ứng dụng trình duyệt cùng domain với API. Quyền sở hữu dữ liệu và quyền mutation phải được xác định từ server, không từ email, role hoặc ID do client gửi.

## Quyết định

Sau OAuth callback, server tạo phiên opaque ngẫu nhiên, chỉ lưu hash phiên cùng user, thời hạn, trạng thái revoke và metadata tối thiểu. Cookie dùng `HttpOnly`, `Secure`, `SameSite=Lax` hoặc chặt hơn sau kiểm thử callback. Mutation áp dụng CSRF/origin control; owner lấy từ session.

JWT không dùng làm browser session trong MVP. JWT chỉ được cân nhắc cho consumer service-to-service cụ thể sau này.

## Phương án bị loại

- **JWT browser mặc định:** khó revoke tức thời và dễ làm lộ quyền nếu lưu sai.
- **Email hoặc user ID từ request:** cho phép IDOR và không thể là nguồn sự thật.
- **Token trong localStorage hoặc URL:** tăng nguy cơ XSS, rò rỉ referer và log.

## Hệ quả

Auth, API và UI phải phân biệt 401 với 403. Sign-out, expiry, disable user và revoke phải xóa quyền truy cập trước khi đọc dữ liệu.

## Rủi ro và kiểm chứng

Kiểm thử callback, cookie, expiry, revoke, CSRF, owner isolation và provider failure trong smoke Day 1–4.
