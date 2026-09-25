# API contract — Campus Coin

## Nguồn sự thật

[`openapi.yaml`](./openapi.yaml) là HTTP contract canonical duy nhất cho MVP. Không duy trì schema payload độc lập trong prose, mock hoặc frontend/backend type thủ công.

## Generated artifacts

Các file dưới `artifacts/` được tạo từ OpenAPI và không được sửa tay:

- `artifacts/openapi.json`: bundle OpenAPI đã resolve.
- `artifacts/api.d.ts`: TypeScript types sinh từ OpenAPI.

Regenerate:

```text
npm run api:validate
npm run api:bundle
npm run api:types
```

## Boundary bắt buộc

- Prefix `/api/v1`.
- Browser dùng opaque server session cookie cho email/password/OTP và Google Sign-In tùy chọn theo ADR-0009.
- Google OIDC chạy phía server với `openid email profile`, PKCE/state/nonce; không Gmail API/token storage và không auto-link theo email.
- Email OTP đi qua SMTP server adapter; không dùng Gmail credential cá nhân, inbox hoặc API.
- State-changing request cần Origin/CSRF policy. Logout của session còn hiệu lực cần Origin hợp lệ và CSRF token hiện tại; nếu session đã hết hạn/bị thu hồi hoặc không có session, endpoint vẫn trả thành công và xóa cookie để hỗ trợ gọi lặp.
- Money mutation cần `Idempotency-Key`; retry cùng body trả kết quả cũ, body khác trả conflict.
- Money là integer VND; ledger type chỉ `income`/`payment`; savings transfer tách riêng.
- List lớn dùng opaque keyset cursor, không yêu cầu exact `total`.
- JEV hiện chưa có runtime endpoint trong OpenAPI; giữ default-off cho đến khi typed adapter/provider probe và fallback được kiểm chứng.
- Error code locale-neutral; message hiển thị do client localization kiểm soát.

## Những điểm chưa là quyết định kiến trúc

Các chi tiết API cần implementation review nhưng không được tự sửa ADR: role provisioning admin, danh sách role least privilege, CSRF token transport, correction command nội bộ/user-facing, read-only incident switch và retention idempotency. Khi chốt quyết định khó đảo ngược, tạo ADR riêng theo quy trình hiện tại.
