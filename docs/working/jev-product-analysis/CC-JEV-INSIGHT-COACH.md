# Handoff lane 3 — JEV Insight/Coach

> **Trạng thái:** working evidence, không phải quyết định canonical/runtime.
>
> **Phạm vi:** monthly summary, giải thích tăng/giảm chi tiêu, mẹo tiết kiệm cá nhân hóa, budget coaching, dashboard widgets, cảnh báo và next-best action không có authority, cùng forecasting nếu còn phù hợp.
>
> **Không thuộc phạm vi:** provider/model/OpenRouter/cost; sửa SRS, ADR, architecture, domain, auth, OpenAPI hoặc source runtime. File này chỉ là handoff để integrator đọc và tổng hợp.

## 1. Kết luận điều hành

### 1.1 Phát hiện chính

- **[Verified fact]** SRS mô tả nhu cầu sinh viên có thu nhập không đều, ghi dữ liệu thủ công, xem chi tiêu theo danh mục, nhận mẹo tiết kiệm và tóm tắt tháng bằng ngôn ngữ đơn giản. SRS cũng nêu dashboard có điểm nhấn/widget, báo cáo tháng, insight AI, mẹo cá nhân hóa, cảnh báo budget và dự báo tùy chọn (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1, L25-L35; §1.6, L101-L165).
- **[Verified fact]** Canonical product hiện khóa MVP vào backend deterministic cho dashboard/report và JEV tùy chọn chỉ gợi ý category trước submit; monthly prose summary, prediction và reasoning về amount/date/balance nằm trong phần để sau. (`docs/PRD.md` §3.3, L33-L37; §3.5, L45-L51; `docs/AI-JEV.md` §8, L91-L93.)
- **[Verified fact]** Wallet, savings, budget và report là miền authoritative. Budget overrun chỉ là warning, không phải authorization; JEV không được tính tiền, authorize payment, hoặc ghi/sửa/xóa money state. (`docs/DOMAIN-MODEL.md` §1, L3-L14; §3, L38-L52; §4, L54-L67.)
- **[Proposal]** Giá trị an toàn nhất ngoài auto-category là **deterministic facts trước, coaching sau**: backend tính số liệu và trạng thái; UI hiển thị bảng/widget/cảnh báo ngay; JEV (chỉ sau một contract riêng được duyệt) diễn đạt các facts đó thành câu đơn giản, có bằng chứng, để user tự quyết định.
- **[Proposal]** Ship trước các widget và cảnh báo không cần JEV. Đưa monthly narrative, change explanation, saving tips, coaching và next-best action vào phase sau khi có fact snapshot, provenance, stale policy, persistence và user-feedback contract. Không mở rộng endpoint category-suggestion hiện tại để làm summary.
- **[Unresolved]** Chưa có canonical API/schema cho insight, comparison giữa tháng, tip, alert event, feedback/dismiss/save/pin, fact snapshot/version hoặc stale marker. Ví dụ thực thể `Insight` trong SRS chỉ là minh họa và không phải schema đã chốt (`SRS..._vi.md` §1.8, L282-L295).

### 1.2 Nguyên tắc product cho sinh viên

1. **Không bắt user hiểu tài chính chuyên môn:** câu ngắn, nêu một điều đang xảy ra và một việc tùy chọn có thể thử.
2. **Không nói quá dữ liệu:** “Chi tiêu danh mục X cao hơn tháng trước” được phép khi backend có đủ facts; “vì bạn căng thẳng/thiếu kỷ luật” hoặc “chắc chắn sẽ tiết kiệm” không được phép.
3. **Không biến gợi ý thành áp lực:** mọi tip/CTA có dismiss; save/pin/feedback là tùy chọn; không dùng ngôn ngữ đổ lỗi hay gây sợ hãi.
4. **Không nhầm tracking với ngân hàng:** số liệu chỉ phản ánh các income/payment user đã nhập vào Campus Coin; không suy ra toàn bộ tình hình tài chính ngoài app. SRS và PRD đều xác nhận app không phải ngân hàng và không xử lý tiền thật (`docs/PRD.md` §1, L3-L7; `docs/DOMAIN-MODEL.md` §1, L3-L5).
5. **Một nguồn sự thật:** amount, balance, budget used, period và category totals lấy từ backend; narrative không tạo hoặc sửa số.

## 2. Phân ranh giới deterministic và narrative/advisory

### 2.1 Facts authoritative (backend/domain)

- **Wallet/savings:** backend giữ projection và công thức authoritative; browser chỉ hiển thị response (`docs/DOMAIN-MODEL.md` §3, L38-L52; `docs/ARCHITECTURE.md` §2, L21-L27).
- **Budget:** `usedVnd`, `limitVnd`, `isOverrun`, tháng và category phải do budget/report service tính. Budget overrun không được chặn payment (`docs/contracts/openapi.yaml` §Budget, L559-L584; `docs/DOMAIN-MODEL.md` §4, L54-L67).
- **Monthly report:** `openingWalletBalanceVnd`, `totalIncomeVnd`, `totalPaymentVnd`, `closingWalletBalanceVnd`, `categoryBreakdown` là các field report hiện có; endpoint là deterministic theo tháng HCMC (`docs/contracts/openapi.yaml` `/reports/monthly`, L238-L254; schema L585-L601).
- **Dashboard:** response hiện có wallet, savings, currentMonth và recentTransactions; UI không tự trở thành nguồn tính toán thứ hai (`docs/contracts/openapi.yaml` `/reports/dashboard`, L255-L260; `docs/ARCHITECTURE.md` §2, L21-L25).
- **Category/budget validity:** category phải active và đúng `appliesTo`; history của category disabled/retired vẫn đọc được (`docs/contracts/openapi.yaml` L533-L544; `docs/DOMAIN-MODEL.md` §2, L34-L36).

