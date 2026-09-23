# CC-001 — Handoff miền sản phẩm và nghiệp vụ Campus Coin

- **Phạm vi handoff:** miền sản phẩm, sổ cái tiền, ví, mục tiêu tiết kiệm, danh mục, ngân sách và vocabulary.
- **Nguồn đã đọc:** `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` (đặc biệt §1.1–§1.8) và các quyết định sản phẩm đã khóa trong yêu cầu CC-001.
- **Trạng thái:** sẵn sàng để điều phối viên tích hợp vào tài liệu chuẩn; các điểm ở mục “Rủi ro/câu hỏi mở” không chặn phạm vi MVP được khóa dưới đây.
- **Giới hạn thay đổi:** chỉ tạo handoff này; không sửa SRS gốc, mã nguồn hoặc tài liệu chuẩn dưới `docs/`.

## 1. Phạm vi và giả định

### 1.1 Tuyên bố capability

Campus Coin là sổ theo dõi tài chính cá nhân cho **một sinh viên**, cho phép sinh viên ghi nhận thu nhập và thanh toán thủ công hoặc qua CSV, theo dõi số dư ví, đặt ngân sách theo danh mục thanh toán và xem báo cáo theo thời gian. Sản phẩm giúp sinh viên hiểu thói quen tiền bạc; sản phẩm không giữ tiền, không kết nối ngân hàng và không thực hiện thanh toán thật.

Sổ cái quyết định tiền theo quy tắc xác định (deterministic). AI/JEV chỉ đề xuất phân loại, tóm tắt hoặc mẹo; AI không được quyết định số dư, cho phép một thanh toán vượt ví, ghi đè lịch sử hoặc thay đổi ngân sách một cách âm thầm.

### 1.2 Trong phạm vi

- Tài khoản sinh viên, hồ sơ cơ bản, một ví khả dụng và một mục tiêu/khoản tiết kiệm tách biệt.
- Hai loại giao dịch duy nhất: `income` và `payment`.
- Nhập giao dịch thủ công, nhập lịch sử CSV và các lịch lặp lại nếu được bật; mỗi lần phát sinh vẫn phải tuân thủ cùng một quy tắc sổ cái.
- Danh mục hệ thống mặc định và danh mục tùy chỉnh theo tài khoản.
- Ngân sách theo danh mục thanh toán và tháng địa phương; cảnh báo không chặn thanh toán.
- Báo cáo, biểu đồ, mẹo và JEV dựa trên dữ liệu đã ghi; các đầu ra tư vấn phải nhận diện là đề xuất.
- Lịch sử giao dịch bất biến, hoàn tác bằng reversal và audit trail append-only.

## 1.3 Giả định miền cho MVP

1. Một `StudentAccount` có đúng một miền dữ liệu tài chính riêng: một `Wallet` và một `SavingsAccount`; không chia sẻ dữ liệu tài chính giữa tài khoản.
2. Người dùng nhập số dư ví hiện tại trong onboarding. Số dư này là baseline của `Wallet`, không phải `income` và không tạo transaction history giả.
3. `SavingsAccount` giữ số dư tiền tiết kiệm tách biệt với ví. Người dùng có thể nạp/rút tùy ý; chuyển định kỳ hằng tháng là tùy chọn với số tiền cố định do người dùng đặt. Mọi chuyển tiền là `SavingsTransfer` nội bộ, không mở rộng enum transaction và không tính vào tổng `income`/`payment` hoặc budget.
4. Số tiền dùng **đồng Việt Nam (VND)**, lưu dưới dạng số nguyên đồng; không dùng số thực và không quy đổi ngoại tệ.
5. Mọi ngày/giờ nghiệp vụ dùng `Asia/Ho_Chi_Minh`. Dấu thời gian kỹ thuật có thể lưu UTC nhưng khi tính ngày, tháng, số dư và báo cáo phải quy đổi về múi giờ nghiệp vụ trước.
6. Một giao dịch đã ghi nhận không bị sửa hoặc xóa tại chỗ. “Sửa/xóa” theo SRS cũ được thay bằng reversal và ghi nhận giao dịch thay thế khi cần.

## 2. Vocabulary chuẩn

