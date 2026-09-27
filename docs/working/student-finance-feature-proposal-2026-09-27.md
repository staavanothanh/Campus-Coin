# Đề xuất tính năng quản lý chi tiêu theo thói quen sinh viên

> Ngày ghi nhận: 2026-09-27
> Người đề xuất: Team Leader — Hiệp
> Trạng thái: Team Leader đã chấp thuận năm nguyên tắc ở mục 7; ba ý tưởng bổ sung ở mục 9 đang được đề xuất, chưa thành phạm vi release
> Nguồn hình ảnh: bốn ảnh Notion do Team Leader cung cấp; mô tả bên dưới là điều rút ra từ ảnh, không sao chép giao diện/CSS.

## 1. Mục tiêu

Giúp sinh viên ghi khoản chi nhanh hơn, nhận ra một số thay đổi trong thói quen mua sắm, và nhìn thấy khoản tiền sắp phải trả trước khi quyết định sử dụng tiền còn lại.

Campus Coin là sổ tài chính do người dùng tự nhập. Sản phẩm không kết nối ngân hàng, không biết giao dịch chưa được nhập, và không đảm bảo khoản chi dự kiến là chính xác. Mọi nhắc nhở, xu hướng và phép so sánh phải nói rõ chúng được tính từ dữ liệu người dùng đã nhập.

Tài liệu này mở rộng ý tưởng trong [nghiên cứu dòng tiền sinh viên](./student-cashflow-research-2026-09-26.md). Năm nguyên tắc tại mục 7 đã được chấp thuận; các đề xuất khác chưa phải phạm vi release và không mở lại bất biến trong docs/DOMAIN-MODEL.md.

## 2. Ý tưởng của Team Leader

1. Khi nhập tên sản phẩm, gợi ý tối đa 10 mặt hàng người dùng đó thường mua để giảm thời gian gõ.
2. Tính tần suất mua từng mặt hàng.
3. Với khoản định kỳ như tiền nhà, cho người dùng đặt ngày đến hạn và cảnh báo trước 10 ngày.
4. Khi ghi một khoản income, cho người dùng nhìn các khoản cố định sắp đến hạn và phần tiền còn lại theo kế hoạch.
5. Với mặt hàng không định kỳ, so sánh khoảng cách giữa lần mua gần nhất và khoảng cách lần trước; cho thấy khoảng cách hiện tại ngắn hơn/dài hơn bao nhiêu ngày.
6. So sánh số tiền ghi nhận của mặt hàng với lần gần nhất, ví dụ 100.000 VND và 120.000 VND, tăng 20.000 VND.
7. Khi xem một danh mục như ăn uống, cho xem tổng chi theo tháng và so sánh với tháng trước hoặc kỳ trước.
8. Hình Notion minh họa thêm các dạng xem lịch sử theo tháng, danh mục, trạng thái/cảm nhận; có ghi chú cho một số mặt hàng và tổng tiền theo nhóm.

## 3. Những gì app hiện hỗ trợ

- ledger_transactions đã có payment, amount_vnd, category_id, occurred_at và description tùy chọn.
- description là mô tả tự do. Chưa có hợp đồng rõ ràng nói rằng trường này luôn là tên sản phẩm; có thể chứa nhiều mặt hàng hoặc ghi chú khác.
- Monthly report đã trả tổng payment và tổng chi theo danh mục cho tháng HCMC.
- Budget theo danh mục/tháng đã có; savings là aggregate riêng.
- Chưa có lịch khoản phải trả, chu kỳ thu nhập dự kiến, tên sản phẩm có cấu trúc hoặc service gợi ý mặt hàng trong contract hiện tại.

Do đó có hai nhóm việc khác nhau:

- Có thể thử sớm bằng dữ liệu hiện tại: so sánh tổng chi danh mục theo tháng, giữ owner scope và dùng date range HCMC.
- Cần chốt model/contract trước: tên sản phẩm có cấu trúc, lịch khoản cố định, trạng thái đã thanh toán và kỳ thu nhập.

## 4. Đề xuất các lát cắt

### A. So sánh chi theo danh mục và tháng

Đây là lát cắt ít phụ thuộc schema mới nhất. Cho người dùng chọn một danh mục và xem:

- Tổng payment trong tháng đang chọn.
- Tổng ở tháng liền trước hoặc một số tháng gần nhất.
- Số tiền tăng/giảm theo VND.
- Phần trăm chỉ khi kỳ trước có tổng lớn hơn 0.

Quy tắc trình bày:

