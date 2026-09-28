# Đề xuất tính năng quản lý chi tiêu theo thói quen sinh viên

> Ngày ghi nhận: 2026-09-27
> Người đề xuất: Team Leader — Hiệp
> Trạng thái cập nhật 2026-09-28: Team Leader đã đồng ý cả ba hướng mở rộng ở mục 9. Phần kế hoạch 30/90/180/365 ngày, what-if và phản ánh tổng kế hoạch với thực tế đã có trong source; gợi ý mặt hàng, so sánh tháng và chọn ngày giao dịch theo `Asia/Ho_Chi_Minh` cũng có code. API từ chối ngày không hợp lệ hoặc timestamp thiếu múi giờ; khi nhập lùi, so sánh không dùng giao dịch xảy ra sau ngày đã chọn. Kế hoạch đã tắt có thể được bật lại theo API/service và audit. Các tính năng cần migration `0011`–`0012` chưa dùng được với DB clone hiện tại cho tới khi DevB xử lý checksum mismatch. Xem bảng trạng thái ở mục 5 để biết cần mở màn nào và điều gì còn thiếu.
> Nguồn hình ảnh: bốn ảnh Notion do Team Leader cung cấp; mô tả bên dưới là điều rút ra từ ảnh, không sao chép giao diện/CSS.

## 1. Mục tiêu

Giúp sinh viên ghi khoản chi nhanh hơn, nhận ra một số thay đổi trong thói quen mua sắm, và nhìn thấy khoản tiền sắp phải trả trước khi quyết định sử dụng tiền còn lại.

Campus Coin là sổ tài chính do người dùng tự nhập. Sản phẩm không kết nối ngân hàng, không biết giao dịch chưa được nhập, và không đảm bảo khoản chi dự kiến là chính xác. Mọi nhắc nhở, xu hướng và phép so sánh phải nói rõ chúng được tính từ dữ liệu người dùng đã nhập.

Tài liệu này mở rộng ý tưởng trong [nghiên cứu dòng tiền sinh viên](./student-cashflow-research-2026-09-26.md). Các nguyên tắc nghiệp vụ bên dưới là quyết định sản phẩm đã áp dụng vào source; giới hạn triển khai, migration và provider được ghi riêng để tránh nhầm code có mặt với tính năng đã chạy live. Tài liệu không mở lại bất biến trong `docs/DOMAIN-MODEL.md`.

## 2. Ý tưởng của Team Leader

1. Khi nhập tên sản phẩm, gợi ý tối đa 10 mặt hàng người dùng đó thường mua để giảm thời gian gõ.
2. Tính tần suất mua từng mặt hàng.
3. Với khoản định kỳ như tiền nhà, cho người dùng đặt ngày đến hạn và cảnh báo trước 10 ngày.
4. Khi ghi một khoản income, cho người dùng nhìn các khoản cố định sắp đến hạn và phần tiền còn lại theo kế hoạch.
5. Với mặt hàng không định kỳ, so sánh khoảng cách giữa lần mua gần nhất và khoảng cách lần trước; cho thấy khoảng cách hiện tại ngắn hơn/dài hơn bao nhiêu ngày.
6. So sánh số tiền ghi nhận của mặt hàng với lần gần nhất, ví dụ 100.000 VND và 120.000 VND, tăng 20.000 VND.
7. Khi xem một danh mục như ăn uống, cho xem tổng chi theo tháng và so sánh với tháng trước hoặc kỳ trước.
8. Hình Notion minh họa thêm các dạng xem lịch sử theo tháng, danh mục, trạng thái/cảm nhận; có ghi chú cho một số mặt hàng và tổng tiền theo nhóm.

## 3. Những gì source hiện hỗ trợ