| Thuật ngữ hiển thị tiếng Việt | Khóa miền/API | Định nghĩa và ranh giới |
|---|---|---|
| Tài khoản sinh viên | `StudentAccount` | Chủ sở hữu và ranh giới dữ liệu; có hồ sơ, ví, mục tiêu tiết kiệm, danh mục và ngân sách riêng. |
| Giao dịch | `Transaction` | Một bản ghi tiền bất biến. `kind` chỉ nhận `income` hoặc `payment`. |
| Thu nhập | `income` | Giao dịch dương làm tăng số dư ví. `amount_vnd` luôn là số dương; dấu tăng do `kind`. |
| Thanh toán | `payment` | Giao dịch dương làm giảm số dư ví. Đây là tên hiển thị và khóa nghiệp vụ cho mọi khoản tiền ra khỏi ví. |
| Ví khả dụng | `Wallet` | Nguồn tiền duy nhất mà `payment` được phép sử dụng; số dư được tính từ sổ cái hợp lệ. |
| Số dư ví | `available_wallet_balance_vnd` | Số tiền hiện có thể dùng cho thanh toán sau các giao dịch đã ghi nhận; không bao gồm tiền tiết kiệm tách biệt. |
| Tiền tiết kiệm | `SavingsAccount` | Số dư tách biệt với ví; nạp/rút qua `SavingsTransfer`, không dùng để cấp hạn mức thanh toán. |
| Danh mục thu nhập | `Category(kind=income)` | Nhãn hợp lệ cho `income`, ví dụ Trợ cấp, Việc làm bán thời gian, Học bổng, Quà tặng, Thu nhập khác. |
| Danh mục thanh toán | `Category(kind=payment)` | Nhãn hợp lệ cho `payment`, ví dụ Đồ ăn, Đi lại, Ký túc xá/Tiền thuê nhà, Học tập, Dịch vụ thuê bao, Giải trí, Linh tinh. |
| Ngân sách | `Budget` | Hạn mức VND của một danh mục thanh toán trong một tháng địa phương. Chỉ dùng để cảnh báo và báo cáo, không phải rào chặn ví. |
| Hoàn tác giao dịch | `Reversal` | Bản ghi append-only mới liên kết `reversal_of` với giao dịch gốc; không xóa hay sửa giao dịch gốc. |
| Nhật ký kiểm toán | `AuditEvent` | Bằng chứng append-only về actor, hành động, thời điểm, nguồn, lý do và định danh yêu cầu; không thay thế sổ cái. |
| Gợi ý AI | `AiSuggestion` | Đề xuất danh mục/tóm tắt/mẹo có nguồn và độ tin cậy; không có quyền ghi tiền hoặc tự động đổi lựa chọn cuối của sinh viên. |

> **Chuẩn hóa từ SRS:** SRS cũ có các câu mô tả “chi phí” và giá trị cũ `` `expense` `` trong trường `Transaction.type`. Giá trị đó **không còn hợp lệ** trong miền mới; mọi ngữ cảnh tương ứng phải dùng `payment`/“thanh toán”. “Chi phí” không được xuất hiện như enum, loại giao dịch, điều kiện API hoặc giá trị database. Có thể giữ từ tự do trong mô tả mà sinh viên nhập, nhưng không dùng nó làm vocabulary nghiệp vụ.

## 3. Mô hình miền và quan hệ

### 3.1 Sơ đồ quan hệ khái niệm

```text
StudentAccount 1 ── 1 Wallet
              1 ── 1 Savings / SavingsGoal
              1 ── n Transaction ── 1 Category
              1 ── n Budget ───────── 1 Category(kind=payment)
              1 ── n AuditEvent

SystemCategory (mặc định) được tham chiếu qua bản sao/quan hệ hợp lệ của từng tài khoản;
CustomCategory chỉ thuộc đúng một StudentAccount.
```

### 3.2 Thực thể và thuộc tính bắt buộc

| Thực thể | Thuộc tính miền đề xuất | Bất biến chính |
|---|---|---|
| `StudentAccount` | `id`, `role`, `locale` (`vi-VN` hoặc `en`), `timezone=Asia/Ho_Chi_Minh`, `currency=VND`, hồ sơ sinh viên, `created_at` | Tài khoản chỉ đọc dữ liệu của chính mình; `role` sinh viên và quyền quản trị là hai ranh giới khác nhau. Locale chỉ đổi presentation copy. |
| `Wallet` | `account_id`, số dư có thể cache, `currency=VND` | Một ví cho một tài khoản; số dư authoritative là kết quả từ sổ cái và chuyển nội bộ, cache phải có thể tái tạo; chỉ `income`/`payment` và transfer hợp lệ ảnh hưởng ví. |
| `SavingsAccount` | `account_id`, số dư có thể cache, `currency=VND` | Tách biệt khỏi ví; deposit/withdrawal/scheduled deposit là `SavingsTransfer` nội bộ, không phải transaction type và không tính vào income/payment/budget. |
| `Category` | `id`, `owner_scope` (system/account), `owner_id`, `name`, `kind` (`income`/`payment`), `status` (`active`/`retired`), audit | `kind` phải khớp `Transaction.kind`; tên duy nhất trong cùng owner + kind; danh mục đã dùng chỉ được retire, không hard-delete. |
| `Transaction` | `id`, `account_id`, `category_id`, `kind`, `amount_vnd>0`, `occurred_at`/ngày địa phương, mô tả, `role` (`original`/`reversal`), `reversal_of`, `created_at_utc`, actor/source/import batch | Append-only; amount dương; `kind` chỉ có hai giá trị; cùng tài khoản; reversal cùng kind và amount với gốc; không đảo ngược một bản ghi hai lần. |
| `Budget` | `id`, `account_id`, `category_id`, `period_month` (YYYY-MM theo múi giờ địa phương), `limit_amount_vnd>=0`, audit | Category phải là `kind=payment`; duy nhất một budget cho account + category + tháng; thay đổi hạn mức phải audit. |
| `AuditEvent` | `id`, actor, action, entity/type, entity id, before/after hoặc payload tối thiểu, reason, source, request/idempotency key, thời điểm | Chỉ append; không chứa secret; đủ để truy nguyên create/reversal/import/category/budget và quyết định admin. |
| `AiSuggestion` | transaction/report reference, đề xuất category hoặc nội dung, model/version, confidence, generated_at, accepted/overridden | Không phải dữ liệu tiền authoritative; người dùng phải xác nhận hoặc ghi đè trước khi trở thành category cuối. |

