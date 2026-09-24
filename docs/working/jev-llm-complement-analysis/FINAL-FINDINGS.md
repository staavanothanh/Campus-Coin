# FINAL-FINDINGS — Phân tích bổ trợ Generative LLM bên cạnh JEV cho Campus Coin

> **Trạng thái:** working report/handoff; không phải ADR, canonical contract, quyết định kiến trúc hoặc runtime implementation.
>
> **Integrator:** `JevProductUsecaseOrchestrator` (báo cáo cho Team Leader `Main`).
>
> **Phạm vi:** tổng hợp bốn lane về ranh giới sản phẩm, use case, routing, performance, safety, privacy và adversarial review khi cân nhắc một Generative LLM bên cạnh TypeSafe System One/JEV. Không sửa SRS, ADR, architecture, domain, auth, OpenAPI hoặc source runtime.
>
> **Phân loại bằng chứng:** `[Verified]` là yêu cầu/năng lực đã có trong SRS, canonical docs hoặc tài liệu chính thức đã đọc; `[Proposal]` là hướng thiết kế cần phê duyệt; `[Unresolved]` là thiếu contract, policy, measurement hoặc quyết định và phải fail closed.
>
> **Phạm vi provider:** Provider/OpenRouter và pricing được coi là prerequisite đã được user xác minh theo yêu cầu. Báo cáo này không tranh luận availability, model ranking, pricing hay cost. Các prerequisite kỹ thuật còn thiếu ở đây là contract/schema, data policy, provenance, stale handling, fallback, performance measurement và product acceptance — không phải lý do để suy diễn về provider.

## 1. Executive decision

### 1.1 Quyết định tích hợp

**[Proposal]** Campus Coin nên giữ ba capability tách biệt:

1. **Deterministic application/domain:** nguồn sự thật duy nhất cho amount, date, wallet, savings, budget, report, duplicate/idempotency, anomaly rule, CTA và mọi side effect.
2. **JEV/System One:** typed decision primitive hẹp (`Choice`, `Noul`, `Score` theo contract), trước hết là category suggestion cho `income|payment`; JEV không phải prose writer, chatbot hay agent.
3. **Generative LLM bổ trợ:** nếu sau này cần, chỉ là adapter riêng cho bounded explanation/copy hoặc structured extraction candidate sau khi code đã tạo facts/staging. LLM không được tính toán, authorize, mutate, chọn action hoặc biến thành authority.

**Quyết định ship:**

- **Ship** deterministic core, manual category picker, dashboard/report/budget facts, immutable ledger/correction và JEV-off parity.
- **Ship có gate** JEV category suggestion sau Gate B: explicit trigger, typed validation, active candidate/appliesTo check, manual override và fallback.
- **Ship trước bằng template** cho monthly summary, spending-change explanation, budget coaching, tips và CTA. Chỉ cân nhắc Generative LLM khi template baseline không đạt comprehension/usefulness và capability contract đã được phê duyệt.
- **Defer** generative explanation pilot, CSV extraction, correction-learning adaptation, anomaly explanation và admin assist cho đến khi có evidence riêng.
- **Reject** mọi đường từ JEV/LLM đến money authority, forecast authority, autonomous action, prose-to-command, auto-import, auto-correction, fraud accusation hoặc open chat.

### 1.2 Vì sao quyết định này phù hợp Campus Coin

- **[Verified]** Campus Coin là sổ tài chính do user tự nhập, không phải ngân hàng; backend/domain là nguồn sự thật và JEV không có quyền tài chính (`docs/PRD.md` §1, §3; `docs/DOMAIN-MODEL.md` §1, §3–§5).
- **[Verified]** Ledger/audit immutable, correction tạo row mới; budget chỉ cảnh báo, không authorization (`docs/DOMAIN-MODEL.md` §1, §4–§5).
- **[Verified]** Browser không tính balance, không gọi provider và không giữ secret; domain không import JEV SDK (`docs/ARCHITECTURE.md` §2, §4–§6).
- **[Verified]** JEV hiện được định vị cho typed category suggestion, có manual fallback, confirmation/override và kill switch (`docs/AI-JEV.md` §3–§7; `docs/contracts/openapi.yaml` phần JEV).
- **[Verified]** SRS rộng hơn MVP canonical và có summary, tips, CSV, anomaly, forecasting; PRD/architecture/delivery plan cắt CSV, prediction, complex AI và autonomous action khỏi MVP (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5–§1.8; `docs/PRD.md` §5; `docs/ARCHITECTURE.md` §8; `docs/DELIVERY-PLAN.md` §9).
- **[Proposal]** Vì vậy, LLM chỉ đáng tồn tại nếu nó giúp sinh viên hiểu deterministic facts tốt hơn mà không làm chậm hoặc thay đổi core. Template-first là baseline sản phẩm, không phải fallback yếu.

### 1.3 Trả lời trực tiếp: ngoài auto-category, nên tích hợp ở đâu?

Ưu tiên thực tế là **sau khi user mở dashboard/report/budget và backend đã trả deterministic snapshot**:

1. Dashboard: card “Điều gì đáng chú ý?” dựa trên direction/category đã được code chọn; bảng/chart nguồn luôn hiển thị trước.
2. Monthly report: summary ngắn theo snapshot tháng HCMC; facts và exact numbers do code render, interpretation là optional.
3. Spending-change: backend xác định baseline, delta và direction; optional copy chỉ giải thích observation, không đoán nguyên nhân.
4. Budget: warning/progress/threshold do code; optional coaching mở màn hình review transactions/budget, không chặn payment.
5. Tips: policy code chọn tip allowlist có evidence; template hoặc LLM chỉ diễn đạt low-pressure, không hứa saving.
6. Next-best action: policy code chọn một CTA allowlist; optional copy giải thích CTA, không để JEV/LLM chọn hoặc thực thi action.
7. CSV preview (phase sau): parser/staging trước, LLM chỉ tạo candidate fields và JEV chỉ gợi ý category sau validation; user review từng row trước import.

**JEV-specific clarification:** ngoài category, JEV chỉ nên được thử cho typed finite signal (ví dụ `pattern_kind`, `relevance` hoặc bounded intent) khi signal đó có giá trị độc lập và đo được. Monthly narrative, coaching, tips và NBA wording không phải capability của System One; chúng thuộc app template hoặc một Generative LLM adapter riêng.