### 2.2 JEV/narrative advisory (chỉ proposal cho phase sau)

- **[Verified fact]** JEV hiện chỉ có request/response cho category suggestion: `transactionType`, `description`, `locale` → `suggested|manual|disabled|unavailable`; không có public insight contract (`docs/contracts/openapi.yaml` `/ai/category-suggestion`, L338-L348; schema L662-L677).
- **[Verified fact]** JEV không được tính wallet, savings, budget, amount/date, authorize payment, đọc raw ledger/balance/session/claims/secret hoặc tạo autonomous action (`docs/AI-JEV.md` §3, L21-L31; `AGENTS.md` L133-L141).
- **[Proposal]** Nếu sau này cần JEV cho narrative, tạo capability/contract riêng: JEV nhận một fact bundle đã allowlist và redact, không nhận raw ledger; backend đã tính sẵn mọi con số; response chỉ là bounded narrative + evidence references. Đây là dependency, không phải đề xuất sửa contract trong handoff này.
- **[Proposal]** UI không hiển thị model/provider/cost hoặc numeric confidence. Hiển thị nguồn dữ liệu, kỳ HCMC, thời điểm snapshot và câu “gợi ý — hãy kiểm tra trước khi làm” theo ngôn ngữ `en`/`vi`.
- **[Unresolved]** Chưa có quyết định về ngưỡng “đủ dữ liệu”, baseline so sánh, định nghĩa significant change, ngữ nghĩa feedback, retention snapshot hoặc API lifecycle. Không được suy ra từ ví dụ `Insight` trong SRS.

### 2.3 Presentation contract dùng chung (proposal)

Mỗi insight/coach card cần một provenance envelope, không nhất thiết là API shape đã chốt:

- `source`: endpoint/read model authoritative và loại facts (report, budget summary, dashboard), không phải raw prompt/provider detail.
- `period`: tháng/khoảng ngày và timezone `Asia/Ho_Chi_Minh`.
- `factSnapshotAt`/`sourceVersion`: thời điểm hoặc version của deterministic data; nếu chưa có thì card không được giả vờ “current”.
- `generatedAt`: thời điểm narrative được tạo (nếu có narrative).
- `evidenceRefs`: category/month/budget IDs hoặc các fact labels đủ để user mở “Vì sao tôi thấy điều này?”.
- `status`: `current|stale|insufficient_data|unavailable` (đề xuất; chưa phải canonical enum).
- `userState`: `unseen|dismissed|saved|pinned|feedback_submitted` (đề xuất; không phải money state).

**Stale policy [Proposal]:** transaction commit, correction/reversal, category disable/rename, budget change, locale change hoặc report rebuild có thể làm snapshot cũ. Khi source facts đổi, gắn `stale`, không âm thầm trình bày narrative cũ là hiện tại; có nút refresh/regenerate nếu dependency cho phép. Immutable ledger/correction semantics là verified (`docs/DOMAIN-MODEL.md` §5, L69-L85), nhưng shared insight version/staleness hiện **[Unresolved]**.

**Offline policy [Unresolved/Proposal]:** canonical docs chưa cam kết offline mode. Nếu sau này có cache, chỉ hiển thị snapshot cuối cùng với nhãn “cập nhật lúc…/stale”; không tạo narrative mới, không cho action ghi tiền khi offline; khi online phải revalidate. Không coi cached insight là authoritative.

## 3. Insertion points theo user journey (ngoài auto-category)

| Điểm trong journey | User value | Automation angle | Placement | Đề xuất phase | Evidence / boundary |
|---|---|---|---|---|---|
| Mở dashboard sau đăng nhập | Nhìn nhanh tháng này đang ở đâu và nên xem gì trước | Chọn widget/CTA từ authoritative dashboard facts | Read-time; async chỉ để tải narrative, không chặn dashboard | MVP deterministic widgets; narrative phase sau | Dashboard response hiện có wallet/savings/currentMonth/recentTransactions (`docs/contracts/openapi.yaml` L255-L260, L602-L610). |
| Vừa commit income/payment | Biết thay đổi vừa nhập có ảnh hưởng gì | Recompute budget/report projection và phát hiện alert sau commit | Async post-commit; tuyệt đối không giữ money transaction chờ JEV | MVP deterministic alert; coach phase sau | Money flow tính budget warning sau commit và không gọi JEV trong transaction (`docs/DOMAIN-MODEL.md` §5, L75-L81; `docs/ARCHITECTURE.md` §4, L35-L41). |
| Mở budget tháng/category | Hiểu đã dùng bao nhiêu và cần review gì | Template coaching từ `used/limit/isOverrun`; JEV chỉ diễn đạt ở phase sau | Read-time; refresh sau budget/payment commit | MVP status/bar; phase sau coaching | Budget là warning-only (`docs/PRD.md` §3.3, L33-L37; `docs/contracts/openapi.yaml` L559-L584). |
| Mở monthly report | Hiểu pattern thay vì chỉ đọc biểu đồ | So sánh facts và tạo narrative có evidence | Read-time facts; async post-commit/month close narrative | Phase sau; report deterministic ship trước | SRS yêu cầu monthly category/report và AI summary; canonical defer monthly prose (`SRS..._vi.md` §1.6, L120-L133; `docs/AI-JEV.md` §8, L91-L93). |
| Quay lại report tháng cũ | Xem lại insight đã lưu và biết nó có còn đúng không | Persist snapshot + stale check | Read-time; không regenerate âm thầm | Phase sau | SRS nêu lưu lịch sử insight, nhưng schema/persistence chưa canonical (`SRS..._vi.md` §1.6, L128-L133; §1.8, L282-L295). |
| User dismiss/save/pin/feedback | Giữ quyền chọn nội dung hữu ích, giảm noise | Lưu interaction signal tách khỏi money state | Async mutation sau thao tác UI, idempotent | Phase sau | SRS nêu bỏ qua/ghim mẹo (`SRS..._vi.md` §1.6, L135-L150); API hiện chưa có route cho insight interaction **[Unresolved]**. |
| Offline hoặc dependency unavailable | Không mất bối cảnh, không bị chặn ghi chép | Chỉ đọc cached authoritative snapshot có stale label | Offline read-only nếu tương lai được duyệt | Defer; manual/core path luôn sống | JEV lỗi không được chặn money path (`docs/AI-JEV.md` §5, L64-L72; `docs/ARCHITECTURE.md` §6, L49-L56). |

