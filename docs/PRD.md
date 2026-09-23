# PRD — Campus Coin

## 1. Tóm tắt

Campus Coin là ứng dụng Web hỗ trợ hai ngôn ngữ **English (en)** và **Tiếng Việt (vi)** dành cho sinh viên để tự ghi nhận `income` và `payment`, theo dõi số dư ví hiện tại, tách riêng tiền tiết kiệm, đặt ngân sách theo tháng/danh mục và xem báo cáo dễ hiểu. Người dùng chuyển ngôn ngữ bằng một nút riêng, độc lập với nút dark/light. Mục tiêu là giúp người dùng nhìn thấy dòng tiền do mình nhập và đưa ra quyết định chi tiêu có ý thức; ứng dụng không giữ tiền, không kết nối ngân hàng và không cung cấp sản phẩm tín dụng.

Mọi phép tính số dư, kiểm tra khả dụng và mức sử dụng ngân sách do backend/domain service xác định. JEV (tên model được yêu cầu) chỉ tạo đề xuất có thể kiểm tra, không có quyền quyết định tài chính.

## 2. Vấn đề và người dùng mục tiêu

Sinh viên thường nhận tiền từ trợ cấp, việc bán thời gian, học bổng hoặc quà tặng không đều; các khoản thanh toán hằng ngày cũng đa dạng. Công cụ tổng quát dễ dùng sai thuật ngữ, không phản ánh việc có một ví hiện tại và một khoản tiết kiệm tách biệt, hoặc khiến người dùng tưởng cảnh báo ngân sách là hạn mức thanh toán.

**Người dùng chính:** sinh viên tự quản lý tiền của mình trên điện thoại hoặc máy tính.

**Người dùng hỗ trợ:** quản trị viên vận hành sản phẩm, chủ yếu đọc và xử lý report/issue.

## 3. Mục tiêu và chỉ số kết quả

- Người dùng tạo tài khoản và ghi nhận bản `income`/`payment` đầu tiên mà không cần kiến thức tài chính chuyên môn.
- Mỗi `payment` hợp lệ làm giảm ví; không thể tạo `payment` vượt số dư ví tại thời điểm commit.
- Người dùng phân biệt rõ số dư ví với tiền tiết kiệm và thấy tác động của chuyển nội bộ.
- Báo cáo theo tháng/danh mục phản ánh đúng dữ liệu bất biến; cảnh báo ngân sách chỉ cảnh báo, không cản trở thanh toán.
- Người dùng có thể chọn biểu đồ tròn hoặc cột và chuyển dark/light bằng một nút chuyên dụng.
- JEV giảm thao tác phân loại/tóm tắt nhưng không làm thay đổi kết quả tính tiền hoặc quyền tạo `payment`.
- Admin xử lý report có trạng thái/audit mà không cần truy cập chi tiết tài chính không cần thiết.

Chỉ số vận hành nên theo dõi sau MVP: tỷ lệ tạo giao dịch thành công, tỷ lệ người dùng phải sửa đề xuất JEV, tỷ lệ lỗi payment do ví không đủ, thời gian phản hồi báo cáo, tỷ lệ report được triage và tỷ lệ gửi email thất bại. Không dùng một chỉ số AI làm tiêu chí duy nhất cho tính đúng đắn tiền.

## 4. Phạm vi MVP

### 4.1 Tài khoản và hồ sơ

- Đăng ký/đăng nhập bằng email và mật khẩu.
- Đăng nhập Google OAuth.
- Liên kết Gmail/Google identity vào tài khoản local đang đăng nhập theo luồng xác nhận rõ ràng.
- Quên/đặt lại mật khẩu bằng OTP gửi qua email/Gmail.
- Cài đặt nhận Gmail notification bật/tắt; email bảo mật bắt buộc được tách khỏi thông báo tùy chọn.
- Hồ sơ tối thiểu: tên hiển thị, email đã xác minh, múi giờ mặc định Việt Nam, trạng thái tài khoản.

### 4.2 Ví, giao dịch và hiệu chỉnh