## 2. Capability boundary và source of truth

| Lớp | Được làm | Không được làm | Disposition |
|---|---|---|---|
| Deterministic domain/app | Validate owner/CSRF/idempotency; tính VND, wallet, savings, budget, report; chọn threshold/CTA; ghi ledger/audit; detector rule; persistence | Không phụ thuộc model để quyết định money state | **Ship / authority** |
| JEV/System One | Trả typed `Choice`/`Noul`/`Score` trong candidate/rubric hữu hạn; category suggestion sau explicit click; optional finite signal | Không sinh prose/reasoning; không tính arithmetic; không chọn next action; không gọi tool; không mutate | **Ship category sau Gate B; signal future** |
| Generative LLM | Bounded advisory text từ allowlisted facts; structured candidate extraction từ staging; masked summary nếu future | Không nhận raw ledger/secret; không parse prose thành command; không tạo authority, balance, forecast, fraud proof, CTA hoặc side effect | **Defer/gated** |
| UI/application composition | Render exact facts, source, `asOf`, period, locale, stale state; cho inspect/override/dismiss/save/feedback | Không đặt model output vào authoritative DTO/ARIA/error/status | **Ship deterministic; optional advisory** |
| Admin/human | Triage, edit, approve, correction/escalation theo role/audit | Không giao autonomous decision cho model | **Human-in-loop** |

### 2.1 Sửa các diễn giải dễ nhầm trong báo cáo cũ

- **[Correction]** “JEV explanation”, “JEV monthly summary”, “JEV coaching” và “JEV NBA prose” phải được đọc là **deterministic template hoặc Generative LLM capability riêng**. System One chỉ cung cấp typed signal nếu cần.
- **[Correction]** `confidence` là tín hiệu bất định/phân phối, không phải chứng minh correctness. HTTP success, valid JSON hoặc prose lưu loát cũng không phải authority.
- **[Correction]** `status` như `suggested`, `manual`, `stale`, `invalid`, `unavailable` là application state; không được coi là model primitive.
- **[Correction]** Feedback/override là append-only telemetry hoặc product signal; không có nghĩa JEV/LLM tự học, retrain hay âm thầm recategorize lịch sử.
- **[Correction]** Async không tự động an toàn: vẫn cần owner scope, snapshot, stale invalidation, retention, idempotency, retry/dead-letter và kill switch.

## 3. Use-case decision matrix

Điểm dưới đây là `[Proposal]`, thang 1–5; `Risk` 5 là rủi ro cao, `Dependency` 5 là phụ thuộc nhiều contract chưa chốt. Không phải runtime measurement.

| Hạng | Use case | User value | Automation value | Product/system fit | Risk | Phase/disposition | Dependency chính |
|---:|---|---:|---:|---:|---:|---|---|
| 1 | Dashboard/report/budget deterministic facts + widgets | 5 | 2 | 5 | 1 | **Ship MVP, không cần model** | Canonical read model, a11y, empty/error states |
| 2 | JEV category suggestion trước submit | 5 | 4 | 5 | 3 | **Ship sau Gate B; manual luôn có** | Typed contract, active candidate, confirmation, stale/fallback |
| 3 | Budget warning + template coaching | 5 | 3 | 5 | 2 | **Warning ship; template trước** | Threshold/dedupe/warning-only policy |
| 4 | Monthly summary bounded explanation | 4 | 4 | 4 | 4 | **Defer LLM; pilot sau template** | Fact snapshot, claim refs, stale, artifact lifecycle |
| 5 | Spending increase/decrease explanation | 4 | 4 | 4 | 3 | **Defer; comparison code trước** | Baseline, direction, threshold, comparison read model |
| 6 | Personalized saving tips | 4 | 4 | 4 | 4 | **Template/rule trước; LLM optional** | Goal semantics, evidence, low-pressure policy, feedback |
| 7 | Deterministic NBA + optional wording | 3 | 3 | 4 | 3 | **Defer** | CTA allowlist, route policy, impression/stale state |
| 8 | Correction/override instrumentation | 4 | 3 | 3 | 3 | **Code-only telemetry trước** | Consent, retention, version, export/delete |
| 9 | Duplicate detection | 4 | 4 | 4 | 2 | **Deterministic phase sau** | Fingerprint/index, race, freshness, warning contract |
| 10 | Anomaly detection | 4 | 3 | 3 | 4 | **Deterministic phase sau; LLM chỉ diễn đạt** | Baseline/min-history, threshold, provenance |
| 11 | CSV batch classification/extraction | 4 | 5 | 3 | 4 | **Defer cùng CSV** | Parser, staging, row review, partial failure, idempotency |
| 12 | Masked admin issue assist | 2 | 2 | 2 | 4 | **Defer separate security gate** | Least privilege, masking, audit, retention |
| 13 | Forecasting | 3 | 3 | 2 | 5 | **Reject MVP; quyết định riêng** | Methodology, calibration, uncertainty, opt-in |
| 14 | Open chat, financial advice, autonomous action | 1 | 5 | 1 | 5 | **Reject** | Xung đột domain, safety và user-control boundary |

## 4. Use-case cards

Mỗi card phân biệt rõ trigger, input, processing, output, user control, persistence/provenance, fallback, success metric và cấm đoán.

### UC-01 — JEV category suggestion

- **Classification/phase:** `[Verified]` JEV fit; manual/core ship ngay, JEV enable sau Gate B.
- **Trigger:** User chọn `income|payment`, nhập description hợp lệ và bấm “Gợi ý danh mục”; không gọi mỗi keystroke.
- **Input:** `transactionType`, bounded/redacted description, active candidates đúng `appliesTo`, locale và contract version. Không gửi amount/date/balance/ledger/session/secret không cần thiết.
- **Processing:** Code kiểm tra auth/CSRF/length/candidate; JEV trả typed answer; code validate schema, candidate membership, active status, type và snapshot; user mới chọn category.
- **Output:** Application state `suggested|manual|disabled|unavailable`, category ID/label từ authoritative list và optional bounded reason. Không tạo transaction.
- **User control:** Manual picker luôn hiển thị; `Use`, override, dismiss và Save là bốn bước riêng. Late response không ghi đè user selection; `confirmedCategorySuggestion` chỉ là acknowledgement.
- **Persistence/provenance:** Suggestion ephemeral; nếu đo quality, append-only masked event gồm candidate snapshot, accepted/overridden/dismissed, locale/type và version. Schema retention/consent là `[Unresolved]`.
- **Fallback:** Flag off, timeout, schema/privacy/injection/low-confidence/stale/4xx/5xx → giữ form và manual picker; không nearest-category guess, không LLM prose repair.
- **Success metric:** 100% accepted IDs active/đúng type; zero auto-commit; JEV-off completion parity; override/abstain/fallback theo locale và transaction type; zero sensitive outbound/log.
- **Cấm đoán:** Không tính money, authorize payment, gọi trong DB transaction, tự submit, browser-to-provider, prose parsing hoặc raw data outbound.