- ledger_transactions đã có payment, amount_vnd, category_id, occurred_at và description tùy chọn.
- description là mô tả tự do. Chưa có hợp đồng rõ ràng nói rằng trường này luôn là tên sản phẩm; có thể chứa nhiều mặt hàng hoặc ghi chú khác.
- Monthly report đã trả tổng payment và tổng chi theo danh mục cho tháng HCMC.
- Budget theo danh mục/tháng đã có; savings là aggregate riêng.
- `item_name` được bổ sung bằng migration mới; API gợi ý tối đa 10 mặt hàng theo owner, kèm lần mua gần nhất, số tiền gần nhất và khoảng cách giữa hai lần mua.
- Form payment dùng ngày lịch `Asia/Ho_Chi_Minh`, gửi lên timestamp ISO-8601 có múi giờ; server kiểm tra ngày/tháng/giờ thật, từ chối ngày tương lai và không so sánh giao dịch nhập lùi với lịch sử tương lai.
- Trong form payment, gợi ý là các nút chọn nhanh hiện khi focus ô tên sản phẩm. Nếu tài khoản chưa có lịch sử, form giải thích cần ghi một số khoản trước; không hiện dữ liệu mẫu.
- Category/month report có phần so sánh tháng đã chọn với tháng liền trước.
- API/UI kế hoạch hỗ trợ khoản phải trả và thu dự kiến một lần/hàng tháng, mặc định lịch 30 ngày và lựa chọn 90/180/365 ngày, nhắc trong 10 ngày, chọn tính khoản phải trả vào forecast và mô phỏng `payment` trong cùng khoảng xem.
- Tổng quan hiện nhắc các khoản phải trả trong 30 ngày; forecast tự tải lại khi số dư wallet đổi sau một lần ghi income/payment. Người dùng có thể chọn tính trước từng khoản ngay tại đây.
- Reflection so tổng kế hoạch với tổng giao dịch đã ghi cho tháng kết thúc; chưa ghép một kế hoạch cụ thể với một payment cụ thể, không gắn nhãn nguyên nhân chênh lệch và không chấm điểm.
- OCR có API/UI để tạo draft gồm số tiền và mô tả. Ảnh gửi qua provider khi người dùng đồng ý; người dùng vẫn phải kiểm tra và tự xác nhận.
- Các migration item/cashflow có trong source nhưng không được giả định đã chạy trên clone. Clone hiện có checksum mismatch `0006`–`0010`; phải đối chiếu lineage trước khi migrate.
- JEV/OpenRouter và OCR mặc định tắt; mock/unit test chưa chứng minh provider thật, chi phí, quota hoặc policy dữ liệu.

Do đó cần phân biệt code sẵn có với môi trường/provider đã kiểm chứng:

- Có thể review UI và domain/service bằng test độc lập với database.
- Muốn demo trên DB clone cần DevB xác nhận migration lineage và apply migration trên clone cô lập trước.
- Muốn thử JEV/OCR thật cần người quản lý môi trường cấu hình secret provider ở server, bật feature flag, ghi nhận quota/chi phí và kiểm tra privacy.
- Chưa có trạng thái “đã thanh toán” cho từng kế hoạch; chỉ giao dịch do người dùng tự ghi mới là dữ liệu authoritative.

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

## 5. Trạng thái triển khai và cách nhìn thấy

