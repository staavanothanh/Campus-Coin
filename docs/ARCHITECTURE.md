# Kiến trúc — Campus Coin

## 1. Quyết định kiến trúc

Campus Coin dùng kiến trúc phân lớp, một Web app và Node API TypeScript trên Vercel, kết nối cloud MySQL qua TLS. Provider/region chưa được chốt cho đến khi qua cổng kiểm chứng Day 1.

```text
Browser React/TypeScript
        |
        v
Node API: validation, session, owner scope, idempotency
        |
        +--> Domain service: wallet, ledger, savings, budget, report
        |       |
        |       +--> MySQL transaction/lock/audit
        |
        +--> Google OAuth adapter
        +--> OpenRouter JEV adapter (optional, typed, default-off)
```

## 2. Boundary bắt buộc

- **Browser:** hiển thị response authoritative; không giữ secret, không tính balance, không authorize payment, không gọi provider.
- **API:** validate schema, session, CSRF/origin, role, owner scope, category, idempotency và feature flag.
- **Domain:** quyết định tiền, period, authorization và report; không import SDK JEV.
- **Persistence:** ledger/audit append-only; projection có thể rebuild; runtime DB role least privilege.
- **Admin:** issue/report triage; không có quyền sửa balance, ledger hoặc audit.

## 3. Xác thực và session

MVP chỉ Google OAuth. Backend kiểm tra redirect allowlist, state, PKCE, nonce, issuer, audience, subject, expiry và verified email, sau đó tạo/reuse user theo `(google, sub)` và rotate opaque session. Cookie là `HttpOnly; Secure; SameSite=Lax` hoặc chặt hơn sau kiểm thử. Owner luôn lấy từ session.

Không tạo bảng/route cho password, account linking, OTP reset hoặc email reset. JWT browser không dùng trong MVP.

## 4. Miền và persistence

Logical tables: `users`, `auth_identities`, `sessions`, `wallet_accounts`, `ledger_transactions`, `categories`, `budgets`, `savings_accounts`, `savings_transfers`, `issues`, `issue_events`, `audit_events` và metadata JEV đã mask nếu cần.

MySQL được chọn vì transaction, FK, row lock, immutable reference và báo cáo deterministic. Dùng integer VND/exact decimal, không dùng floating point. Mọi financial row có owner; mọi query có owner scope.

Payment lock wallet và kiểm tra đủ tiền trước insert. Savings lock wallet rồi savings theo thứ tự cố định. Không gọi OpenRouter, email hoặc worker trong money transaction.

## 5. Boundary JEV/OpenRouter

JEV là optional category suggestion trước submit. API gửi description đã redact, type, candidate opaque và locale; nhận typed Choice/probabilities/confidence; server validate candidate, threshold và user confirmation. Không gửi balance, savings, ledger, Google claims, session, secret hoặc PII không cần thiết.

`JEV_CATEGORY_SUGGESTION_ENABLED=false` mặc định. Typed endpoint/model, quota, cost, latency và provider privacy phải qua probe. Không thay thế typed contract bằng chat completion rồi parse prose.

## 6. Triển khai và vận hành

- Web/API: Vercel-provided domain.
- DB: cloud MySQL đã kiểm chứng, TLS, bounded serverless pool, backup/restore.
- Secret: Vercel environment בלבד; không log/commit.
- Log: structured và redact OAuth code/token, cookie, password, raw JEV, raw financial data.
- Migration: versioned, non-destructive với ledger; rollback deployment và restore data theo runbook.
- JEV/email lỗi không được chặn money path.

## 7. Tiêu chí chấp nhận kiến trúc

1. OAuth/session/owner scope an toàn, không local auth/link/OTP.
2. MySQL cloud có evidence TLS, connection, backup/restore.
3. Concurrent payment không làm wallet âm; savings tách biệt; history rebuild được.
4. Client không gửi final balance; admin không mutate ledger.
5. JEV typed contract được chứng minh hoặc giữ off; không chat-completions substitution.
6. VND/HCMC, `en`/`vi`, redaction và rollback được kiểm tra.

## 8. Ngoài phạm vi

Local production DB, microservices/event bus, banking/payment processor, lending/BNPL, interest, multi-currency, enterprise admin, custom email domain, password/OTP/linking, JEV autonomous action, JEV math/date/balance engine, CSV/PDF và credentials trong repo.

## 9. ADR liên quan

[ADR-0001](./adr/0001-google-oauth-only.md), [ADR-0002](./adr/0002-opaque-browser-session.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md).