### UC-02 — Correction/override signal và learning instrumentation

- **Classification/phase:** `[Proposal]` code-only telemetry trước; adaptation/retraining defer.
- **Trigger:** User accept/override/dismiss category hoặc submit correction sau primary action.
- **Input:** Opaque event, suggested/final category IDs, event kind, locale/type, candidate/rule/schema version, actor/time; feedback text chỉ khi consent và redaction đã có.
- **Processing:** Ghi event append-only; correction vẫn đi qua normal append-only domain command. Aggregate/holdout evaluation chạy offline hoặc worker riêng; không gọi model trong money transaction.
- **Output:** `feedbackRecorded` hoặc bounded operational label; không tạo category rewrite, retrain command hay money state.
- **User control:** User biết feedback dùng cho mục đích nào, có opt-out nếu policy cho phép; user vẫn tự sửa từng transaction; không hứa “hệ thống đã học ngay”.
- **Persistence/provenance:** Event owner-scoped, versioned, masked, có retention/export/delete policy. Raw prompt/completion không lưu mặc định; resource contract hiện `[Unresolved]`.
- **Fallback:** Store/consent/privacy/schema/worker failure → bỏ optional label hoặc ghi event tối thiểu theo policy; original row và manual behavior không đổi.
- **Success metric:** Original rows immutable; event traceability/idempotency; zero raw PII/secret; zero historical auto-recategorization; holdout override giảm mà correct abstention không giảm.
- **Cấm đoán:** Không coi một correction là truth cho user khác; không cross-user learning tự động; không SQL update/delete ledger; không âm thầm đổi category cũ.

### UC-03 — CSV batch classification/extraction

- **Classification/phase:** `[Verified]` CSV ngoài canonical MVP; `[Proposal]` LLM extraction và JEV row-level category chỉ future.
- **Trigger:** User upload file sau khi feature CSV được phê duyệt; user mở preview, không import trực tiếp.
- **Input:** File bounded được parse/size/encoding/schema trước; opaque job/row ID; validated fields; redacted description; active candidates; locale/parser version. CSV cells là untrusted data, không phải instruction.
- **Processing:** Deterministic parser/staging kiểm tra header, type, positive integer VND, HCMC date, owner, duplicate/idempotency; LLM chỉ tạo candidate extraction; JEV chỉ category trên row đã validated; user review trước normal import.
- **Output:** Per-row `valid|manual|invalid|unsafe|duplicate` với candidate fields, evidence/source span, category suggestion, field errors và review flags. Chưa review thì chưa được gọi là imported.
- **User control:** Map columns; xem/sửa amount/date/type/category/description; accept/override/skip từng row; explicit batch confirm. Unresolved row không tự commit.
- **Persistence/provenance:** Job/file fingerprint, parser/schema/model policy version, row decision, owner scope và import idempotency. Raw-file retention, partial commit và export/delete là `[Unresolved]`.
- **Fallback:** Provider/model off, timeout, unsafe/invalid file, schema/refusal/privacy/queue failure → deterministic parsed preview + manual picker; giữ row error, không silent drop/zero-fill/duplicate.
- **Success metric:** Zero silent row loss/duplicate; 100% committed rows explicit reviewed; zero model-authored amount/date/type; time-to-import tốt hơn manual baseline; per-row failure/retry idempotency.
- **Cấm đoán:** Không bank-sync assumption, auto-import, raw file outbound, prose-to-money parsing, overwrite/delete ledger hoặc giữ DB transaction trong extraction.

### UC-04 — Duplicate detection

- **Classification/phase:** `[Proposal]` deterministic code-only detector; JEV detector reject; LLM explanation optional sau flag.
- **Trigger:** Pre-submit idempotency check, post-commit scanner hoặc user mở history.
- **Input:** Owner-scoped validated type/amount/date/category/normalized description, idempotency/body fingerprint, own-record references, rule version và freshness.
- **Processing:** Exact idempotency trước; matching rule xử lý possible duplicate; recheck race trong normal commit. Optional LLM chỉ diễn đạt deterministic flag từ allowlisted facts.
- **Output:** `same_idempotent_replay|possible_duplicate|no_signal|cannot_verify`, matched own reference, rule/source refs và compared-at. Không gọi fraud/theft.
- **User control:** Inspect basis, dismiss/mark expected/proceed explicit, mở correction/issue; valid payment không bị freeze chỉ vì heuristic.
- **Persistence/provenance:** Fingerprint, rule/baseline version, matched own IDs, disposition và freshness trong read model append-only; schema/threshold `[Unresolved]`.
- **Fallback:** Stale/insufficient history → `cannot_verify`; exact idempotency domain vẫn chạy; optional explanation ẩn khi model lỗi.
- **Success metric:** Zero duplicate cùng key/body; zero valid payment blocked; 100% high-signal có basis; precision/false-positive/dismiss/mark-expected.
- **Cấm đoán:** Không model detector/proof, auto-delete/merge/reverse/refund/freeze hoặc cross-owner matching.

### UC-05 — Anomaly detection read-only