## 4. Xếp hạng use case

Thang điểm **1–5**: Value 5 = lợi ích trực tiếp cao; Automation 5 = tự động hóa an toàn cao; Fit 5 = khớp Campus Coin hiện tại; Risk 5 = rủi ro gây hiểu sai/authority cao; Dependency 5 = phụ thuộc nhiều quyết định/contract chưa có. Điểm là **[Proposal]**, không phải đo lường hiện tại.

| Rank | ID / use case | Value | Automation | Fit | Risk | Dependency | Disposition |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | `UC-IC-05` Dashboard widgets deterministic | 5 | 2 | 5 | 2 | 2 | **Ship MVP không cần JEV**; JEV copy chỉ phase sau |
| 2 | `UC-IC-06` Budget alert deterministic | 5 | 2 | 5 | 2 | 3 | **Ship MVP không cần JEV**; không block payment |
| 3 | `UC-IC-04` Budget coaching | 5 | 3 | 5 | 3 | 3 | **MVP status/template**, narrative phase sau |
| 4 | `UC-IC-02` Giải thích tăng/giảm | 4 | 4 | 4 | 3 | 4 | Phase sau khi có comparison facts/snapshot |
| 5 | `UC-IC-01` Monthly summary | 4 | 4 | 4 | 4 | 4 | Deterministic report MVP; JEV narrative phase sau |
| 6 | `UC-IC-03` Personalized saving tips | 4 | 4 | 4 | 4 | 4 | Phase sau, rule/template trước JEV |
| 7 | `UC-IC-07` Next-best action | 3 | 3 | 4 | 4 | 4 | Phase sau, allowlist deterministic |
| 8 | `UC-IC-08` Forecasting | 3 | 3 | 2 | 5 | 5 | **Reject MVP / defer product decision**; không đưa vào JEV hiện tại |

**Lý do xếp hạng:** widget và alert dùng facts đã có, tăng trải nghiệm mà không cần trao narrative engine quyền tính tiền. Summary/tips/coach có giá trị nhưng dễ tạo causal/financial-advice overclaim nếu snapshot hoặc baseline thiếu. Forecasting dễ bị hiểu là dự đoán số dư/khả năng chi trả, trong khi SRS chỉ ghi tùy chọn và canonical đã scope-cut prediction.

## 5. Use-case cards

### UC-IC-01 — Monthly summary thân thiện

**Disposition:** deterministic report **ship MVP**; JEV prose **phase sau/defer hiện tại**.

- **Trigger:** User mở `/reports/monthly?month=YYYY-MM`, hoặc đọc dashboard rồi chọn “Xem tóm tắt tháng”. Async regeneration chỉ sau khi source report đã commit/reconcile hoặc khi tháng đã có snapshot mới.
- **Input:** Backend report authoritative gồm tháng, `openingWalletBalanceVnd`, `totalIncomeVnd`, `totalPaymentVnd`, `closingWalletBalanceVnd`, `categoryBreakdown`; period HCMC. Narrative phase sau chỉ nhận allowlisted aggregate facts + data sufficiency, không nhận raw ledger. Field report hiện có được mô tả tại `docs/contracts/openapi.yaml` L585-L601.
- **Processing:** (1) backend kiểm tra owner, period, correction/reversal và completeness; (2) backend tính mọi arithmetic/ordering; (3) UI render numbers/table/chart từ backend; (4) nếu có capability narrative riêng, JEV chỉ diễn đạt các facts đã tính và liên kết evidence, không tự suy ra nguyên nhân hay mục tiêu tiết kiệm. Current JEV category adapter không được dùng cho bước này (`docs/AI-JEV.md` §3, L21-L31; §8, L91-L93).
- **Output:** Một hoặc vài câu ngắn như “Tháng này payment tập trung ở …” kèm facts authoritative, kỳ dữ liệu, link “Xem chi tiết”. Không dùng “bạn đã chi đúng/sai”, không gọi là financial advice.
- **Placement:** Read-time deterministic facts; narrative nếu được duyệt là async post-commit/month-close. Không chạy trong money transaction; khi narrative lỗi, report vẫn render. Offline chỉ đọc cached snapshot có stale label nếu offline capability được duyệt.
- **User control:** User mở rộng evidence, xem table, dismiss, save hoặc pin summary; feedback hữu ích/không hữu ích là tùy chọn. Không có nút “apply” thay đổi tiền; action link chỉ mở report/budget để user tự quyết định.
- **Persistence / provenance / stale:** Report facts giữ theo report contract; narrative snapshot, `generatedAt`, `factSnapshotAt`, evidence refs và interaction state cần persistence riêng **[Dependency/Unresolved]**. Sau payment/correction/reversal hoặc report rebuild, đánh dấu stale và cho refresh; không overwrite snapshot đã lưu mà không báo.
- **Fallback:** Hiển thị report deterministic, chart/table và copy “Chưa thể tạo tóm tắt; bạn vẫn xem được số liệu”. Nếu thiếu data/baseline thì không tạo narrative; không điền zero hay đoán.
- **Success metric [Proposal]:** ≥90% người dùng test có thể trả lời đúng “tháng này chi tiêu category nào nổi bật?”; tỷ lệ mở evidence; tỷ lệ dismiss vì không liên quan; zero summary chứa số không khớp report. Baseline và ngưỡng phải đo sau khi có UI **[Unresolved]**.
- **Cấm đoán:** Không để JEV tính/hiệu chỉnh total, closing balance, savings, budget; không suy đoán ngoài transaction đã nhập; không tự tạo budget/payment/savings; không hứa tiết kiệm; không lộ raw ledger/PII/prompt; không lưu narrative stale như current.

