# Tương tác nhỏ, ảnh hưởng lớn — 2026-09-27

## Mục đích

Giữ giao diện domain hiện tại và làm chắc các trạng thái mà người dùng thường chỉ nhận ra khi có lỗi, dùng bàn phím hoặc mở ứng dụng trên màn hình nhỏ. Đây là phần hành vi; DevC vẫn có thể tiếp tục hoàn thiện màu sắc, bố cục và chi tiết trình bày.

## Đã áp dụng

- Khi đọc giao dịch, savings history hoặc báo cáo gặp lỗi, giao diện báo lỗi và cho thử lại tại chỗ. Lỗi tải không còn bị trình bày như một tháng/lịch sử rỗng. Nút tải tiếp vẫn giữ vị trí khi đang tải; lỗi ở trang kế tiếp retry đúng cursor hiện tại.
- Sau khi API xác nhận đã ghi `income`, `payment` hoặc savings transfer, modal giữ một biên nhận ngắn với loại và số tiền để người dùng biết yêu cầu đã được ghi. Làm mới số liệu phía sau không gửi lại mutation. Idempotency key vẫn gắn với cùng nội dung thử lại.
- Danh mục lỗi tải có nút thử lại ngay trong form, giữ số tiền và ghi chú người dùng đã nhập.
- Modal ưu tiên focus vào trường được chỉ định, bỏ qua control bị disable trong focus trap, giữ focus trong dialog, khóa cuộn nền và giới hạn cuộn bên trong modal trên màn hình thấp.
- Menu di động hoạt động như một dialog: `Tab` được giữ trong menu, nội dung phía sau bị vô hiệu hóa khi menu mở, `Escape` đóng menu và trả focus về nút mở. Điều hướng tới trang khác chuyển focus tới tiêu đề trang; mục đang chọn có `aria-current` và tên đọc được kể cả khi sidebar thu gọn.
- Tổng trên lịch sử giao dịch hiện trạng thái đang tải hoặc không khả dụng khi API lỗi; số `0` chỉ xuất hiện khi đã tải thành công và không có giao dịch phù hợp.
- Bảng giao dịch, savings và ngân sách có vùng cuộn ngang đặt tên, có thể focus bằng bàn phím. Theme, ngôn ngữ, bộ lọc và tháng đang chọn công bố trạng thái ngoài màu sắc.

## Nguyên tắc tham khảo

[Bencho](https://bencho.dev/) và [Finds](https://bencho.dev/finds) được dùng để xem cách một tương tác nhỏ báo cho người dùng biết thao tác đang chạy, đã hoàn tất hay cần sửa. Không lấy source, asset hoặc animation nguyên xi. Các mẫu kéo-thả như “slide to confirm” không dùng cho số tiền; mọi hành động vẫn có thể thao tác bằng điều khiển chuẩn và bàn phím.

## Kiểm tra và giới hạn

- `npm run typecheck`: pass.
- `npm run test:web`: 33/33 pass, có hồi quy cho focus/scroll modal và menu di động, tổng giao dịch khi tải lỗi, thử lại danh mục, biên nhận income/payment và savings, cùng việc phân biệt lỗi tải báo cáo với tháng rỗng.
- Đây là kiểm tra component trong jsdom, chưa thay cho kiểm tra bằng trình đọc màn hình, bàn phím thực, thiết bị di động hoặc 4 trình duyệt mục tiêu.
- Thay đổi này không sửa service/domain contract và không chạy migration.
