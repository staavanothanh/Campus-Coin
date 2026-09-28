# Tương tác nhỏ, ảnh hưởng lớn — cập nhật 2026-09-28

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

[Bencho](https://bencho.dev/) được mở và tương tác trực tiếp với các mẫu lựa chọn magnetic, ô mã xác minh, xác nhận tại chỗ, tiến trình và xác nhận bằng kéo. Đây là thư viện khối tương tác riêng lẻ, không phải mẫu trang hoàn chỉnh. Campus Coin chỉ lấy nguyên tắc và tự viết CSS/React; không lấy source, asset hoặc animation nguyên xi. Không dùng “slide to confirm” cho thao tác tiền vì nút chuẩn có nhãn rõ dễ dùng bằng bàn phím và thiết bị hỗ trợ.

### Ghi nhận tương tác trực tiếp ngày 2026-09-28

- **Magnetic select:** bản demo tự di chuyển con trỏ qua các ô và làm lựa chọn trung tâm đổi theo vị trí. Ý tưởng có thể chuyển thành gợi ý mặt hàng chọn bằng click/keyboard; Campus Coin đã dùng các nút gợi ý có tên rõ, không cần con trỏ giả hoặc hiệu ứng hút.
- **Time scrubber:** thanh thời gian thay đổi trạng thái khi được kéo. Với dự báo dòng tiền, bộ chọn 30/90/180/365 ngày đã thể hiện rõ mốc được chọn và chỉ thay đổi kịch bản đang xem.
- **Eye tracker:** mắt trong demo chạy theo vị trí con trỏ. Đây là chuyển động trang trí, không truyền thông tin tài chính nên không áp dụng.
- **Inline confirm:** bấm `Delete` đổi trạng thái thành `Deleted` và hiện `Undo`. Mẫu này hữu ích cho thao tác có thể khôi phục ngay; không gắn nó vào ledger hoặc savings vì các bản ghi tiền là append-only. Khi cần sửa giao dịch, hệ thống phải dùng correction/reversal có lý do và quyền thích hợp.
- **Bộ lọc Hover/Press:** lọc demo theo kiểu tương tác giúp nhận ra loại điều khiển cần thử; đây là cách khám phá thư viện, không phải thành phần cần đưa vào sản phẩm.

Những điều đã đưa vào Campus Coin đều có bản đồ trạng thái bền vững hơn animation: trạng thái được chọn công bố qua `aria-pressed`, kế hoạch tắt có thể bật lại, lỗi có thể thử lại tại chỗ, và phản hồi mutation chỉ xuất hiện sau khi server xác nhận. Chuyển động chỉ dùng ngắn và tôn trọng `prefers-reduced-motion`.

## Bổ sung áp dụng ngày 2026-09-28

- Gợi ý mặt hàng trong form payment hiện thành các nút chọn nhanh rõ ràng khi focus. Khi account chưa có lịch sử, form giải thích vì sao chưa có gợi ý và dữ liệu nào sẽ làm gợi ý xuất hiện; không tạo dữ liệu mẫu.
- Chọn mặt hàng làm điền tên vào ô nhưng không lưu giao dịch. Khi người dùng nhập amount, so sánh số lần trước và khoảng cách mua hiện lên như thông tin trung tính.
- Tắt một khoản kế hoạch cần xác nhận ngay tại dòng đó; có thể hủy bằng bàn phím. Kế hoạch đã tắt có thể bật lại; giao diện báo thành công rõ ràng.
- Kế hoạch dòng tiền có bộ chọn 30/90/180/365 ngày. Màn hình thử khoản chi dùng đúng khoảng đang xem và còn là kịch bản, không ghi giao dịch.
- Các hiệu ứng vào danh sách và xác nhận dùng chuyển động ngắn; quy tắc `prefers-reduced-motion` toàn cục tôn trọng lựa chọn giảm chuyển động.
- Trang đăng nhập/OTP nhận tinh chỉnh focus và kiểu nhập mã; toàn bộ form giữ semantic label, native input và trạng thái lỗi.

Những thay đổi này nằm trong form payment và màn **Báo cáo → Kế hoạch dòng tiền**; chúng không đổi màu sắc/bố cục chính của dashboard. Người dùng không có lịch sử giao dịch hoặc chưa khai báo kế hoạch sẽ chỉ thấy giải thích/trạng thái rỗng, không có số liệu minh họa.

## Kiểm tra và giới hạn

- Kết quả ban đầu ngày 2026-09-27: `npm run test:web` 33/33 pass cho tương tác nền.
- Kết quả hiện tại sau các thay đổi ngày 2026-09-28 được cập nhật ở [CURRENT-STATUS](../CURRENT-STATUS.md); số test được ghi sau lượt chạy gần nhất, không suy ra từ tài liệu cũ.
- Đây là kiểm tra component trong jsdom, chưa thay cho kiểm tra bằng trình đọc màn hình, bàn phím thực, thiết bị di động hoặc 4 trình duyệt mục tiêu.
- Phần tinh chỉnh tương tác trong lượt này chỉ sửa service/repository để nút bật lại khoản đã tắt hoạt động; câu này chỉ mô tả phần tương tác, không mô tả các thay đổi khác của nhánh về tiền authoritative, ledger contract hoặc migration.