| Ý tưởng | Trạng thái trong source | Cách người dùng thấy | Còn thiếu / giới hạn |
|---|---|---|---|
| Gợi ý 10 mặt hàng cá nhân và đếm tần suất | Đã có API owner-scoped, lưu `itemName` riêng, xếp theo tần suất rồi lần mua gần nhất; form có nút chọn nhanh và trạng thái chưa có lịch sử | Mở **Giao dịch → Thêm thanh toán**, focus **Tên sản phẩm**. Tài khoản cần có payment đã ghi với `itemName` thì mới có nút mặt hàng thật | Cần migration `0011` chạy trên DB mục tiêu. DB clone đang vướng checksum `0006`–`0010`; tài khoản không có lịch sử chỉ thấy lời giải thích, không có dữ liệu mẫu |
| So sánh số tiền/lần mua và khoảng cách ngày | Đã có tính toán trên lịch sử cùng owner; so sánh bằng integer VND và ngày lịch HCMC | Nhập lại một mặt hàng đã từng ghi ở **Giao dịch → Thêm thanh toán**; sau khi nhập số tiền sẽ hiện so sánh | Cần từ hai lần ghi cho lịch sử khoảng cách; không kết luận giá đơn vị hoặc lượng tiêu thụ. Cần `0011` áp dụng lên DB |
| Khoản cố định, nhắc hạn và “dành trước” | Có kế hoạch một lần/hàng tháng, nhắc 10 ngày, opt-in tính trước; bật/tắt kế hoạch không tạo payment | Mở **Báo cáo → Kế hoạch dòng tiền**; thêm khoản như “Khoản nợ Hiệp”, chọn danh mục `Trả nợ` nếu có, rồi tự chọn **Tính trước** | Cần migration `0012` trên DB mục tiêu. Không theo dõi dư nợ/gốc/lãi, không tự trừ tiền và không tạo giao dịch |
| Dòng tiền theo mốc học kỳ/năm | Đã có bộ chọn 30, 90, 180 và 365 ngày cho lịch dự kiến; mặc định vẫn 30 ngày | Cùng màn **Báo cáo → Kế hoạch dòng tiền**, chọn **Khoảng xem**; 180 ngày xấp xỉ sáu tháng, 365 ngày xấp xỉ một năm | Đây là số ngày, chưa phải lịch tuần hay lịch học kỳ của trường. Chỉ tính khoản user khai báo; chưa dự đoán các khoản chưa nhập |
| “Nếu tôi mua khoản này thì sao?” | Đã có what-if phía server, dùng cùng khoảng xem, không ghi ledger | Trong **Báo cáo → Kế hoạch dòng tiền**, nhập số tiền/ngày rồi bấm **Xem thử** | Cần ví đã khởi tạo. Kịch bản dùng dữ liệu đã ghi/kế hoạch nhập tay nên không khẳng định khả năng chi trả |
| So sánh kế hoạch với thực tế, không chấm điểm | Đã có tổng hợp theo tháng đã kết thúc và câu chữ phân biệt dữ liệu chưa ghi; không có score | Cuối trang **Báo cáo → Kế hoạch dòng tiền**, mở phần **Tháng trước: kế hoạch và khoản đã ghi** | Chỉ đối chiếu tổng income/payment, chưa ghép khoản dự kiến với payment cụ thể hoặc cho người dùng gắn nguyên nhân lệch |
| So sánh danh mục giữa hai tháng | Đã có so sánh tháng đang xem với tháng liền trước | Mở **Báo cáo**, xem phần **Chi tiêu theo danh mục** | Chưa có kỳ theo từng lần nhận income; chưa quyết định semantics cho income gần nhau hoặc thu nhập dự kiến chưa nhận |
| OCR hóa đơn | Có API/UI tạo draft và yêu cầu đồng ý; luôn cho sửa bằng tay | Mở form payment, chọn ảnh và đồng ý trước khi yêu cầu đọc hóa đơn | Feature flag tắt mặc định; chưa có provider live, kiểm thử độ chính xác, quota/chi phí và rà soát riêng tư |
| Gợi ý danh mục bằng AI | Có adapter/API và yêu cầu đồng ý; user duyệt trước khi lưu | Trong form payment, nhập nội dung, đồng ý gửi, chọn **Gợi ý danh mục** | Feature flag tắt mặc định; chưa xác minh provider live. Không dùng AI để tính hoặc ghi tiền |
| Trạng thái cảm nhận như trong Notion | Chưa triển khai | Chưa có | Chờ thử nghiệm với sinh viên; không suy đoán cảm xúc hoặc chấm điểm |

Các đường dẫn trên là vị trí trong giao diện đang chạy từ source hiện tại. Nếu màn hình vẫn hiện bản cũ, xác nhận đã khởi động từ nhánh `hiep`, reload sau khi Vite dựng lại, và nhớ rằng account hiện tại cần có dữ liệu của chính nó để xem so sánh. Code có mặt không chứng minh migration/provider đã chạy trên môi trường demo.

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