- **Classification/phase:** `[Proposal]` deterministic baseline phase sau; JEV detector reject; LLM chỉ optional presentation.
- **Trigger:** Post-commit scanner hoặc user mở history/dashboard khi amount/category/frequency khác baseline.
- **Input:** Own committed transactions, HCMC period, per-user aggregates, baseline/rule version, data sufficiency/freshness. Không benchmark cross-user mặc định.
- **Processing:** Reconcile/rebuild check; code tính threshold/signal; optional LLM chỉ nhận neutral flag, reason key và fact refs để tạo copy.
- **Output:** `possible_anomaly|no_signal|insufficient_or_stale`, reason trung tính “khác mẫu trước đây”, evidence period/source. Không cáo buộc fraud.
- **User control:** Inspect transaction/basis, dismiss/mark expected, mở issue/correction append-only; không auto-fix.
- **Persistence/provenance:** Opaque target, rule/baseline version, observation period, freshness, generatedAt và disposition; worker/retention contract `[Unresolved]`.
- **Fallback:** Thiếu history, stale, worker/model failure → `insufficient_or_stale` hoặc hide; transaction/dashboard/correction vẫn chạy.
- **Success metric:** Zero payment freeze/reject/auto-reversal; 100% flag có basis/period/freshness; user-confirmed precision, false-positive và stale rate.
- **Cấm đoán:** Không fraud/theft claim, cross-user inference, wallet freeze, payment rejection, auto-correct hoặc raw ledger outbound.

### UC-06 — Monthly report explanation

- **Classification/phase:** Facts là code-only; deterministic template ship trước; Generative LLM có fit bounded prose sau Gate L và artifact contract; JEV chỉ optional finite signal, không viết prose.
- **Trigger:** User mở `/reports/monthly` hoặc explicit “Tạo giải thích” sau deterministic snapshot load; không gọi trong report calculation/transaction.
- **Input:** HCMC month, source snapshot/version, code-computed totals/directions/category refs, completeness, locale và approved claim vocabulary. Không gửi raw ledger nếu không cần.
- **Processing:** Code xác định facts/claims; optional LLM paraphrase từ allowlist; validator kiểm fact refs, schema, length, locale, prohibited numeric/causal/action claims; stale check trước persist/display.
- **Output:** `advisory_text` bounded blocks + fact refs, source/as-of/caveat, clearly labelled “Gợi ý tham khảo”. Exact values/period/table from app-owned report.
- **User control:** Facts/table trước; inspect source, dismiss/refresh/save/pin/feedback nếu artifact contract approved; không Apply-to-wallet/budget/payment.
- **Persistence/provenance:** Owner snapshot, HCMC period, source refs, generatedAt, policy/schema/template version, locale, status và stale reason; immutable version, refresh supersedes; raw prompt/completion không lưu mặc định.
- **Fallback:** Report/chart/table + static localized copy; missing/stale/unsafe/schema/privacy/timeout → suppress advisory, không fake zero/partial text.
- **Success metric:** 100% claim-to-source; zero stale-as-current/numeric mismatch; comprehension task; source-open/dismiss/feedback; JEV/LLM-off parity.
- **Cấm đoán:** Không tự tính totals/balance, causal inference, financial advice, generated value vào authoritative response hoặc first useful report dependency.

### UC-07 — Spending increase/decrease explanation

- **Classification/phase:** Comparison read model và arithmetic code-only; template trước; optional LLM wording future.
- **Trigger:** User mở dashboard/report hoặc bấm “Điều gì thay đổi?” khi baseline đủ dữ liệu.
- **Input:** Current vs baseline category totals, compared periods HCMC, completeness, source snapshot, deterministic direction/significance và optional budget status.
- **Processing:** Code chọn baseline/delta/threshold; optional LLM diễn đạt observation + caveat; không yêu cầu model suy ra cause.
- **Output:** Category, direction, exact values từ backend, compared period, fact refs và “chưa đủ dữ liệu” khi cần.
- **User control:** Mở report/source, dismiss/save/feedback; correction chỉ qua normal flow; card không tự sửa.
- **Persistence/provenance:** Baseline definition, source snapshot/version, compared window, generated time, locale và stale triggers; schema artifact `[Unresolved]`.
- **Fallback:** Current category table/report; baseline/timezone unclear → no narrative, show deterministic facts.
- **Success metric:** Zero unsupported causal claim; user xác nhận card khớp report; source-open và comprehension tăng so với template baseline.
- **Cấm đoán:** Không arithmetic trong model/browser, không đổ lỗi user, không biến một row thành trend, không tạo budget/payment action.

### UC-08 — Personalized saving tips và budget coaching

- **Classification/phase:** Budget arithmetic/status/threshold/CTA code-only; deterministic allowlisted tip/template trước; LLM chỉ paraphrase low-pressure copy sau evidence.
- **Trigger:** User mở budget/dashboard/report hoặc deterministic warning event sau commit; không gọi mỗi payment nếu không có dedupe policy.
- **Input:** `categoryId/label`, HCMC month, `usedVnd`, `limitVnd`, `isOverrun`, direction/baseline, data completeness, approved tip ID/CTA ID và source version. Không để model chọn threshold.
- **Processing:** Code quyết định warning, candidate tip, dedupe và CTA; optional LLM rewrite trong bounded envelope; code kiểm unsupported promise/shaming/causal language.
- **Output:** Progress/warning exact từ backend + advisory tip; CTA chỉ mở report/budget/transactions. Không “guaranteed saving”.
- **User control:** Dismiss/snooze/save/feedback, inspect source; change budget/payment/savings chỉ qua normal form/confirmation/CSRF/idempotency.
- **Persistence/provenance:** Tip/coaching snapshot, evidence refs, source period, template/schema/model version, generatedAt, stale/resolved state và interaction events; notification/retention contract `[Unresolved]`.
- **Fallback:** Static localized warning/template hoặc hide card; stale/missing baseline/model failure không block payment.
- **Success metric:** Budget comprehension; source-open/review completion; useful/dismiss/alert-noise; zero payment rejection/mutation; zero unsupported savings promise/shaming.
- **Cấm đoán:** Không đổi limit/threshold, reject payment, tự transfer savings, loan/BNPL/investment advice, ép cắt khoản thiết yếu hoặc push/email khi chưa consent.

### UC-09 — Next-best action (NBA) không authority