### 3.3 Trạng thái giao dịch

- `original`: bản ghi phát sinh ban đầu. Một giao dịch `original` có thể được liên kết tối đa một reversal.
- `reversal`: bản ghi mới với `reversal_of=<original_id>`, giữ cùng `kind` và `amount_vnd`; không phải loại giao dịch thứ ba.
- “Đã bị hoàn tác” là trạng thái suy ra khi original có reversal hợp lệ. Không cập nhật cờ làm mất lịch sử nếu không cần; nếu có cache trạng thái, cache phải tái tạo được từ các bản ghi append-only.
- Không cho reversal của một reversal, reversal chéo tài khoản, reversal khác amount/kind hoặc reversal của bản ghi đã reversal.

## 4. Quy tắc tiền và sổ cái

### 4.1 Dấu hiệu hiệu lực

`amount_vnd` luôn là số nguyên dương. Dấu tiền được suy ra từ `kind` và vai trò reversal:

| Bản ghi | Hiệu ứng lên ví |
|---|---:|
| `original` + `income` | `+amount_vnd` |
| `original` + `payment` | `-amount_vnd` |
| `reversal` của `income` | `-amount_vnd` |
| `reversal` của `payment` | `+amount_vnd` |

Pseudo-formula:

```text
baseSign(kind) = +1 nếu kind = income
                 -1 nếu kind = payment
roleSign(role) = +1 nếu role = original
                 -1 nếu role = reversal
walletEffect(e) = baseSign(e.kind) * roleSign(e.role) * e.amount_vnd
```

Số dư ví hiện tại:

```text
available_wallet_balance_vnd
  = opening_balance_vnd (MVP: 0)
  + Σ walletEffect(e) của mọi event đã post thuộc tài khoản
```

Số dư tại một thời điểm/ngày `t` dùng các event có thời điểm nghiệp vụ không muộn hơn `t`, theo thứ tự xác định `(occurred_at_local, append_sequence, id)`.

### 4.2 Điều kiện ghi nhận `income`

1. Actor đã xác thực và sở hữu tài khoản.
2. `kind=income`, `amount_vnd` là số nguyên dương trong miền cho phép, currency là VND.
3. Category tồn tại, đang active, thuộc system hợp lệ hoặc chính account, và có `kind=income`.
4. Ngày/giờ được chuẩn hóa về `Asia/Ho_Chi_Minh`.
5. Ghi một bản ghi append-only và audit event; không sửa bản ghi sau đó.

### 4.3 Điều kiện ghi nhận `payment`

1. Actor đã xác thực và sở hữu tài khoản.
2. `kind=payment`, amount là số nguyên dương VND.
3. Category active thuộc account/system và có `kind=payment`.
4. Tính số dư ví khả dụng bằng cùng công thức authoritative trước khi ghi.
5. Chỉ chấp nhận nếu thanh toán không làm số dư ví âm:

```text
payment.amount_vnd <= available_wallet_balance_before
```

   Với giao dịch ghi lùi ngày hoặc nhập CSV, phải kiểm tra thêm mọi số dư tiền tố theo thứ tự nghiệp vụ; nếu bất kỳ prefix nào âm thì từ chối row/batch theo chính sách import. Không được dùng thu nhập tương lai hoặc `Savings` để vượt điều kiện này.
6. Nếu payment làm vượt budget nhưng vẫn đủ ví, vẫn ghi nhận thành công; tạo cảnh báo, không chặn.
7. Nếu không đủ ví, trả lỗi nghiệp vụ ổn định (ví dụ `PAYMENT_INSUFFICIENT_WALLET`), không tạo transaction ledger; có thể ghi security/audit log cho lần từ chối nhưng không giả mạo giao dịch.

### 4.4 Reversal và điều chỉnh append-only

