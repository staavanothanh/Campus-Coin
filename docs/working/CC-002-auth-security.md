# CC-002 — Handoff xác thực và bảo mật

- **Chủ sở hữu human:** Developer A
- **Trạng thái:** Tư vấn đã tích hợp; không mở lại local auth cũ.
- **Quyết định:** [ADR-0001](../adr/0001-google-oauth-only.md), [ADR-0002](../adr/0002-opaque-browser-session.md).

## Phạm vi đã chốt

MVP chỉ Google OAuth Authorization Code + PKCE. Identity là `(google, sub)`. Callback kiểm tra state, nonce, PKCE, issuer, audience, expiry và verified email rồi tạo opaque server session.

Không có local registration/password, password credential, account linking, OTP/password reset, Gmail inbox, Gmail API read/send hoặc security-email.

## Kiểm soát

- Challenge one-time, TTL ngắn, bind browser flow.
- Session ID CSPRNG; DB lưu hash, user, expiry, revoke và metadata tối thiểu.
- Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; không localStorage/URL.
- Mutation kiểm tra CSRF hoặc Origin, schema và idempotency.
- `user_id` luôn lấy từ session; 401/403 tách biệt.
- Provider/DB lỗi fail closed, không tạo financial row.
- Log không chứa OAuth code/token, cookie, secret, raw claim, raw JEV hoặc full ledger.

## Acceptance

1. Callback mismatch/replay/claim lỗi không tạo session hoặc user mapping.
2. User A không đọc/mutate user B bằng đổi ID.
3. Session expiry/revoke/disable chặn API trước data read.
4. Admin không mutate ledger/balance/audit.
5. OAuth/DB failure có lỗi an toàn `en`/`vi`.

## Handoff

A cung cấp session owner context và CSRF result cho B; auth states cho C; env/redirect/rollback evidence cho D. Team Leader duyệt production callback và GO/NO-GO. Chi tiết chuẩn ở `AUTHENTICATION.md`.