- **Classification/phase:** Code policy chọn CTA; JEV/LLM không chọn action; optional copy future.
- **Trigger:** Dashboard/report/budget load hoặc sau insight/alert.
- **Input:** Deterministic state (`budget exists/status`, report availability, recent activity), route, locale, dismiss state và allowlisted actions.
- **Processing:** Code chọn tối đa một CTA theo policy; optional model chỉ giải thích lý do từ fact/CTA ID; no model-selected route.
- **Output:** Advisory card + `view_report|review_budget|review_transactions|record_income` allowlist; CTA mở màn hình, không submit mutation.
- **User control:** Click explicit, dismiss/save/feedback; user bỏ qua không lặp trong cùng snapshot; final action vẫn normal flow.
- **Persistence/provenance:** Impression/click/completion/dismiss/feedback và source snapshot nếu analytics được duyệt; stale khi state/route/locale đổi.
- **Fallback:** Hide card hoặc link “Xem báo cáo”; core navigation/form vẫn dùng được.
- **Success metric:** Time-to-next-useful-screen, review-action completion, comprehension; zero unintentional submit/payment/transfer.
- **Cấm đoán:** Không suy đoán mục tiêu/khả năng trả nợ, tự navigate chain, tự notification/transfer, bypass authz hoặc gọi CTA ngoài allowlist.

### UC-10 — Admin issue assistance

- **Classification/phase:** Code/human authority; optional masked JEV topic hint hoặc LLM summary chỉ sau separate security/privacy gate; autonomous triage reject.
- **Trigger:** Authorized admin explicit request trên issue đã mask; không background scan cross-owner.
- **Input:** Least-privilege masked issue fields, opaque ID, finite topic/rubric, locale. Không raw ledger, secret, Google claims, cross-owner financial detail.
- **Processing:** Optional typed topic/summary; admin tự inspect/edit/commit status, priority, note, assignment theo role/audit.
- **Output:** Bounded topic/missing-information/neutral summary + source refs; không priority/status mutation, incident command hay money action.
- **User control:** Admin accept/edit/reject hint; support/user vẫn có issue flow; P0/P1 không chờ model.
- **Persistence/provenance:** Masked version, source issue ID, generatedAt, policy/schema, role/audit; retention/consent `[Unresolved]`.
- **Fallback:** Manual triage/static issue view; no guessed priority/auto-close; preserve evidence.
- **Success metric:** Zero privilege/owner leak; 100% admin actions audited; P0/P1 handling parity; human agreement/override.
- **Cấm đoán:** Không autonomous status/priority/escalation, xem owner khác, disable safeguard, mutate ledger hoặc expose raw completion.

### UC-11 — Forecasting, open chat và financial advice

- **Classification/phase:** Forecast reject MVP/defer separate product-safety decision; open chat/authority reject.
- **Trigger:** Không tạo mặc định. Future research chỉ explicit opt-in trên planning surface nếu methodology được duyệt.
- **Input/processing/output:** Không gửi model để tính balance, amount, date, payment capacity, forecast, fraud proof hoặc saving guarantee. Nếu future forecast được duyệt, deterministic model/range/uncertainty trước; prose chỉ diễn đạt.
- **User control:** Opt-in, assumptions, uncertainty, dismiss/hide; không Apply forecast.
- **Persistence/provenance:** Model/method version, input snapshot, uncertainty, generatedAt, stale policy và decision; hiện `[Unresolved]`.
- **Fallback:** History/report deterministic hoặc hide; không zero giả.
- **Success metric:** Calibration/coverage và user phân biệt estimate với actual; zero authority belief/harmful action.
- **Cấm đoán:** Không authorize/reject payment, set budget, transfer savings, loan/BNPL/investment advice, autonomous action, chat-completion prose parse.

## 5. Architecture placement và routing

### 5.1 Placement matrix

| Placement | Phù hợp | Luồng an toàn | Quy tắc blocking |
|---|---|---|---|
| Synchronous pre-submit | JEV category; deterministic duplicate warning | Validate → optional typed suggestion → user review → normal command | Suggestion có thể chờ riêng; form/Save không chờ provider; không giữ DB transaction |
| Async post-commit | Monthly artifact, coaching wording, feedback label, anomaly explanation | Commit → snapshot → bounded job → validate → versioned artifact → read | Không thay row đã commit; retry idempotent; queue failure chỉ mất enrichment |
| Read-time insight | Dashboard/report/budget cards | Facts/source/as-of trước → optional artifact fetch → stale check → advisory | First useful facts không chờ model; late result không focus theft/overwrite |
| Offline/batch | CSV staging/extraction, holdout evaluation | Parse/stage → optional per-row candidate → review → normal import | Unresolved row không commit; không raw file trực tiếp |
| Không đặt model | Auth, baseline, payment, correction command, report arithmetic, budget calculation | Deterministic API/domain/UI | Provider/model call = zero trong money transaction |

### 5.2 Topology được phép

1. **JEV-only:** category typed signal; giữ manual fallback.
2. **LLM-only:** bounded prose/extraction trên explicit advisory/preview surface; không dùng cho category money path nếu JEV contract đã đủ.
3. **Parallel fan-out:** chỉ cho hai optional outputs độc lập sau facts; core response không await join.
4. **JEV-gated cascade:** chỉ khi code chứng minh typed signal tạo nhu cầu bounded copy; không hidden repair loop, không critical path.
5. **Async worker:** ưu tiên cho monthly artifact, saved insight và batch; cần job key, deadline, retry/dead-letter, stale discard.
6. **Cache/precompute:** chỉ owner/source/locale/policy/schema key đầy đủ; cache miss trả facts/template, không stale-as-current.

### 5.3 Deadline, retry và idempotency

- `[Proposal]` Deadline phân tầng: request → queue admission → provider connect/response → schema/claim validation → persist/cache. Timeout map thành `manual|unavailable|stale|pending`, không fake success.
- Không retry mặc định category click. Worker chỉ retry transient, bounded và còn budget/deadline; permanent schema/privacy/validation không retry.
- Job key gồm capability, owner, source snapshot/version, input fingerprint và schema/policy version. Cùng key/body đọc artifact cũ; khác fingerprint conflict/reject.
- Advisory idempotency không thay thế ledger idempotency. Sau user review, normal domain API vẫn validate owner/category/type/amount/date/idempotency.
- Không claim percentile, “real-time”, cancellation cost saving hay availability khi chưa có measurement; technical measurements là gate, không phải product promise.

## 6. Safety, privacy, provenance và UX contract

### 6.1 Input/data boundary