- Không có endpoint/domain command sửa hoặc xóa trực tiếp `Transaction`.
- Hoàn tác một `income` tạo reversal cùng `kind=income`, amount bằng bản gốc; effect là âm. Chỉ chấp nhận khi toàn bộ số dư prefix sau khi thêm reversal vẫn không âm. Nếu sinh viên đã dùng tiền, yêu cầu reversal có thể bị từ chối thay vì tạo số dư âm.
- Hoàn tác một `payment` tạo reversal cùng `kind=payment`, amount bằng bản gốc; effect là dương, làm tiền quay lại ví tại thời điểm reversal. Reversal không phải một payment mới để tính ngân sách.
- Giao dịch gốc vẫn hiển thị trong lịch sử với trạng thái đã hoàn tác; replacement transaction (nếu cần) là một bản ghi mới. Lý do reversal là bắt buộc đối với thao tác người dùng/admin.
- Báo cáo dòng tiền hiện tại dùng effect theo thời điểm reversal. Báo cáo theo kỳ nên tính các `original` còn active; một original đã reversal bị loại khỏi tổng income/payment của kỳ của bản gốc, còn reversal không được tính như một khoản thu nhập/thanh toán độc lập. Quy tắc này phải được dùng nhất quán trong báo cáo, budget và JEV.
- Mọi hành động create/reversal/import/đổi category/đổi budget phải có audit event append-only với actor và thời điểm. Admin không được sửa lịch sử tiền để “dọn dữ liệu”.

### 4.5 Ví và tiền tiết kiệm

- `Wallet` là nguồn tiền duy nhất cho `payment`. Không đọc `SavingsAccount` để bổ sung `available_wallet_balance_vnd`.
- `SavingsAccount` giữ số dư riêng. Deposit làm giảm ví và tăng savings; withdrawal làm tăng ví và giảm savings. Scheduled deposit dùng số tiền cố định do người dùng đặt và idempotency theo user/kỳ.
- Mọi `SavingsTransfer` là internal transfer, không phải `income`/`payment` và không tính vào tổng hai loại hoặc budget. Không tính lãi hoặc phần trăm tích lũy.
- Savings transfer phải kiểm tra đủ ví/savings và cập nhật hai aggregate trong cùng transaction; không tạo bản ghi nửa chừng.

## 5. Danh mục

### 5.1 Danh mục mặc định

- System cung cấp bộ danh mục khởi tạo tiếng Việt theo `kind`: `income` gồm Trợ cấp, Việc làm bán thời gian, Học bổng, Quà tặng, Thu nhập khác; `payment` gồm Đồ ăn, Đi lại, Ký túc xá/Tiền thuê nhà, Học tập, Dịch vụ thuê bao, Giải trí, Linh tinh.
- Admin có thể bổ sung/đổi trạng thái phiên bản danh mục mặc định nhưng không được làm mất khả năng đọc giao dịch lịch sử. Nếu danh mục đã dùng, chỉ `retire`; tên/ý nghĩa cũ phải giữ bằng snapshot hoặc version.
- Khi tạo tài khoản, danh mục system active được tham chiếu/copy theo chiến lược persistence của kiến trúc; kết quả nghiệp vụ phải là category hợp lệ trong đúng tài khoản.

### 5.2 Danh mục tùy chỉnh

- Sinh viên tạo danh mục riêng, chọn `kind=income` hoặc `kind=payment`; tên được chuẩn hóa whitespace và duy nhất trong cùng account + kind.
- Giao dịch chỉ chọn category cùng account (hoặc system category được phép) và cùng kind.
- Category đang được dùng không bị hard-delete; thao tác “xóa” chỉ retire/ẩn khỏi lựa chọn mới. Giao dịch cũ vẫn đọc được.
- Category `payment` bắt buộc cho payment đã post để budget và báo cáo không phải suy diễn. CSV thiếu/không khớp category phải bị từ chối hoặc đưa vào hàng chờ xác nhận, không tự post bằng kết quả AI.
- Gợi ý category của AI chỉ là `AiSuggestion`; category cuối do rule/schema hoặc người dùng xác nhận. Sửa gợi ý phải audit nếu làm thay đổi category cuối.

## 6. Ngân sách và cảnh báo

### 6.1 Phạm vi tính ngân sách

Mỗi budget là `(account_id, payment_category_id, period_month_local, limit_amount_vnd)`. `period_month_local` là tháng `YYYY-MM` sau khi quy đổi `occurred_at` sang `Asia/Ho_Chi_Minh`.

```text
budget_spent(account, category, month)
  = Σ original.amount_vnd
    với original.kind = payment,
    category đúng category,
    localMonth(original.occurred_at) = month,
    original chưa có reversal hợp lệ
```

- Không cộng `income`, mục tiêu/số dư `Savings`, giao dịch chưa post, hoặc payment đã reversal.
- Reversal của một payment cũ làm original không còn active; báo cáo/budget của tháng gốc được tính lại và reversal không được coi là khoản thu riêng trong tháng hiện tại.
- `limit_amount_vnd` là số nguyên không âm; một account không có hai budget cùng category và tháng.
- `budget_ratio = budget_spent / limit_amount_vnd` khi limit > 0. Với limit bằng 0, mọi payment dương là trạng thái vượt; không chia cho 0.

### 6.2 Cảnh báo