- Người dùng nhập số dư ví hiện tại ban đầu.
- Tạo hai loại giao dịch duy nhất: `income` và `payment`; số tiền là VND nguyên dương.
- Mọi `payment` được cấp từ ví. Backend chặn tại commit nếu số dư khả dụng nhỏ hơn số tiền thanh toán.
- Lịch sử đã commit không được sửa hoặc xóa âm thầm. Hiệu chỉnh dùng bản ghi đảo/điều chỉnh mới, giữ liên kết audit.
- Lọc/xem lịch sử theo khoảng ngày, danh mục và loại; ngày/tháng hiển thị theo `Asia/Ho_Chi_Minh`.
- Có thể hỗ trợ giao dịch lặp lại ở phase sau; nếu làm, mỗi lần phát sinh vẫn là bản ghi immutable riêng.

### 4.3 Tiền tiết kiệm

- Tiền tiết kiệm có số dư riêng, không nằm trong số dư ví.
- Người dùng gửi/rút tiền tiết kiệm bất cứ lúc nào; mỗi lần là một `savings_transfer` internal transfer riêng, không phải `income`/`payment` và không cộng vào tổng hai loại giao dịch.
- Có thể đặt chuyển tự động hằng tháng một số tiền cố định do người dùng chọn từ ví sang tiết kiệm. Không có lãi suất hoặc phần trăm tích lũy.
- Chuyển vào tiết kiệm phải kiểm tra ví; rút ra làm tăng ví. Lỗi/thiếu ví không được tạo bản ghi nửa chừng.

### 4.4 Danh mục và ngân sách

- Danh mục `income` và `payment` được tách theo loại; danh mục không hợp lệ với loại giao dịch bị từ chối.
- Danh mục mặc định do hệ thống cung cấp không bị xóa; người dùng có thể tắt/ẩn. Danh mục custom chỉ xóa vật lý khi không có tham chiếu lịch sử; nếu có tham chiếu thì archive/disable để giữ toàn vẹn lịch sử.
- Người dùng đặt ngân sách theo tháng và danh mục `payment`.
- Mức sử dụng ngân sách chỉ tổng hợp các `payment` thuộc tháng/danh mục; `income` và savings transfer không tính.
- Cảnh báo tại ngưỡng cấu hình và khi vượt ngân sách; cảnh báo không chặn `payment` nếu ví còn đủ.

### 4.5 Dashboard, báo cáo và UI

- Dashboard hiển thị ví khả dụng, tiền tiết kiệm, tổng `income`, tổng `payment`, ngân sách và các quick action.
- Báo cáo tháng và xu hướng tối đa sáu tháng gồm tổng hợp theo danh mục, ngày/tuần và đối chiếu ngân sách.
- Người dùng chuyển biểu đồ giữa pie và bar; lựa chọn chỉ là cách trình bày, không đổi dữ liệu.
- Nút chuyên dụng chuyển dark/light; trạng thái được lưu theo người dùng/trình duyệt.
- Toàn bộ nội dung hiển thị, label, validation, lỗi, report, notification và admin UI có bản dịch `en`/`vi`; nút chuyển ngôn ngữ hoạt động độc lập với nút dark/light. UI hỗ trợ bàn phím, focus rõ và tương phản phù hợp.

### 4.6 JEV và quản trị

- JEV đề xuất danh mục từ mô tả giao dịch, có confidence và cho phép xác nhận/ghi đè.
- JEV có thể tạo tóm tắt tháng hoặc gợi ý hành động ở ngôn ngữ đơn giản sau khi dữ liệu đã được backend tổng hợp.
- Admin nhận report/issue, triage trạng thái, ghi note nội bộ và quản lý cấu hình nội dung vận hành cần thiết; không chỉnh sửa ledger.

## 5. Acceptance criteria cấp sản phẩm