- Ghi rõ hai khoảng ngày đang so sánh theo Asia/Ho_Chi_Minh.
- Nếu tháng trước không có giao dịch, ghi “chưa có khoản chi được ghi nhận”, không chia cho 0 hoặc hiện phần trăm gây hiểu nhầm.
- Chỉ tính các khoản payment đang đại diện cho chi thực tế theo correction policy; không đếm hai lần giao dịch đã reversal/thay thế.
- Dữ liệu phải được tính ở server và scope theo owner trong session.
- Bắt đầu bằng bảng/text có thể đọc bằng screen reader; chart chỉ là phần bổ sung.

Kỳ theo tháng phù hợp để làm trước. So sánh theo “mỗi lần nhận lương” cần định nghĩa kỳ income riêng ở mục D.

### B. Gợi ý mặt hàng cá nhân và so sánh lần mua

Trước khi làm, cần quyết định rõ tên sản phẩm là dữ liệu riêng hay tiếp tục dùng description.

Đề xuất để dễ nhóm và tìm chính xác:

- Tạo trường có ý nghĩa riêng như itemName cho một mặt hàng của một giao dịch payment; giữ description/ghi chú cho nội dung tự do nếu vẫn cần.
- Nếu được duyệt, thêm trường nullable bằng migration mới. Không backfill description lịch sử thành itemName tự động vì description hiện là ghi chú tự do và có thể không phải tên mặt hàng.
- Không tạo bảng catalogue toàn cục. Mặt hàng và thống kê chỉ thuộc user đã nhập chúng.
- Khi focus ô tên mặt hàng, gợi ý tối đa 10 tên của chính user; khi gõ thì lọc trong danh sách đó.
- Chuẩn hóa khóa so sánh bằng trim và so chữ hoa/thường; giữ nguyên cách viết người dùng để hiển thị. Không tự gộp tên gần giống hoặc suy ra quy cách/khối lượng.
- Đếm payment đang đại diện cho chi thực tế theo cùng correction policy của report. Khi bằng tần suất, ưu tiên lần mua gần đây hơn.
- Đặt giới hạn query và số lượng kết quả; không nhận userId từ client, lấy owner từ session.

Khi người dùng nhập mặt hàng, ngày và số tiền:

- So sánh số tiền ghi nhận lần này với payment gần nhất cho cùng mặt hàng. Câu chữ nên là “Lần này ghi nhận 120.000 VND; lần trước 100.000 VND; tăng 20.000 VND”, không kết luận giá đơn vị tăng vì app chưa biết số lượng/chất lượng.
- Nếu có đủ hai lần mua trước đó, so khoảng cách giữa hai ngày mua gần nhất với khoảng cách ngay trước đó. Ví dụ “Khoảng gần nhất: 15 ngày; lần này: 10 ngày; ngắn hơn 5 ngày”.
- Dùng câu trung tính “mua lại sớm hơn”, không kết luận “tiêu nhiều hơn” hoặc “dùng nhiều hơn”; giao dịch không cho biết lượng tiêu thụ.
- Không hiện kết luận xu hướng nếu thiếu lịch sử, ngày bị nhập lùi hoặc row lịch sử đã bị correction. Có thể nói dữ liệu chưa đủ.

Gợi ý mặc định: hiển thị chênh lệch số tiền tuyệt đối bằng VND; phần trăm chỉ khi lần trước lớn hơn 0. Không yêu cầu người dùng nhập quantity trong lát cắt đầu tiên.

### C. Khoản cố định và ngày đến hạn

Khoản dự kiến phải được lưu tách khỏi ledger:

- Có tên, payment category, số tiền ước tính, nhịp lặp, ngày đến hạn, trạng thái đang hoạt động và owner.
- Người dùng có thể tạo khoản như “Khoản nợ Hiệp”, 50.000 VND mỗi tháng, và phân loại bằng payment category `Trả nợ`. Đây chỉ là một khoản dự kiến lặp lại; không tạo hồ sơ dư nợ, không tính tiền gốc/lãi/còn nợ và không cần kết nối ngân hàng.
- Cảnh báo trong ứng dụng khi còn 10 ngày tới hạn như Team Leader đề xuất. Khoảng nhắc có thể cấu hình về sau.
- Bản đầu nên là thông báo trong app khi người dùng mở dashboard; chưa gửi email/push vì chưa có contract notification được chốt.
- Tháng không có ngày 29, 30 hoặc 31 cần quy tắc rõ. Đề xuất tạm: dùng ngày cuối cùng của tháng đó, nhưng Team Leader phải xác nhận trước khi triển khai.
- Khoản lặp được tính theo kỳ đến hạn (ví dụ một lần mỗi tháng), không được nhân thêm mỗi khi có một income. Khi có nhiều income trong cùng tháng, cùng một khoản đến hạn chỉ xuất hiện một lần trong phép tính của kỳ đó.
- Mỗi khoản đến hạn có thể chỉ hiển thị để nhắc, hoặc người dùng chủ động chọn “Tính như đã dành trước” để trừ nó trong con số còn lại dự kiến. Đây chỉ là phép tính, không phải giao dịch.
- Nếu người dùng thực sự đã trả, họ có thể chủ động chọn “Ghi khoản đã thanh toán”, xem lại ngày, category và số tiền thực tế rồi xác nhận. Chỉ sau xác nhận mới gọi luồng tạo `payment` hiện có và liên kết payment với kỳ đến hạn tương ứng. Không có lịch tự tạo payment hoặc trừ wallet.
- Mỗi lần đến hạn cần được nhận diện theo khoản lặp và tháng cụ thể để không hiện thành nhiều nghĩa vụ hoặc nhắc trùng. Payment bị correction/reversal phải làm trạng thái nghĩa vụ được tính lại theo policy; không giữ “đã trả” mồ côi.
- Khoản đã được ghép với payment thật không bị trừ thêm lần nữa trong phép tính dự kiến. Nếu số payment thật khác số ước tính, dùng số thật cho wallet/report; số ước tính chỉ áp dụng cho các kỳ tương lai chưa thanh toán.
- Lựa chọn “Tính như đã dành trước” chỉ đổi phép tính hiển thị, không khóa tiền, không trừ số dư wallet, không tạo `ledger_transactions`, không cộng `budget_used` và không tự chạy payment.
- Nếu người dùng không còn muốn theo dõi một khoản lặp, họ có thể tắt lịch để ngừng các kỳ tương lai. Không xóa payment đã ghi hoặc lịch sử kỳ đã thanh toán.

Sau khi ghi income, đề xuất một phần “Các khoản sắp đến hạn” lấy từ các khoản cố định trong khoảng thời gian được chọn. Mỗi khoản có lựa chọn “Chỉ nhắc tôi” hoặc “Tính như đã dành trước”. Số còn lại chỉ là phép tính tham khảo; khoản dự kiến được trừ gồm những occurrence chưa được ghép với payment thật và được người dùng chọn:

    Số dư server sau khi ghi income
    - tổng các khoản dự kiến chưa thanh toán mà người dùng chọn dành trước
    = số còn lại tham khảo sau khi dành trước các khoản đã chọn

Việc chọn “Tính như đã dành trước” không phải xác nhận đã trả và không làm thay đổi số dư authoritative. Nếu người dùng đã trả thật, họ dùng thao tác xác nhận riêng để ghi `payment`; khi đó wallet thay đổi qua money flow hiện có. Không thể gọi đây là số tiền còn lại “đến kỳ lương sau” nếu user chưa khai báo ngày nhận income kế tiếp. Theo nguyên tắc đã chốt, khi chưa có ngày income kế tiếp thì mặc định xem 30 ngày và gắn nhãn đây là khoảng tham khảo; không tự đoán payday.

### D. So sánh theo kỳ nhận income

Đây là phần cần định nghĩa nghiệp vụ riêng vì sinh viên có thể nhận trợ cấp, lương làm thêm hoặc học bổng vào ngày không đều.

Đề xuất thử nghiệm cho phiên bản sau:

- Mỗi income đã ghi có thể làm mốc bắt đầu một kỳ; kỳ kéo dài tới trước income kế tiếp.
- Chỉ so các kỳ đã đủ hai đầu mốc; khoản trước income đầu tiên không được âm thầm bỏ qua.
- Giao diện luôn hiện ngày bắt đầu/kết thúc; kỳ dài/ngắn khác nhau không được so sánh như thể cùng thời lượng.
- Báo cả tổng tiền và thời lượng kỳ; không nói user “vượt ngân sách” chỉ vì kỳ này dài hơn.
- Trước khi triển khai, cần quyết định cách xử lý nhiều income gần nhau và khoản thu nhập định kỳ đã dự kiến nhưng chưa nhận.

Không đưa kỳ income vào bản đầu nếu cách chia kỳ chưa được Team Leader chốt. So sánh theo tháng là phương án rõ ràng hơn để bắt đầu.