### Còn cần quyết định trước khi mở rộng thêm

1. Top 10 hiện dùng toàn bộ payment đủ điều kiện của chính user; nếu muốn đổi sang cửa sổ gần đây, cần product review và so sánh ảnh hưởng dữ liệu.
2. Hóa đơn đến hạn ngày 29–31 trong tháng ngắn hiện được đưa về ngày cuối tháng; cần xem phản hồi người dùng nếu muốn đổi.
3. Chưa thêm trạng thái cảm nhận như ảnh Notion; cần thử với sinh viên trước khi lưu loại dữ liệu chủ quan này.

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

## 9. Ba ý tưởng mở rộng Team Leader đã đồng ý

Team Leader đã đồng ý cả ba hướng. Bản hiện tại áp dụng phạm vi ban đầu ở mục 9.1–9.3; trạng thái giới hạn và cách truy cập được ghi ở mục 5. Phần chưa có code không được xem là hoàn tất chỉ vì đã có trong tài liệu.

### 9.1. Bản đồ dòng tiền theo lịch năm học

**Nhu cầu:** Tổng theo tháng có thể che khuất các khoản lớn nhưng không xuất hiện hằng tháng, như học phí, tiền cọc/chuyển trọ, sách đầu kỳ hoặc chi phí đi lại. Sinh viên có thể nhìn thấy một tháng “còn dư” nhưng chưa để dành phần cần cho mốc sắp tới.

**Cách làm đang có:** Cho người dùng tự tạo khoản dự kiến với tên, ngày hoặc hạn, số tiền ước tính và tùy chọn danh mục. Một khoản có thể là một lần hoặc lặp lại. Khoảng mặc định 30 ngày; người dùng có thể chọn 90, 180 hoặc 365 ngày. Thu nhập tương lai chỉ xuất hiện nếu người dùng tự khai báo ngày và số tiền dự kiến; không tự đoán lịch học, học phí hay ngày nhận lương.

**Giới hạn và rủi ro:** Khoản kế hoạch không phải số dư, không phải nghĩa vụ đã xác nhận và không tự trừ ví. Nếu người dùng chưa nhập khoản thu tương lai, hệ thống không nên trình bày số dư cuối kỳ như một con số chắc chắn; nên chỉ cho xem các khoản đã khai báo và nói rõ dữ liệu còn thiếu. Lịch học kỳ là khung xem do người dùng chọn, không thay mặc định 30 ngày đã được chấp thuận.

**Giá trị cần kiểm chứng:** Sinh viên có ghi trước được các mốc lớn không, họ có nhận ra thời điểm thiếu hụt sớm hơn không, và có hiểu đúng sự khác nhau giữa kế hoạch với giao dịch đã ghi không.

### 9.2. Thử tác động trước khi mua

**Nhu cầu:** Nếu chỉ phân tích sau giao dịch, ứng dụng giúp người dùng hiểu quá khứ nhưng chưa hỗ trợ cân nhắc khoản mua trước khi ghi payment. Một phép tính “nếu mua món này thì sao?” có thể lấp khoảng trống đó.

**Cách làm đang có:** Người dùng nhập tạm số tiền và ngày dự định. Ứng dụng cho xem kết quả kịch bản cùng số dư hiện tại và các khoản kế hoạch sắp tới trong khoảng đang xem. Kết quả dùng phép tính server-side theo integer VND, có ngày kết thúc và giả định. Form chưa nhận category để điều chỉnh budget/category view.

**Giới hạn và rủi ro:** Đây chỉ là kịch bản, không phải quyết định “đủ khả năng chi trả”, không giữ chỗ tiền, không chặn giao dịch và không tạo ledger row. Số dư hiện tại không phản ánh giao dịch chưa nhập; các khoản tương lai có thể đổi hoặc người dùng có thể quên khai báo. Nếu dữ liệu đầu vào thiếu, giao diện phải báo thiếu thay vì bù bằng số 0 hoặc khẳng định kết luận.

