# Campus Coin — Bộ tài liệu sản phẩm và kiến trúc

## Mục đích

Thư mục này là nguồn tài liệu chuẩn cho Campus Coin: một ứng dụng Web hỗ trợ hai ngôn ngữ **English (en)** và **Tiếng Việt (vi)**, giúp sinh viên ghi nhận `income` (thu nhập), `payment` (thanh toán), theo dõi ví, quản lý tiền tiết kiệm và ngân sách. Người dùng chuyển ngôn ngữ bằng một nút riêng, độc lập với nút chuyển dark/light. Ứng dụng **không phải** ngân hàng, dịch vụ cho vay, BNPL/pay-later hay dịch vụ tư vấn tài chính.

Tài liệu này được xây dựng từ SRS tiếng Việt và các quyết định sản phẩm mới. Khi SRS cũ mâu thuẫn với các quyết định mới, quyết định mới trong bộ tài liệu này được ưu tiên. SRS gốc không bị sửa.

## Quyết định nền tảng đã chốt

| Chủ đề | Quyết định |
|---|---|
| Ngôn ngữ giao diện/nội dung | Toàn bộ UI, thông báo, validation, report và nội dung sản phẩm hỗ trợ `en`/`vi`; người dùng chuyển bằng nút riêng. Thuật ngữ loại giao dịch trong API/domain vẫn là đúng hai giá trị `income` và `payment`; nhãn UI theo locale lần lượt là “Thu nhập”/“Thanh toán” hoặc “Income”/“Payment”. |
| Tiền tệ | VND; số tiền là số nguyên dương theo VND, không dùng số thực cho tính toán tiền. |
| Thời gian | Quy ước nghiệp vụ và hiển thị `Asia/Ho_Chi_Minh`; có thể lưu instant UTC nhưng mọi ngày/tháng báo cáo được quy đổi theo múi giờ Việt Nam. |
| Lịch sử | Ledger giao dịch bất biến. Không sửa/xóa âm thầm; hiệu chỉnh bằng bản ghi đảo/điều chỉnh mới và audit trail. |
| Ví và tiết kiệm | Ví là nguồn của mọi `payment`; tiền tiết kiệm là số dư/khoản mục riêng, không gộp vào ví. Chuyển vào/ra tiết kiệm là internal transfer, không phải `income`/`payment` và không tính vào tổng hai loại đó. |
| Ngân sách | Theo tháng và danh mục; chỉ `payment` làm tăng mức sử dụng. Cảnh báo chạm/vượt ngưỡng không chặn thanh toán. |
| Tính toán tiền | Backend/domain service và giao dịch DB là nguồn sự thật duy nhất. JEV chỉ phân loại, trích xuất, tóm tắt hoặc gợi ý. |
| Cơ sở dữ liệu | MySQL được quản lý trên cloud, có transaction/foreign key/constraint và backup; xem `ARCHITECTURE.md`. |
| Xác thực | Server-side opaque session trong cookie bảo mật cho ứng dụng Web; Google OAuth và local password đều đổi thành session; không dùng JWT làm session trình duyệt. |
| Triển khai | React + TypeScript/TSX và Node.js API TypeScript trên Vercel (MVP), kết nối MySQL managed; nhà cung cấp cụ thể là quyết định triển khai, không ghi secret vào repo. |

## Bản đồ tài liệu

