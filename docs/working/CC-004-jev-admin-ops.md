# CC-004 — Handoff JEV và vận hành admin/report/issue

> Chủ sở hữu: `JevAdminOps`  
> Phạm vi: phân tích SRS Campus Coin tiếng Việt và các quyết định sản phẩm đã khóa.  
> Tài liệu này chỉ là handoff để điều phối viên tích hợp; không thay thế `AI-JEV.md` hoặc `ADMIN-OPERATIONS.md` và không sửa mã nguồn/SRS gốc.

## 1. Phạm vi và giả định

### 1.1 Phạm vi

Handoff này chốt ranh giới và flow cho hai năng lực liên quan:

1. **Lớp tích hợp JEV/AI**: trích xuất dữ liệu ứng viên từ đầu vào do người dùng cung cấp, đề xuất phân loại, tạo gợi ý tiết kiệm và tạo tóm tắt báo cáo. JEV là lớp advisory, không phải sổ cái, bộ máy tính tiền, bộ quyết định quyền hoặc nguồn dữ liệu chuẩn.
2. **Vận hành quản trị nhẹ**: tiếp nhận và xử lý report/issue của người dùng, triage, trạng thái, ghi chú vận hành, nội dung vận hành, cài đặt feature/provider, thống kê chất lượng và audit. Admin không được chỉnh sửa lịch sử giao dịch bất biến.

SRS tiếng Việt mô tả AI là tùy chọn cho đề xuất phân loại, tóm tắt tháng, mẹo cá nhân hóa; mô tả báo cáo theo danh mục, so sánh thu nhập với các khoản chi, bộ lọc và xuất báo cáo; đồng thời yêu cầu admin quản lý danh mục mặc định, mẫu thông báo/mẹo, tài khoản và thống kê. Handoff này biến các yêu cầu đó thành biên tích hợp có thể viết thành tài liệu chuẩn.

### 1.2 Các giả định cần giữ khi tích hợp

- Ngôn ngữ UI, nội dung JEV, report và thông báo là **tiếng Việt**; locale mặc định `vi-VN`.
- Tiền tệ duy nhất là **VND**; mọi phép cộng, trừ, so sánh, làm tròn, tổng hợp và kiểm tra giới hạn do logic xác định của miền tiền thực hiện.
- Múi giờ nghiệp vụ là **`Asia/Ho_Chi_Minh`**. Ranh giới ngày, tuần, tháng, thời điểm chốt snapshot và lịch chạy job phải dùng múi giờ này; timestamp lưu trữ phải giữ timezone/UTC theo quyết định hạ tầng nhưng không được đổi nghĩa ngày nghiệp vụ.
- `transaction.type` chỉ có **`income`** và **`payment`**. Trong UI và tài liệu nghiệp vụ dùng “thanh toán” cho loại `payment`; không tạo type thứ ba và không dùng từ chỉ khoản chi như một giá trị type.
- Lịch sử giao dịch là **immutable/append-only**. Sửa hoặc xóa theo trải nghiệm người dùng phải tạo bản ghi điều chỉnh/sự kiện mới theo mô hình miền, không cập nhật/xóa hàng lịch sử; JEV và admin không được ghi thẳng vào ledger.
- Tiền trong ví tách khỏi tiền tiết kiệm. Một `payment` chỉ lấy từ số dư ví và bị từ chối nếu vượt số dư; JEV không được phê duyệt, bỏ qua hoặc thay thế kiểm tra này.
- Budget chỉ tính các `payment`; cảnh báo budget chỉ cảnh báo, không chặn thao tác `payment` hợp lệ (ngoại trừ bất biến số dư ví nói trên).
- Campus Coin không kết nối ngân hàng, không xử lý thanh toán tiền thật, không cho vay, không BNPL, không lãi suất và không đưa ra tư vấn tài chính được chứng nhận.
- Logic tiền xác định là authoritative. AI/JEV chỉ đưa ra đề xuất, giải thích hoặc tóm tắt để người dùng xem xét; không có output model nào tự động làm thay đổi số dư, budget, quyền hay giao dịch.
- “JEV” được xem là tên của biên tích hợp AI trong dự án. Provider, model, cách triển khai cụ thể và hợp đồng dữ liệu chưa được khóa trong SRS; các điểm này là câu hỏi mở ở cuối handoff.

## 2. Quyết định đề xuất

### 2.1 Ranh giới tin cậy

