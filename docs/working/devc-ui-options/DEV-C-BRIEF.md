# Gói bàn giao giao diện cho DevC

## File cần đọc

**Quyết định và hợp đồng:**

- `AGENTS.md`
- `docs/README.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DOMAIN-MODEL.md`
- `docs/AUTHENTICATION.md`
- `docs/contracts/openapi.yaml`
- `docs/QUALITY-AND-SCORING.md`
- `docs/ENGINEERING-PRINCIPLES-APPLICATION.md`
- `docs/TEAM-BOARD.md`
- `docs/DELIVERY-PLAN.md`

**Giao diện và API client hiện có:**

- `src/app/App.tsx`
- `src/app/text.ts`
- `src/app/main.tsx`
- `src/styles/main.css`
- `src/features/auth/auth.api.ts`

**Chỉ đọc để nối đúng API và quyền:**

- `src/routes/api.ts`, `src/routes/domain.ts`
- `src/application/wallet.service.ts`
- `src/application/ledger.service.ts`
- `src/application/savings.service.ts`
- `src/application/category.service.ts`
- `src/application/budget.service.ts`
- `src/application/report.service.ts`
- `src/application/issue.service.ts`
- `test/auth.mysql.integration.test.ts`
- `test/mysql.integration.test.ts`
- `test/e2e.contract.smoke.test.ts`

## Ba bản xem trước

- `option-01-so-tay.html` và `option-01-so-tay.css`
- `option-02-ban-tin.html` và `option-02-ban-tin.css`
- `option-03-tuyen-chi.html` và `option-03-tuyen-chi.css`

## Phạm vi theo thứ tự

1. Dựng cả ba hướng xem trước thành ba trang/trạng thái tách biệt, dùng cùng nội dung và dữ liệu minh họa. Chụp/xuất ảnh bản desktop và mobile để nhóm so sánh. Chưa nối API ở bước này.
2. Ghi nhận ưu/nhược từng hướng theo độ rõ, dấu ấn sinh viên, khả năng đọc, mobile và bàn phím; đề xuất một hướng, để nhóm chọn.
3. Sau khi nhóm chọn, giữ flow đăng nhập hiện có: đăng nhập thành công mở dashboard, đăng xuất quay lại đăng nhập. Nối hướng được chọn với API thật.
4. Triển khai theo lát: khởi tạo ví, dashboard, ghi thu/chi và lịch sử; sau đó tiết kiệm, danh mục/ngân sách; cuối cùng báo cáo và issue.

## Hợp đồng cần giữ

- Bắt đầu bằng `GET /api/v1/wallet`. Nếu ví chưa tồn tại và API trả `404`, hiện bước nhập số dư ban đầu rồi gọi `POST /api/v1/wallet/baseline`.
- Số dư ban đầu là số mở ví, không phải giao dịch `income` và không đại diện cho tiền thật.
- Đọc các route còn lại trong `docs/contracts/openapi.yaml`; không tự tạo endpoint hoặc field mới.
- Dashboard hiện có thể trả một số field `null` trước khi có ví, trong khi OpenAPI khai báo chúng bắt buộc. Hãy xử lý trạng thái chưa có ví an toàn và báo lại nhóm để thống nhất hợp đồng.
- Các thao tác ghi cần CSRF và `Idempotency-Key`. Helper hiện tại trong `src/features/auth/auth.api.ts` chưa có chỗ truyền `Idempotency-Key`; hãy bổ sung cách truyền nhỏ, rõ ràng.
- Owner lấy từ session server. Không gửi `user_id` từ trình duyệt để cấp quyền; không lưu session hoặc dữ liệu tài chính trong localStorage.

## Yêu cầu giao diện và mã

- Chọn một hướng làm nền; có thể lấy một chi tiết nhỏ từ hai bản còn lại.
- Tạo dấu ấn sinh viên riêng, dễ nhận ra nhưng không cần đồ họa phức tạp. Tránh mẫu dashboard đại trà với hàng loạt card giống nhau, gradient phủ cả trang, hiệu ứng kính và emoji ngẫu nhiên.
- Ưu tiên semantic HTML, input có label, báo lỗi gắn với field, bàn phím/focus dùng được, nội dung `vi|en`, responsive và `prefers-reduced-motion`.
- Có trạng thái loading, empty, success, lỗi mạng, 401, 403 và chưa có ví. Giữ dữ liệu form khi lỗi; chặn submit lặp. Retry cùng thao tác dùng lại idempotency key của thao tác đó.
- Viết component và hàm ngắn, tên dễ hiểu, CSS dễ sửa. Không thêm thư viện UI nếu chưa có nhu cầu cụ thể.
- Bản xem trước dùng dữ liệu giả để so sánh. Không chuyển các số liệu đó thành dữ liệu khởi tạo thật.
- Ba hướng phải dùng chung bộ số liệu để so sánh công bằng: số dư 4.280.000 VND; thu tháng 2.400.000 VND; chi tháng 1.640.000 VND; tiết kiệm 900.000 VND; ăn uống 1.260.000/2.000.000 VND.

## Bàn giao

Gửi nhóm ba ảnh so sánh desktop/mobile, nhận xét ngắn từng hướng và đề xuất một hướng. Sau khi nhóm chọn, bàn giao màn hình đã nối API, cách chạy, kết quả kiểm tra thực tế và các điểm hợp đồng API cần DevA xử lý. Không ghi staging/API là đã kiểm chứng nếu chưa chạy với môi trường đó.