- `[Verified]` Provider call và secret phải server-only; browser không gửi trực tiếp.
- `[Proposal]` Chỉ gửi minimal allowlisted state; không gửi raw ledger, full balance, session cookie, Google claims, secret, admin raw data, unnecessary PII hoặc raw CSV/file.
- Description, CSV cell, OCR text và issue text là **untrusted data**. Delimit như data; instruction “ignore rules”, “reveal prompt”, “authorize payment”, “change balance” không có quyền đổi policy.
- Redaction/allowlist là security boundary chính; model refusal/moderation không thay authz, owner check hoặc validation.
- Output luôn untrusted: strict discriminator/schema, unknown-field reject, max length, plain-text sanitizer, fact refs, locale, allowed enums và prohibited-claim checks. Không parse prose/JSON-in-text để sửa hay tạo command.

### 6.2 Provenance envelope

Mọi advisory artifact được phép display/save phải có:

- capability và schema/policy/template version;
- owner-scoped opaque subject và source kind;
- source snapshot/version, `factRefs`/`sourceRef`, period và `Asia/Ho_Chi_Minh` nếu áp dụng;
- exact facts do app render, `asOf`, generated/observed time;
- locale, status, stale reason, user decision và model metadata đã allowlist nếu cần vận hành.

Thiếu provenance, source conflict, owner mismatch hoặc period không rõ → suppress interpretation; authoritative facts vẫn có thể hiển thị.

### 6.3 Stale/invalidation

Đánh dấu stale/discard khi có transaction/correction/reversal/replacement commit, category lifecycle change, budget change/rollover, report/projection rebuild, period/timezone/locale/policy/schema change, owner/session change, retention expiry hoặc result đến sau snapshot. Stale không làm ledger sai; chỉ cấm trình bày interpretation như current. Exact values phải đọc lại canonical endpoint.

### 6.4 Persistence và feedback

- Suggestion/extraction preview ephemeral mặc định.
- Saved insight immutable/versioned; refresh tạo version mới/supersedes, không silent overwrite.
- Raw prompt/completion/provider payload không persist mặc định; debug sample cần consent, masking, retention ngắn, access log và security approval.
- Feedback là append-only masked event (`accepted|edited|dismissed|reported|not_useful`) gắn capability/version/source snapshot. Không hứa retrain, không global learning, không auto-recategorize.
- `[Unresolved]` consent, opt-out, export/delete, retention duration, saved artifact lifecycle và provider deletion phải được owner chốt trước enablement.

### 6.5 User control state machine

`manual-ready → loading/pending → ready/advisory → stale|suppressed|unavailable → accepted/edited|dismissed|saved`.

- First useful content là facts/form/manual picker.
- User có `inspect`, `accept`, `override`, `edit`, `dismiss`, `skip`, `save`, `feedback` tùy capability.
- Model output không phải consent; render card không phải authorization.
- Late response bị discard nếu user đổi input/type/category/locale hoặc source snapshot.
- Không có `Apply advice`, `Pay`, `Transfer`, `Set budget`, `Correct ledger` từ generated card.

### 6.6 Localization và accessibility

- App sở hữu translation keys, numeric/VND/HCMC formatting, labels, errors, loading, stale, fallback, disclosure, `aria-label`, `aria-live` và CTA.
- `en|vi` parity phải được đánh giá riêng; chưa có evidence thì dùng template/app copy và suppress generated prose ở locale không đạt.
- Advisory không phải kênh duy nhất để hiểu số liệu. Chart phải có table/text equivalent; trạng thái không chỉ truyền bằng màu; keyboard, focus, zoom/reflow, contrast, reduced motion và screen reader phải giữ được khi output dài/rỗng/lỗi.
- Generated content không được chiếm focus hoặc ghi đè user input; status loading/stale/fallback phải được thông báo accessible.

## 7. Adversarial review — findings và gates

### 7.1 Severity-ranked findings

| Mức | Finding | Tác động | Điều kiện chặn/giảm thiểu |
|---|---|---|---|
| CRITICAL | LLM/JEV output đi vào amount/balance/budget/ledger/authorization | Financial integrity, audit và user harm | Code-only authority; route test chứng minh provider call/mutation bằng 0 |
| CRITICAL | Prose/JSON được parse thành money command hoặc hidden repair loop | Bypass schema, injection và user confirmation | Strict structured envelope; reject unknown/partial; không repair bằng model |
| CRITICAL | Stale/cross-owner artifact hiển thị như current | Sai report, privacy leak | Snapshot/owner key, invalidation, stale suppression 100% |
| HIGH | Raw ledger/PII/secret/session/CSV outbound hoặc log | Privacy/security incident | Minimal redaction, server-only, masked telemetry, no raw persistence |
| HIGH | Prompt injection qua description/CSV/OCR/issue text | Policy exfiltration, false action | Treat as data, suspicious flag/manual, adversarial corpus, no tool mode |
| HIGH | Model chọn CTA/route/notification/autonomous admin action | Mất user control, privilege escalation | Code allowlist; model chỉ copy; human admin commit |
| HIGH | JEV bị gán nhầm là prose writer/LLM fallback | Capability drift, unsafe contract reuse | Capability IDs/contracts/flags tách biệt; JEV typed-only |
| MEDIUM | Optional model chặn first useful content hoặc Save | UX regression, provider coupling | Facts-first, async/read-time, timeout/cancel, manual parity |
| MEDIUM | Narrative tạo causal/shaming/guaranteed saving/financial advice | Harmful student guidance | Approved claim vocabulary, neutral template, suppression/human review |
| MEDIUM | Async retry/fan-out/cache tạo duplicate/stale spend | Operational instability | Bounded retry, job idempotency, budget admission, source invalidation |
| LOW | Long/empty/wrong-locale output phá layout/a11y | Comprehension/accessibility regression | Max length, sanitizer, locale gate, chart/table equivalent |

### 7.2 Evidence gates trước generative enablement

