# CC-001 — Handoff miền sản phẩm

- **Chủ sở hữu human:** Developer B
- **Trạng thái:** Tư vấn đã tích hợp; canonical source là `docs/PRD.md` và `docs/DOMAIN-MODEL.md`.
- **Quyết định chi phối:** [ADR-0005](../adr/0005-immutable-money-domain.md), [ADR-0007](../adr/0007-five-day-thin-slice.md).

## Phạm vi

Campus Coin là sổ theo dõi tiền cá nhân do sinh viên tự nhập. Không giữ tiền, không kết nối ngân hàng, không thanh toán thật và không cung cấp tư vấn tài chính.

## Từ vựng chuẩn

| UI tiếng Việt | API/domain | Ranh giới |
|---|---|---|
| Thu nhập | `income` | Tăng wallet |
| Thanh toán | `payment` | Giảm wallet nếu đủ |
| Ví | wallet | Nguồn duy nhất của payment |
| Tiết kiệm | savings | Aggregate riêng |
| Chuyển savings | savings transfer | Không phải ledger |
| Danh mục | category | Phải khớp `applies_to` |
| Ngân sách | budget | Chỉ cảnh báo |

## Bất biến

- Chỉ `income` và `payment`; amount VND nguyên dương.
- Ledger immutable, correction là reversal/adjustment/replacement append-only.
- Savings deposit/withdraw atomic, không vào income/payment/budget.
- Payment khóa wallet và reject khi thiếu tiền.
- Mọi row/query scope theo user; HCMC là timezone nghiệp vụ.
- JEV chỉ gợi ý category, không có authority.

## Handoff triển khai

Developer B nhận owner/session từ A, cung cấp API authoritative cho C và boundary JEV-off cho D. B không parse Google token, không để client gửi owner/final balance và không gọi JEV trong transaction. Chi tiết formula, schema và acceptance nằm ở `DOMAIN-MODEL.md`.

## Cắt phạm vi

Không đưa vào MVP: bank, real-money transfer, lending, BNPL, interest, multi-currency, recurring, CSV/PDF, prediction, complex AI và auto-transfer chưa có safety gate.
