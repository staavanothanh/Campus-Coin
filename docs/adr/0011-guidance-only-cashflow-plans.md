# ADR-0011: Kế hoạch dòng tiền chỉ mang tính hướng dẫn

- **Ngày:** 2026-09-28
- **Trạng thái:** Đề xuất
- **Người quyết định:** Chờ Team Leader xác nhận

## Bối cảnh

Nhánh `hiep` đề xuất kế hoạch khoản phải trả và expected income, forecast, what-if và reflection. Tính năng này mở rộng domain/API và cần schema mới; không được làm thay đổi ledger, wallet projection, savings hay authorization payment. Migration chain của repository hiện kết thúc ở `0032` theo ADR-0010.

## Quyết định đề xuất

1. Kế hoạch dòng tiền là dữ liệu guidance do user nhập; không phải transaction và không được tạo/sửa/xóa ledger, wallet, savings hoặc budget.
2. Chỉ `obligation` có payment category và tùy chọn `reserveInForecast`; expected income không dự trù tiền.
3. Forecast dùng available wallet balance hiện tại; bỏ qua event đến hạn hôm nay khi tính projection, chỉ trừ obligation được chọn dự trù và cộng expected income khai báo. What-if không authorize payment.
4. Mutation phải owner-scoped, xác thực, CSRF/origin protected, idempotent và ghi audit. Trạng thái kế hoạch lịch sử được lưu bằng status events append-only.
5. Nếu được phê duyệt, schema sử dụng migration mới `0033` trở đi; không đổi hoặc chạy lại `0001`–`0032`. Chưa chạy migration lên DB shared.

## Hệ quả

- Cần xác minh route/API contract, dữ liệu owner scope, status-history reconstruction, concurrent idempotency và MySQL migration trên disposable DB trước khi triển khai.
- Forecast có thể âm vì là thông tin dự kiến; giá trị đó không được dùng làm quyền từ chối/thực hiện payment.
- UI phải thể hiện rõ trạng thái loading/error và nhắc dự báo không phải số dư ngân hàng, không tự trừ tiền.

## Gate

ADR đang ở trạng thái đề xuất; không coi tính năng hoặc migration là quyết định sản phẩm được chấp nhận cho đến khi Team Leader phê duyệt. Không apply migration lên database dùng chung nếu chưa có xác nhận riêng từ DBA.