- Cảnh báo “sắp chạm” và “đã vượt” là thông tin trong ứng dụng (và kênh thông báo nếu được bật), **không phải rào chặn payment**.
- Đề xuất mặc định ngưỡng sắp chạm là 80% và ngưỡng vượt là `spent > limit`; ngưỡng có thể cấu hình sau nhưng phải ghi rõ trong product config và audit. Nếu chưa chốt ngưỡng, vẫn phải hiển thị trạng thái vượt một cách xác định.
- Payment chỉ bị chặn bởi điều kiện số dư ví; không bị chặn vì ngân sách, mẹo AI hoặc dự báo.

## 7. Thời gian, tiền tệ và nhập dữ liệu

### 7.1 VND và phép tính

- `currency=VND` ở account/wallet/transaction/budget; API không nhận currency khác trong MVP.
- Lưu lượng tiền bằng integer đồng (`BIGINT` hoặc decimal scale 0 được kiểm soát); cấm float/JS binary arithmetic cho phép tính authoritative.
- Hiển thị tiếng Việt, định dạng `vi-VN`; không có USD, FX, tỷ giá hoặc làm tròn ngoại tệ.

### 7.2 `Asia/Ho_Chi_Minh`

- `occurred_at` là thời điểm nghiệp vụ do người dùng nhập; ngày không có giờ được hiểu là 00:00 tại `Asia/Ho_Chi_Minh`.
- `created_at`/audit timestamp có thể lưu UTC để đồng bộ nhưng UI/report chuyển về `Asia/Ho_Chi_Minh`.
- Ngày, tuần, tháng, budget và so sánh xu hướng đều dùng local date/month sau quy đổi; không dùng timezone của trình duyệt để đổi kỳ.
- Event cùng local timestamp phải có `append_sequence`/id tie-breaker ổn định. CSV dùng `row_order` trong batch khi cần tái lập thứ tự.

### 7.3 CSV và giao dịch lặp lại

- CSV phải validate schema, owner, kind, amount, category, currency và ngày trước khi post; mỗi dòng tạo bản ghi append-only với `source=csv` và batch id.
- Idempotency key/batch fingerprint nên ngăn import cùng một batch hai lần; row lỗi phải có lý do hiển thị được, không âm thầm bỏ qua.
- Nhập lùi ngày phải chạy kiểm tra số dư prefix; không đưa một dòng làm ví âm vào ledger. Chính sách atomic toàn batch hay chấp nhận từng dòng là câu hỏi mở ở mục 10, nhưng không được bỏ qua payment guard.
- Lịch lặp lại chỉ là lịch tạo bản ghi; mỗi occurrence phải có id, thời điểm, category và audit riêng, vẫn chạy payment guard. Lỗi một occurrence không được âm thầm tạo payment vượt ví.

## 8. Mâu thuẫn SRS và quyết định override

| Vị trí SRS tiếng Việt | Mô tả cũ | Quyết định mới/ảnh hưởng tích hợp |
|---|---|---|
| §1.1, §1.2 và §1.4 (dòng 27–63) | Mô tả thu nhập cùng các khoản “chi phí”; phân tích số dư theo thu nhập so với chi phí. | Chuẩn hóa mô hình thành `income` và `payment`; số dư là số dư `Wallet` theo signed ledger, không phải phép cộng trừ tự do trên UI. |
| §1.6 (dòng 85–99, bảng danh mục) | Category minh họa theo loại thu nhập và loại cũ cho khoản ra. | `Category.kind` chỉ `income`/`payment`; bộ nhãn tiếng Việt cho payment được giữ về mặt ý nghĩa nhưng không dùng giá trị cũ. |
| §1.6 (dòng 107–112) | Cho phép sửa và xóa giao dịch nhưng vẫn giữ lịch sử. | Bị override bởi immutable history: không update/delete transaction; reversal + replacement + audit trail append-only. |
| §1.8 (dòng 258–270) | Bảng `Transaction` có `type` minh họa gồm giá trị cũ cho khoản ra. | Bảng chuẩn mới dùng `kind ∈ {income, payment}`; amount dương và effect do kind/role quyết định. |
| §1.6 (dòng 141–146), §1.8 (dòng 272–280) | Budget theo danh mục và cảnh báo khi sắp chạm/vượt, chưa chốt ranh giới tính. | Chỉ original payment còn active tính budget; cảnh báo không chặn payment khi ví đủ. |
| §1.8 (dòng 245) | `monthly_savings_goal` là một trường hồ sơ. | Bị override thành `SavingsAccount` và `SavingsTransfer` tách khỏi Wallet; nạp/rút/tự động chuyển không phải `income`/`payment`, không tính budget và không có lãi suất. |
| §1.8 (dòng 269), §1.7 (dòng 187–201) | Chỉ có DATE/DATETIME chung, chưa quy định timezone nghiệp vụ. | Mọi kỳ/ngày nghiệp vụ dùng `Asia/Ho_Chi_Minh`; dấu kỹ thuật có thể UTC. |
| §1.5 (dòng 67–71), §1.6 (dòng 113–139) | Không ngân hàng/thanh toán thật; AI phân loại/tóm tắt/mẹo. | Ranh giới không ngân hàng được giữ; AI/JEV advisory, không authoritative cho money logic, category cuối, guard hoặc budget. |
| §1.6 (dòng 152–159) | Admin thêm/sửa/xóa category mặc định và quản lý tài khoản. | Admin có thể quản trị trạng thái/category và quyền tài khoản, nhưng không chỉnh/xóa transaction; category đã dùng chỉ retire/version và mọi hành động audit. |

