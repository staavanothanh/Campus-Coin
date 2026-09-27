# Mô hình miền — Campus Coin

## 1. Nguyên tắc

Campus Coin là sổ theo dõi do user nhập, không phải sao kê ngân hàng. Ưu tiên tính đúng, truy vết, owner scope và rebuild.

- Currency duy nhất: VND.
- Amount là số nguyên dương; không floating point.
- Transaction type duy nhất: `income` và `payment`.
- Ledger/audit đã commit là immutable và append-only.
- Wallet là nguồn duy nhất cho payment; savings là aggregate riêng.
- Budget chỉ cảnh báo; không phải authorization.
- JEV không ghi balance, quyết định authorization hoặc thay đổi ledger.
- Ngày/kỳ nghiệp vụ dùng `Asia/Ho_Chi_Minh`.

## 2. Thực thể

### User và AuthCredential

`User` có `id`, display name, email đã xác minh, status, locale, timezone và timestamps. `AuthCredential` lưu password hash/salt phía server; OTP challenge lưu hash, purpose, expiry, attempts và created time. Google Sign-In tùy chọn lưu identity `(provider=google, subject=sub)` trong `auth_identities`; account linking cần session và thao tác rõ ràng, không tự động merge theo email. Không dùng Gmail credential/inbox/API hoặc lưu Google token. Mọi financial query scope theo `user_id` lấy từ session.

### WalletAccount

Một user có một wallet. `initial_wallet_balance` là baseline do user nhập, không phải income và không tạo lịch sử giả. `available_balance` là projection do backend cập nhật trong transaction.

### LedgerTransaction

Bản ghi immutable có owner, `type`, `amount_vnd`, category, occurred instant, role, reference correction, audit và idempotency key. `type` chỉ `income|payment`; role có thể `original|reversal|adjustment|replacement` nhưng không tạo enum thứ ba.

### SavingsAccount và SavingsTransfer

Savings là aggregate riêng. Deposit làm giảm wallet/tăng savings; withdrawal làm tăng wallet/giảm savings. Transfer không phải income/payment và không tính budget. Lock order luôn wallet rồi savings.

### Category, Budget, AuditEvent

Category có `applies_to`, active/disabled/retired và lịch sử đọc được. Default hoặc category đã được tham chiếu không hard-delete. Budget có user, payment category, local month và limit. Audit append-only, không lưu secret.

## 3. Công thức authoritative

```text
wallet_available = opening_balance
                 + income_effects
                 - payment_effects
                 - savings_deposits
                 + savings_withdrawals

savings_balance = deposits - withdrawals
budget_used = tổng payment gốc còn hiệu lực
               cùng owner/category trong tháng HCMC
```

Reversal giữ bản gốc, tạo row mới và áp dụng effect đối nghịch. Không mutate/delete row cũ. Báo cáo loại đúng các row đã reversed theo policy.

## 4. Invariant bắt buộc

1. `type ∈ {income, payment}`.
2. `amount_vnd` là integer dương, không overflow.
3. Mọi row có đúng một owner; mọi read/write scope theo owner.
4. Ledger/audit sau commit không update/delete.
5. Payment chỉ commit khi wallet khả dụng `>= amount` tại lock/commit.
6. Payment thiếu tiền không tạo row và không làm wallet âm.
7. Retry cùng idempotency key không duplicate; body khác trả conflict.
8. Savings transaction atomic và không vào income/payment/budget.
9. Budget overrun cảnh báo, không reject payment nếu wallet đủ.
10. Category disabled không nhận row mới nhưng history vẫn đọc được.
11. Report dùng local half-open period HCMC.
12. JEV output không bypass validation, calculation hoặc authorization.

## 5. Luồng nghiệp vụ

### Khởi tạo ví

Validate session và amount không âm; tạo wallet/savings/audit một lần trong transaction. Không tạo income giả.

### Tạo income/payment

Validate session, CSRF/origin, amount, category, occurred time và idempotency trước transaction. Lock wallet; income tăng, payment chỉ insert khi đủ tiền; insert ledger/audit và cập nhật projection atomic. Budget warning tính sau commit.

### Gửi/rút savings

Lock wallet rồi savings; kiểm tra đủ; insert transfer, cập nhật hai aggregate và commit atomic. Không gọi JEV hoặc email trong transaction.

### Điều chỉnh

Giữ row cũ; tạo reversal/adjustment/replacement có reason, actor, reference và audit. Không có SQL update/delete trực tiếp từ UI/admin.

## 6. Acceptance miền

- Với opening 500.000, income 100.000, payment 200.000, deposit 50.000: wallet 350.000, savings 50.000, payment total 200.000.
- Payment 400.001 khi wallet 400.000 bị từ chối, không có row mới.
- Hai payment 80.000 đồng thời trên wallet 100.000 chỉ tối đa một request commit nếu không có replenishment hợp lệ.
- Rebuild projection khớp ledger; mismatch mở incident và fail closed.

## 7. ADR liên quan

[ADR-0005](./adr/0005-immutable-money-domain.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.md).
