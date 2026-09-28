# ADR-0010: Trường hồ sơ cá nhân tùy chọn

- **Trạng thái:** Đã chấp nhận bởi Team Leader ngày 2026-09-28
- **Phạm vi:** ngày sinh và giới tính trong hồ sơ user

## Bối cảnh

Settings cần cho phép người dùng cập nhật ngày sinh và giới tính. Hai trường này là dữ liệu cá nhân và không cần thiết để ghi nhận hoặc tính toán giao dịch.

## Quyết định

- Lưu `birth_date DATE NULL` và `gender VARCHAR(32) NULL` bằng migration additive; tài khoản hiện có giữ `NULL`.
- Cả hai trường đều tùy chọn. API chỉ chấp nhận các mã giới tính định nghĩa trong contract và ngày lịch hợp lệ không ở tương lai theo `Asia/Ho_Chi_Minh`.
- Chỉ endpoint hồ sơ của user đang đăng nhập trả/ghi các trường này; owner lấy từ session.
- Không đưa ngày sinh/giới tính vào admin list, audit detail, analytics, logs hoặc JEV request.
- Chỉ cấp runtime `UPDATE` cho hai cột mới cần sửa; không cần index vì không có truy vấn lọc theo chúng.

## Hệ quả

- Database dùng chung cần chạy migration `0034_user_profile_details.sql` trước khi bật bản app mới.
- Bản ghi cũ tương thích vì hai cột cho phép `NULL`; người dùng có thể xóa giá trị bằng PATCH `null`.
- Ngày sinh và giới tính không ảnh hưởng đến session authorization hoặc domain tiền.

## Rủi ro và giới hạn

Ngày sinh/giới tính có thể được xem là dữ liệu nhạy cảm theo chính sách tổ chức; production cần giữ mục đích sử dụng rõ, hạn chế quyền truy cập và tuân thủ yêu cầu lưu trữ của dự án.