| Thành phần | Được làm | Không được làm |
| --- | --- | --- |
| Logic miền/ledger | Tính số dư ví, tổng `income`/`payment`, kiểm tra payment không vượt số dư, tính budget, snapshot báo cáo, kiểm tra quyền | Không phụ thuộc model/provider |
| Report service | Lấy dữ liệu ledger immutable, áp bộ lọc, tổng hợp theo VND và `Asia/Ho_Chi_Minh`, tạo PDF/hình ảnh | Không lấy số liệu từ văn bản AI |
| JEV orchestrator | Chuẩn hóa payload tối thiểu, gọi provider, validate schema, gắn confidence/evidence, lưu trạng thái và fallback | Không commit giao dịch, không tính số dư authoritative, không tự quyết định quyền |
| Model/provider | Trích xuất ứng viên, phân loại, diễn đạt tóm tắt/gợi ý trong schema hạn chế | Không được truy cập DB, tool, auth, wallet, budget hoặc gọi hành động ngoài contract |
| UI người dùng | Hiển thị đề xuất rõ là “gợi ý”, cho accept/override/reject, report output | Không coi đề xuất là kết quả đã ghi sổ |
| Admin console | Triage issue, quản trị content/config/feature flag theo quyền, xem metric/audit đã mask | Không sửa/xóa ledger, budget, wallet, savings hoặc ép apply output AI |

### 2.2 Các capability JEV

1. **Trích xuất ứng viên**: đọc CSV/đầu vào văn bản hoặc OCR nếu sau này được bật, trả về các trường ứng viên có `source_row_id`/`field_confidence`. Parser và validator xác định có thể parse được gì; người dùng phải xem và xác nhận trước khi tạo transaction. JEV không được tự import hàng loạt.
2. **Đề xuất phân loại**: từ mô tả transaction và danh sách category được phép, trả về một `category_id` ứng viên, confidence và lý do ngắn. Kết quả chỉ prefill/suggestion; accept hoặc override của người dùng mới trở thành lệnh miền canonical.
3. **Gợi ý tiết kiệm**: dùng facts/aggregate đã tính xác định để diễn đạt một số hành động đơn giản, không cam kết tiết kiệm, không tư vấn đầu tư/tín dụng. Gợi ý có thể bị bỏ qua hoặc ghim; không tự thay budget/payment.
4. **Tóm tắt báo cáo**: diễn đạt các mẫu nổi bật của snapshot báo cáo bằng tiếng Việt đơn giản. Mọi con số/so sánh phải trỏ tới `fact_id` đã tính trước; server loại output không có fact tương ứng hoặc sai số. Khi JEV lỗi, dùng template xác định.
5. **Phát hiện bất thường/trùng lặp (tùy chọn)**: chỉ tạo cờ cảnh báo cho người dùng xem; không tự hủy, sửa hay chặn transaction.

### 2.3 Sync và async

- **Sync**: phân loại một mô tả khi nhập hoặc trích xuất một mục nhỏ. API đặt timeout hữu hạn, không giữ transaction DB trong lúc chờ provider. Nếu timeout, lỗi, schema sai hoặc provider bị ngắt, API trả về trạng thái `fallback/manual_required` và người dùng vẫn có thể tiếp tục bằng luồng xác định.
- **Async**: import CSV nhiều dòng, tóm tắt tháng, gợi ý hàng loạt, reprocess, evaluation và các job có thể chạy lâu. Hàng đợi nhận job sau khi command/snapshot đã commit qua outbox; worker ghi kết quả theo `idempotency_key`. UI hiển thị `queued`, `processing`, `succeeded`, `failed`, `quarantined` hoặc `canceled`, không giả vờ đã hoàn tất.
- **Không chặn đường tiền**: tạo/sửa theo flow miền, tính số dư, ghi `income`/`payment` và xem report cơ bản không cần JEV. JEV down chỉ làm mất suggestion/insight, không làm mất khả năng ghi dữ liệu hợp lệ.
- **Snapshot rõ ràng**: summary/job gắn `source_snapshot_id` và khoảng kỳ theo `Asia/Ho_Chi_Minh`. Khi ledger/budget thay đổi sau snapshot, artifact cũ được đánh dấu stale; job mới tạo version mới, không ghi đè âm thầm.

### 2.4 Flow phân loại một transaction

1. Người dùng nhập mô tả, category tùy chọn và dữ liệu transaction. API xác thực tài khoản, kiểm tra schema, VND, ngày và type; các kiểm tra ví/số dư/budget thuộc miền xác định.
2. Orchestrator tạo `jev_request_id` và fingerprint của nguồn; chỉ gửi description đã redaction, `locale`, timezone, danh sách category được phép và type context cần thiết. Amount, số dư ví, token, email và tên không cần cho phân loại thì không gửi.
3. JEV provider trả schema nghiêm ngặt: `category_id|null`, `confidence`, `rationale_short`, model/prompt version, safety flags. Server kiểm tra category tồn tại, thuộc phạm vi user/system, phù hợp ngữ cảnh `payment`, độ dài/encoding và confidence trong miền cho phép.
4. UI hiển thị “Đề xuất từ JEV — hãy kiểm tra”, không ghi ledger. Confidence thấp hoặc safety flag thì hiển thị manual required thay vì prefill.
5. Người dùng accept, chọn category khác hoặc bỏ qua. Lệnh canonical revalidate toàn bộ dữ liệu và quy tắc ví; provenance lưu `suggested`, `accepted`, `overridden` hoặc `rejected` cùng request/artifact id. Không có đường tắt từ provider tới transaction.
6. Lỗi provider, output sai schema, category không hợp lệ, prompt injection hoặc claim không an toàn chuyển sang fallback manual và ghi metric đã mask.