- **L0 Product separation:** capability owner, user value vượt template, output/fallback/control và public API review.
- **L1 Adapter contract:** server-only secret, exact schema/discriminator, error/timeout/cancel/limits and privacy evidence. Provider availability/pricing prerequisite đã user xác minh; không coi đó là product evidence.
- **L2 Data/injection:** outbound fixtures, PII/secret negative tests, injection corpus `en|vi`, masked traces, retention/consent policy.
- **L3 Quality/claim:** synthetic facts, claim-to-source, numeric/date/category validation, abstention, harmful/shaming suppression, extraction exactness.
- **L4 Critical-path isolation:** deterministic/JEV/LLM/async variants đo first useful content, Save/task parity, queue age, stale discard và fallback; không đặt ngưỡng chưa đo.
- **L5 Operational budget:** request/output bounds, concurrency, retry/fan-out cap, per-user/global admission và kill switch. Đây là control vận hành, không phải pricing analysis.
- **L6 Trust/i18n/a11y:** fact-vs-advisory comprehension, source inspection, stale state, keyboard/focus/live-region/chart-table và locale review.
- **L7 Fallback/rollback:** provider/schema/privacy/timeout/quota/queue failure đều trả truthful facts/manual; disable flag không làm core hỏng.
- **L8 Canary/observability:** versioned policy/schema/template/model metadata, holdout/canary, aggregate metrics, rollback; không log raw prompt/response.

### 7.3 No-go invariants

- `LLM/JEV → money mutation` phải bằng 0.
- Unsupported numeric/date/period/causal claim phải bằng 0.
- Stale-as-current, cross-owner artifact, raw secret/session/PII leak phải bằng 0.
- Extraction financial field commit phải có explicit review + normal domain validation 100%.
- JEV/LLM-off core completion và authorization phải giữ parity baseline.
- Fallback không được fake zero, fake success hoặc mất input.

## 8. Metrics và evaluation dataset

### 8.1 Metrics

**Safety hard gates:** mutation count, source traceability, stale suppression, sensitive-data boundary, explicit review, fallback truthfulness, owner isolation và off-parity.

**Product value:** time-to-understand report, category-entry friction, time-to-next-useful-screen, manual completion, source-open, comprehension task, useful/dismissed/irrelevant feedback. Không dùng engagement hoặc token volume làm KPI duy nhất.

**Category:** override, abstain, manual completion, active/appliesTo validity, JEV-off parity theo `en|vi × income|payment`.

**Insight/coaching:** claim-source exactness, unsupported claim rejection, stale refresh, source-open, user hiểu direction/period/fact-vs-advisory, alert noise/dismiss, zero payment side effect.

**CSV:** field validity, source-span correctness, unresolved/manual rate, row order, explicit review, duplicate/silent-loss, time-vs-manual baseline.

**Duplicate/anomaly:** deterministic precision, false-positive dismiss/mark-expected, stale/insufficient rate, review time; không tối ưu recall bằng cách block payment.

**Operations:** first useful facts, optional artifact readiness, timeout/cancel, queue age/backlog, retry/dead-letter, cache hit/stale, suppression, schema failure và locale mismatch. Percentile thresholds chỉ đặt sau baseline measurement.

### 8.2 Synthetic/anonymized evaluation matrix

Không dùng production prompt, raw ledger, session, secret, Google claims hoặc unnecessary PII.

| Slice | Expected behavior |
|---|---|
| Clear in-set category | Suggest active candidate đúng type hoặc abstain |
| Ambiguous/slang/abbreviation | Manual/abstain, không đoán |
| Out-of-set/disabled/retired/wrong appliesTo | Reject result/manual picker |
| PII/secret-shaped | Redact/fallback, zero leak |
| Prompt injection/multilingual malicious text | Treat as data, no prompt/tool/authority leak |
| Empty/max-length/Unicode/diacritics | Stable validation, no crash/raw echo |
| Timeout/429/5xx/schema/flag off | Manual/static fallback, preserve input |
| User override/type/locale race | Late result discarded |
| Known report facts | Every displayed claim maps to fact ID |
| HCMC boundary/correction pending | Correct period, stale/suppressed interpretation |
| Long/wrong-locale/unsafe generated output | Suppress/template, retain controls |
| CSV missing/ambiguous/duplicate fields | Row-level manual/invalid/skip, no auto-import |
| Budget overrun | Warning-only, wallet-sufficient payment remains allowed |
| Anomaly/duplicate low confidence | `cannot_verify`/`insufficient_or_stale`, no accusation |

Category evaluation should maintain the existing minimum synthetic/holdout discipline in `docs/AI-JEV.md` §6. Narrative evaluation uses deterministic fixtures with source refs, mutation invalidation, locale and accessibility states.

## 9. Recommended implementation sequence

| Bước | Owner | Hành động | Exit evidence |
|---:|---|---|---|
| 0 | Team Leader | Chốt product boundary: deterministic authority; JEV typed category; generative LLM separate/off; template-first | Approved capability map và prohibited-output list |
| 1 | B/C | Hoàn thiện manual core: transaction, correction, dashboard/report/budget, `en|vi`, a11y, error/empty/loading | JEV/LLM-off smoke và domain invariants pass |
| 2 | D + B/C | Gate JEV category: redaction, typed schema, active candidates, stale/race, manual fallback, explicit confirmation | Gate B evidence; no auto-commit/Save block |
| 3 | Team Leader + D | Chốt semantics `confirmedCategorySuggestion`, suggestion event/kill switch nếu cần | Accept/override/dismiss/stale smoke; server-side off |
| 4 | B/C | Ship deterministic widgets, monthly facts, budget warning/template, comparison read model nếu scope cho phép | Source-linked facts, warning-only budget, table equivalent |
| 5 | D + B | Viết capability contract riêng cho advisory artifact | Snapshot/version, fact refs, status, stale, owner, retention/feedback decisions |
| 6 | D + C | Đo template baseline và thiết kế monthly/spending/budget candidate facts | Claim-source fixtures; no causal/authority claims |
| 7 | Team Leader + safety owner | Nếu baseline thiếu, approve một LLM pilot duy nhất, explicit/async/read-time | L0–L8 applicable gates, kill switch, rollback, no core regression |
| 8 | B/D | CSV parser/staging/preview/import/idempotency/partial failure trước; sau đó candidate extraction/JEV row category | Explicit row review; zero silent loss/duplicate |
| 9 | B/D + safety | Duplicate/anomaly deterministic read model; optional explanation chỉ sau flag | No freeze/reject/auto-correct; provenance/stale evidence |
| 10 | Team Leader | Revisit admin assist/forecasting only with separate product/safety decisions | Go/no-go riêng; không mở broad chat/autonomy |