1. Đăng ký local tạo account mới với password hash; đăng nhập sai không tiết lộ account có tồn tại.
2. Google OAuth kiểm tra state/PKCE/nonce, issuer, audience, subject và email đã xác minh trước khi tạo session.
3. Một account local có thể link một hoặc nhiều Google identity sau khi người dùng xác nhận; không tự động chiếm account chỉ vì email trùng.
4. OTP reset có thời hạn, dùng một lần, giới hạn thử; mã không lưu dạng plaintext và phản hồi lỗi không cho phép dò account.
5. Giao dịch chỉ chấp nhận type đúng `income` hoặc `payment`, VND nguyên dương, category cùng loại và ngày hợp lệ.
6. Với số dư ví khả dụng là `B` và payment là `A`, commit chỉ thành công khi `B >= A`; request đồng thời không được làm số dư âm.
7. Không có thao tác người dùng/admin nào mutate hoặc hard-delete bản ghi lịch sử đã commit; correction tạo bản ghi mới và audit reference.
8. Savings deposit/withdraw/auto transfer cập nhật ví và savings trong một transaction nguyên tử, không xuất hiện trong tổng `income`/`payment`.
9. Budget consumption chỉ dùng `payment`; cảnh báo không chặn payment khi ví đủ, và payment vẫn bị chặn khi ví thiếu dù budget còn.
10. Default category không thể xóa; custom category có lịch sử không bị xóa làm hỏng tham chiếu.
11. Dashboard/report cho cùng một tập dữ liệu cho cùng tổng VND, bất kể chọn pie hay bar.
12. JEV lỗi, timeout hoặc confidence thấp thì hệ thống cho chọn category thủ công; JEV không được quyết định số dư/quyền.
13. Admin chỉ thấy dữ liệu cần cho report/operation theo quyền; mọi truy cập đặc biệt được audit.
14. Toàn bộ UI/content có thể chuyển đổi giữa English và Tiếng Việt bằng nút riêng; tiền là VND và kỳ báo cáo dùng `Asia/Ho_Chi_Minh`.

15. Locale chỉ thay đổi nội dung trình bày; enum/API/domain (`income`, `payment`), mã lỗi, công thức tiền và dữ liệu audit không đổi theo ngôn ngữ.

## 6. Out-of-scope và ranh giới bắt buộc

- Kết nối tài khoản ngân hàng, đọc số dư ngân hàng hoặc đồng bộ giao dịch ngân hàng.
- Chuyển tiền thật, cổng thanh toán, ví điện tử, lưu ký tiền hoặc xác minh giao dịch tiền thật.
- Cho vay, lãi suất, tín dụng, BNPL, pay-later, ứng trước hoặc quảng cáo các dịch vụ đó.
- Tư vấn đầu tư/tài chính được chứng nhận; JEV chỉ cung cấp thông tin mô tả và gợi ý quản lý ngân sách có thể bỏ qua.
- Tính lãi/phần trăm tăng trưởng cho tiền tiết kiệm.
- Multi-currency trong MVP; VND là đơn vị duy nhất.
- Sửa/xóa âm thầm lịch sử; admin chỉnh sửa số dư hoặc ledger trực tiếp.
- Giao quyền cho JEV xác thực, authorize payment, tính balance/budget hoặc ghi dữ liệu tài chính mà không qua domain service.
- Chatbot hỗ trợ tự do có quyền hành động; export dữ liệu nhạy cảm hàng loạt mặc định.

## 7. Giả định và phụ thuộc

- Vận hành dùng cloud-managed MySQL và Node API như `ARCHITECTURE.md`.
- Email OTP/notification đi qua nhà cung cấp email transactional hoặc Gmail-compatible provider; tên nhà cung cấp và domain gửi là quyết định triển khai, không ảnh hưởng contract.
- Model `jev` được gọi qua adapter có timeout và schema; endpoint/phiên bản cụ thể chưa chốt.
- CSV import, PDF export, giao dịch lặp lại và dự báo là phase sau trừ khi được đưa vào backlog có acceptance riêng.
- Mọi số liệu hỗ trợ người dùng là dữ liệu do chính user nhập; sản phẩm không tuyên bố số liệu là sao kê tài chính chính thức.