### 2.5 Flow CSV/OCR và trích xuất

1. Server parse cấu trúc tệp bằng parser xác định trước: encoding, cột bắt buộc, ngày, VND, type và row id. Row lỗi được báo cụ thể; không âm thầm bỏ qua.
2. JEV chỉ nhận các trường tối thiểu của row hợp lệ/không rõ (thường là mô tả và row id), hoặc candidate đã parse để gợi ý category. Amount/date/type phải qua validator xác định và người dùng xác nhận; JEV không được tự diễn giải tiền tệ mơ hồ.
3. Mỗi row có `source_row_id`, fingerprint và idempotency key riêng. Kết quả batch có thể thành công từng row nhưng chỉ row đã được người dùng review mới phát lệnh tạo transaction.
4. Với OCR trong tương lai, ảnh/tài liệu chỉ được gửi khi capability được bật và có chính sách privacy/provider phù hợp; output luôn là candidate review, không phải giao dịch đã ghi.
5. Bản import hiển thị summary số row thành công/lỗi/chờ review. Retry một row không tạo bản sao và không thay đổi row đã accepted.

### 2.6 Flow report và tóm tắt tháng

1. Report service truy vấn ledger immutable và budget snapshot, áp filter ngày/category/nguồn `income`, tính các total bằng VND và tạo `fact_id` cho từng số liệu. Báo cáo sáu tháng, ngày/tuần/tháng và budget-vs-actual đều do service này tạo.
2. Summary request gửi `user_scope_token` ngắn hạn, kỳ, snapshot id, category labels đã allow-list và facts đã tổng hợp. Không gửi email/tên, auth token, toàn bộ lịch sử, mô tả từng dòng hoặc dữ liệu không cần thiết.
3. JEV trả `summary_vi`, danh sách `tips`, `claims[]` chứa `fact_id` và text, confidence/quality flags. Server chỉ chấp nhận claim có fact tồn tại và value/period phù hợp; không dùng văn bản model để tính lại tổng.
4. Output được lưu versioned cùng source snapshot, prompt/model version, generated timestamp, trạng thái `generated|stale|quarantined|hidden`. Regenerate tạo version mới; không sửa nội dung lịch sử đã phát hành bằng update mù.
5. UI gắn nhãn “Tóm tắt/gợi ý tham khảo từ AI; không phải tư vấn tài chính”. Người dùng có thể ghim/bỏ qua/report. Nếu provider thất bại hoặc validator loại output, report vẫn hiển thị template xác định từ facts.
6. Export PDF/hình ảnh dùng report facts và bản summary đã được validate; không xuất prompt, raw provider response, internal notes hoặc audit metadata.

### 2.7 Fallback xác định

- **Phân loại**: rule/keyword mapping an toàn nếu đã được phê duyệt; nếu không chắc chắn thì `category_id=null`, yêu cầu người dùng chọn. Không biến confidence giả thành category.
- **Trích xuất**: parser xác định và màn hình review; row không parse được giữ lỗi có thể sửa, không tự tạo record.
- **Tóm tắt/gợi ý**: template tiếng Việt lấy trực tiếp từ facts đã tính, ví dụ mức sử dụng budget hoặc xu hướng category. Template chỉ mô tả dữ kiện và đề nghị xem xét, không hứa hẹn kết quả.
- **Report**: số liệu, biểu đồ, export và bộ lọc vẫn hoạt động khi JEV bị tắt.
- **Safety/privacy**: output có PII, yêu cầu hành động bị cấm, claim không đối chiếu được hoặc nội dung có vẻ là tư vấn tín dụng bị quarantine; không fallback bằng cách hiển thị nguyên văn output lỗi.

## 3. Contract dữ liệu và idempotency đề xuất

### 3.1 Payload tối thiểu

`ClassificationRequest` nên gồm:

- `jev_request_id`, `idempotency_key`, `capability`, `source_snapshot_or_version`;
- `user_scope_token` không đảo ngược trực tiếp về email/user name;
- `locale=vi-VN`, `timezone=Asia/Ho_Chi_Minh`;
- description đã redaction, độ dài giới hạn;
- danh sách `allowed_categories[{id,label,type}]`, trong đó type chỉ `payment` khi phân loại khoản thanh toán;
- `prompt_version`, `model_policy_version` do orchestrator chọn, không do người dùng điều khiển.

