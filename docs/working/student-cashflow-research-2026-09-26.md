# Nghiên cứu hướng quản lý dòng tiền cho sinh viên

- Ngày: 2026-09-26
- Trạng thái cập nhật 2026-09-28: một số hướng đã được Team Leader chấp thuận và có code. Bảng triển khai hiện hành ở [đề xuất tính năng quản lý chi tiêu](./student-finance-feature-proposal-2026-09-27.md); nội dung bên dưới giữ lại bối cảnh và các hướng chưa triển khai.
- Mục đích: Cung cấp căn cứ để Team Leader và nhóm cân nhắc hướng sản phẩm sau khi hoàn thiện giao diện domain hiện có.

## 1. Bối cảnh đề tài

Campus Coin là công cụ ghi nhận và lập kế hoạch từ dữ liệu do sinh viên nhập. Sản phẩm không kết nối/xác minh ngân hàng, không giữ tiền thật và không thực hiện thanh toán. Vì vậy lợi ích chính cần thể hiện là giúp sinh viên hiểu tiền đến và đi khi nào, nhận ra tuần có thể thiếu tiền và cân nhắc lựa chọn trước khi ghi một khoản chi.

SRS mô tả các tình huống thu nhập không đều như trợ cấp gia đình, học bổng, việc làm thêm và quà tặng. SRS cũng nêu ghi thu/chi nhanh, nhóm danh mục dành cho sinh viên, ngân sách, savings goals, báo cáo tuần/sáu tháng và mẹo dựa trên lịch sử cá nhân. Mọi khoản dự kiến phải được phân biệt với giao dịch đã ghi.

## 2. Đề xuất ưu tiên

### Ưu tiên 1: Hoàn thiện luồng tài chính đang có

Trước tiên làm cho sinh viên dùng được wallet onboarding, dashboard, ghi `income`/`payment`, lịch sử, savings, budget và report. Backend đã có các service/API domain tương ứng; giao diện sau đăng nhập hiện chưa cung cấp các màn này. Đây là nền để đáp ứng chức năng trong SRS và có một demo hoàn chỉnh.

### Ưu tiên 2: Xem dòng tiền theo tuần

**Trạng thái:** Cách xem theo từng tuần chưa có. Source hiện có forecast theo khoảng ngày user chọn (30/90/180/365), với tổng hợp kế hoạch và lịch sự kiện; đây không phải bảng số dư đầu/cuối từng tuần.

Đề xuất trả lời câu hỏi: “Từ bây giờ đến lần nhận tiền tiếp theo, số dư tuần nào có thể thiếu?”. Mỗi tuần thể hiện số dư đầu kỳ, khoản thu, chi phí/savings và số dư cuối tuần; số dư cuối chuyển thành số dư đầu tuần sau.

Khoản đã ghi và khoản dự kiến phải có nhãn riêng. Số dự kiến chỉ là kế hoạch dựa trên dữ liệu người dùng nhập, không được cộng vào wallet thực tế hoặc ledger. CFPB khuyến nghị theo dõi thu nhập, nguồn lực và chi tiêu trước khi lập cash-flow budget; mẫu của họ tính số dư tuần rồi chuyển sang tuần kế tiếp.

### Ưu tiên 3: Mô phỏng “Nếu chi khoản này?”

**Trạng thái:** What-if theo ngày/số tiền và khoảng forecast hiện có trong màn Kế hoạch dòng tiền; không đổi ledger, wallet hoặc budget. Chưa mô phỏng savings goal/category cụ thể.

Cho nhập amount, ngày và category để xem ước tính ảnh hưởng tới số dư các tuần sau, budget còn lại và savings goal. Đây là kịch bản tạm thời: không tạo ledger row, không thay đổi balance, không ngăn người dùng ghi giao dịch thật. Kết quả cần nêu khoảng thời gian và giả định.

### Ưu tiên 4: Mục tiêu savings có bước đi cụ thể

Nếu nhóm muốn phát triển tiếp, cho người dùng tự đặt target amount và ngày cần đạt; hiển thị số còn thiếu và số tiền cần dành mỗi tuần. User có thể đổi hoặc tạm dừng mục tiêu. Không áp một công thức chung như 50/30/20 cho mọi sinh viên.

### Ưu tiên 5: So sánh cá nhân

**Trạng thái:** Report so sánh tổng chi theo category giữa tháng đang xem với tháng liền trước của cùng user. Đây là so sánh lịch sử cá nhân, chưa có phân tích cohort hoặc chuẩn tham chiếu sinh viên.