## 9. Invariant có thể kiểm tra

### 9.1 Domain/service

| ID | Invariant kiểm tra |
|---|---|
| INV-D01 | `Transaction.kind` chính xác là `income` hoặc `payment`; không có alias khác. |
| INV-D02 | `amount_vnd` là integer dương; currency duy nhất là VND; không dùng float cho logic tiền. |
| INV-D03 | Category active, thuộc account/system hợp lệ và `category.kind == transaction.kind`. |
| INV-D04 | Payment mới chỉ post khi `amount_vnd <= available_wallet_balance_before` và mọi số dư prefix liên quan không âm. |
| INV-D05 | Budget chỉ tham chiếu category `payment`, `limit_amount_vnd >= 0`, duy nhất theo account/category/local month. |
| INV-D06 | Wallet không lấy số dư Savings; Savings không cấp hạn mức payment. |
| INV-D07 | Transaction và audit event không update/delete; reversal là bản ghi mới, same account/kind/amount, liên kết một-một và không chain. |
| INV-D08 | Period totals/budget loại original đã reversal; reversal không là giao dịch độc lập để cộng kỳ. |
| INV-D09 | AI suggestion không được làm thay đổi effect, wallet, budget hoặc category cuối nếu chưa được xác nhận. |
| INV-D10 | Mọi kỳ ngày/tháng dùng local time `Asia/Ho_Chi_Minh`; cùng timestamp có thứ tự append ổn định. |

### 9.2 API/application boundary

- Bắt buộc session/token của account; mọi `account_id`, `transaction_id`, `category_id`, `budget_id` từ client phải được kiểm tra ownership, không tin ID do client gửi.
- Endpoint tạo payment phải chạy validate + wallet guard trong cùng transaction/lock logic để hai request đồng thời không cùng tiêu một số dư.
- Không cung cấp `PATCH`/`DELETE` làm mất hoặc sửa transaction; endpoint điều chỉnh phải là command reversal với reason và idempotency key.
- Lỗi nghiệp vụ nên ổn định và không rò rỉ dữ liệu tài khoản khác, tối thiểu có `PAYMENT_INSUFFICIENT_WALLET`, `CATEGORY_KIND_MISMATCH`, `TRANSACTION_ALREADY_REVERSED`, `INVALID_VND_AMOUNT`.
- AI/JEV endpoint trả recommendation/provenance/confidence; không được có quyền gọi domain command ghi tiền nếu thiếu xác nhận người dùng.
- Import phải tách validate/preview khỏi commit; retry cùng idempotency key không tạo duplicate transaction.

### 9.3 Database/storage

- CHECK/enum cho kind, currency, amount > 0, budget limit >= 0, role và local period format; FK transaction/category/account và budget/category/account.
- Unique `(account_id, category_kind, normalized_name)` cho category tùy chỉnh; unique `(account_id, category_id, period_month)` cho budget.
- Unique partial constraint trên `reversal_of` để một original có tối đa một reversal; CHECK reversal cùng account/kind/amount được enforced ở service và DB trigger/constraint phù hợp.
- Quyền DB của application không cho `UPDATE`/`DELETE` transaction/audit; nếu cần archive vật lý phải qua retention policy riêng, không qua thao tác nghiệp vụ.
- Audit event ghi actor/source/request id và được bảo vệ khỏi sửa; index theo account + occurred_at/local month phục vụ tái tính.
- Cache số dư/budget là derived data; job/reconciliation phải có thể đối chiếu với ledger và không được trở thành nguồn authoritative.

## 10. Tiêu chí chấp nhận (Acceptance Criteria)

