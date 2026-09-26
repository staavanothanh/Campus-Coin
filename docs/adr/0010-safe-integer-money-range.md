# ADR-0010: Giới hạn integer an toàn cho số tiền VND

- Trạng thái: Đã chấp nhận
- Ngày: 2026-09-26
- Người quyết định: Team Leader

## Bối cảnh

API hiện truyền số tiền dưới dạng JSON number và backend dùng JavaScript `number`. Số nguyên lớn hơn `Number.MAX_SAFE_INTEGER` có thể bị làm tròn, dẫn tới balance hoặc tổng báo cáo sai dù từng phép tính trông hợp lệ. MySQL `BIGINT UNSIGNED` có miền lớn hơn giới hạn này.

## Quyết định

- Mọi amount, balance và budget limit VND truyền qua API/runtime không vượt `Number.MAX_SAFE_INTEGER` (`9007199254740991`).
- Application kiểm tra kết quả phép tính trước khi ghi; lỗi phải rollback toàn mutation.
- MySQL CHECK constraints chặn amount/balance/limit vượt giới hạn để bảo vệ khi code path khác ghi trực tiếp.
- Giao dịch ledger và budget upsert từ chối nếu tổng tháng sau mutation vượt giới hạn.
- Ledger mutation có ngày lùi bị từ chối nếu khiến opening hoặc closing của bất kỳ monthly report HCMC nào vượt miền integer an toàn; report không trả số đã bị làm tròn.

## Hệ quả

- Không cần đổi API amount thành string trong phạm vi hiện tại; code vẫn dùng integer VND dễ đọc.
- Migration `0006`–`0010` giới hạn từng bảng trong từng version riêng; tất cả đều bắt buộc để schema readiness đạt.
- Trước khi apply migration lên DB đã có dữ liệu, operator phải xác nhận các cột tiền hiện có không vượt giới hạn; migration dừng ở bảng đầu tiên có row vượt ngưỡng và không sửa/xóa lịch sử.
- Nếu sản phẩm sau này cần giá trị lớn hơn, cần ADR mới để chuyển wire/domain representation sang exact decimal/string hoặc bigint-safe encoding; không được bỏ kiểm tra.

## Kiểm chứng

- Unit test cho closing balance và integration tests cho wallet, correction, savings, budget rollback, và ledger nhập lùi ngày làm report vượt miền hỗ trợ.
- `datatest` kiểm tra DB từ chối tiền vượt giới hạn ở wallet, ledger, budget và savings.
