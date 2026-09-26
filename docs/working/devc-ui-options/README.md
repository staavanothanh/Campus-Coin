# Ba hướng giao diện Campus Coin gửi DevC

Thư mục này có ba bản xem trước HTML/CSS tĩnh để nhóm so sánh phong cách trước khi nối API.

## Cách xem

Mở từng file HTML bằng Chrome, Edge hoặc Firefox:

1. `option-01-so-tay.html` — cảm giác sổ tay ghi thu chi, giấy ấm, xanh thông và dấu đóng riêng.
2. `option-02-ban-tin.html` — kiểu trang biên tập tài chính sinh viên, nhiều khoảng trắng, chữ có thứ bậc và đường kẻ báo.
3. `option-03-tuyen-chi.html` — tuyến đường tiền trong khuôn viên, xanh mực, màu đất và giao dịch như các điểm dừng.

Các số liệu và tên trong bản xem trước là minh họa. Ba hướng dùng cùng tình huống mẫu: số dư 4.280.000 VND, thu tháng 2.400.000 VND, chi tháng 1.640.000 VND, tiết kiệm 900.000 VND và nhóm ăn uống 1.260.000/2.000.000 VND. Trang không kết nối API, không tạo giao dịch và không lưu dữ liệu.

## Chọn hướng

DevC có thể chọn một hướng làm nền, rồi giữ lại một vài chi tiết tốt từ hai hướng còn lại. Ba hướng dùng cùng một tập nội dung mẫu để dễ so sánh. Chưa hướng nào được coi là quyết định thương hiệu cuối cùng.

## Nguyên tắc triển khai

- Dùng HTML semantic, label rõ, focus bàn phím nhìn thấy được, màu đủ tương phản và bố cục co lại tốt trên màn hình nhỏ.
- Giữ mã đơn giản, CSS dễ chỉnh; không cần thư viện UI hoặc animation lớn.
- Dữ liệu thật phải lấy qua API; owner lấy từ session server. Không đưa `user_id` vào client để quyết định quyền.
- Đây là đề xuất thiết kế nội bộ, không sao chép từ một repo giao diện bên ngoài.