### E. Trạng thái cảm nhận, ghi chú và bố cục Notion

Ảnh Notion gợi ý lịch sử có thể lọc/nhóm theo tháng, danh mục hoặc trạng thái; mỗi row có thể có ghi chú và tổng tiền nhóm. Đây là tham khảo về cách duyệt lịch sử, không phải yêu cầu sao chép Notion.

- Ghi chú tự do có thể hữu ích để nhớ bối cảnh; giữ riêng khỏi itemName và không đưa nội dung ghi chú vào log analytics.
- Trạng thái “hài lòng/còn do dự” không cần thiết để tính số dư hoặc báo cáo tiền. Chỉ thêm nếu user research cho thấy sinh viên muốn tự nhìn lại quyết định mua; phải tùy chọn, trung tính và không ảnh hưởng budget/score.
- Không lưu ảnh Notion hay sao chép CSS/source từ sản phẩm khác vào repo.

## 5. Thứ tự đề xuất

1. Thử nghiệm so sánh chi theo danh mục giữa tháng hiện tại và tháng trước bằng monthly report API/dữ liệu tổng hợp đã có. Đây là thay đổi UI/API nhỏ nhất, không cần lịch mới.
2. Chốt semantics cho itemName và tạo gợi ý Top 10 theo user. Chỉ thêm schema/API sau khi chốt trường này; giữ nguyên display value người dùng nhập.
3. Thêm so sánh số tiền và khoảng cách mua sau khi có dữ liệu mặt hàng đủ rõ; hiển thị sự kiện thực tế bằng câu chữ trung tính.
4. Thiết kế planned obligations và cảnh báo ngày đến hạn. Đây là feature mới, cần migration, API, authorization, reminder behavior và cách liên kết payment thật.
5. Cân nhắc comparison theo kỳ income sau khi thống nhất cách chia kỳ. Không trộn số tháng với số kỳ income trong cùng nhãn.

Năm nguyên tắc nghiệp vụ ở mục 7 được Team Leader chấp thuận ngày 2026-09-27. Danh sách trên là các hướng khả thi, chưa phải lịch release hoặc phân công implementation. Cần ghi phạm vi và owner ở delivery plan trước khi bắt đầu thay schema hoặc triển khai.

## 6. Bất biến và riêng tư

- Không thay income/payment enum, VND integer rules, Asia/Ho_Chi_Minh, append-only ledger, budget warning semantics hoặc owner-from-session.
- Dự báo, khoản định kỳ, gợi ý sản phẩm và so sánh không được ghi hoặc sửa ledger.
- Chỉ thao tác payment thật được người dùng xác nhận mới cập nhật wallet/budget theo API hiện hành.
- Endpoint mới phải kiểm tra session, CSRF/Origin, validation, pagination/limit và owner scope như contract hiện hành.
- Không suy ra thu nhập/ngày lương hoặc nghĩa vụ trả nợ tự động từ lịch sử giao dịch.
- Không tạo benchmark giữa sinh viên. Chỉ so sánh với dữ liệu của chính người đang đăng nhập.
- Giao diện nói rõ khi dữ liệu thiếu, ghi chú là do người dùng tự nhập và khoản cố định là kế hoạch; không hứa dự đoán chắc chắn hoặc đưa lời khuyên phán xét.

## 7. Quyết định đã chốt và phần còn mở

### Đã được Team Leader chấp thuận ngày 2026-09-27

1. Tên mặt hàng là trường itemName riêng; description giữ vai trò ghi chú tự do. Nếu thêm trường, dùng migration mới, nullable và không tự backfill description lịch sử.
2. Khoản cố định là kế hoạch/nhắc nhở; không tự trừ wallet, không tự tạo ledger/payment và không cộng vào budget đã dùng. Người dùng có thể chọn tính khoản đó như đã dành trước trong dự báo; nếu muốn ghi khoản đã trả, họ phải chủ động xác nhận payment thật. Chỉ payment được xác nhận mới tác động số liệu authoritative.
3. Nếu chưa biết ngày income tiếp theo, phần khoản cố định sắp tới mặc định xem 30 ngày và phải ghi rõ đó là khoảng xem tham khảo, không gọi là “đến kỳ lương sau”.
4. Ưu tiên so sánh chi theo tháng trước. So sánh theo income cycle để giai đoạn sau khi đã chốt cách chia kỳ.
5. Với từng khoản cố định sau income, người dùng có thể chọn chỉ xem nhắc nhở hoặc tính khoản đó như tiền đã dành trước trong con số còn lại tham khảo. Nếu khoản đã được trả, người dùng có thể chủ động xác nhận để ghi `payment` thật; chỉ payment này mới đổi wallet/report. Không có tự động trừ tiền hoặc tạo payment. Một kỳ đến hạn mỗi tháng chỉ được tính một lần, không lặp theo số lần ghi income.