### UC-IC-02 — Giải thích spending increase/decrease

**Disposition:** Phase sau; có thể ship deterministic comparison card trước narrative.

- **Trigger:** User chọn một tháng trong report/dashboard hoặc mở alert “thay đổi đáng chú ý”. Chỉ hiển thị khi có baseline đủ dữ liệu (tháng trước hoặc rolling baseline đã được product chốt).
- **Input:** Current category totals và baseline category totals do backend tính; khoảng thời gian HCMC; sample/data completeness; budget status nếu cần. OpenAPI hiện có report một tháng và dashboard, chưa có comparison read model **[Unresolved]** (`docs/contracts/openapi.yaml` L238-L260, L585-L601).
- **Processing:** Backend quyết định baseline, threshold significant-change, direction tăng/giảm và numbers. Narrative chỉ diễn đạt “tăng/giảm so với …” với evidence; không nói nguyên nhân tâm lý, không gán causal factor nếu dữ liệu không chứng minh. Nếu correction làm thay đổi tháng cũ, recompute và stale snapshot.
- **Output:** Change card có category, direction, current/baseline facts, period và “Vì sao thấy điều này?”; optional next link tới transaction/report. Nếu chênh lệch không đủ lớn hoặc dữ liệu thiếu, hiển thị “chưa đủ dữ liệu để kết luận”.
- **Placement:** Read-time từ comparison facts; narrative async post-commit nếu được bật. Không chặn thêm transaction; offline chỉ hiển thị comparison snapshot stale hoặc ẩn card nếu không có snapshot.
- **User control:** Expand evidence, chọn xem tháng đối chiếu, dismiss, save/pin, feedback; user có thể sửa transaction qua normal correction flow nhưng card không tự sửa. Dismiss card không xóa dữ liệu hay làm mất alert authoritative.
- **Persistence / provenance / stale:** Lưu fact snapshot + baseline definition + evidence refs nếu product chấp thuận; lưu interaction riêng. Ghi rõ `comparedMonth`/rolling period và generated/source times. New transaction, reversal, correction, category lifecycle hoặc baseline policy change → stale.
- **Fallback:** Bảng category breakdown hiện tại và link report; không narrative nếu comparison API/quality gate unavailable. Không dùng “tháng trước” khi timezone/period chưa rõ.
- **Success metric [Proposal]:** User mở evidence hoặc report detail sau card; giảm feedback “không hiểu vì sao”; zero unsupported causal explanations; tỷ lệ user xác nhận số card khớp report. Ngưỡng cần baseline **[Unresolved]**.
- **Cấm đoán:** Không tự tính arithmetic trong JEV/browser; không khẳng định “do ăn ngoài/tiệc tùng” nếu description không đủ; không tạo budget cap/payment; không coi increase là lỗi của user; không dùng một transaction bất thường làm xu hướng chắc chắn.

### UC-IC-03 — Personalized saving tips thực dụng

**Disposition:** Phase sau; MVP nên dùng rule/template deterministic trước khi có JEV wording.

