# Nguồn tham khảo cho ba hướng giao diện

Các bản HTML/CSS trong thư mục này được viết riêng cho Campus Coin. Không có mã nguồn, CSS, font hoặc hình ảnh nào được sao chép từ các repo bên dưới. Các liên kết chỉ giúp DevC hiểu nguyên tắc đã tham khảo.

## Tài liệu CLOVER đã dùng để tìm đầu mối

- `D:\bacHo\CLOVER\START_HERE.md` dẫn đến Opportunity Library cho tra cứu nguồn.
- `D:\bacHo\CLOVER\clover-opportunity-library\20-Sources\catalog\myidea-organized-r2.owner.vi.md` có các locator bên dưới.
- `SOURCE_MANIFEST.json` đánh dấu nguồn được lưu là ghi chú bảo quản; quyền sử dụng chưa được xác minh độc lập. Vì vậy, không coi catalog là giấy phép sao chép hoặc cài đặt.

## Repo/trang upstream đã mở để tham khảo

| Nguồn | Điều hữu ích cho bản xem trước | Đã dùng | Chưa làm |
|---|---|---|---|
| [Impeccable](https://github.com/pbakaus/impeccable) | Đánh giá lựa chọn bố cục theo mục tiêu; phát hiện bố cục card lặp và thứ bậc đơn điệu. | Tham khảo khi làm hướng sổ tay và rà sự khác biệt giữa ba bố cục. | Chưa cài hoặc chạy skill; không dùng stylesheet/code của repo. |
| [Hallmark](https://github.com/Nutlope/hallmark) | Chọn cấu trúc lớn theo brief thay vì chỉ đổi màu của một mẫu chung. | Mỗi phương án dùng một cấu trúc và cách trình bày dữ liệu khác nhau. | Chưa cài; chưa kiểm tra license/maintenance đầy đủ. |
| [OpenDesign](https://github.com/nexu-io/open-design) | README mô tả đi từ brief đến hướng thiết kế, design system rồi artifact HTML/CSS. | Dùng làm cách tổ chức ba lựa chọn xem trước và gói handoff. | Không chạy ứng dụng prototype, không dùng artifact của repo. |
| [React Bits](https://github.com/DavidHDev/react-bits) | Thư viện component/animation React; có thể là nguồn xem xét nếu sau này cần một tương tác nhỏ. | Không đưa component/animation vào ba bản preview tĩnh. | Chưa chọn component, cài dependency hoặc sao chép asset/code. |
| [A11Y.md](https://github.com/fecarrico/A11Y.md) và [WCAG 2.2](https://www.w3.org/TR/wcag/) | Gợi ý kiểm tra semantic, bàn phím, focus và khả năng đọc. | Bản preview dùng landmarks/heading/table/list/time/progress phù hợp, focus-visible và breakpoint mobile. | Đây chưa phải audit accessibility đầy đủ hoặc kiểm thử với người dùng. |

## Giới hạn

Các preview mới được đọc lại và kiểm tra tĩnh trong phạm vi hẹp. Chưa xác nhận hình ảnh render trong Chrome/Edge, chưa chạy app/build/test suite, chưa nối API và chưa có đánh giá người dùng. Những điểm này cần DevC kiểm tra khi chọn phương án và triển khai thật.
