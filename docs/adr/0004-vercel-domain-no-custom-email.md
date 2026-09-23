# ADR-0004: Dùng domain Vercel, chưa dùng email domain riêng

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

MVP cần phát hành trong bốn đến năm ngày. Custom domain, SPF, DKIM, DMARC và email notification có rủi ro delivery, quota và privacy nhưng không tạo giá trị bắt buộc cho money path.

## Quyết định

Web/API triển khai trên domain do Vercel cung cấp. Custom domain và email domain riêng không phải điều kiện launch. Notification email tắt mặc định; chỉ xem xét lại khi có provider-managed sender đã kiểm chứng mà không làm chậm release.

Không đọc Gmail inbox, không gửi bằng credential Gmail cá nhân và không dùng email cho security reset trong MVP Google-only.

## Phương án bị loại

- **Custom domain ngay trong MVP:** tăng cấu hình DNS và delivery gate.
- **Gmail cá nhân làm mail server:** sai boundary, rủi ro credential và privacy.
- **Email là dependency đăng nhập:** trái với quyết định Google OAuth-only.

## Hệ quả

JEV, email tùy chọn và provider lỗi không được chặn money path. Rollback trỏ về deployment Vercel đã biết tốt.

## Rủi ro và kiểm chứng

Kiểm tra exact redirect URI, environment scope, health check, redacted logs và rollback trên domain Vercel.
