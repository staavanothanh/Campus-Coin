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
        +--> SMTP email adapter (OTP)
        +--> Google OIDC adapter (optional, server-side)
        +--> OpenRouter JEV adapter (optional, typed, default-off)
```

## 2. Boundary bắt buộc

- **Browser:** hiển thị response authoritative; không giữ secret, không tính balance, không authorize payment, không gọi provider.
- **API:** validate schema, session, CSRF/origin, role, owner scope, category, idempotency và feature flag.
- **Domain:** quyết định tiền, period, authorization và report; không import SDK JEV.
- **Persistence:** ledger/audit append-only; projection có thể rebuild; runtime DB role least privilege.
- **Admin:** issue/report triage; không có quyền sửa balance, ledger hoặc audit.

## 3. Xác thực và session

Email/password/OTP tiếp tục theo ADR-0008. Google Sign-In được thêm như lựa chọn tùy chọn theo ADR-0009 qua server-side OIDC Authorization Code + PKCE S256, state, nonce và scope `openid email profile`. Danh tính dựa trên `(provider=google, subject=sub)`; ID token phải được verify theo audience, nonce và `email_verified`. Cả hai flow đều tạo opaque server session bằng cookie hiện có. Owner luôn lấy từ session.

Google chưa cấu hình thì nút Google ẩn và email login vẫn hoạt động. Email trùng account hiện hữu không tự động merge; user cần đăng nhập trước rồi chủ động kết nối Google. Không lưu Google access/refresh token, không dùng Gmail credential cá nhân/inbox/API hoặc JWT browser. SMTP/provider phải có timeout, số retry hữu hạn, lỗi rõ và không được ghi OTP ra log/dev fallback.

## 4. Miền và persistence

Logical tables: `users`, `auth_identities`, `auth_credentials`, `email_otps`, `sessions`, `wallet_accounts`, `ledger_transactions`, `categories`, `budgets`, `savings_accounts`, `savings_transfers`, `issues`, `issue_events`, `audit_events` và metadata JEV đã mask nếu cần.

MySQL được chọn vì transaction, FK, row lock, immutable reference và báo cáo deterministic. Dùng integer VND/exact decimal, không dùng floating point. Mọi financial row có owner; mọi query có owner scope.

Payment lock wallet và kiểm tra đủ tiền trước insert. Savings lock wallet rồi savings theo thứ tự cố định. Không gọi OpenRouter, email hoặc worker trong money transaction.

## 5. Boundary JEV/OpenRouter

JEV là optional category suggestion trước submit. API gửi description đã redact, type, candidate opaque và locale; nhận typed Choice/probabilities/confidence; server validate candidate, threshold và user confirmation. Không gửi balance, savings, ledger, Google claims, session, secret hoặc PII không cần thiết.

`JEV_CATEGORY_SUGGESTION_ENABLED=false` mặc định. Typed endpoint/model, quota, cost, latency và provider privacy phải qua probe. Không thay thế typed contract bằng chat completion rồi parse prose.

## 6. Triển khai và vận hành

- Web/API: Vercel-provided domain. Vite build xuất vào `dist`; route `/api/v1/*` dùng Node.js Function tại `api/v1/[...path].ts`, còn SPA path rewrite về `index.html`.
- Local API chạy bằng `src/local-server.ts`; file này không mang tên server entrypoint của Vercel. Vercel adapter gọi cùng `handleRequest` để không tạo một bộ route thứ hai. Body parser của platform tắt để giới hạn và parse JSON thống nhất trong API boundary.
- Trên Vercel, `attachDatabasePool` quản lý kết nối MySQL idle trước khi function suspend; pool vẫn bounded và cần đo tổng connections theo số function instance, không suy đoán capacity từ limit mỗi instance.
- Deploy workflow chỉ chạy thủ công sau CI, chọn Preview hoặc Production; Production chỉ từ nhánh `hiep` và cần GitHub Environment có approval phù hợp.
- DB: cloud MySQL đã kiểm chứng, TLS, bounded serverless pool, backup/restore.
- Mọi response API/redirect gửi `Cache-Control: no-store, private`. Mutation cần `Origin` đúng allowlist; `Referer` không phải fallback.
- Secret: lưu trong Vercel environment; không log/commit.
- Auth: rate-limit login theo account/IP; OTP có expiry, maximum attempts, cooldown, single-use; session có expiry/revoke; mọi owner lấy từ session.
- Log: structured và redact cookie, password, OTP, reset token, SMTP credential, raw JEV, raw financial data.
- Migration: versioned, non-destructive với ledger; rollback deployment và restore data theo runbook.
- JEV/email lỗi không được chặn money path.

## 7. Tiêu chí chấp nhận kiến trúc

1. Email/password/OTP và Google Sign-In tùy chọn dùng opaque session, CSRF và owner scope an toàn; không Gmail credential/inbox.
2. MySQL cloud có evidence TLS, connection, backup/restore.
3. Concurrent payment không làm wallet âm; savings tách biệt; history rebuild được.
4. Client không gửi final balance; admin không mutate ledger.
5. JEV typed contract được chứng minh hoặc giữ off; không chat-completions substitution.
6. VND/HCMC, `en`/`vi`, redaction và rollback được kiểm tra.

## 8. Ngoài phạm vi

Local production DB, microservices/event bus, banking/payment processor, lending/BNPL, interest, multi-currency, enterprise admin, custom email domain, tự động merge theo email, JEV autonomous action, JEV math/date/balance engine, CSV/PDF và credentials trong repo.

## 9. ADR liên quan

[ADR-0008](./adr/0008-email-password-otp-auth.md), [ADR-0009](./adr/0009-optional-google-sign-in.md), [ADR-0002](./adr/0002-opaque-browser-session.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md), [ADR-0004](./adr/0004-vercel-domain-no-custom-email.md), [ADR-0006](./adr/0006-optional-openrouter-jev.md).