`SummaryRequest` nên gồm kỳ, snapshot id, facts có định danh, aggregate VND, budget/payment facts cần thiết và các constraint diễn đạt. Không gửi raw transaction history khi aggregate đã đủ.

### 3.2 Output bắt buộc

Mọi output phải có envelope dạng tương đương:

```text
status: succeeded | fallback | rejected | quarantined
capability: extraction | classification | suggestion | summary
jev_request_id
artifact_id (nếu có)
model_version / prompt_version
confidence hoặc quality_flags
result (schema theo capability)
source_fact_ids / source_row_ids
expires_at hoặc stale_at
```

`result` là dữ liệu có schema, không nhận prose tự do làm protocol. Category id, row id và fact id phải được allow-list/foreign-key validate phía server. Raw response provider chỉ tồn tại ở vùng tạm có kiểm soát, không mặc định lưu lâu dài.

### 3.3 Idempotency, retry và dead letter

- `idempotency_key` ổn định từ capability + user scope + source object/version + input fingerprint + policy/model version. Không dùng raw description hoặc PII làm key gửi ra ngoài.
- Worker phải an toàn với at-least-once delivery: cùng key trả artifact hiện có hoặc cùng kết quả, không tạo insight/transaction bản sao.
- Chỉ retry lỗi tạm thời (timeout, network, 429, 5xx) với exponential backoff và jitter, số lần hữu hạn. Không retry vô hạn và không retry lỗi schema, policy, validation, 4xx hoặc safety.
- Sau giới hạn retry, chuyển dead-letter với lý do chuẩn hóa, correlation id và nút replay có quyền. Replay vẫn giữ source snapshot/idempotency, có audit actor/reason; không dùng cách tạo request mới để né dedupe.
- Circuit breaker và global/user-level kill switch phải ngăn thác lỗi. Khi provider có error rate/latency bất thường, tự chuyển fallback và báo operator.
- Job không được giữ transaction lock trong khi gọi JEV; outbox/event được phát sau commit, worker xử lý độc lập.

## 4. Confidence, manual override và provenance

- Confidence là tín hiệu để quyết định cách trình bày, **không phải sự thật**. Mỗi category suggestion có `0..1` hoặc trạng thái `abstain`; model không được tự đặt category ngoài allow-list.
- Chính sách ban đầu đề xuất: confidence cao có thể prefill nhưng vẫn cần user accept; confidence trung bình hiển thị cảnh báo/giải thích; confidence thấp/abstain chỉ mở luồng manual. Ngưỡng cụ thể phải là setting có version và được hiệu chuẩn qua evaluation, không hard-code ở UI.
- Với summary/tip, quality gate gồm evidence coverage và safety validation; một câu có số liệu nhưng thiếu fact tương ứng bị loại dù model tự báo confidence cao.
- Accept/override/reject của user là sự kiện provenance. Override luôn thắng suggestion trong transaction hiện tại; JEV không tự học online từ một override để làm thay đổi ledger khác.
- Có thể dùng feedback đã khử định danh cho evaluation hoặc cải thiện model khi có chính sách/consent phù hợp; không gửi toàn bộ lịch sử một user làm dữ liệu huấn luyện ngầm.

## 5. Privacy, retention và bảo mật dữ liệu

### 5.1 Payload minimization

- Không gửi tên, email, auth/session token, địa chỉ, ảnh hồ sơ, thông tin ngân hàng, secret hoặc dữ liệu admin sang provider.
- Redact pattern giống email, điện thoại, URL nhạy cảm, mã tài khoản/thẻ và chuỗi credential khỏi free text trước khi gọi. Giới hạn kích thước, encoding, số row và số token.
- Classification không cần amount/số dư thì không gửi. Summary ưu tiên aggregate category/period/budget facts; tránh mô tả từng giao dịch. Khi cần amount để diễn đạt, gửi aggregate VND đã được đánh dấu là fact read-only, không gửi credential hay identity.
- Log, metric label và trace không chứa description, raw prompt, raw response, exact financial detail hoặc user id trực tiếp. Dùng correlation id, capability, model/prompt version và bucket/aggregate.

### 5.2 Retention và vòng đời

- Provider phải có cam kết không dùng payload cho training ngoài thỏa thuận và retention tối thiểu phù hợp; nếu chưa chứng minh được thì capability phải tắt hoặc chỉ dùng provider nội bộ được phê duyệt.
- Raw prompt/raw response nên xóa ngay sau validate hoặc giữ trong retention ngắn đã phê duyệt cho debug; artifact đã render chỉ giữ theo nhu cầu lịch sử insight/report của user và trạng thái stale.
- `AIRequest` metadata, audit và user report có retention riêng, cấu hình được theo chính sách; không mặc định giữ vĩnh viễn. Ngày cụ thể là câu hỏi mở cần chốt với privacy/ops.
- Xóa/vô hiệu hóa tài khoản phải dọn hoặc anonymize request, queue, cache, artifact và report liên quan theo chính sách; không để job pending tái xuất hiện sau xóa.
- Encryption in transit/at rest, service-to-service auth, tenant/user scoping và access logging là bắt buộc. Provider chỉ được nhận token scope ngắn hạn, không token đăng nhập.