| ID | Given/When/Then có thể kiểm chứng |
|---|---|
| AC-01 — Tách tài khoản | Given hai tài khoản sinh viên, When một tài khoản đọc wallet/category/budget/transaction, Then chỉ thấy dữ liệu của chính mình; không thể dùng ID để đọc/sửa dữ liệu tài khoản kia. |
| AC-02 — Vocabulary | Given mọi request/schema/domain record, Then `kind` chỉ nhận `income` hoặc `payment`; UI/API/database dùng “Thanh toán” cho khoản ra và không có giá trị cũ `expense` hoặc “chi phí” làm loại giao dịch. |
| AC-03 — Income | Given account có category `income`, When ghi income 1.000.000 VND, Then một bản ghi append-only được tạo, wallet tăng đúng 1.000.000 và budget không tăng. |
| AC-04 — Payment hợp lệ | Given wallet đang có 1.000.000 VND, When ghi payment 250.000 VND với category `payment`, Then ghi thành công, wallet còn 750.000 và amount được tính bằng integer VND. |
| AC-05 — Chặn vượt ví | Given wallet đang có 750.000 VND, When gửi payment 750.001 VND, Then domain trả lỗi insufficient wallet, không có ledger transaction mới và wallet không âm. |
| AC-06 — Budget không chặn | Given budget category là 200.000 VND và wallet đủ 500.000 VND, When ghi payment 250.000 VND, Then payment thành công, spent là 250.000, trạng thái vượt/cảnh báo hiển thị, không reject vì budget. |
| AC-07 — Budget đúng phạm vi | Given một income, một payment active, một payment đã reversal và SavingsGoal, When tính budget tháng, Then chỉ payment active đúng category và local month được tính; income, SavingsGoal và payment đã reversal không được tính. |
| AC-08 — Append-only/reversal | Given original income/payment đã post, When người dùng yêu cầu sửa/xóa, Then hệ thống không mutate/delete original; reversal (nếu hợp lệ) và audit event mới được tạo. Reversal payment hoàn tiền vào ví theo thời điểm reversal; reversal income bị từ chối nếu làm prefix balance âm. |
| AC-09 — Reversal không double count | Given payment tháng trước được reversal tháng này, When đọc ledger và budget, Then wallet hiện tại phản ánh khoản hoàn tiền theo thời điểm reversal, còn budget loại original đã reversal và không cộng reversal như một payment/income độc lập. |
| AC-10 — Category | Given category tùy chỉnh `payment` đang được transaction dùng, When sinh viên bấm xóa, Then category chuyển retired/ẩn khỏi lựa chọn mới, transaction cũ vẫn đọc được; category `income` không thể gán cho payment. |
| AC-11 — Savings tách ví | Given SavingsGoal có target/progress, When tính wallet hoặc kiểm tra payment, Then SavingsGoal không làm tăng available wallet, không cấp hạn mức và không được tính vào budget. |
| AC-12 — VND/timezone | Given event gần ranh giới UTC, When quy đổi sang `Asia/Ho_Chi_Minh`, Then ngày/tháng và budget dùng local date; UI hiển thị VND/vi-VN, không có FX hoặc số lẻ ngoại tệ. |
| AC-13 — AI advisory | Given AI đề xuất category hoặc mẹo, When confidence thấp hoặc người dùng ghi đè, Then ledger/budget vẫn theo category và dữ liệu do người dùng xác nhận; AI không tự tạo effect tiền. |
| AC-14 — CSV/retry | Given CSV có row thiếu category, sai kind hoặc làm prefix ví âm, When preview/commit, Then row được báo lỗi và không post sai; retry cùng idempotency key không tạo duplicate. Các row hợp lệ vẫn chịu cùng payment guard. |
| AC-15 — Audit/admin | Given admin xem hoặc retire category, When thao tác hoàn tất, Then có audit actor/time/reason; admin không thể update/delete hay thay đổi effect của transaction lịch sử. |

## 11. Out-of-scope

- Kết nối ngân hàng, open banking, đồng bộ sao kê tự động, xác minh số dư ngân hàng.
- Xử lý thanh toán thật, thẻ, ví điện tử, chuyển khoản thật, nhận/giữ tiền hoặc settlement.
- Cho vay, tín dụng, BNPL, lãi suất, hạn mức tín dụng, thu hồi nợ hoặc bảo lãnh.
- Đầu tư, bảo hiểm, giao dịch tài sản hoặc tư vấn tài chính được chứng nhận.
- Tiền tệ ngoài VND, đa tiền tệ, FX và làm tròn theo ngoại tệ.
- Dùng Savings để thanh toán hoặc tự động chuyển phần dư sang savings trong MVP; actual savings transfer cần quyết định/roadmap riêng.
- Ví dùng chung gia đình/ký túc xá, chia sẻ ngân sách nhiều người, liên kết tài khoản phụ huynh hoặc multi-tenant trường học.
- Biến AI thành nguồn sự thật cho số dư, phân loại cuối, cảnh báo chặn, quyết định reversal hoặc bất kỳ phép tính tiền nào.
- Hard-delete/sửa tại chỗ giao dịch hay audit trail; “xóa dữ liệu” theo retention/privacy policy là luồng quản trị riêng và không được giả làm correction nghiệp vụ.
- Suy diễn danh mục/amount hợp lệ chỉ từ text AI khi người dùng chưa xác nhận; import thiếu dữ liệu không được tự post mù.

## 12. Rủi ro và câu hỏi mở không blocking