Bắt đầu bằng so sánh một category/tháng với các kỳ trước của chính user. Luôn hiển thị khoảng thời gian và số kỳ có dữ liệu; không tính phần trăm khi kỳ so sánh rỗng, bằng 0 hoặc thiếu. Ngưỡng tối thiểu số tháng là quyết định UX cần thử nghiệm, không phải ngưỡng khoa học được chứng minh.

Chưa nên xếp hạng hoặc so sánh user với “sinh viên khác”: dự án chưa có dữ liệu đại diện, cơ chế đồng ý, định nghĩa cohort hay ngưỡng chống nhận diện. Không tạo benchmark giả trong demo.

## 3. Cách tạo khác biệt và đo hiệu quả

Khác biệt nên đến từ một tình huống sinh viên nhận ra được: tiền nhà/đi lại/ăn uống đến hạn trước kỳ trợ cấp hoặc học bổng tiếp theo. Demo có thể đi qua: ghi số dư và ngày tiền về → thêm khoản chi dự kiến → thấy tuần nào thiếu hoặc goal thay đổi → tự quyết định → ghi khoản thực tế nếu đã chi.

Nội dung nên ngắn, đúng lúc, gắn với mục tiêu do người dùng tự đặt, không phán xét và không hứa “giúp tiết kiệm nhiều hơn” nếu chưa đo. Nếu nhóm thử với sinh viên, ghi rõ nhiệm vụ và các số đo như thời gian ghi khoản thu/chi, số lỗi nhập, khả năng tìm tuần có nguy cơ thiếu và mức độ hiểu giả định. Một thử nghiệm nhỏ chỉ đánh giá usability, không chứng minh kết quả tài chính dài hạn.

## 4. Tham khảo sản phẩm và giấy phép

| Nguồn | Điều đáng học | Giới hạn |
|---|---|---|
| CFPB, Your Money Your Goals | Weekly cash-flow worksheet, lịch thu/chi, savings-goal tools và nguyên tắc đưa thông tin đúng lúc, có thể hành động | Đây là tài liệu giáo dục, không phải bằng chứng rằng Campus Coin tự tạo ra kết quả tài chính tốt hơn |
| Actual Budget | Envelope/category budget, số đã phân bổ/đã chi/còn lại, lịch khoản dự kiến có thể cần duyệt, nhập dữ liệu và xử lý giao dịch trùng | Repo MIT; chỉ nghiên cứu workflow và tự thiết kế. Không sao chép template, code, component hay CSS theo yêu cầu originality trong SRS |
| Firefly III | Tham khảo cách một ứng dụng cá nhân gom budget, category, mục tiêu và report | Repo AGPL-3.0, phạm vi rộng và không tập trung vào sinh viên; chỉ đọc ý tưởng, không port code |
| W3C WCAG 2.2 | Tiêu chí kiểm tra nội dung dễ nhận biết, thao tác bằng bàn phím, nhãn và báo lỗi | Dùng làm tiêu chí UI/accessibility; chưa phải kết quả kiểm thử giao diện Campus Coin |

## 5. Trạng thái và rủi ro

- Hướng dùng khoản kế hoạch, what-if, reflection không chấm điểm và so sánh cá nhân đã được đưa vào phạm vi product ở mức được mô tả trong PRD/đề xuất tính năng; chi tiết còn thiếu không tự suy ra là đã làm.
- Không mô tả bảng weekly cashflow, savings goal deadline hay benchmark giữa các nhóm sinh viên là chức năng đã triển khai.
- Các kết quả tính phải deterministic, dùng integer VND và ngày nghiệp vụ `Asia/Ho_Chi_Minh`; giữ code đơn giản để thành viên có thể giải thích.
- Dữ liệu là nhập tay nên có thể thiếu hoặc trễ. Giao diện phải nói rõ kết quả phản ánh dữ liệu được nhập, không phải số dư ngân hàng hoặc dự đoán chắc chắn.
- Chỉ triển khai sau khi các màn domain căn bản hoạt động và acceptance/test được thống nhất.

## 6. Nguồn tham khảo

- CFPB, [Creating a cash flow budget tool](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- CFPB, [Five principles of effective financial education](https://files.consumerfinance.gov/f/documents/cfpb_five-principles-practitioner-toolkit_2024-08.pdf)
- CFPB, [Savings plan tool](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)
- Actual Budget, [Budget](https://actualbudget.org/docs/tour/budget/), [Schedules](https://actualbudget.org/docs/schedules/), [Importing transactions](https://actualbudget.org/docs/transactions/importing/)
- Actual Budget, [repository](https://github.com/actualbudget/actual), [MIT license](https://github.com/actualbudget/actual/blob/master/LICENSE.txt)
- Firefly III, [repository and feature overview](https://github.com/firefly-iii/firefly-iii), [license](https://github.com/firefly-iii/firefly-iii/blob/main/COPYING)
- W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