### 5.3 Prompt injection và output safety

- Description, CSV cell, report text và user report là **dữ liệu không đáng tin**, không phải instruction. Đặt chúng trong delimiter, system contract cố định, không cho model gọi tool/network/file.
- Validate JSON schema, enum, length, Unicode, category/fact/row references, prohibited claims và PII leak trước khi lưu/hiển thị.
- Prompt/model version phải pin vào allow-list; thay đổi prompt, provider hoặc model tạo version mới và chạy evaluation/canary trước publish.
- Nếu provider trả nội dung có yêu cầu chuyển tiền, vay, tín dụng, BNPL, kết nối ngân hàng, cam kết lợi nhuận, lời khuyên chuyên môn hoặc hướng dẫn vượt quyền, quarantine và dùng fallback template. Không “sửa nhẹ” rồi ghi như output hợp lệ nếu không thể xác minh.

## 6. Evaluation và monitoring

### 6.1 Offline evaluation

Xây golden set tiếng Việt gồm mô tả giao dịch sinh viên, tên cửa hàng mơ hồ, category hợp lệ, CSV lỗi định dạng, ngày/VND biên, câu prompt injection và các kỳ report giả lập. Tách train/tuning khỏi test; không lấy raw production data khi chưa có cơ chế cho phép.

Chỉ số tối thiểu:

- classification: top-1/top-k đúng, abstention, override/reject rate và calibration theo category;
- extraction: field exactness, row-level error detection, không tạo duplicate khi replay;
- summary/tip: fact/evidence coverage, numeric consistency, period correctness, readability tiếng Việt, unsafe/advice violation rate và human review score;
- privacy/safety: PII leakage, forbidden-domain detection, schema rejection và quarantine precision;
- reliability: timeout/error/fallback, queue age, retry và DLQ rate.

Quality gate: không phát hành model/prompt nếu có lỗi privacy/safety nghiêm trọng; các ngưỡng accuracy/factuality/latency phải được ghi theo capability và version. Mẫu human review được khử định danh và lưu quyết định/rationale.

### 6.2 Online monitoring

Dashboard vận hành tách khỏi dashboard người dùng và chỉ hiển thị dữ liệu aggregate/masked:

- availability, timeout, 429/5xx, schema reject, provider/model/prompt version;
- p50/p95 latency sync, queue age, success/fallback/retry/DLQ/circuit-open;
- suggestion acceptance/override/reject/abstain theo category và version;
- summary report rate, stale/quarantine rate, evidence rejection và user report rate/severity;
- drift về ngôn ngữ, độ dài mô tả, phân bố category và confidence calibration;
- token/cost nếu provider có tính phí, nhưng không gắn raw financial detail.

Alert phải có ngưỡng, window, owner, runbook và kill switch. Không dùng một metric tăng cao để tự động thay đổi ledger. Có canary/cutover, rollback model/prompt và audit cho mọi thay đổi policy.

## 7. Báo cáo người dùng

### 7.1 Contract chức năng

- Báo cáo tháng theo category `payment`, income và tổng hợp so sánh thu nhập với thanh toán trong sáu tháng gần nhất.
- Tóm tắt ngày/tuần trong tháng hiện tại; bộ lọc khoảng ngày, category hoặc nguồn `income`; ranh giới tháng/ngày/tuần theo `Asia/Ho_Chi_Minh`.
- Hiển thị amount bằng VND và lấy từ report facts xác định; budget-vs-actual chỉ cộng `payment`, cảnh báo không chặn payment.
- Xuất PDF/hình ảnh từ dữ liệu đã kiểm tra; export không kèm prompt, raw provider payload, admin notes, user report hoặc internal ids.
- AI summary/tip là tùy chọn, có nhãn advisory, source period và thời điểm tạo. Khi tắt/lỗi JEV, report deterministic vẫn đầy đủ số liệu.
- User có thể xem insight theo version, ghim/bỏ qua tip và report artifact. Artifact stale phải nói rõ kỳ nguồn và cho phép regenerate; không trình bày bản cũ như số liệu hiện tại.

### 7.2 User report/issue

Nút report xuất hiện trên suggestion, summary, tip, import result và report export. Form tối giản gồm:

- `target_type`, `target_id`/`artifact_id`, capability và request id nếu có;
- loại issue: phân loại sai, số liệu/tóm tắt không khớp, nội dung không phù hợp/an toàn, privacy concern, import/technical failure hoặc khác;
- mô tả tiếng Việt giới hạn độ dài, được redaction; không khuyến khích gửi email, số tài khoản hay thông tin tài chính ngoài target;
- severity người dùng chọn (privacy/safety tự nâng ưu tiên khi server nhận diện).

Issue state machine đề xuất:

```text
new -> triaged -> in_progress -> resolved
                         |          |
                         +-> rejected +-> reopened
new/triaged/in_progress -> duplicate
```

Mỗi chuyển trạng thái cần actor, timestamp, reason và audit event. User thấy ticket id, trạng thái và thông báo public; internal notes không lộ ra UI. `resolved` chỉ đóng khi có resolution code; user có thể reopen nếu vấn đề còn. Report không sửa artifact/transaction gốc; nếu output có hại, admin quarantine/hide artifact và tạo version/fallback phù hợp.

## 8. Admin operations nhẹ

### 8.1 Vai trò và least privilege

Tên role chỉ là đề xuất, mapping cuối cùng phải khớp `AUTHENTICATION.md`:

| Role/quyền | Được làm | Không được làm |
| --- | --- | --- |
| `support_operator` | Xem danh sách report đã mask, triage, assign, đổi state, ghi internal note không chứa full financial detail | Không xem raw prompt/description mặc định; không sửa ledger/budget/wallet/savings |
| `content_operator` | Soạn, review, publish, rollback phiên bản category label, thông báo, tip/template tiếng Việt | Không tự đổi policy tiền; không tạo lời khuyên vay/tín dụng; không sửa lịch sử |
| `ai_operator` | Xem metric aggregate, bật/tắt capability/provider, quản lý allow-list model/prompt, replay DLQ theo quyền | Không accept output thay user; không truy cập raw user history hàng loạt |
| `security_auditor` | Read-only audit, access review, report privacy/safety | Không mutate business data hoặc publish config |
| `system_admin` | Quản lý role/permission và emergency kill switch theo break-glass có audit | Vẫn không được sửa/xóa immutable transaction history |

Có thể gộp role trong triển khai nhỏ nhưng permission phải tách; mọi thao tác nhạy cảm cần reason, actor, scope, correlation id và audit. Raw detail chỉ mở theo case-specific, time-bound elevation, field-level masking và justification; quyền admin không đồng nghĩa quyền xem toàn bộ tài chính user.

### 8.2 Triage và xử lý issue

- Queue mặc định sắp theo severity, privacy/safety trước, tuổi ticket sau. Có filter capability, status, model/prompt version, period và tenant/scope được phép.
- Detail view hiển thị target artifact, redacted input, deterministic fact refs, output status, model/prompt version, retry/fallback và audit liên quan; không hiển thị raw secret hoặc toàn bộ lịch sử tài chính.
- Admin có thể assign, thêm note, liên kết duplicate, quarantine/hide AI artifact, yêu cầu regenerate từ snapshot mới, hoặc chuyển đội auth/privacy. Admin không thể “sửa câu trả lời trong chỗ” để làm mất provenance.
- Sai category/transaction được hướng người dùng về flow canonical để override/append adjustment; admin không tự ghi transaction thay user.
- Report privacy/safety phải tạo escalation và chặn artifact bị ảnh hưởng khỏi UI nếu policy yêu cầu. Không xóa bằng chứng audit; raw payload vẫn theo retention/redaction policy.

### 8.3 Operational content và settings

- Content: category mặc định, notification template, tip/template fallback, nhãn advisory, report resolution text. Mỗi bản có draft/review/published/retired, author, reviewer, version, effective time và rollback target.
- Settings: AI capability enabled, confidence thresholds, payload/row limits, timeout/retry cap, provider/model allow-list, retention profile, feature flag và kill switch. Setting thay đổi không hồi tố artifact đã phát hành trừ khi quarantine policy áp dụng.
- Publish cần validate tiếng Việt, prohibited-domain rules, accessibility/text length và smoke review; content không được hứa hẹn lợi ích tài chính, quảng bá vay/BNPL/ngân hàng hay biến tip thành chỉ dẫn chuyên môn.
- Mọi config/content mutation đều append-only audit và có version. Audit viewer read-only; export admin chỉ aggregate hoặc masked.

### 8.4 Thống kê vận hành

Admin được xem active users, số report theo state/capability, tổng transaction count/category usage ở dạng aggregate theo SRS; thêm metrics JEV ở mục 6. Không mặc định cho phép drill-down vào lịch sử giao dịch cá nhân. Report analytics phải tách dữ liệu support khỏi dữ liệu billing/ledger, giới hạn filter và log truy cập.

## 9. Bất biến bắt buộc