| Tài liệu | Nội dung chính | Đọc khi |
|---|---|---|
| [`PRD.md`](./PRD.md) | Tầm nhìn, người dùng, phạm vi, yêu cầu, acceptance criteria và out-of-scope | Cần hiểu sản phẩm phải làm gì |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Kiến trúc lớp, stack, cloud, dữ liệu, auth boundary và vận hành | Cần quyết định hệ thống được xây như thế nào |
| [`DOMAIN-MODEL.md`](./DOMAIN-MODEL.md) | Thực thể, ledger bất biến, công thức ví/tiết kiệm/ngân sách và invariant | Cần triển khai hoặc review nghiệp vụ tiền |
| [`AUTHENTICATION.md`](./AUTHENTICATION.md) | Local account, Google OAuth, linking, OTP, session, Gmail notification và threat controls | Cần thiết kế auth hoặc recovery |
| [`AI-JEV.md`](./AI-JEV.md) | Ranh giới JEV, pipeline sync/async, fallback, privacy và đánh giá | Cần tích hợp AI an toàn |
| [`ADMIN-OPERATIONS.md`](./ADMIN-OPERATIONS.md) | Vai trò admin, report/issue workflow, least privilege và audit | Cần vận hành sản phẩm |
| [`ROADMAP.md`](./ROADMAP.md) | MVP, các phase sau, rủi ro và câu hỏi mở không blocking | Cần lập kế hoạch thực hiện |
| [`working/TEAM-BOARD.md`](./working/TEAM-BOARD.md) | Bảng Kanban, owner, scope, handoff và merge gate của lượt phân tích này | Cần truy vết cách tài liệu được tạo |

## Thứ tự ưu tiên khi có mâu thuẫn

1. Quyết định sản phẩm được nêu trong yêu cầu hiện hành.
2. Invariant và ranh giới an toàn trong `DOMAIN-MODEL.md`/`AUTHENTICATION.md`.
3. Quyết định kiến trúc trong `ARCHITECTURE.md`.
4. Yêu cầu chức năng còn phù hợp của SRS Campus Coin.
5. Giả định hoặc câu hỏi mở trong `ROADMAP.md`.

## Phạm vi tài liệu và ngoài phạm vi

Bộ tài liệu mô tả một web app quản lý thu nhập và thanh toán do người dùng tự nhập. Không tài liệu nào cấp phép tích hợp tài khoản ngân hàng, giữ tiền thật, xử lý thanh toán thật, cho vay, BNPL, tính lãi, đầu tư hoặc đưa lời khuyên tài chính được chứng nhận. Tài liệu cũng không chứa mã nguồn, credential thật hoặc dữ liệu cá nhân thật.

## Quy tắc thuật ngữ

- Viết `income` và `payment` khi nói về enum/API/domain; dùng “Thu nhập” và “Thanh toán” ở UI.
- Không dùng `expense` hoặc “chi phí” để đặt tên loại giao dịch. Có thể nói “mức sử dụng ngân sách” hoặc “tổng thanh toán”.
- “Ví” là số dư khả dụng để thanh toán; “tiền tiết kiệm” là số dư tách biệt.
- “Điều chỉnh/đảo giao dịch” luôn là bản ghi mới tham chiếu bản ghi cũ, không phải mutation.
- Mọi ví dụ tiền dùng VND; mọi ngày/tháng nghiệp vụ dùng `Asia/Ho_Chi_Minh`.

## Quy tắc đa ngôn ngữ

- Mọi nội dung người dùng nhìn thấy phải có bản dịch `en` và `vi`: navigation, label, form, validation, lỗi nghiệp vụ, report, notification, nội dung admin và nhãn AI.
- Nút chuyển ngôn ngữ là control riêng, hoạt động độc lập với nút dark/light; lựa chọn được lưu theo user hoặc trình duyệt.
- Locale mặc định cho user Việt Nam là `vi-VN`; locale English dùng `en-US` hoặc `en-GB` theo quyết định triển khai, không thay đổi currency VND hoặc timezone `Asia/Ho_Chi_Minh`.
- Enum/API/domain, tên field, mã lỗi và audit event giữ ổn định bằng tiếng Anh; chỉ lớp presentation/localization thay đổi nhãn hiển thị.
- Không ghép chuỗi bằng cách trộn hai ngôn ngữ. Translation key phải có fallback an toàn và được kiểm tra khi thiếu bản dịch.

## Cách cập nhật

Thay đổi miền phải cập nhật đồng thời `PRD.md`, `DOMAIN-MODEL.md` và các acceptance criteria liên quan. Thay đổi auth phải cập nhật `AUTHENTICATION.md` và `ARCHITECTURE.md`. Thay đổi JEV/admin phải cập nhật tài liệu tương ứng và `ROADMAP.md`. Mọi quyết định mới cần ghi giả định, tác động và cách kiểm chứng; không ghi secret.