### Còn cần quyết định trước khi làm các phần tương ứng

1. Top 10 mặt hàng tính trên toàn bộ lịch sử hay một khoảng gần đây? Đề xuất ban đầu: toàn bộ payment còn hiệu lực của chính user; sort theo tần suất giảm dần, lần mua gần nhất dùng để phá hòa.
2. Với hóa đơn đến hạn ngày 29–31 trong tháng ngắn, dùng ngày cuối tháng đó có phù hợp không?
3. Bản đầu có cần trạng thái cảm nhận “hài lòng/còn do dự” như ảnh Notion không? Đề xuất: chưa thêm cho tới khi thử với sinh viên.

## 8. Tiêu chí thử nghiệm khi triển khai

- Gợi ý chỉ chứa mặt hàng của user hiện tại, tối đa 10 kết quả, không lộ dữ liệu user khác.
- Tên gần giống nhưng khác theo normalization đã chốt không bị tự gộp âm thầm.
- Tính tần suất bỏ qua giao dịch đã correction theo policy; query có giới hạn phù hợp khi history lớn.
- So sánh số tiền chính xác bằng integer VND; không dùng float và không tạo ledger mutation.
- Khoảng cách ngày theo ngày lịch Asia/Ho_Chi_Minh; kiểm tra ngày nhập trùng, ngày nhập lùi và lịch sử chỉ có một lần mua.
- Compare category dùng cùng hai khoảng tháng HCMC, có case tháng trước rỗng, correction/reversal và owner isolation.
- Chỉ nhắc hoặc bật/tắt “Tính như đã dành trước” không làm thay đổi wallet, ledger hoặc budget-used; xác nhận thanh toán mới tạo một `payment` duy nhất và ghép đúng kỳ. Kiểm tra nhiều income trong một tháng không đếm trùng, cảnh báo trước 10 ngày, đúng ngày đến hạn, quá hạn, đã trả và khoản bị tắt.
- Bật/tắt “dành trước” chỉ thay đổi số còn lại tham khảo, không tạo mutation hoặc thay đổi kết quả authoritative từ API wallet/report.
- Reminder tránh hiển thị trùng cùng khoản/kỳ và không lộ dữ liệu trong log.
- Có kiểm tra bàn phím, focus, nhãn, trạng thái live, responsive và tiếng Việt/Anh.
- Nếu có migration, kiểm thử upgrade từ schema đang dùng và chuẩn bị rollback/restore plan trên disposable DB trước khi yêu cầu DB owner áp lên clone.

## 9. Ba ý tưởng mở rộng để tham khảo

Ba ý tưởng tạo thành một vòng hỗ trợ quyết định: nhìn kế hoạch sắp tới, thử tác động của một khoản mua, rồi học từ chênh lệch giữa kế hoạch và khoản đã ghi. Chúng bổ sung cho các tính năng hiện có; không có nghĩa là phải triển khai đồng thời hoặc đưa ngay vào MVP.

### 9.1. Bản đồ dòng tiền theo lịch năm học

**Nhu cầu:** Tổng theo tháng có thể che khuất các khoản lớn nhưng không xuất hiện hằng tháng, như học phí, tiền cọc/chuyển trọ, sách đầu kỳ hoặc chi phí đi lại. Sinh viên có thể nhìn thấy một tháng “còn dư” nhưng chưa để dành phần cần cho mốc sắp tới.

**Cách làm đề xuất:** Cho người dùng tự tạo khoản dự kiến với tên, ngày hoặc hạn, số tiền ước tính và tùy chọn danh mục. Một khoản có thể là một lần hoặc lặp lại. Có thể xem danh sách theo 30 ngày mặc định đã chốt, hoặc tự chọn khoảng dài hơn như một học kỳ. Thu nhập tương lai chỉ xuất hiện nếu người dùng tự khai báo ngày và số tiền dự kiến; không tự đoán lịch học, lịch học phí hay ngày nhận lương.

**Giới hạn và rủi ro:** Khoản kế hoạch không phải số dư, không phải nghĩa vụ đã xác nhận và không tự trừ ví. Nếu người dùng chưa nhập khoản thu tương lai, hệ thống không nên trình bày số dư cuối kỳ như một con số chắc chắn; nên chỉ cho xem các khoản đã khai báo và nói rõ dữ liệu còn thiếu. Lịch học kỳ là khung xem do người dùng chọn, không thay mặc định 30 ngày đã được chấp thuận.

