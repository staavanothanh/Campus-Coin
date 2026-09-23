# DOMAIN-MODEL — Campus Coin

## 1. Nguyên tắc miền

Campus Coin là sổ theo dõi do người dùng nhập, không phải sổ ngân hàng hay nguồn xác nhận tiền thật. Miền phải ưu tiên tính đúng đắn, truy vết và khả năng rebuild:

- Mọi số tiền là VND nguyên dương theo đơn vị đồng.
- Loại giao dịch chỉ có hai enum/API value: `income` và `payment`.
- Lịch sử đã commit là immutable; không update/delete âm thầm.
- Ví là nguồn của mọi `payment`; tiền tiết kiệm là aggregate tách riêng.
- Budget chỉ tiêu thụ bởi `payment`; cảnh báo không phải authorization.
- `jev` không được ghi balance, quyết định authorization hay thay đổi ledger.
- Business date/time hiển thị và phân kỳ theo `Asia/Ho_Chi_Minh`.

## 2. Thực thể và value object

### User

`User` có `id`, display name, email chuẩn hóa, status, locale mặc định `vi-VN` hoặc `en`, timezone mặc định `Asia/Ho_Chi_Minh`, created/updated timestamps. User là chủ sở hữu dữ liệu; mọi query financial phải scope theo `user_id`. Locale chỉ điều khiển nội dung trình bày, không thay đổi enum/API, công thức tiền hoặc dữ liệu audit.

### AuthIdentity và Credential

`AuthIdentity` liên kết user với Google subject/provider; `PasswordCredential` giữ password hash và metadata đổi mật khẩu. Đây là phần auth, mô tả đầy đủ ở `AUTHENTICATION.md`.

### WalletAccount

Một user có aggregate ví hiện tại, chứa `initial_wallet_balance` đã xác nhận tại thời điểm khởi tạo và metadata. Initial balance là baseline do user nhập; không phải `income` và không tạo transaction history giả.

### LedgerTransaction

Bản ghi tài chính immutable của đúng một user:

| Trường | Quy tắc |
|---|---|
| `id` | UUID/ID duy nhất, không tái sử dụng |
| `user_id` | FK owner, không đổi |
| `type` | Chỉ `income` hoặc `payment` |
| `amount_vnd` | Integer > 0; không dùng số âm để biểu diễn hướng |
| `category_id` | Category cùng transaction type; giữ FK lịch sử |
| `occurred_at` | Instant hợp lệ; phân kỳ local bằng Asia/Ho_Chi_Minh |
| `description` | Optional, user text; xem như untrusted input khi gửi JEV |
| `role` | original/reversal/adjustment/replacement nếu cần truy vết, không tạo enum transaction type thứ ba |
| `supersedes_or_reverses_id` | Optional reference tới bản ghi cũ, không mutate bản ghi cũ |
| `created_at` | Server timestamp immutable |
| `idempotency_key` | Unique theo user/use case để chống retry duplicate |

`role` là metadata nghiệp vụ. Một reversal của `payment` dùng một ledger row `income` bằng số tiền cần đảo; reversal của `income` dùng row `payment`. Correction khác category/mô tả có thể gồm row đảo bản ghi cũ và một row replacement mới. UI phải hiển thị quan hệ để người dùng hiểu, không xóa dấu vết.

### SavingsAccount và SavingsTransfer

`SavingsAccount` giữ số dư tiền tiết kiệm riêng. `SavingsTransfer` là internal transfer với direction `deposit`, `withdrawal` hoặc `scheduled_deposit`, amount VND, source/destination aggregate, initiated_by và status. Đây **không phải** `LedgerTransaction`, không có `income`/`payment` type và không được tính vào tổng `income`/`payment` hoặc budget usage.

Deposit làm giảm ví và tăng savings; withdrawal làm tăng ví và giảm savings. Scheduled transfer phải có idempotency theo user/kỳ. Không tính lãi hoặc phần trăm tích lũy.

### Category

Category có `id`, name tiếng Việt, `applies_to` = `income` hoặc `payment`, `is_default`, status active/disabled/retired, owner (system hoặc user), timestamps. Default category không hard-delete. User có thể disable default để ẩn khỏi picker; historical rows vẫn tham chiếu category cũ. Custom category có historical reference thì không được hard-delete; chỉ disable/retire. Custom không có reference mới có thể xóa theo policy.

### Budget

Budget có user, local month (YYYY-MM theo Asia/Ho_Chi_Minh), payment category, `limit_amount_vnd`, warning thresholds, status. Một user/category/tháng có unique constraint theo policy. `income` không bao giờ làm tăng consumption.

### AuditEvent và Correction

Audit event append-only ghi actor, action, target, before/after metadata tối thiểu, reason, request id, created_at. Không lưu secret. Correction record bắt buộc reason và link tới bản ghi gốc/mới; quyền correction có thể yêu cầu re-auth/step-up.

## 3. Công thức authoritative

Ký hiệu:

- `I(t)` = tổng amount của ledger rows `type=income` có hiệu lực theo quy tắc correction trong kỳ/tập dữ liệu.
- `P(t)` = tổng amount của ledger rows `type=payment` có hiệu lực.
- `D(t)` = tổng savings deposit đã commit.
- `W(t)` = tổng savings withdrawal đã commit.
- `B0` = initial wallet balance.

