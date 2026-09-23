# RP-A — Handoff Google OAuth và Vercel

- **Human owner:** Developer A
- **Trạng thái:** Tư vấn đã hợp nhất; implementation chưa bắt đầu.
- **ADR:** [0001](../../adr/0001-google-oauth-only.md), [0002](../../adr/0002-opaque-browser-session.md).

## Quyết định

MVP chỉ Google OAuth. Không local password, password credential, account linking, OTP/reset, security-email, Gmail inbox hoặc credential Gmail cá nhân.

## Flow

1. Backend OAuth start tạo state, nonce, PKCE và allowlisted return URL.
2. Challenge one-time, TTL ngắn, bind browser flow.
3. Callback HTTPS exchange code server-side; kiểm tra state/PKCE/nonce/issuer/audience/sub/expiry/verified email.
4. Tạo/reuse user theo `(google, sub)`; rotate opaque server session.
5. Cookie `HttpOnly; Secure; SameSite=Lax`; owner lấy từ session.
6. Mutation có CSRF/origin, schema và idempotency.

## Day-1 gate

Kiểm tra exact redirect trên Vercel-provided domain, test account, claims, callback, session expiry/revoke, IDOR, env validation và redacted logs. Vercel pool/connection phải bounded. Không dùng local DB production.

## Handoff

A cung cấp session/owner/CSRF contract cho B, auth states cho C và env/rollback evidence cho D. Auth/provider/DB failure không tạo ledger row. Team Leader duyệt gate và GO/NO-GO.
