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
- Browser dùng opaque server session cookie; owner scope lấy từ session.
- State-changing request cần Origin/CSRF policy; endpoint logout phải idempotent và clear cookie kể cả khi token stale.
- Money mutation cần `Idempotency-Key`; retry cùng body trả kết quả cũ, body khác trả conflict.
- Money là integer VND; ledger type chỉ `income`/`payment`; savings transfer tách riêng.
- List lớn dùng opaque keyset cursor, không yêu cầu exact `total`.
- JEV endpoint chỉ advisory category suggestion, default-off, manual fallback; không ghi money.
- Error code locale-neutral; message hiển thị do client localization kiểm soát.

## Những điểm chưa là quyết định kiến trúc

Các chi tiết API cần implementation review nhưng không được tự sửa ADR: role provisioning admin, danh sách role least privilege, CSRF token transport, correction command nội bộ/user-facing, read-only incident switch và retention idempotency. Khi chốt quyết định khó đảo ngược, tạo ADR riêng theo quy trình hiện tại.