**Giá trị cần kiểm chứng:** Người dùng có hiểu khoản nào đã xảy ra và khoản nào chỉ là giả định không; kết quả có giúp cân nhắc mà không tạo cảm giác ứng dụng đang cấm chi tiêu không.

### 9.3. Học từ chênh lệch kế hoạch và thực tế, không chấm điểm

**Nhu cầu:** Tổng tiền đơn lẻ không giải thích được vì sao một kế hoạch bị lệch. Điểm số, streak hoặc xếp hạng có thể tạo áp lực nhưng không giúp phân biệt khoản bất thường với thay đổi thực sự trong thói quen.

**Cách làm đang có:** Với tháng đã kết thúc, cho người dùng xem tổng `income`/`payment` đã dự kiến cạnh tổng đã ghi. So sánh chỉ dùng dữ liệu của chính user, có nhãn tháng và giải thích rằng thiếu bản ghi không đồng nghĩa không có hoạt động. Chưa có đánh dấu nguyên nhân lệch hoặc ghép kế hoạch với payment cụ thể.

**Giới hạn và rủi ro:** Ứng dụng không biết các payment chưa được nhập, nên “không có giao dịch được ghi nhận” không đồng nghĩa “không tiêu tiền”. Không gọi chênh lệch là thất bại, lãng phí hay thiếu kỷ luật; không chấm điểm tài chính và không so người này với người khác. Không dùng AI để suy đoán cảm xúc, lý do mua hoặc tình trạng tài chính từ lịch sử.

**Giá trị cần kiểm chứng:** Người dùng có thấy nhận xét hữu ích và chính xác theo dữ liệu họ đã ghi không; các nhãn tự giải thích có giúp sửa kế hoạch mà không gây phán xét không.

### 9.4. Cổng hoàn thiện

1. Chạy migration mới trên DB clone sau khi DevB giải quyết checksum mismatch; sau đó xác nhận các màn item history/cashflow đọc được dữ liệu thật.
2. Thử forecast 30/90/180/365 ngày bằng khoản giả của test account và xác nhận lựa chọn “Tính trước” chỉ đổi dự báo.
3. Thử what-if và reflection với dữ liệu đã ghi; đối chiếu các phép tính trên DBeaver bằng test account, không dùng dữ liệu thật của thành viên khác.
4. Kiểm tra UI, bàn phím, màn hẹp và copy VI/EN; ghi các giới hạn trong delivery evidence.
5. Chỉ thêm đối chiếu từng khoản hoặc bộ lọc theo income cycle sau khi product semantics và migration/test plan được thống nhất.

## 10. Chụp hóa đơn để tạo bản nháp payment

### Mục tiêu

Giảm việc gõ lại thông tin khi sinh viên có hóa đơn giấy hoặc hóa đơn điện tử. OCR chỉ đọc nội dung ảnh và điền trước dữ liệu; người dùng vẫn quyết định có ghi khoản `payment` hay không.

### Luồng đề xuất

1. Người dùng chọn chụp ảnh hoặc tải ảnh hóa đơn lên. Nhập tay vẫn luôn dùng được.
2. Server kiểm tra loại file, dung lượng và kích thước ảnh trước khi gửi tới OCR adapter. Browser không gọi nhà cung cấp OCR trực tiếp.
3. OCR tạo bản nháp gồm các trường nhận diện được như tên cửa hàng, ngày, tổng tiền và có thể là các dòng mặt hàng. Mỗi giá trị chưa chắc chắn phải được trình bày để người dùng kiểm tra, không được coi là dữ liệu đã xác nhận.
4. Giao diện cho sửa trường, chọn danh mục và xem tổng tiền trước khi lưu. Với model hiện tại, bản đầu chỉ tạo một `payment` có một tổng tiền và một danh mục; không tự tách hóa đơn thành nhiều giao dịch hoặc tự phân bổ danh mục cho từng món.
5. Chỉ khi người dùng bấm xác nhận thì ứng dụng mới gọi API tạo payment. Hủy hoặc lỗi OCR không tạo ledger row; người dùng có thể chuyển sang nhập tay.

### Quyền quyết định và tự động hóa