**Giá trị cần kiểm chứng:** Sinh viên có ghi trước được các mốc lớn không, họ có nhận ra thời điểm thiếu hụt sớm hơn không, và có hiểu đúng sự khác nhau giữa kế hoạch với giao dịch đã ghi không.

### 9.2. Thử tác động trước khi mua

**Nhu cầu:** Nếu chỉ phân tích sau giao dịch, ứng dụng giúp người dùng hiểu quá khứ nhưng chưa hỗ trợ cân nhắc khoản mua trước khi ghi payment. Một phép tính “nếu mua món này thì sao?” có thể lấp khoảng trống đó.

**Cách làm đề xuất:** Người dùng nhập tạm số tiền, ngày dự định và thông tin tùy chọn như itemName/category. Ứng dụng cho xem kịch bản có và không có khoản mua, đồng thời đối chiếu với số dư hiện tại và các khoản kế hoạch sắp tới trong khoảng đang xem. Kết quả dùng phép tính server-side chính xác theo integer VND, hiển thị ngày kết thúc cùng giả định và dữ liệu được dùng.

**Giới hạn và rủi ro:** Đây chỉ là kịch bản, không phải quyết định “đủ khả năng chi trả”, không giữ chỗ tiền, không chặn giao dịch và không tạo ledger row. Số dư hiện tại không phản ánh giao dịch chưa nhập; các khoản tương lai có thể đổi hoặc người dùng có thể quên khai báo. Nếu dữ liệu đầu vào thiếu, giao diện phải báo thiếu thay vì bù bằng số 0 hoặc khẳng định kết luận.

**Giá trị cần kiểm chứng:** Người dùng có hiểu khoản nào đã xảy ra và khoản nào chỉ là giả định không; kết quả có giúp cân nhắc mà không tạo cảm giác ứng dụng đang cấm chi tiêu không.

### 9.3. Học từ chênh lệch kế hoạch và thực tế, không chấm điểm

**Nhu cầu:** Tổng tiền đơn lẻ không giải thích được vì sao một kế hoạch bị lệch. Điểm số, streak hoặc xếp hạng có thể tạo áp lực nhưng không giúp phân biệt khoản bất thường với thay đổi thực sự trong thói quen.

**Cách làm đề xuất:** Với một kỳ đã kết thúc và đủ dữ liệu, cho người dùng xem số đã dự kiến cạnh số payment họ đã ghi theo danh mục hoặc khoản kế hoạch. Có thể cho họ tự đánh dấu một chênh lệch là phát sinh một lần, thay đổi kế hoạch, hoặc khoản đã quên nhập. So sánh chỉ dùng dữ liệu của chính user, có nhãn thời gian và giải thích phép tính.

**Giới hạn và rủi ro:** Ứng dụng không biết các payment chưa được nhập, nên “không có giao dịch được ghi nhận” không đồng nghĩa “không tiêu tiền”. Không gọi chênh lệch là thất bại, lãng phí hay thiếu kỷ luật; không chấm điểm tài chính và không so người này với người khác. Không dùng AI để suy đoán cảm xúc, lý do mua hoặc tình trạng tài chính từ lịch sử.

**Giá trị cần kiểm chứng:** Người dùng có thấy nhận xét hữu ích và chính xác theo dữ liệu họ đã ghi không; các nhãn tự giải thích có giúp sửa kế hoạch mà không gây phán xét không.

### 9.4. Thứ tự thử nghiệm và điều kiện đưa vào sản phẩm

1. Thử bản đồ kế hoạch với các khoản sắp tới trong 30 ngày; chỉ mở khoảng học kỳ khi người dùng chủ động chọn mốc dài hơn.
2. Dùng cùng dữ liệu kế hoạch đó làm đầu vào cho màn hình thử tác động trước khi mua; giữ nguyên ví và ledger.
3. Chỉ hiển thị so sánh kế hoạch với thực tế sau khi có kỳ đã kết thúc, dữ liệu nhập đủ dùng và cách báo dữ liệu thiếu được kiểm tra với sinh viên.

Trước khi đổi schema hoặc code, cần ghi phạm vi, owner, acceptance và migration/test plan vào PRD/delivery plan. Ba ý tưởng ở mục này chưa được Team Leader chốt thành yêu cầu triển khai.
