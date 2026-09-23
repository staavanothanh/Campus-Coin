# ADR-0005: Miền tiền bất biến và tách savings

- **Ngày:** 2026-09-24
- **Trạng thái:** Đã chấp nhận
- **Người quyết định:** Team Leader (người dùng)

## Bối cảnh

Ứng dụng chỉ ghi nhận dữ liệu tiền do user nhập, không phải ngân hàng và không xử lý tiền thật. Sai lệch số dư, sửa lịch sử trực tiếp hoặc trộn wallet với savings làm mất khả năng truy vết.

## Quyết định

Chỉ có hai enum/API type là `income` và `payment`. Amount là số nguyên VND dương. Ledger đã commit và audit là append-only; correction dùng reversal/adjustment/replacement row mới có reason, actor và reference. Payment khóa wallet và chỉ commit khi đủ tiền. Savings là aggregate riêng; deposit/withdraw atomic và không tính vào income/payment/budget. Budget chỉ cảnh báo, không authorize.

Mọi phép tính authoritative do backend/domain thực hiện trong transaction ngắn. JEV không được tính, authorize hoặc ghi tiền.

## Phương án bị loại

- **Update/delete ledger:** phá audit và reconciliation.
- **Dùng số âm để biểu diễn hướng:** làm mờ invariant amount dương.
- **Dùng savings để thanh toán:** trộn hai aggregate.
- **Client tự tính balance:** cho phép bypass authorization.

## Hệ quả

Báo cáo deterministic theo `Asia/Ho_Chi_Minh`; UI chỉ hiển thị response authoritative. Admin không sửa ledger bằng UI hoặc SQL tùy tiện.

## Rủi ro và kiểm chứng

Kiểm tra concurrent payment, idempotency, reversal, savings atomicity, HCMC boundary và restore reconciliation trước GO.
