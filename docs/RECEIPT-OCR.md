# Nhận diện hóa đơn bằng ảnh

## Trạng thái

Campus Coin có luồng thử nghiệm OCR dùng Google Cloud Vision `DOCUMENT_TEXT_DETECTION`. Luồng tắt mặc định. Local unit test dùng phản hồi giả; chưa có bằng chứng API key, quota, chi phí hoặc OCR thật đã được cấu hình.

## Luồng người dùng

1. Người dùng chọn/chụp ảnh JPEG hoặc PNG trong biểu mẫu payment.
2. Trình duyệt thu nhỏ ảnh thành JPEG, tối đa 1600 px cạnh dài và 2.2 MB.
3. Người dùng chọn checkbox đồng ý gửi ảnh tới Google Cloud Vision và bấm “Đọc hóa đơn”.
4. Máy chủ xác thực session, CSRF/Origin, consent, định dạng/kích thước ảnh và quota.
5. API trả số tiền và mô tả ở dạng dự thảo. Ảnh và OCR text đầy đủ không được lưu bởi Campus Coin; không có payment nào được tạo.
6. Người dùng kiểm tra/sửa số tiền, mô tả, ngày và category rồi tự bấm lưu giao dịch hiện có.

Nếu OCR không tìm thấy tổng tiền hoặc provider lỗi, người dùng nhập tay. Không suy đoán kết quả và không tạo giao dịch tự động.

## Cấu hình provider

Để thử OCR thật, quản trị viên cần bật Cloud Vision API trong Google Cloud project, tạo API key chỉ cho Cloud Vision và lưu key trong secret environment phía server. Tên biến là `GOOGLE_CLOUD_VISION_API_KEY`; bật `RECEIPT_OCR_ENABLED=true` chỉ trong môi trường test/preview sau khi có quota/chi phí và quyền riêng tư được kiểm tra. Không gửi key qua chat hoặc commit.

Google Cloud khuyến nghị gửi API key qua header `x-goog-api-key` và áp dụng restriction cho key. Ảnh được gửi tới endpoint `images:annotate`; trước khi bật, nhóm phải tự xem điều khoản xử lý/lưu giữ của Cloud Vision và thông báo phù hợp cho người dùng. [Tài liệu yêu cầu Vision](https://docs.cloud.google.com/vision/docs/request), [OCR](https://docs.cloud.google.com/vision/docs/ocr), [dùng API key](https://docs.cloud.google.com/docs/authentication/api-keys-use), [bảo vệ API key](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices).

## Giới hạn hiện tại

- Chỉ nhận JPEG/PNG; ảnh tối đa 2.2 MB sau khi thu nhỏ.
- Parser chỉ lấy một dòng mô tả ngắn và một con số gần nhãn tổng tiền. Biên lai nhiều loại định dạng/ngôn ngữ có thể bị đọc sai.
- Kết quả luôn là bản nháp, không phải biên nhận thanh toán hay bằng chứng ngân hàng.
- Quota hiện giới hạn 5 lượt/user/giờ và 10 lượt/IP/giờ. Hạn mức này giảm lạm dụng nhưng không thay thế quota/budget Google Cloud.
- Chưa có live provider test. Người giữ secret cần thử một ảnh hóa đơn giả/được phép, rà kết quả ở UI, kiểm tra quota và xác nhận không có ảnh/OCR text trong log.
