# Developer C — UI domain, accessibility và tương thích

## Ưu tiên theo rubric

Functionality Testing chiếm 35 điểm; UI/accessibility 15 điểm; compatibility 5 điểm. Auth screen đã có, nhưng sau khi đăng nhập còn thiếu trải nghiệm domain hoàn chỉnh.

## Lát cắt cần hoàn thiện

1. Wallet onboarding và dashboard.
2. Tạo `income`/`payment`, lịch sử và phân trang.
3. Savings và chuyển tiền giữa wallet/savings.
4. Category, budget và cảnh báo vượt ngân sách.
5. Báo cáo; issue form/trạng thái nếu còn thời gian.

Dùng API trong [OpenAPI](../../contracts/openapi.yaml). Owner lấy từ session server; browser không gửi `userId` làm quyền sở hữu. Không tính balance hoặc quyết định payment trong UI.

## Acceptance giao diện

- Dùng semantic HTML: `form`, `label`, input type phù hợp, `button`, fieldset/legend khi có nhóm trường; submit hoạt động bằng Enter và keyboard.
- Mỗi thao tác có loading, thành công, empty, validation, 401/403/404/409/422/429 và lỗi server. Request lỗi không xóa input người dùng.
- Nội dung/label/lỗi/status có `en` và `vi`; focus được đưa tới lỗi phù hợp, error liên kết bằng `aria-describedby`, async status dùng live region vừa đủ.
- Thiết kế có dấu ấn riêng, dễ đọc, responsive trên màn nhỏ; không dựa vào màu sắc đơn lẻ để truyền nghĩa.
- Giữ component và CSS thẳng, đặt tên dễ giải thích; chỉ thêm abstraction khi có reuse thực sự.

## Bằng chứng để chấm

- Bảng SRS → trang/luồng → API → test thủ công/tự động.
- Ảnh hoặc video ngắn của các luồng chính và viewport mobile/desktop.
- Checklist keyboard/focus/labels/live-region và các trạng thái lỗi/loading.
- Ma trận Chrome, Firefox, Edge, Opera gồm version, viewport, ngày, kết quả và lỗi đã sửa.