- **Trigger:** Dashboard/report load khi có đủ lịch sử và/hoặc budget; hoặc sau post-commit khi một pattern đủ điều kiện. Không tạo tip cho user mới chưa có data.
- **Input:** Backend aggregates theo category, trend/comparison facts, budget used/limit/status, data completeness và user-set preferences nếu có. SRS có nhắc mục tiêu tiết kiệm, nhưng canonical savings hiện là aggregate transfer và chưa có `targetAmountVnd`/goal API **[Unresolved]** (`SRS..._vi.md` §1.6, L135-L140; `docs/contracts/openapi.yaml` L501-L526; `docs/contracts/API-REVIEW.md` §Domain scope, L39-L42).
- **Processing:** Candidate generator deterministic chọn một tip có evidence và low-pressure action; nếu cần exact amount/limit, backend tính từ budget rules, không để JEV tính. JEV future chỉ viết lại câu trong candidate/evidence envelope. Xếp hạng theo product value/relevance, không theo “tiền chắc chắn tiết kiệm”.
- **Output:** Một tip ngắn phù hợp sinh viên, ví dụ review delivery/subscription hoặc thử đặt weekly review; rationale chỉ trỏ tới category/trend/budget. CTA mở report/budget/transaction review, không auto-apply. Có nhãn “gợi ý tham khảo, không phải tư vấn tài chính”.
- **Placement:** Read-time trên dashboard/report; async post-commit để cập nhật candidate sau dữ liệu mới; không gọi trong money transaction. Offline giữ tip cũ với stale label hoặc ẩn nếu action cần server.
- **User control:** Dismiss, save, pin, feedback; “Xem budget/Review transactions” là explicit navigation. Nếu có “dùng gợi ý này”, chỉ prefill form để user review; không tự upsert budget, transfer savings hay tạo payment.
- **Persistence / provenance / stale:** Lưu tip snapshot, evidence refs, source period, generatedAt, dismiss/save/pin/feedback riêng nếu có capability; không ghi vào ledger/budget/savings. Tip stale khi source facts/budget đổi; giữ lịch sử đã save nhưng hiển thị trạng thái cũ.
- **Fallback:** Rule-based copy hoặc không hiển thị tip khi data insufficient/unavailable; luôn giữ dashboard/report. Không suy ra từ category chưa active, raw description nhạy cảm hoặc external benchmark.
- **Success metric [Proposal]:** Tỷ lệ tip được mở evidence và feedback hữu ích; completion của action review (không phải số tiền “saved” do app tự đoán); tỷ lệ dismiss thấp hơn baseline; zero accidental money mutation. Không dùng “giảm chi tiêu” đơn độc làm KPI vì có thể khuyến khích hành vi không an toàn.
- **Cấm đoán:** Không gọi là lời khuyên tài chính được chứng nhận; không cam kết số tiền tiết kiệm; không ép cắt khoản thiết yếu; không bán sản phẩm/loan/BNPL; không tự chuyển savings, sửa budget, thanh toán hoặc ghi ledger; không học từ feedback bằng cách mutate canonical history.

### UC-IC-04 — Budget coaching

**Disposition:** Budget status/progress **ship MVP deterministic**; coaching narrative phase sau.

- **Trigger:** User mở budget tháng/category; sau payment commit; hoặc khi `isOverrun=true`/approaching threshold theo policy đã được duyệt. Threshold “sắp chạm” hiện chưa có field/semantics canonical **[Unresolved]**.
- **Input:** `/budgets`, `/budgets/summary` với month, category, `limitVnd`, `usedVnd`, `isOverrun`; optional elapsed-period fact do backend xác định HCMC. OpenAPI schema hiện chỉ mô tả exact used/limit/isOverrun (`docs/contracts/openapi.yaml` L215-L245, L559-L584).
- **Processing:** Backend tính progress/status/threshold và kiểm tra period; template/JEV chỉ giải thích trạng thái. Overrun là cảnh báo chứ không phải authorization; payment wallet-sufficient vẫn được xử lý (`docs/DOMAIN-MODEL.md` §4, L54-L67; `docs/contracts/API-REVIEW.md` §Response, L32-L37).
- **Output:** Progress bar + text/table equivalent; card có “đã dùng/giới hạn”, tháng, category và CTA review transactions hoặc mở form budget. Coaching câu ngắn như “Bạn có thể xem lại các khoản trong category này” thay vì “Bạn phải ngừng chi”.
- **Placement:** Read-time budget/dashboard; status recompute async post-commit sau ledger/budget commit. Không giữ transaction chờ narrative; offline chỉ hiển thị status snapshot stale, không cho submit budget change offline.
- **User control:** Dismiss/snooze coaching, save/pin/feedback; mở form để user tự chỉnh budget và confirm qua normal API. Dismiss không tắt authoritative warning vĩnh viễn nếu product chưa định nghĩa preference.
- **Persistence / provenance / stale:** Budget data giữ theo budget contract; coaching/interaction state cần riêng **[Dependency/Unresolved]**. Provenance gồm month/category/source budget summary; budget upsert hoặc payment/correction → invalidate. Không giữ progress cũ mà không gắn month.
- **Fallback:** Render exact `used/limit/isOverrun`, table/text equivalent và link manual. Nếu threshold chưa được chốt, chỉ dùng overrun đã authoritative; không tự chọn ngưỡng từ JEV.
- **Success metric [Proposal]:** Người dùng hiểu đúng trạng thái budget; tăng lượt mở category transactions trước khi thay đổi budget; zero payment rejection do coaching; zero budget mutation không có explicit user submit.
- **Cấm đoán:** Không chặn/reject payment vì overrun; không tự sửa limit/category/month; không tính budget trong JEV; không nói “không đủ tiền” chỉ vì budget overrun; không dùng progress bar màu duy nhất; không gửi cảnh báo lặp vô hạn.

### UC-IC-05 — Dashboard insight widgets

**Disposition:** **Ship MVP deterministic, không cần JEV.** JEV chỉ có thể thêm copy sau.

