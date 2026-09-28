# Developer C — hoàn thiện trình bày, accessibility và tương thích

> Cập nhật: 2026-09-28. Đây là handoff theo trạng thái code hiện tại của nhánh `hiep`.

## Trạng thái sản phẩm

Các màn nghiệp vụ chính đã có trong source: dashboard/ví, form `income` và `payment`, lịch sử/phân trang, savings, ngân sách, báo cáo, quản lý danh mục, hồ sơ/cài đặt, đổi mật khẩu qua OTP, bắt buộc hoàn thiện tên/mật khẩu sau Google nếu thiếu, help và issue/admin. Báo cáo hiện có so sánh chi theo danh mục và kế hoạch dòng tiền; form payment có gợi ý mặt hàng, so sánh giá/nhịp mua và OCR hóa đơn thành bản nháp.

Code/components đã có regression tests. Đây chưa phải bằng chứng kiểm thử trực tiếp các màn đã đăng nhập trên trình duyệt hoặc screen reader. UI không tự tính số dư, không cấp quyền, không ghi dữ liệu mẫu; owner do session server quyết định.

## Việc Dev C cần làm

1. **Polish bề mặt giao diện:** rà chữ, khoảng cách, thứ bậc tiêu đề, mobile navigation và trạng thái trống/loading/error của từng trang; giữ nhận diện Campus Coin, tránh viết lại service hoặc đổi contract.
2. **Kiểm thử trình duyệt:** lập bảng Chrome, Firefox, Edge và Opera với version, ngày, viewport. Bao gồm login/register/reset, dashboard, payment form, Reports, Settings và Help. Dùng tài khoản thử nghiệm riêng; không ghi secret hoặc dữ liệu người khác vào evidence.
3. **Accessibility:** thử keyboard-only, focus mở/đóng dialog và menu, nhãn/lỗi/live region, zoom 200%, contrast, giảm chuyển động; ghi rõ screen reader nếu có thiết bị để thử.
4. **Responsive:** kiểm tra ít nhất 320×640, 375×812, 768×1024, 1200×800 và 667×375. Ghi overflow ngang, nút bị che, dialog cuộn và footer cố định có che nội dung không.
5. **SRS/evidence:** đối chiếu từng màn với acceptance trong SRS có thẩm quyền; chụp ảnh hoặc quay clip ngắn cho luồng thành công và trạng thái lỗi. Không khẳng định coverage chỉ từ ảnh.

## Quy tắc khi sửa

- Dùng semantic HTML: `form`, `label`, input type phù hợp, `button`, `fieldset`/`legend` cho nhóm trường; submit được bằng Enter và keyboard.
- Mọi thao tác giữ loading, success, empty, validation, 401/403/404/409/422/429 và server-error state. Request lỗi phải giữ input người dùng.
- Có đủ nội dung VI/EN. Không truyền nghĩa chỉ bằng màu hoặc animation.
- Giữ component và CSS dễ đọc; không thêm dependency hoặc abstraction nếu không cần thiết.
- Không thay test bằng mock giả cho business invariant, không xóa lịch sử tiền và không dùng undo để xóa ledger. Correction/reversal phải theo API/domain contract.
- Không bật provider JEV/OCR trong UI nếu server chưa cấu hình; luôn để lối nhập tay.

## Giới hạn phối hợp hiện tại

- MySQL clone có checksum mismatch ở migration `0006`–`0010`. Không chạy DB test ghi dữ liệu hoặc migration lên clone cho tới khi DevB/DB owner đối chiếu; xem [DB-STAGING-TESTING.md](../../DB-STAGING-TESTING.md).
- OCR/JEV mặc định tắt và chưa có live provider probe. Không dùng ảnh bill hoặc dữ liệu thật để demo nếu chưa có consent/cấu hình môi trường.
- Local UI hiện có component-test evidence. CI trên commit sau push và browser matrix cần được ghi riêng; chúng không được suy ra từ lịch sử.

## Kết quả cần bàn giao

- Bảng browser/version/viewport/kết quả/lỗi đã sửa.
- Checklist keyboard/focus/labels/contrast/reduced-motion.
- Ảnh hoặc clip của các trang/luồng chính sau khi đăng nhập tài khoản thử nghiệm.
- Danh sách lỗi UI còn lại, có đường tái hiện và mức độ ưu tiên.
