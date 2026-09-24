# Lộ trình — Campus Coin

## 1. Nguyên tắc

Ưu tiên production thin-slice 4–5 ngày nhưng không hy sinh email/password/OTP theo ADR-0008, Google Sign-In tùy chọn theo ADR-0009, owner scope, ledger immutable, wallet/savings separation, deterministic calculation, VND, `Asia/Ho_Chi_Minh`, `en`/`vi` và ranh giới no banking/lending/BNPL.

JEV không nằm trên money critical path. Email provider là dependency bắt buộc cho register/reset; nếu chưa kiểm chứng thì auth chưa production-ready, không dùng log/dev fallback.

## 2. MVP

### M0 — Email/password/OTP và nền tảng

React + TypeScript/TSX, Node API TypeScript, register → verify OTP → login → session, forgot → reset, SMTP adapter, rate limit, opaque session, CSRF/origin, owner scope, Vercel-provided domain, env validation, TLS và redacted logs.

**Gate:** email delivery thật, OTP/session/IDOR/rate-limit, Vercel env/connectivity và DB candidate.

### M0.1 — Google Sign-In tùy chọn

Server-side OIDC Authorization Code + PKCE; nối account hiện hữu bằng thao tác tường minh; không dùng Gmail API và không tự động merge theo email.

**Gate:** OAuth client/callback, state/nonce/audience/email verification, session ownership và live callback evidence.

### M1 — Miền tiền

Opening wallet, immutable `income`/`payment`, atomic insufficient-wallet block, savings deposit/withdraw, category lifecycle, budget warning, deterministic report và restore evidence.

**Gate:** concurrency/idempotency, reconciliation, HCMC boundary, no client money authority.

### M2 — UI và admin

Dashboard, form income/payment, history, savings, budget/category, report pie/bar + table, `en`/`vi`, VND/HCMC, dark/light độc lập, accessibility, user report và admin issue queue.

**Gate:** JEV-off flow, mobile/keyboard/focus, least privilege và bilingual parity.

### M3 — JEV tùy chọn

Backend adapter OpenRouter typed System One/Decisions, model/endpoint probe, default-off, category suggestion only, schema/confidence/manual fallback, privacy/cost/latency evidence và kill switch.

**Gate:** JEV off vẫn chạy đầy đủ; JEV không tính/authorize/write tiền.

## 3. Lịch 5 ngày

| Ngày | Owner chính | Kết quả/gate |
|---|---|---|
| 0 | Team Leader + A/B/C/D | Scope, API, invariant, owner, logging và rollback trigger được khóa |
| 1 | A/B/C/D | SMTP/auth/Vercel, MySQL/restore, UI contract và OpenRouter probe có evidence |
| 2 | A/B | Session/owner và money transaction; C/D tiêu thụ contract, JEV ngoài transaction |
| 3 | C + A/B/D | UI/report/admin hai locale; security, reconciliation, fallback, redacted observability |
| 4 | Tất cả | Integrated smoke, concurrency, restore, accessibility, privacy, rollback |
| 5 | Team Leader/D | GO hoặc NO-GO/defer; không thêm feature |

## 4. Phần để sau

Tự động merge account theo email, Gmail inbox/Gmail credential cá nhân, SMS/passkey/MFA bắt buộc, notification ngoài auth, auto-transfer chưa có safety proof, CSV/PDF, recurring, prediction, complex AI summary/chat, banking, payment thật, lending, BNPL, interest, multi-currency, enterprise admin và custom email domain.

## 5. Rủi ro và xử lý

| Rủi ro | Xử lý |
|---|---|
| MySQL free tier thiếu restore/quota | Chọn candidate khác đã kiểm chứng hoặc Team Leader duyệt paid; không dùng local production |
| SMTP/auth/session/IDOR/rate-limit lỗi | NO-GO |
| Wallet/savings invariant lỗi | NO-GO; không sửa ledger bằng SQL |
| Vercel connection exhaustion | Bounded pool/connector hoặc đổi provider; không đoán số dư |
| OpenRouter typed contract chưa rõ | JEV off; không parse chat |
| JEV quality/privacy/cost kém | Tắt flag; manual picker là đường chính |
| Email provider chưa sẵn sàng | Auth register/reset chưa release; không gửi OTP qua log/dev fallback |

## 6. Quyết định cần evidence sau Day 1

MySQL provider/region/free-tier/restore, OpenRouter transport ID/model/quota/cost/latency/privacy, budget threshold và backup RPO/RTO thực tế. Không quyết định nào làm thay đổi enum, immutable history, wallet/savings, VND/HCMC hoặc no-banking boundary.

## 7. Định nghĩa hoàn thành

Chỉ đánh dấu done khi source, focused smoke, migration/restore evidence, security review, redacted logs/rollback/runbook và docs đều đạt. UI scaffold, model response mẫu hoặc deploy thành công không đủ.

## 8. ADR liên quan

[ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md), [ADR-0007](./adr/0007-five-day-thin-slice.md).