- **Trigger:** Dashboard read sau session/onboarding và mỗi lần refresh. SRS yêu cầu top category và budget-vs-actual widget (`SRS..._vi.md` §1.6, L101-L106).
- **Input:** `/reports/dashboard` authoritative wallet, savings, currentMonth, recentTransactions; budget summary nếu widget cần; category labels current locale. Current contract có dashboard/currentMonth/categoryBreakdown (`docs/contracts/openapi.yaml` L255-L260, L602-L610).
- **Processing:** Backend/report service cung cấp facts/order; UI trình bày card/list/chart + table/text equivalent. Không để browser/JEV tự tính closing balance, budget used hay top category từ raw rows. Narrative copy nếu phase sau chỉ paraphrase selected facts.
- **Output:** `Top category this month`, `Budget vs actual`, `Current month income/payment` và link xem report/budget. Số authoritative render nguyên dạng VND/HCMC; trạng thái loading/empty/error rõ ràng.
- **Placement:** Read-time, song song với dashboard fetch; narrative nếu có là async và không block first content. Offline không có canonical promise; cached widgets phải gắn stale timestamp.
- **User control:** Collapse/hide/pin widget là **[Proposal]**; click-through mở report/budget; dismiss insight không xóa widget authoritative. Feedback chỉ áp dụng nếu widget có narrative, không dùng để thay đổi facts.
- **Persistence / provenance / stale:** Facts không cần duplicate insight persistence; preferences/hide/pin và snapshot timestamp là dependency nếu muốn. Source là dashboard/report response + period. Payment/correction/budget update invalidates displayed snapshot; refresh phải revalidate.
- **Fallback:** Hiển thị bảng/text equivalent hoặc các facts sẵn có; nếu widget data thiếu thì empty state có hướng dẫn, không render 0 giả. JEV unavailable không làm dashboard fail.
- **Success metric [Proposal]:** Thời gian tới first useful click; tỷ lệ user tìm thấy report/budget; accessibility/table parity pass; zero discrepancy với `/reports/dashboard`/report.
- **Cấm đoán:** Không để widget thay authoritative wallet/report; không auto-navigate vào payment; không dùng màu duy nhất; không gọi top category là “category cần cắt”; không hide error bằng zero; không để narrative stale ghi đè current facts.

### UC-IC-06 — Budget threshold/overrun alerts trong app

**Disposition:** **Ship MVP deterministic** với policy được chốt; JEV phrasing là optional phase sau.

- **Trigger:** Sau khi income/payment/correction làm thay đổi budget projection, hoặc khi user mở dashboard/budget và backend thấy threshold/overrun. Alert phải dedupe theo user/category/month/status.
- **Input:** Authoritative `usedVnd`, `limitVnd`, `isOverrun`, category, month và source timestamp; threshold “sắp chạm” cần product decision. SRS yêu cầu in-app notification khi sắp chạm/vượt budget (`SRS..._vi.md` §1.6, L141-L145); current API chỉ có summary/budget fields (`docs/contracts/openapi.yaml` L215-L245, L559-L584).
- **Processing:** Backend tính status và dedup; ghi/read alert event nếu persistence được duyệt; UI hiển thị exact facts. JEV không quyết định có alert hay mức độ; nếu dùng narrative, chỉ làm câu lịch sự từ status đã tính.
- **Output:** In-app alert có category/month/status, số used/limit, source time và CTA “Xem giao dịch”/“Mở budget”. Không có “payment bị khóa”, không có email/push mặc định (ngoài scope hiện tại).
- **Placement:** Async post-commit sau transaction/report projection; read-time reconcile khi mở dashboard; không gọi JEV hoặc gửi notification trong money transaction. Offline không tạo alert mới; đồng bộ sau reconnect nếu offline capability được duyệt.
- **User control:** Dismiss/read, snooze nếu policy có; feedback về hữu ích/ồn; CTA chỉ mở review. Dismiss không thay đổi budget/payment. User không cần xác nhận để đọc alert nhưng phải confirm riêng nếu chỉnh budget.
- **Persistence / provenance / stale:** Alert read/dismiss và dedup key cần event store riêng **[Dependency/Unresolved]**; provenance source budget summary + snapshot time. Payment/correction/budget update phải cập nhật trạng thái; alert cũ chuyển stale/resolved thay vì hiển thị current.
- **Fallback:** Budget bar/status vẫn hiển thị; nếu alert worker/read model unavailable, không giả “đã gửi”, chỉ show inline warning khi read-time facts có. Không chặn money path.
- **Success metric [Proposal]:** Tỷ lệ alert mở review trước/đúng lúc; duplicate rate thấp; dismiss/feedback “too noisy”; zero payment rejection hoặc mutation do alert; latency không được đánh đổi bằng transaction lock.
- **Cấm đoán:** Không authorize/reject payment; không tự update budget; không spam/retry vô hạn; không làm user hiểu app thấy toàn bộ bank spending; không tạo push/email nếu chưa có consent/contract; không biến JEV thành alert authority.

### UC-IC-07 — Next-best action (NBA) không authority

**Disposition:** Phase sau; deterministic allowlist trước, JEV chỉ diễn đạt.

- **Trigger:** Dashboard/report/budget view sau khi facts đã load; hoặc sau một alert/insight card. Chỉ chọn một CTA ưu tiên để tránh overload.
- **Input:** State facts authoritative (có budget chưa, budget status, report availability, recent activity), current route, locale và user-dismiss state; không dùng raw ledger prompt. Candidate actions allowlist, ví dụ `view_report`, `review_budget`, `review_transactions`, `record_income`, `choose_category_manually`.
- **Processing:** Policy deterministic xếp action theo missing setup/attention cần thiết; JEV không được tự phát minh action hoặc gọi money command. Explanation trỏ tới fact (“Bạn chưa đặt budget cho category này”) và phải tránh imperative financial advice.
- **Output:** Một card CTA với lý do, link tới màn hình tương ứng, trạng thái “tham khảo”. `record_income` chỉ mở form; `review_budget` chỉ mở form; không submit ngầm.
- **Placement:** Read-time sau load; async refresh khi dismiss/feedback hoặc source facts đổi; offline chỉ cho navigation read-only tới cached view, không ghi.
- **User control:** Click explicit, dismiss, save/pin, feedback; user có thể bỏ qua mà không bị lặp trong cùng snapshot; mọi money mutation vẫn cần form review/CSRF/idempotency normal path.
- **Persistence / provenance / stale:** Impression/click/completion/dismiss/feedback event và source snapshot cần analytics/persistence được duyệt; không ghi money state. New commit/budget change/locale/route change làm NBA stale hoặc recompute.
- **Fallback:** Không hiển thị NBA hoặc chỉ link “Xem báo cáo” nếu state thiếu; không chọn action ngẫu nhiên. Core navigation/form vẫn dùng được.
- **Success metric [Proposal]:** Completion của intended review action, giảm time-to-next-useful-screen, thấp tỷ lệ dismiss do irrelevance; zero unintentional submit/payment/savings transfer.
- **Cấm đoán:** Không tự tạo/sửa/xóa ledger, budget, savings; không tự gửi notification/transfer; không ép user theo “best” như quyết định đúng; không suy đoán mục tiêu/khả năng trả nợ; không dùng feedback để bypass server authorization.