1. JEV không bao giờ là source of truth cho balance, wallet, savings, budget, transaction, authorization, role hoặc report facts.
2. Type giao dịch chỉ `income`/`payment`; nội dung AI không được sinh type khác.
3. Mọi `payment` canonical phải qua kiểm tra số dư ví xác định; budget warning không được biến thành block.
4. Immutable history không bị JEV, worker, admin, retry, replay, report regeneration hay content publish sửa/xóa.
5. AI luôn advisory; user phải nhìn thấy đề xuất và có đường accept/override/reject hoặc manual fallback.
6. Không có bank connection, real-money processing, lending, BNPL, interest hay certified financial advice.
7. Snapshot/report/summary dùng timezone `Asia/Ho_Chi_Minh`, VND và source facts versioned.
8. Không gửi payload tối thiểu vượt mục đích; không log hoặc giữ raw PII/financial detail ngoài retention đã phê duyệt.
9. At-least-once job/retry/replay phải idempotent; một nguồn chỉ tạo một kết quả cho mỗi key/version, trừ khi regenerate có version mới rõ ràng.
10. Provider/model/prompt failure chuyển sang fallback xác định hoặc manual, không chặn đường tiền và không hiển thị output chưa validate.
11. Admin chỉ có quyền vận hành được cấp; mọi đọc detail/mutation config đều audit, không có quyền chỉnh ledger.
12. User report và audit là record append-only; quarantine/hide artifact không được làm biến mất provenance cần thiết.

## 10. Tiêu chí chấp nhận handoff/triển khai

### JEV

- [ ] `AI-JEV.md` mô tả rõ bốn capability trích xuất, phân loại, gợi ý và tóm tắt; mỗi capability có input/output, owner dữ liệu và fallback.
- [ ] Có sequence sync cho single classification và async cho batch/monthly summary, gồm trạng thái job, outbox, idempotency, retry bounded, DLQ và replay.
- [ ] Với provider down, timeout, malformed JSON, category/fact không hợp lệ hoặc safety violation, transaction/report deterministic vẫn chạy và UI nhận trạng thái fallback/manual.
- [ ] Không có code path/provider contract nào có thể ghi trực tiếp balance, wallet, savings, budget, authorization hoặc immutable transaction.
- [ ] Mọi suggestion có confidence/abstain, allow-list category, nhãn advisory, manual override và provenance; override không bị retry ghi đè.
- [ ] Summary chỉ dùng source snapshot/fact xác định; numeric claim thiếu/mâu thuẫn fact bị loại; regenerate tạo version mới.
- [ ] Payload test chứng minh không gửi identity/token/raw full history không cần thiết; logs/metrics được mask; retention và deletion propagation được mô tả.
- [ ] Prompt injection, PII leakage, prohibited financial-domain text và provider/model failure đều có reject/quarantine/fallback; không chạy repair LLM ẩn.
- [ ] Evaluation có golden set tiếng Việt, calibration/accuracy, extraction quality, factuality, safety/privacy và human review; monitoring có latency/error/fallback/override/report/drift và rollback.

### Report/admin

- [ ] User report có target artifact, loại issue, mô tả đã giới hạn/redact, ticket id, state machine và public status; internal notes không lộ.
- [ ] Support/admin có thể triage, assign, note, duplicate, resolve/reopen/quarantine theo permission; mọi transition có audit/reason.
- [ ] Admin view mặc định mask user identity và financial detail; elevated access có scope/thời hạn/lý do; admin không có endpoint sửa/xóa ledger, wallet, budget, savings hay transaction history.
- [ ] Content/settings có version, review, publish/rollback, kill switch và audit; setting không tự động hồi tố artifact hoặc làm thay đổi tiền.
- [ ] Dashboard admin chỉ đưa aggregate usage/JEV quality; không có raw financial export và không dùng report analytics làm nguồn tiền authoritative.
- [ ] Report user có tháng/category payment, sáu tháng income-vs-payment, ngày/tuần, filter, VND, timezone và export; AI tắt/lỗi vẫn có report xác định.
- [ ] UI/content tiếng Việt và nhãn AI advisory xuất hiện trong suggestion, summary, tip, report issue và fallback.

## 11. Out-of-scope

- Kết nối ngân hàng, đọc số dư ngân hàng, xử lý thanh toán tiền thật, cổng thanh toán, lending, BNPL, lãi suất hoặc tư vấn đầu tư/tài chính được chứng nhận.
- Cho JEV tự tạo/commit/sửa/xóa transaction, tự chuyển tiền, tự chỉnh wallet/savings/budget, tự cấp quyền hoặc tự disable tài khoản.
- Dùng JEV làm máy tính số dư, máy tính budget, validator payment hoặc nguồn số liệu report.
- Chatbot tự do có quyền gọi tool/DB/network; agent tự trị hoặc hidden repair loop không có contract.
- Huấn luyện model bằng raw history của user, bán/chia sẻ dữ liệu, hoặc gửi dữ liệu provider khi chưa có policy/consent/hợp đồng phù hợp.
- Xây full SOC/SIEM, helpdesk enterprise hoặc workflow pháp lý; handoff chỉ thiết kế admin/report/issue nhẹ cần cho Campus Coin.
- Tự quyết định retention ngày cụ thể, provider/model cụ thể, SLA support hoặc ngưỡng quality khi chưa có owner phê duyệt.

