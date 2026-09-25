# Review rủi ro API — Campus Coin

> Ngày: 2026-09-24 · Đây là working design evidence; không sửa ADR hoặc architecture canonical.

## Cổng bảo mật

- Session response phải `Cache-Control: no-store, private` và không được cache ở edge.
- State-changing request phải kiểm tra Origin/Referer allowlist trước CSRF token.
- CSRF token phải bind với active session và tự vô hiệu khi session revoke.
- Logout của session còn hiệu lực vẫn cần CSRF token đúng; CSRF sai phải trả `403` và giữ session. Khi session không còn hiệu lực, logout phải idempotent: trả thành công và clear cookie, kể cả khi client còn gửi session cookie cũ.
- Owner lấy từ session; cross-owner resource trả 404 hoặc 403 theo contract, không leak existence.
- `relatedTransactionId` trong issue phải kiểm tra ownership.

## Admin

- Không dùng `INITIAL_ADMIN_GOOGLE_SUB` để tự re-elevate role ở mỗi callback.
- Role provisioning admin cần explicit seed/CLI hoặc one-time verified bootstrap; role sau đó lấy từ DB.
- Role phải least-privilege; support không mặc định xem audit, security mới xem audit.
- Admin không được gọi money mutation, sửa ledger, balance hoặc audit.
- System category/content/feature flag mutation nếu cần phải là admin endpoint riêng, có reason/version/approval/audit.
- Incident read-only/kill-switch là operational capability cần thiết kế riêng trước production, không thêm âm thầm vào MVP contract.

## Ledger correction

- Public user correction chỉ nên expose reversal nếu chưa có product decision khác.
- Correction row kế thừa transaction type của target; client không gửi type.
- Chỉ target original chưa có reversal; không chain reversal/reverse correction.
- Reversal income phải kiểm tra wallet đủ để không âm; transaction rollback atomic khi fail.
- Correction timestamp/report semantics phải được chốt để không làm sai report tháng HCMC.
- `adjustment`/`replacement` là internal domain commands cho đến khi có contract và UI approval rõ.

## Response và pagination

- JSON API dùng một envelope nhất quán: `{ success, data, error, meta }`; 204 là ngoại lệ không body.
- Budget warning nằm trong `data.budgetWarning`.
- Keyset pagination dùng opaque signed/validated cursor và `hasNext`/`limit`; không trả exact `total` cho list ledger lớn.
- Error code locale-neutral; message không được chứa stack trace/provider payload/secret.

## Domain scope

- Savings không có `targetAmountVnd` trong MVP nếu domain chưa chốt.
- Không có DELETE category; dùng disable/retire và giữ history.
- Idempotency kiểm tra trước domain existence check để retry network trả kết quả đã lưu.
- Date filter phải khai báo rõ `Asia/Ho_Chi_Minh`, local date hoặc UTC instant; month dùng `YYYY-MM`.

## Trạng thái

OpenAPI hiện là contract draft đã parse/validate. Redocly còn warnings style/strictness về operationId, tag description, license URL và response 2xx/4xx cho redirect/health; cần harden trước khi coi contract review-ready. Không coi đây là implementation hoặc production readiness.