**Điểm dừng:** Gate A fail thì không bật model. Gate B fail thì JEV off nhưng core vẫn ship. LLM gate fail thì giữ template/manual; không mở rộng scope để lấp thiếu contract. Không dùng provider/cost availability làm lý do cho product fit; prerequisites kỹ thuật phải có evidence tương ứng trước enablement.

## 10. Rejected/deferred decisions

| Capability | Quyết định | Lý do |
|---|---|---|
| JEV/LLM auto-select/auto-commit transaction | **Reject** | Vi phạm explicit review, immutable ledger và domain authority |
| Model tính wallet/savings/budget/report/amount/date | **Reject** | Deterministic backend/domain là source of truth |
| Model authorize/reject payment, transfer, set budget | **Reject** | Không có money authority; budget warning-only |
| Prose/JSON → ledger/budget/correction/admin mutation | **Reject** | Injection/schema bypass và mất auditability |
| JEV/LLM duplicate/anomaly/fraud detector | **Reject as authority; defer deterministic** | Matching/baseline/freshness là code-owned; false positive không block payment |
| CSV auto-import/batch auto-commit | **Reject MVP; defer** | Thiếu parser/staging/review/idempotency/partial-failure contract |
| Monthly/spending explanation | **Defer generative; ship facts/template** | Cần snapshot, claim refs, stale, artifact lifecycle; JEV không viết prose |
| Personalized tips/coaching | **Defer generative; template-first** | Cần goal/threshold/feedback policy; tránh shaming/guaranteed saving |
| Model-selected NBA | **Reject; code allowlist only** | Action/route/notification không được model quyết định |
| Forecasting | **Reject MVP; defer separate decision** | Cần methodology, calibration, uncertainty, opt-in và harm review |
| Open chatbot/financial advice | **Reject** | Không bounded, không phù hợp typed/advisory boundary |
| Autonomous admin triage/dispute | **Reject** | Xung đột least privilege, privacy, audit và human authority |

## 11. Open decision register

1. Capability advisory nào tạo lift thật sự so với app-owned template?
2. Artifact API/resource có cần public OpenAPI không, và owner/scope/version/idempotency cụ thể là gì?
3. Claim vocabulary, fact ID, numeric/causal/advice policy và validator semantics là gì?
4. Stale TTL/invalidation sau transaction, correction, category/budget/report change ra sao?
5. Consent, opt-out, retention, export/delete và saved insight lifecycle ra sao?
6. Async worker/queue/dead-letter/cancel/kill switch thuộc delivery scope nào?
7. `en|vi` copy inventory, native-language review, max length và screen-reader states đã đạt chưa?
8. Threshold quality/performance/fallback nào được Team Leader phê duyệt sau baseline?
9. CSV partial failure, raw-file retention, evidence spans và import idempotency contract là gì?
10. Anomaly/duplicate rule, baseline/min-history và “mark expected” lifecycle là gì?

**Default cho mọi `[Unresolved]`:** manual/deterministic/off; không suy diễn, không silent fallback sang capability rộng hơn và không thử trên money path.

## 12. Evidence index và verification note

### Canonical/local sources

- `AGENTS.md` — layered boundary, secret handling, no provider in money transaction, bounded JEV/fallback, accessibility/performance rules.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` — product journey, AI advisory/override, CSV, reports, tips, anomaly/forecast requirements.
- `docs/PRD.md` — deterministic core, JEV category-only/default-off/manual fallback, scope cut.
- `docs/DOMAIN-MODEL.md` — VND/HCMC, immutable ledger, correction, budget warning-only, no JEV authority.
- `docs/ARCHITECTURE.md` — browser/API/domain/persistence boundary, no provider in money transaction, out-of-scope list.
- `docs/AI-JEV.md` — typed System One boundary, category contract, redaction, fallback, evaluation and deferred prose/CSV/prediction.
- `docs/contracts/openapi.yaml` — current deterministic routes and category suggestion contract.
- `docs/contracts/API-REVIEW.md` — owner, CSRF, cache, correction, idempotency and admin constraints.
- `docs/ADMIN-OPERATIONS.md` — least privilege, masked issue workflow, audit and kill/fallback boundary.
- `docs/AUTHENTICATION.md` — Google-only session, owner scope and fail-closed auth.
- `docs/DELIVERY-PLAN.md` — gates, JEV probe, JEV-off smoke, rollback and scope cut.

### Integrated handoffs đã đọc

- `CC-JEV-LLM-BOUNDARY-USECASES.md` — capability matrix, use-case cards, correction to old JEV prose assumptions.
- `CC-JEV-LLM-ROUTING-PERFORMANCE.md` — JEV-only/LLM-only/parallel/cascade/async/cache routing, deadline, retry, stale and idempotency.
- `CC-JEV-LLM-SAFETY-CONTRACTS.md` — privacy, injection, strict envelopes, provenance, UX/a11y, retention and suppression gates.
- `CC-JEV-LLM-ADVERSARIAL-REVIEW.md` — severity-ranked review, ship/defer/reject, L0–L8 gates, metrics and no-go conditions.

### Verification note

- **[Verified]** Bốn handoff tồn tại tại đúng workspace và đã được Integrator đọc trực tiếp.
- **[Verified]** Báo cáo này chỉ tạo file `docs/working/jev-llm-complement-analysis/FINAL-FINDINGS.md`; không sửa canonical/runtime hoặc workspace phân tích cũ.
- **[Verified]** Đây là document-only analysis; không chạy formatter, linter, build hoặc full test suite theo scope.
- **[Unresolved]** Artifact API, persistence, consent/retention, queue, exact thresholds và performance measurements vẫn cần owner quyết định trước implementation.

### Kết luận

Campus Coin nên ship deterministic core và JEV typed category theo gate; không gọi Generative LLM là “JEV nâng cấp”. Nếu sản phẩm cần diễn giải tự nhiên, hãy bắt đầu bằng deterministic template sau facts. Chỉ mở một LLM pilot bounded, server-side, non-authoritative, async/read-time khi contract, provenance, stale suppression, privacy, i18n/a11y, fallback và evaluation đã pass. Mọi đường authority, prose-to-money, autonomous action, forecast/financial advice và open chat đều bị reject. Provider/OpenRouter/pricing là prerequisite đã user xác minh, không phải luận cứ sản phẩm và không thay thế các gate nêu trên.