## 12. Rủi ro và câu hỏi mở

1. **JEV chưa được định danh provider/API**: cần chốt provider nội bộ/ngoài, data residency, no-training, DPA, timeout, rate limit, cost và khả năng xóa payload trước khi bật production.
2. **Retention/privacy chưa có số ngày**: product/privacy owner phải chốt retention cho raw request, artifact, issue, audit, queue/DLQ và account deletion; mặc định bảo thủ là không giữ raw lâu hơn cần thiết.
3. **Confidence model có thể không calibration**: cần chọn golden set, ngưỡng theo capability và owner review; không cho auto-apply chỉ vì model trả `0.99`.
4. **OCR/ảnh có thật sự nằm trong release không**: nếu không, giữ dưới feature flag/out-of-scope; nếu có, cần consent, storage redaction, malware scanning và policy provider riêng.
5. **SRS dùng ngôn ngữ “sửa/xóa giao dịch nhưng giữ lịch sử”**: CC-001/canonical domain phải chốt event/adjustment semantics; CC-004 chỉ yêu cầu JEV/admin không mutate và mọi correction giữ append-only provenance.
6. **Admin role có thể bị gộp trong MVP**: cần map quyền vào authentication model, đặc biệt break-glass, read raw detail, AI kill switch, content publish và audit read.
7. **User report SLA và escalation**: cần chốt severity matrix, owner, thời gian phản hồi và khi nào privacy/safety issue tự quarantine artifact.
8. **Fact verification cho summary**: cần chốt thư viện/parser/schema validation, cách nhận diện numeric claim tiếng Việt và quyết định fallback khi câu mô tả không có số nhưng vẫn unsupported.
9. **Mức chi tiết VND trong payload**: cần chốt khi nào aggregate amount được gửi provider; ưu tiên ratios/buckets và chỉ gửi VND fact đã cần cho câu trả lời người dùng.
10. **Feedback/learning từ override**: cần chốt consent, retention, per-user preference vs global model improvement và cơ chế chống dữ liệu độc hại/prompt injection từ feedback.
11. **Stale insight**: cần chốt trigger regenerate khi adjustment/late import/budget change và cách hiển thị nhiều phiên mà không gây nhầm số liệu hiện tại.
12. **Acceptance quality thresholds**: product/ops cần đặt ngưỡng cụ thể cho classification accuracy, factuality, latency, fallback rate và report severity trước canary.

## 13. Điểm cần tích hợp vào tài liệu chuẩn

| Tài liệu chuẩn | Nội dung CC-004 cần chuyển vào |
| --- | --- |
| `AI-JEV.md` | Boundary authoritative/advisory; capability; payload/output schema; sync/async sequence; snapshot/facts; confidence/override; fallback; retry/idempotency/DLQ; privacy/retention; prompt/model failure; evaluation/monitoring; user-facing labels. |
| `ADMIN-OPERATIONS.md` | Role/permission matrix; report issue state machine; triage/escalation; content/settings versioning; quarantine/rollback; masking/elevated access; audit; aggregate metrics; cấm mutate immutable history. |
| `DOMAIN-MODEL.md` | Provenance/status của AI artifact, source snapshot/fact, user report/audit/content version; liên kết với append-only ledger nhưng không biến artifact thành transaction. |
| `ARCHITECTURE.md` | JEV orchestrator/provider adapter, outbox/queue/worker, validation, circuit breaker, fallback, redaction, service auth, retention boundary và observability. |
| `AUTHENTICATION.md` | Mapping role/permission, scoped service token, admin session, break-glass/elevated raw-detail access, audit actor và account disable/reset boundary. |
| `PRD.md` | AI tùy chọn/advisory, report user, export, admin nhẹ, UI tiếng Việt, nhãn không phải tư vấn tài chính và các out-of-scope tài chính. |
| `ROADMAP.md` | Phases: deterministic report/fallback trước; JEV classification sync; async batch/summary; admin triage/content; evaluation/canary; privacy/provider decisions và các câu hỏi mở. |

**Kết luận handoff:** đủ cơ sở để viết `AI-JEV.md` và `ADMIN-OPERATIONS.md` mà không trao quyền authoritative cho JEV hoặc admin. Mọi điểm chưa chốt đều là provider/privacy/ops policy và không được tự biến thành phạm vi mới trong quá trình tích hợp.