### UC-IC-08 — Forecasting tháng tới

**Disposition:** **Reject trong MVP; defer product/safety decision.** Không dùng JEV hiện tại.

- **Trigger:** Chỉ khi user chủ động mở một planning surface trong tương lai; không đặt forecast vào dashboard mặc định khiến user tưởng là dự báo chắc chắn.
- **Input:** Historical monthly aggregates, data completeness, selected period và explicit user opt-in. SRS chỉ ghi forecasting là UX nâng cao tùy chọn (`SRS..._vi.md` §1.6, L161-L165); PRD scope-cut `prediction` và AI-JEV defer prediction/reasoning (`docs/PRD.md` §5, L65-L67; `docs/AI-JEV.md` §8, L91-L93).
- **Processing:** Nếu product duyệt sau này, phải có deterministic model/range, calibration, uncertainty and data-quality rules; JEV chỉ có thể diễn đạt kết quả đã tính, không tính amount/date/balance. Không forecast nếu history sparse, corrections pending hoặc category semantics đổi.
- **Output:** Chỉ có range/scenario được giải thích rõ là ước tính, không phải balance/payment authorization; nếu không đủ data, nói rõ không dự báo. Đây là proposal tương lai, không phải output MVP.
- **Placement:** Future opt-in read-time/async; không chạy trong money transaction. Offline không tạo forecast mới; cached forecast luôn stale/estimate.
- **User control:** Opt-in, dismiss/hide, save/pin, feedback; không có “apply forecast”. Mọi planning action đều mở form và yêu cầu user review; không auto-transfer hay auto-budget.
- **Persistence / provenance / stale:** Cần model/version, training/evaluation evidence, input snapshot, uncertainty, generatedAt và stale policy riêng **[Dependency/Unresolved]**. New transaction/correction/month close invalidates estimate.
- **Fallback:** Hiển thị lịch sử deterministic hoặc report hiện tại; không thay bằng số 0/ước lượng giả. Nếu model/data unavailable, ẩn forecast.
- **Success metric [Proposal]:** Calibration/coverage và user understanding of uncertainty, không phải “forecast giống đúng một con số”; zero user belief that forecast is guaranteed balance; product owner phải phê duyệt metric trước build.
- **Cấm đoán:** Không gọi forecast là số dư chắc chắn, lời hứa thu nhập/chi phí, financial advice hay khả năng thanh toán; không dựa vào forecast để reject/authorize payment; không tự đặt budget/transfer; không dùng JEV hiện tại để suy reasoning về amount/date/balance.

## 6. MVP/phase/defer plan

### 6.1 Ship MVP không mở rộng JEV

1. **Dashboard widgets deterministic:** render currentMonth/categoryBreakdown, budget status và table/text equivalent từ backend.
2. **Budget status + in-app alert deterministic:** exact used/limit/isOverrun; threshold rule phải được product chốt; alert không block payment.
3. **Report facts:** monthly report authoritative, empty/error/loading/accessibility states; không cần prose AI.
4. **Template coaching tối thiểu (nếu đủ facts):** copy tĩnh/allowlisted chỉ nhắc review, không claim financial advice.
5. **Manual fallback luôn sống:** JEV off/unavailable không thay đổi money path (`docs/PRD.md` §4, L53-L63; `docs/AI-JEV.md` §7, L80-L89).

### 6.2 Phase sau khi có capability contract riêng

- Monthly summary narrative và increase/decrease explanation.
- Saving tips có evidence, ranking, dismiss/save/pin/feedback.
- Budget coaching narrative và NBA allowlist.
- Persisted insight snapshot + provenance + stale/recompute semantics.
- Bilingual copy/a11y state matrix và user-understanding evaluation.

Các mục trên chỉ được triển khai sau khi có deterministic fact read model, source version/stale policy, owner-scoped persistence, error/fallback matrix và product approval. JEV category endpoint hiện tại không phải dependency đủ để ship chúng.

### 6.3 Reject/defer rõ ràng

- Forecasting/prediction: reject MVP; defer decision.
- Autonomous payment, savings transfer, budget mutation, notification action hoặc “apply all tips”: reject.
- JEV tính balance/budget/report, suy nguyên nhân không có evidence, hoặc biến narrative thành authorization: reject tuyệt đối.
- External financial benchmark/peer comparison: defer/reject vì app là user-entered tracker và chưa có consent/data contract.
- Push/email alerts, recurring automation, OCR/CSV narrative trong lane này: không mở rộng scope; CSV/category batch thuộc lane transaction automation nếu được integrator giao.

## 7. Dependency và unresolved decision log

> Đây là dependency cho implementer tương lai, **không phải thay đổi được thực hiện trong handoff**.