1. **Savings là mục tiêu hay tiền thực?** Khuyến nghị MVP chỉ cam kết `SavingsGoal` tách ví. Nếu cần số dư thực có thể rút, cần chốt `SavingsTransfer` (hai leg ví–savings, quyền reversal, audit, báo cáo) trước khi phát triển; không mở rộng transaction kind.
2. **Số dư đầu kỳ:** hiện giả định 0; nếu cho phép nhập số dư ban đầu, cần chốt command/nhãn/category và cách xuất hiện trong báo cáo, vẫn phải append-only.
3. **Ngưỡng “sắp chạm”:** đề xuất 80%; product có thể đổi config. Ngưỡng vượt 100% phải giữ cảnh báo nhưng không chặn.
4. **Payment ghi lùi ngày/cùng ngày:** đề xuất thứ tự `(local occurred_at, append_sequence, id)` và kiểm tra mọi prefix; cần chốt UX khi CSV có cùng ngày nhưng không có giờ.
5. **CSV atomic hay từng dòng:** đề xuất preview trước, commit batch có trạng thái rõ; cần quyết định có rollback toàn batch hay giữ các dòng hợp lệ. Dù chọn cách nào, row payment vi phạm ví không được post.
6. **Reversal income sau khi tiền đã dùng:** khuyến nghị từ chối nếu làm bất kỳ prefix nào âm; cần nội dung lỗi và quyền yêu cầu người dùng tạo correction phù hợp.
7. **Báo cáo sau reversal:** đề xuất báo cáo kỳ tái tính original active để số liệu không còn khoản đã hoàn tác; nếu cần snapshot bất biến để xuất PDF, phải lưu version/report generated_at riêng.
8. **Danh mục mặc định được đổi tên:** khuyến nghị retire/version thay vì rename phá nghĩa lịch sử; cần chọn copy-on-account hay tham chiếu system tại architecture.
9. **Lịch lặp lại:** cần chốt vùng giờ, occurrence trùng, và cách xử lý khi ví thiếu; không được bypass payment guard.
10. **Concurrency:** hai payment đồng thời có thể cùng đọc số dư; implementation phải serialize/lock hoặc dùng optimistic version và retry có kiểm soát để giữ INV-D04.

## 13. Điểm cần tích hợp vào tài liệu chuẩn

| Tài liệu đích | Nội dung cần đưa vào |
|---|---|
| `docs/DOMAIN-MODEL.md` | Glossary §2; quan hệ Account–Wallet–Savings–Category–Transaction–Budget; enum hai kind; trạng thái original/reversal; formula `walletEffect`; budget formula; category lifecycle. |
| `docs/PRD.md` | Capability sinh viên; UI có locale `en`/`vi`; flow ghi income/payment; wallet guard; budget warning không chặn; acceptance AC-01–AC-15; các mâu thuẫn SRS được override. |
| `docs/ARCHITECTURE.md` | Append-only ledger, integer VND, timezone normalization, transaction/lock/idempotency, derived-cache reconciliation, DB constraints và prefix-balance validation. |
| `docs/AUTHENTICATION.md` | Ownership account; phân cách student/admin; mọi command money cần actor; quyền admin chỉ quản trị, không sửa lịch sử. Phối hợp với CC-002 về session/OAuth/OTP. |
| `docs/AI-JEV.md` | AI/JEV advisory, provenance/confidence/override, không gọi money command authoritative; deterministic wallet/budget/reversal nằm ngoài AI. Phối hợp với CC-004 về fallback/privacy/evaluation. |
| `docs/ADMIN-OPERATIONS.md` | Category system seed/retire/version, audit trail, account disable, import/reconciliation và nguyên tắc admin không mutate ledger. |
| `docs/ROADMAP.md` | Câu hỏi savings transfer thực, opening balance, threshold config, CSV atomicity, report snapshot, recurrence/concurrency; không mở phạm vi ngân hàng/cho vay/BNPL. |
| `docs/working/INTEGRATION-HANDOFF.md` | Đánh dấu CC-001 là nguồn miền; kiểm consistency vocabulary `income/payment`, VND, `Asia/Ho_Chi_Minh`, immutable/reversal, wallet vs Savings và budget non-blocking. |

### Hợp đồng phối hợp với các handoff khác

- **CC-002 AuthSecurity:** cung cấp actor/session/ownership; không được cấp quyền làm suy yếu append-only hoặc payment guard.
- **CC-003 TechCloud:** persistence phải hỗ trợ integer VND, local-month query, append-only/audit, unique reversal và concurrency guard.
- **CC-004 JevAdminOps:** JEV chỉ advisory; admin workflow có audit và không sửa ledger; báo cáo/budget dùng formula của handoff này.

## 14. Kết luận bàn giao

Miền có thể tích hợp ngay với các quyết định đã khóa: `income`/`payment` là hai kind duy nhất; Wallet là nguồn duy nhất của payment; Savings tách biệt; payment không vượt số dư ví nhưng budget chỉ cảnh báo; tiền dùng VND và timezone `Asia/Ho_Chi_Minh`; lịch sử transaction/audit append-only, correction qua reversal. Các câu hỏi còn lại chỉ bổ sung UX/triển khai hoặc quyết định mở rộng, không được dùng để suy diễn thêm ngân hàng, cho vay, BNPL hay một kind giao dịch thứ ba.