- Sau khi người dùng chủ động chọn ảnh, có thể tự động nhận diện và điền các trường đọc được để giảm thao tác.
- Người dùng có thể sửa hoặc xóa từng giá trị nhận diện, chọn danh mục khác, bỏ bản nháp hoặc xác nhận tạo `payment`.
- Không tự ghi payment, không tự trừ wallet, không coi hóa đơn là bằng chứng giao dịch đã thanh toán và không dùng OCR để quyết định người dùng có đủ tiền hay không.
- Lưu ảnh hóa đơn là lựa chọn riêng, mặc định tắt. Nếu người dùng không chọn lưu ảnh, xóa ảnh tạm sau khi OCR hoàn tất hoặc thất bại; không ghi ảnh hay toàn văn OCR vào application log.

### Giới hạn và an toàn dữ liệu

- OCR có thể đọc sai số tiền, ngày, dấu phân cách hàng nghìn hoặc tổng tiền sau giảm giá. Không được âm thầm sửa số người dùng nhập hay tạo giao dịch tự động.
- `amountVnd` cuối cùng phải là số nguyên VND hợp lệ theo contract; ngày phải theo semantics `Asia/Ho_Chi_Minh`. Giá trị không đọc chắc chắn phải để người dùng xác nhận hoặc nhập lại.
- File upload cần giới hạn dung lượng/kích thước, kiểm tra định dạng thật, timeout và lỗi provider có thông báo cùng đường nhập tay. Không log ảnh, toàn văn hóa đơn, token hay dữ liệu nhận diện thô.
- Ảnh có thể chứa tên, địa chỉ hoặc thông tin thanh toán. Chỉ chọn provider sau khi xem điều khoản xử lý/lưu giữ dữ liệu và thử độ chính xác trên bộ hóa đơn mẫu được phép sử dụng.
- Không dùng JEV để thay OCR adapter. JEV đang có mục đích riêng là gợi ý danh mục; OCR đọc tài liệu và trích các giá trị ứng viên, không tính toán hay authorize money state.

### Thử nghiệm trước khi quyết định triển khai

1. Tạo bộ hóa đơn mẫu đa dạng, đã được phép sử dụng và đã che thông tin cá nhân không cần cho thử nghiệm.
2. Đo riêng độ chính xác exact-match của tổng tiền/ngày, tỷ lệ người dùng phải sửa từng trường và thời gian hoàn thành so với nhập tay. Không kết luận chất lượng chỉ từ việc OCR có trả ra chữ.
3. Kiểm tra hóa đơn mờ, nghiêng, nhiều định dạng ngày, giảm giá, thuế, nhiều dòng hàng, thiếu tổng tiền và provider timeout; tất cả phải có đường sửa hoặc nhập tay.
4. Kiểm tra rằng không có ledger mutation trước bước xác nhận, request retry không tạo payment trùng và dữ liệu của user khác không thể xem lại.

Tài liệu provider hiện cho biết Google Cloud Vision OCR có hỗ trợ ngôn ngữ tiếng Việt; đó là khả năng nhận dạng chữ, không đảm bảo tự hiểu chính xác trường tổng tiền/ngày trên hóa đơn. Google Document AI cũng phân biệt bộ nhận dạng OCR đa ngôn ngữ với Expense Parser; danh sách ngôn ngữ của Expense Parser hiện không nêu tiếng Việt. Đây chỉ là căn cứ để thử nghiệm, chưa phải quyết định dùng Google hay một provider cụ thể: [Vision OCR languages](https://docs.cloud.google.com/vision/docs/languages), [Vision OCR features](https://docs.cloud.google.com/vision/docs/features-list), [Document AI processors and languages](https://docs.cloud.google.com/document-ai/docs/processors-list), [Document AI response fields](https://docs.cloud.google.com/document-ai/docs/handle-response).

Ý tưởng này cần product owner chốt phạm vi, provider, quyền lưu ảnh và acceptance trước khi thêm vào PRD/delivery plan hoặc bắt đầu thay schema/code.