| ID | Dependency / câu hỏi cần chốt | Vì sao blocking |
|---|---|---|
| D-IC-01 | Backend comparison read model: baseline nào, period HCMC, significant-change threshold, data sufficiency | Không giải thích tăng/giảm mà không bịa baseline. |
| D-IC-02 | Fact snapshot/version và invalidation sau transaction, correction, reversal, budget/category change | Ngăn narrative stale hiển thị như current. |
| D-IC-03 | Insight/coach/alert persistence ownership, interaction schema (dismiss/save/pin/feedback), retention và owner scope | SRS yêu cầu lưu/lưu ghim nhưng canonical/API chưa có contract. |
| D-IC-04 | Approved insight contract riêng nếu dùng JEV; allowlisted facts, output schema, evidence refs, malformed/fallback semantics | Current JEV contract chỉ category suggestion và monthly prose đang deferred. |
| D-IC-05 | Budget near-threshold policy và dedup/snooze semantics | Current contract có `isOverrun`, chưa định nghĩa “sắp chạm”/alert lifecycle. |
| D-IC-06 | Savings-goal semantics nếu tips cần goal; canonical savings hiện không có target amount | Tránh bịa mục tiêu hoặc nhầm savings transfer với financial goal. |
| D-IC-07 | `en`/`vi`, accessibility, stale/empty/error copy và chart/table equivalent | SRS/AGENTS yêu cầu usability/accessibility/i18n; narrative states chưa có inventory. |
| D-IC-08 | Forecast product decision, calibration/evaluation and uncertainty UX | SRS chỉ nói optional; PRD/AI-JEV hiện scope-cut prediction. |
| D-IC-09 | Read-time/async worker or cache lifecycle, bounded retry and kill behavior | Không được giữ money transaction chờ narrative hoặc làm JEV lỗi chặn core. |

## 8. Safety acceptance checklist cho integrator

- [ ] Mỗi card phân biệt fact deterministic với narrative/advisory; không có JEV math.
- [ ] Amount/balance/budget/report chỉ render từ backend; JEV không là source of truth.
- [ ] Mọi narrative có provenance, period HCMC, generated/source timestamp và stale behavior.
- [ ] User có explicit review/override/dismiss; save/pin/feedback không mutate money state.
- [ ] Post-commit async/read-time placement; không gọi JEV trong transaction và không block payment/report.
- [ ] Unavailable/insufficient data fallback về report/table/budget bar/manual copy, không zero giả.
- [ ] Dashboard, report, budget và alert vẫn dùng được khi JEV off.
- [ ] Alert là warning-only; không reject/authorize payment vì budget status.
- [ ] Không hứa financial advice, guaranteed saving, forecast certainty hoặc bank completeness.
- [ ] Không suy causal explanation từ mô tả/raw ledger; không đưa PII/raw prompt vào narrative input/log.
- [ ] Insight history/persistence không được dựng từ ví dụ SRS thành schema canonical khi chưa có decision.
- [ ] Forecasting giữ defer/reject, không lẫn vào MVP.

## 9. Evidence index

- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1, L25-L35 — sinh viên, dữ liệu không đều, mẹo và summary AI.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.2, L37-L51 — dashboard/API/data-layer concept.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.4, L57-L63 — scope dashboard, reports, tips, AI summary.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71 — manual/user-entered data, no real banking/payment, AI advisory/override.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L101-L165 — widgets, reports, monthly AI insight, tips, budget alerts, forecasting.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.8, L282-L295 — illustrative `Insight` example, not canonical schema.
- `docs/PRD.md` §1, L3-L7 — student tracker, deterministic backend, no certified financial advice.
- `docs/PRD.md` §3.3, L33-L37 — category/budget/report deterministic.
- `docs/PRD.md` §3.5, L45-L51; §4, L53-L63 — JEV category-only, confirmation, fallback, JEV-off invariant.
- `docs/PRD.md` §5, L65-L67 — prediction/complex AI/autonomous action outside MVP.
- `docs/DOMAIN-MODEL.md` §1, L3-L14; §3, L38-L52; §4, L54-L67; §5, L69-L85 — authoritative formulas, warning-only budget, immutable/correction flow, JEV boundary.
- `docs/ARCHITECTURE.md` §2, L21-L27; §4-6, L35-L56 — browser/API/domain boundaries, no provider call in money transaction, JEV failure isolation.
- `docs/AI-JEV.md` §3, L21-L31; §5-8, L64-L93 — allowed category use case, privacy/bounds/fallback, deferred monthly prose/prediction.
- `docs/contracts/openapi.yaml` `/budgets`, `/budgets/summary`, `/reports/monthly`, `/reports/dashboard`, L215-L260 — current read surfaces.
- `docs/contracts/openapi.yaml` schemas L559-L610 — budget/report/dashboard authoritative fields.
- `docs/contracts/openapi.yaml` `/ai/category-suggestion`, L338-L348; schemas L662-L677 — current public JEV contract is category-only.
- `docs/contracts/API-REVIEW.md` §Response, L32-L37; §Domain scope, L39-L44 — warning/error/date semantics and missing savings target.
- `docs/ADMIN-OPERATIONS.md` §5-8, L38-L55 — feature flag/audit, JEV kill-first/manual fallback, aggregate ops metrics.
- `AGENTS.md` L31-L39, L87-L97, L133-L141 — layered boundary, accessible bilingual UI, JEV default-off/no authority/fallback.

**Kết luận handoff:** Đề xuất thực dụng là làm dashboard facts, budget status và alert deterministic trước; sau đó thêm insight/coach như lớp diễn giải có provenance và stale safety. JEV không được tính authoritative balance/budget/report, không được authorize payment, không được tự thay đổi money state và không được biến sự tiện lợi thành lời hứa financial advice.