**Ví khả dụng:**

```text
wallet_balance = B0 + Σ(income) - Σ(payment) - Σ(savings deposit) + Σ(savings withdrawal)
```

**Tiền tiết kiệm:**

```text
savings_balance = Σ(savings deposit) - Σ(savings withdrawal)
```

Nếu có projection/cache, các công thức trên vẫn là authority và projection phải rebuild/đối soát được. Correction/reversal không được cộng kép: domain projection phải áp dụng policy hiệu lực đã xác định, đồng thời giữ toàn bộ rows để audit.

**Budget usage của category c trong local month m:**

```text
budget_used(c,m) = Σ(amount của payment có category=c và occurred_at quy đổi Asia/Ho_Chi_Minh thuộc m)
```

Không cộng `income`, savings transfer, hoặc dữ liệu JEV chưa được user xác nhận. `budget_ratio = budget_used / limit` chỉ dùng cho hiển thị/cảnh báo.

## 4. Invariants bắt buộc

1. `type ∈ {income, payment}`; không có `expense`, `chi phí`, `transfer` trong enum transaction.
2. `amount_vnd` là integer dương, không overflow và không floating point.
3. Ledger row sau commit không update/delete; correction chỉ append.
4. Mọi financial row có một owner và mọi read/write đều tenant-scope bằng `user_id`.
5. `payment` chỉ commit khi wallet khả dụng tại lock/commit `>= amount`.
6. Hai payment đồng thời không thể cùng tiêu một số dư; transaction/row lock bảo vệ invariant.
7. Savings deposit không làm số dư savings âm và phải giảm ví nguyên tử; withdrawal không vượt savings balance.
8. Savings transfer không xuất hiện trong `income_total`, `payment_total` hoặc budget consumption.
9. Category phải `applies_to` đúng type; category disabled không nhận row mới trừ correction/replay được kiểm soát.
10. Default category không hard-delete; custom category có lịch sử không hard-delete.
11. Budget key theo user + local month + payment category; cảnh báo/overrun không reject payment nếu wallet đủ.
12. JEV output không bypass validation, domain calculation hoặc authorization.
13. Tất cả period/date display dùng Asia/Ho_Chi_Minh; API phải định nghĩa rõ instant/local date.
14. Retry cùng idempotency key không tạo duplicate ledger/savings transfer.

## 5. Luồng nghiệp vụ chính

### Khởi tạo ví

User nhập số dư ví hiện tại là số nguyên VND không âm. Backend ghi baseline vào `WalletAccount` trong transaction; hiển thị đây là số dư khởi tạo, không phải `income`. Nếu sản phẩm sau này cần import số dư lịch sử, phải định nghĩa một migration/correction flow có audit, không bịa transaction.

### Tạo income

Validate session, amount, type/category, local date và idempotency. Insert immutable `income`; budget không đổi. JEV chỉ có thể đề xuất category trước xác nhận; category cuối do user hoặc rule domain chấp nhận.

### Tạo payment

Validate session và category, khóa wallet aggregate, tính balance authoritative, reject nếu không đủ, insert immutable `payment`, cập nhật projection (nếu có), tính budget warning sau commit. Nếu budget vượt nhưng ví còn đủ, vẫn commit; response có warning tiếng Việt.

### Gửi/rút savings

Khóa wallet và savings aggregate theo thứ tự cố định để tránh deadlock; kiểm tra balance; insert `SavingsTransfer`; cập nhật hai số dư trong cùng transaction. Không tạo `income`/`payment` giả và không gọi JEV.

### Điều chỉnh

User/admin được cấp quyền gửi correction request với reason. Hệ thống giữ bản gốc, tạo reversal/adjustment/replacement rows, ghi actor/audit và hiển thị quan hệ. Không dùng SQL update/delete trực tiếp từ UI/admin. Nếu correction làm payment mới vượt ví, domain phải áp dụng policy đã định và từ chối/đưa vào flow kiểm soát; không âm thầm cho balance âm.

## 6. Acceptance criteria miền

- Với `B0=500.000`, income 100.000, payment 200.000 và deposit savings 50.000, ví hiển thị 350.000; savings 50.000; tổng payment chỉ 200.000.
- Payment 400.001 trong ví 400.000 bị từ chối và không có ledger row mới.
- Hai request payment cùng lúc với ví 100.000 và mỗi request 80.000 chỉ tối đa một request commit (trừ khi có income/withdrawal khác commit trước theo transaction hợp lệ).
- Payment vượt budget nhưng ví đủ vẫn commit và trả warning; payment vượt ví bị từ chối dù budget còn.
- Reversal không xóa/mutate bản gốc; rebuild từ rows/reference cho kết quả giống projection.
- Disable default/custom category không làm mất category_id của lịch sử.
- Mọi report tháng dùng biên local `Asia/Ho_Chi_Minh`, không lệch ngày do UTC.

## 7. Out-of-scope miền

Không có tài khoản ngân hàng, giao dịch tiền thật, cho vay, BNPL, lãi suất, multi-currency, portfolio đầu tư, tư vấn tài chính được chứng nhận, hoặc AI tự quyết định. Không cho phép hard-delete lịch sử chỉ để “sửa cho đẹp”.
