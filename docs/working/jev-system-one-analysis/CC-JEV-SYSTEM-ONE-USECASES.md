# CC-JEV-SYSTEM-ONE-USECASES — Đánh giá use case theo TypeSafe System One

> **Trạng thái:** working analysis; không phải ADR, canonical contract hoặc runtime implementation.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa SRS, ADR, domain, architecture, auth, OpenAPI, source runtime hoặc `docs/working/jev-product-analysis/`.
>
> **Phân loại bằng chứng:** `[Verified fact]` là điều được nêu trong nguồn chính thức hoặc canonical/local docs; `[Proposal]` là hướng thiết kế cần owner phê duyệt; `[Unresolved]` là khoảng trống contract/evidence, không được coi là capability đã có.

## 0. Kết luận ngắn

**[Verified fact]** Campus Coin là tracker do user tự nhập, không phải bank feed, không giữ tiền thật và không xử lý payment thật. `income` và `payment` là hai transaction type canonical; backend/domain giữ authority cho wallet, ledger, savings, budget và report. JEV không được tính tiền, authorize payment, hoặc tạo/sửa/xóa money state. (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65–71; `docs/PRD.md` §1, L3–7; `docs/DOMAIN-MODEL.md` §1, L3–14; §4, L54–67.)

**[Verified fact]** TypeSafe System One không phải LLM chat/prose. Nó đánh giá một `state` bằng một hoặc nhiều câu hỏi có kiểu; các câu hỏi cùng nhìn state nhưng được trả lời độc lập/song song. Output là answer có kiểu và xác suất/phân bố; model không tự chọn bước tiếp theo, không sinh explanation và không sở hữu control flow hay side effect. (`https://docs.typesafe.ai/concepts/system-one` — “How it differs from an LLM”, “Fast judgments inside a larger workflow”; `https://docs.typesafe.ai/concepts/state` — “Each request evaluates one state against one or more questions”; `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “Summary”, “What makes System One composable”, “Use code when you can”.)

**[Proposal]** Vì vậy, JEV chỉ có giá trị ở các judgment hẹp sau đây:

- **Classification:** chọn một nhãn trong tập hữu hạn bằng `Choice` (category, intent, correction area, insight candidate).
- **Abstention/unknown-like signal:** `Noul` cho một mệnh đề yes/no như “mô tả có đủ để phân loại không?”; code đặt ngưỡng và có thể đưa về manual.
- **Ranking/ordered signal:** `Score` chỉ khi sản phẩm thật sự có rubric có thứ tự và cần một tín hiệu số/ranking; không dùng để giả lập arithmetic, anomaly score, budget percentage hoặc “độ đúng” tài chính.
- **Không phải generation:** application dùng typed output để chọn candidate/template và tự viết copy localized; JEV không viết summary, lý do, coaching sentence hay admin note.

**[Proposal]** Use case ship an toàn nhất là **auto-category trước submit**, nhưng vẫn là suggestion cần user review. Transaction intent/type, correction classification, CSV row category và masked admin issue classification chỉ là candidate cho phase sau. Duplicate/anomaly, budget status, authoritative monthly report, next-best action và money/correction authority phải do deterministic code; JEV không hữu ích hoặc không an toàn ở các vai trò đó.

---

## 1. Ranh giới capability chính thức

### 1.1. State, questions và composition

**[Verified fact]** TypeSafe cho phép `state` là string, object hoặc array; dùng object để đặt các field liên quan trong state và chỉ đưa context cần cho judgment. Một request có một state và map các questions; mọi question thấy cùng state nhưng không lấy output của question khác làm hidden context. (`https://docs.typesafe.ai/concepts/state` — “State can be a simple string or a structured JSON value”; `https://docs.typesafe.ai/api` — “Request body”, “Question types”.)

**[Verified fact]** Hướng dẫn build yêu cầu giữ control flow, deterministic rules và side effects trong code; tách judgment rộng thành các câu hỏi atomic; hỏi độc lập rồi compose answer trong code. (`https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “Use code when you can”, “Decompose the input state”, “Decompose the questions”, “Ask multiple questions together”.)

**[Proposal]** Pipeline chung cho mọi card có JEV:

```text
user trigger
  -> application xác thực session/owner/feature + validate input
  -> application tạo minimal, redacted state + finite candidate set
  -> System One trả typed answers (questions độc lập)
  -> application validate schema, candidate membership, freshness và threshold
  -> application compose answer với deterministic facts/rules
  -> user inspect và accept/override/dismiss (nếu có)
  -> normal deterministic API/domain mới được phép side effect
```

JEV không được gọi trong money transaction, không được giữ lock/payment transaction khi chờ response và không được tự gọi API tiếp theo.

### 1.2. Chọn primitive đúng

| Primitive | Dùng khi | Output chính | Campus Coin dùng ở đâu | Không dùng để |
|---|---|---|---|---|
| **Choice** | Một nhãn trong tập hữu hạn đã định nghĩa | `choice`, `probabilities` cho từng option, `confidence` | Category, intent/type, correction area, CSV category, insight/CTA candidate (nếu phase sau) | Tạo câu trả lời tự do, chọn option ngoài candidate set |
| **Noul** | Một mệnh đề yes/no độc lập | `noul` là xác suất “yes”; không có field `confidence` riêng | Mô tả có đủ để phân loại không; có phải correction/issue/security signal không | Đo mức độ, score tài chính hoặc thay cho nhiều điều kiện ghép trong một câu |
| **Score** | Một thang có các mức **ordered** và product có nghĩa rõ cho điểm/ranking | `score` probability-weighted, `probabilities`, `confidence`, `legend` | Chỉ có thể cân nhắc cho ranking candidate đã có rubric sau này | Arithmetic, percent budget, balance, anomaly score, “tiền tiết kiệm”, authorization |

**[Verified fact]** Choice trả option đã chọn cùng probability cho mọi option và confidence; Noul trả xác suất yes/no và không có confidence riêng; Score trả điểm probability-weighted trên levels có thứ tự, probability và confidence. (`https://docs.typesafe.ai/primitives/choice` — “Use a Choice…”, “Choice answer”; `https://docs.typesafe.ai/primitives/noul` — “Use a Noul…”, “Reading a Noul”; `https://docs.typesafe.ai/primitives/score` — “Use a Score…”, “Response structure”; `https://docs.typesafe.ai/api` — “Answer types”.)

**[Verified fact]** Confidence được suy ra từ phân bố probabilities, không phải bằng chứng đúng tuyệt đối. TypeSafe nêu ba đường xử lý: high confidence có thể tự động hóa trong action phù hợp, medium cần review/confirmation, low không hành động và fallback/escalate; threshold phải do code chọn theo rủi ro. (`https://docs.typesafe.ai/confidence` — “Confidence is derived from the probabilities”, “I don’t know is a useful signal”, “Three paths for using confidence”, “Thresholds scale with risk”.)

**[Proposal]** Không hiển thị numeric confidence cho user như “độ đúng”. Backend dùng probabilities/confidence hoặc `noul` trong policy; UI chỉ nói `gợi ý`, `cần kiểm tra`, `chưa đủ dữ liệu` và luôn có manual path. Giá trị `noul` ở vùng giữa không phải “đúng một nửa”; đó là tín hiệu bất định để code abstain/review.

### 1.3. OpenRouter/API evidence

**[Verified fact]** TypeSafe HTTP API dùng `POST https://api.typesafe.ai/v1/systemone` với `state`, `model` và map `questions`; OpenRouter System One API mô tả `POST /api/v1/systemone`, gửi state và typed questions, trả `answers` theo question id. (`https://docs.typesafe.ai/api` — “Evaluation endpoint”, “Request body”, “Response body”; `https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md` — “Submit a System One request”, OpenAPI `POST /systemone`.)

**[Verified fact]** URL Decisions được yêu cầu là `https://openrouter.ai/docs/api/api-reference/decisions/submit-a-decisions-request`; tại thời điểm research URL này trả HTTP 404. Official OpenRouter documentation index (`https://openrouter.ai/docs/llms.txt`) liệt kê trang chính thức thay thế là `https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md` (“Submit a Decisions request”). Phân tích này không suy diễn thêm semantics Decisions từ URL 404; các card dưới đây dựa trên System One typed contract đã đọc được.

**[Unresolved]** Endpoint/model/transport/pricing/privacy compatibility của runtime Campus Coin vẫn là prerequisite đã được user xác minh bên ngoài assignment; file này không phân tích provider/cost và không giả nhận runtime capability. `docs/AI-JEV.md` §2, L15–19 yêu cầu probe typed contract trước khi bật; nếu không xác minh được thì giữ disabled.

### 1.4. Campus Coin canonical boundaries

**[Verified fact]** Public JEV endpoint hiện tại chỉ là `POST /ai/category-suggestion`, luôn advisory; request gồm `transactionType`, `description`, `locale`, response gồm `status`, `categoryId`, `confidence`, `reasonCode`. (`docs/contracts/openapi.yaml` L338–348, L662–677.) Đây không phải contract cho intent, correction, CSV, report insight, coaching, NBA hoặc admin assist.

**[Verified fact]** Category phải active và đúng `appliesTo`; transaction request cần `type`, positive integer `amountVnd`, `categoryId`, `occurredAt`; `confirmedCategorySuggestion` chỉ là acknowledgement field, không thay domain validation. (`docs/contracts/openapi.yaml` L397–400, L440–449, L533–544.)

**[Verified fact]** Ledger immutable/append-only; correction là row mới có reason/actor/reference/audit; budget overrun chỉ là warning; report dùng period HCMC; JEV output không bypass validation/calculation/authorization. (`docs/DOMAIN-MODEL.md` §3, L38–52; §4, L54–67; §5, L69–85.)

**[Verified fact]** Browser không gọi provider; API giữ validation/session/owner/CSRF/feature; domain giữ money/period/authorization/report; JEV adapter ở application boundary; JEV lỗi không được chặn money path. (`docs/ARCHITECTURE.md` §2, L21–27; §4–6, L35–56; `AGENTS.md` L99–141.)

---

## 2. Contract chung cho các card

### 2.1. Minimal state

**[Proposal]** State outbound chỉ chứa các field cần cho một judgment cụ thể, đã redact và có candidate/rubric hữu hạn. State không được chứa session, Google claims, secret, raw ledger, balance, savings, admin raw data, PII thừa, hoặc user instruction có thể biến thành command. Description/CSV cell/issue text là **data**, không phải instruction.

**[Verified fact]** JEV boundary canonical cho category chỉ cần type, description đã redact, candidates, locale và contract version; cấm balance, savings, raw ledger, claims, session, secret và PII thừa. (`docs/AI-JEV.md` §3–6, L21–23, L33–45, L64–78.)

### 2.2. Typed output envelope (logic, chưa phải API schema)

**[Proposal]** Adapter nội bộ có thể chuẩn hóa mỗi answer thành:

```text
questionId
primitive: choice | noul | score
answer: typed value
probabilities/confidence nếu primitive hỗ trợ
thresholdDecision: accepted | review | abstain
candidateVersion/rubricVersion
```

Đây là logic analysis, **không** phải đề xuất sửa OpenAPI. Public contract hiện tại chỉ expose category suggestion shape; mọi field mới cho các card phase sau là `[Unresolved]`.

### 2.3. Deterministic composition

**[Verified fact]** Code phải sở hữu sequencing, deterministic formulas, candidate membership, authorization, persistence và side effects theo TypeSafe build guidance và Campus Coin canonical docs. (`https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “Use code when you can”, “Ask multiple questions together”; `docs/ARCHITECTURE.md` §2, §5, L21–27, L43–47.)

**[Proposal]** Một typed answer chỉ là input cho pure policy function. Policy phải kiểm tra lại owner, status, period HCMC, freshness, active category, domain invariant và user action trước khi cho render hoặc route. JEV không được trả “next action” rồi tự thi hành.

### 2.4. User control, provenance và fallback chung

**[Proposal]** Mọi suggestion/advisory đi theo `propose → inspect → decide → commit`:

1. `propose`: user trigger rõ ràng hoặc mở surface đã opt-in; không gọi mỗi keystroke.
2. `inspect`: phân biệt fact authoritative với typed recommendation; application tự viết localized explanation dựa trên evidence.
3. `decide`: accept/override/dismiss/save/feedback hoặc escalation tùy card.
4. `commit`: chỉ deterministic domain API mới ghi money state.

**[Verified fact]** AI output theo SRS chỉ advisory và user được xem xét/ghi đè; JEV lỗi/low confidence/schema/privacy phải fallback manual. (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65–71; `docs/AI-JEV.md` §5–7, L64–89.)

**[Proposal]** Provenance tối thiểu cho typed artifact: `sourceKind`, `sourceSnapshot/version`, `period` + `Asia/Ho_Chi_Minh` nếu có, `asOf`, `candidate/rubric version`, typed decision, status `fresh|stale|manual|unavailable`, user decision và opaque subject reference. Không lưu raw prompt/response mặc định. Nếu thiếu provenance hoặc source stale, không render như current; fallback deterministic/manual.

---

## 3. Ma trận disposition

| ID | Use case | JEV hữu ích ở đâu | JEV không hữu ích/unsafe ở đâu | Disposition |
|---|---|---|---|---|
| UC-01 | Auto-category | `Choice` category + `Noul` đủ/không đủ để abstain | Không auto-select/submit, không tính amount/date | **Ship capability hiện có, default-off/manual-first** |
| UC-02 | Transaction intent/type | `Choice` finite intent/type + unknown/manual | Không override explicit user type, không authorize | **Defer** |
| UC-03 | Correction classification | `Noul` correction + `Choice` area để route form/help | Không chọn correction role/amount/category hay tạo row | **Defer; reject authority** |
| UC-04 | CSV row classification | Per-row `Choice` category + `Noul` description sufficiency | Không parse/validate amount/date/type, dedupe/import/commit | **Defer cùng CSV** |
| UC-05 | Duplicate detection | Không cần JEV; exact idempotency/matching là code | Semantic JEV matcher dễ false positive và không có authority | **Ship deterministic phase sau; reject JEV detector** |
| UC-06 | Anomaly detection | Không cần JEV để tính baseline/threshold | `Score` anomaly là numeric authority giả, có false positive | **Defer deterministic; reject JEV detector** |
| UC-07 | Monthly report/insight | `Choice` chọn candidate insight đã có evidence; `Noul` support/abstain | Không prose summary, arithmetic, causal explanation | **Report ship deterministic; typed insight defer** |
| UC-08 | Budget status/coaching | Có thể `Choice` chọn bounded coaching candidate sau status code | Không tính used/limit/threshold, không gửi action | **Status ship; typed coaching defer** |
| UC-09 | Next-best action | Không giao JEV chọn next action | Agent-like orchestration và side effect unsafe; code policy đủ | **Ship deterministic navigation; reject JEV NBA** |
| UC-10 | Admin assistance | Phase sau có thể classify masked issue/abstain cho human | Không auto-triage, priority/status, dispute hoặc money action | **Defer bounded assist; reject autonomous** |
| UC-11 | Correction/learning feedback | Có thể ghi nhận typed disposition/quality signal sau user action | Không tự retrain, recategorize history hay thay policy | **Defer** |

> Tên `UC-11` là feedback/learning vì SRS yêu cầu “học từ chỉnh sửa”; nó được tách khỏi correction authority để không nhầm quality signal với money mutation.

---

## 4. Use-case cards

### UC-01 — Auto-category trước submit

**Capability verdict:** `[Verified fact]` Đây là JEV insertion point duy nhất đã có canonical public contract. SRS nêu auto-category và override (`SRS..._vi.md` §1.6, L107–119); `docs/AI-JEV.md` §3, L21–31 và `docs/contracts/openapi.yaml` L338–348, L662–677 giới hạn JEV ở category suggestion. `[Proposal]` System One hữu ích ở classification + abstention, không phải explanation.

- **Trigger:** User đã chọn `income` hoặc `payment`, nhập description và bấm “Gợi ý danh mục”. Không gọi mỗi keystroke; manual picker phải usable trước khi request.
- **Minimal request state:**
  ```json
  {
    "transactionType": "income|payment",
    "descriptionRedacted": "short user-entered description",
    "candidates": [{"id": "opaque-active-category", "label": "short semantic label"}],
    "locale": "en|vi",
    "candidateVersion": "server snapshot",
    "contractVersion": "category-v1"
  }
  ```
  Không gửi amount, date, balance, savings, raw ledger, session, Google claims, secret hoặc PII thừa.
- **Typed questions / primitive:**
  1. `category`: **Choice**, criteria là active candidates đúng `appliesTo` + option `manual_required`; hỏi “Mô tả này phù hợp nhất với category nào trong các candidate, hay cần chọn thủ công?”.
  2. `description_sufficient`: **Noul**, hỏi “Mô tả có đủ thông tin để chọn chắc chắn một candidate không?”. Noul vùng giữa → code abstain/review; Noul không có confidence field riêng.
  3. Không dùng Score: category không có ordered numeric semantics.
- **Typed output:** Choice `{choice, probabilities, confidence}` + Noul `{noul}`. Adapter map thành internal `suggested|manual|disabled|unavailable`; `categoryId` chỉ được nhận nếu thuộc candidate snapshot. Public response hiện chỉ có `status/categoryId/confidence/reasonCode`, nên probabilities là `[Unresolved]` nếu muốn expose ra ngoài (`docs/contracts/openapi.yaml` L669–677).
- **Deterministic code composition:** Validate session/CSRF/flag/length/candidates trước; gọi System One; validate answer schema, option membership, active status, `appliesTo`, request version và threshold; nếu Noul thấp/vùng giữa hoặc Choice=`manual_required` → manual; render label từ current category list; user selection thắng late response; normal `POST /ledger/transactions` mới validate positive VND, date, wallet, idempotency và commit immutable row. JEV không nằm trong money transaction.
- **User control:** `Use this category`, manual override, dismiss, hoặc bỏ qua JEV; Save là thao tác riêng. `confirmedCategorySuggestion` không phải authorization; server revalidate dù user accept.
- **Persistence/provenance:** Suggestion mặc định ephemeral. Nếu đo quality, chỉ lưu masked non-financial event: candidate version, type, status/reason, accept/override/dismiss, timestamp, locale; không raw prompt/response. Transaction/audit chỉ do normal domain commit.
- **Fallback/abstain/escalation:** Flag off, timeout, 4xx/5xx/429, schema mismatch, PII/privacy concern, prompt injection, low/ambiguous confidence, stale candidate → giữ form và manual picker. Không map “gần đúng”; nếu category API/manual path lỗi thì hiện lỗi core, không bịa category. Repeated schema/privacy incident → disable feature/owner review.
- **Metrics:** 100% suggested IDs thuộc active candidate và đúng type; 100% committed row có explicit category review; zero auto-submit/auto-commit; JEV-off completion không kém manual baseline; correct-abstention rate; override rate theo `en|vi × income|payment × category`; stale/invalid/fallback rate; zero raw sensitive payload in logs/events.
- **Disposition:** **Ship capability hiện có sau compatibility/safety gate; default-off, manual-first.** Không mở rộng thành text explanation.

**Old finding được sửa:** `[Verified fact]` FINAL-FINDINGS §3 UC-01, L66–77 đã đúng về typed suggestion/manual fallback. `[Correction]` Handoff cũ vẫn mô tả “source/explanation” như output có thể được JEV cung cấp; theo System One, UI explanation phải do application viết từ category label/status/evidence, không yêu cầu JEV prose. (`docs/working/jev-product-analysis/FINAL-FINDINGS.md` L66–77; `docs/AI-JEV.md` §1, L5–10.)

**Evidence:** `https://docs.typesafe.ai/concepts/system-one` — “How it differs from an LLM”; `https://docs.typesafe.ai/primitives/choice` — “Request structure”, “Choice answer”; `https://docs.typesafe.ai/primitives/noul` — “Reading a Noul”; local `docs/AI-JEV.md` §3–7, L21–89; `docs/contracts/openapi.yaml` L338–348, L662–677.

---

### UC-02 — Transaction intent/type

**Capability verdict:** `[Proposal]` JEV có thể classify description vào finite intent/type để giảm một bước form, nhưng chỉ như prefill suggestion. Đây không phải authorization và không được thay explicit user choice. Domain chỉ cho `income|payment`; không đưa `expense` vào candidate dù SRS dùng từ “chi phí”. (`docs/DOMAIN-MODEL.md` §1, L7–14; `docs/contracts/openapi.yaml` L397–400.)

- **Trigger:** User ở form add transaction, chưa chọn hoặc muốn kiểm tra `income|payment`, chủ động bấm “Gợi ý loại giao dịch”. Không gọi khi user đã explicit chọn type trừ khi user yêu cầu re-check.
- **Minimal request state:** `descriptionRedacted`, `screenContext=add_transaction`, candidate type definitions `{income,payment,manual_or_not_transaction}`, locale; không amount/date/balance/ledger.
- **Typed questions / primitive:**
  1. `transaction_intent`: **Choice** `income`, `payment`, `not_a_transaction`, `manual_required`; criteria mô tả đúng enum canonical.
  2. `is_recordable_transaction`: **Noul** “Text có mô tả một giao dịch user muốn ghi nhận không?”; Noul thấp/vùng giữa → manual.
  3. Không dùng Score vì `income/payment` là category hữu hạn, không phải mức độ.
- **Typed output:** Choice `{choice, probabilities, confidence}` + Noul `{noul}`; output là `suggestedType|manual|not_transaction`, không phải `CreateTransactionRequest` và không có amount/date/category.
- **Deterministic code composition:** Code ưu tiên explicit type user đã chọn; nếu chưa có, chỉ prefill pending form khi Choice hợp lệ, Noul vượt ngưỡng conservative và answer còn fresh; yêu cầu user confirm type; server vẫn kiểm tra enum/category `appliesTo`/amount/date/idempotency. Choice khác user selection không overwrite. Không cho output route thẳng ledger.
- **User control:** User chọn `income` hoặc `payment` bằng control native, đổi lại bất cứ lúc nào, dismiss suggestion; final Save cần review toàn bộ type/category/amount/date.
- **Persistence/provenance:** Ephemeral suggestion; optional masked event ghi trigger, selected/final type, answer status, candidate/rubric version, override; không ghi raw description nếu không cần. Không ghi money state.
- **Fallback/abstain/escalation:** Flag off/unavailable/schema/privacy/injection/ambiguous → manual type picker; conflicting explicit user choice → explicit choice wins, không escalation tự động; type ngoài enum → validation error. Nếu description chứa request correction/transfer/payment authorization → route manual help/correction, không classify thành ledger type.
- **Metrics:** Type suggestion agreement với final user type; override/abstain rate; zero transaction có type ngoài enum; zero type/category mismatch at commit; manual completion parity khi JEV off; no suggestion-induced failed saves.
- **Disposition:** **Defer** đến khi có capability contract riêng; manual type picker và canonical `income|payment` ship độc lập. JEV useful only for classification/abstention, unsafe as type authority.

**Old finding được sửa:** `[Verified fact]` Product Journey cũ gợi ý JEV ở add transaction nhưng chủ yếu nói category (`CC-JEV-PRODUCT-JOURNEY.md` L46–55). `[Correction]` Không được mở rộng “category assistant” thành agent hiểu toàn form; intent/type nếu có chỉ là một Choice bounded, không để JEV suy đoán amount/date hay tự chọn next action.

**Evidence:** `https://docs.typesafe.ai/concepts/state` — “Separate content from questions”; `https://docs.typesafe.ai/primitives/choice`; `https://docs.typesafe.ai/primitives/noul`; local `docs/contracts/openapi.yaml` L397–400, L440–449; `docs/DOMAIN-MODEL.md` §4, L54–67.

---

### UC-03 — Correction classification

**Capability verdict:** `[Proposal]` JEV có thể classify **ý định và vùng vấn đề** của user để mở đúng manual help/correction screen. `[Verified fact]` JEV không được chọn correction role, amount, category, target hoặc tạo correction. Ledger correction là append-only domain command; API review còn yêu cầu chốt public reversal vs internal `adjustment|replacement`. (`docs/DOMAIN-MODEL.md` §5, L83–85; `docs/contracts/API-REVIEW.md` §Ledger correction, L23–30.)

- **Trigger:** User viết issue/help text hoặc bấm “Tôi muốn sửa giao dịch”; user chủ động yêu cầu phân loại hỗ trợ. Không gọi trong correction transaction và không gọi để tự sửa history.
- **Minimal request state:** `messageRedacted`, optional opaque `targetContext=history|correction_help`, finite areas `category|amount|occurred_at|possible_duplicate|other`, locale. Không gửi raw ledger, full transaction, balance, session hoặc correction command.
- **Typed questions / primitive:**
  1. `is_correction_request`: **Noul**, “User đang yêu cầu sửa một bản ghi đã ghi nhận, thay vì chỉ hỏi thông tin?”
  2. `correction_area`: **Choice** `category`, `amount`, `occurred_at`, `possible_duplicate`, `other`, `manual_required`.
  3. Không dùng Score để suy ra severity hoặc role; priority/correction semantics do code/admin policy.
- **Typed output:** `{isCorrection: noul, area: choice, probabilities, confidence}`; đây chỉ là route hint. Không có `correctionRole`, `newAmountVnd`, `newCategoryId` hoặc mutation command trong output.
- **Deterministic code composition:** Validate owner/target ở server; nếu Noul và Choice đạt threshold thì preselect help tab, không submit; map `area` sang form field/help copy do application localization; user tự chọn target/reason; normal correction endpoint revalidates ownership, role policy, idempotency and append-only invariant. Nếu target không tồn tại/không thuộc owner → 404/403 theo contract, không để JEV suy đoán.
- **User control:** User xác nhận target, reason và correction form; có thể đổi area, mở issue hoặc bỏ qua; admin không accept thay user.
- **Persistence/provenance:** Optional masked routing event: opaque target, area, decision, policy version, actor/time; correction row/audit chỉ domain ghi. Không lưu raw message/JEV response mặc định.
- **Fallback/abstain/escalation:** Noul vùng giữa, Choice manual/other, privacy/injection, malformed output → manual correction menu + static help. Ambiguous financial dispute hoặc possible integrity issue → human/support escalation; không tự chọn reversal/adjustment/replacement. Correction policy chưa chốt → giữ manual/support, không “guess role”.
- **Metrics:** Route-to-correct-form rate; manual correction completion; abstention/escalation safety; zero JEV-created correction; zero original row mutation; zero wrong-owner target exposure; zero role/amount/category injected into command.
- **Disposition:** **Defer bounded classification; reject correction authority.** Ship deterministic correction path trước.

**Old finding được sửa:** `[Verified fact]` FINAL-FINDINGS UC-04, L49–50 đúng khi nói JEV không làm correction authority. `[Correction]` Cách diễn đạt “lineage explainer/narrative” (FINAL-FINDINGS L79–90; `CC-JEV-PRODUCT-JOURNEY.md` L49–50) phải đổi thành typed route classification hoặc application-written static explanation; System One không sinh prose lineage.

**Evidence:** `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “Decompose the questions”, “Keep control flow… in code”; `https://docs.typesafe.ai/primitives/noul`; `https://docs.typesafe.ai/primitives/choice`; local `docs/DOMAIN-MODEL.md` §3, §5, L50–52, L83–85; `docs/contracts/API-REVIEW.md` L23–30; `docs/contracts/openapi.yaml` L138–152, L450–458.

---

### UC-04 — CSV row classification

**Capability verdict:** `[Verified fact]` SRS có CSV import và batch category suggestion nhưng canonical PRD/architecture loại CSV khỏi MVP (`SRS..._vi.md` §1.5–1.6, L65–84, L113–119; `docs/PRD.md` §5, L65–67; `docs/ARCHITECTURE.md` §8, L67–69). `[Proposal]` Khi có import contract, System One hữu ích ở **row-level category classification + abstention**, không phải parser/import agent.

- **Trigger:** Chỉ sau upload bounded file, parse/map/validate deterministic vào staging preview. JEV không nhận raw file và không tự commit.
- **Minimal request state mỗi row:** `rowId` opaque, `transactionType` đã deterministic-validated (`income|payment`), `descriptionRedacted`, active category candidates đúng `appliesTo`, `locale`, `candidateVersion`. Amount/date chỉ ở staging của application; không gửi vào question nếu category không cần.
- **Typed questions / primitive:**
  1. `row_category`: **Choice** active candidate IDs + `manual_required`.
  2. `description_sufficient`: **Noul**, “Description có đủ bằng chứng để chọn một candidate không?”
  3. Không dùng Score để tính chất lượng import, amount hay date.
- **Typed output:** Per-row `{categoryChoice, probabilities, confidence, sufficient:noul}`; app map thành `suggested|manual|abstain|invalid|duplicate` nhưng `invalid/duplicate` phải do deterministic parser/matcher xác định, không lấy từ JEV.
- **Deterministic code composition:** Parse size/encoding/header/column map/type/date/positive integer VND/owner/idempotency trước; gọi JEV chỉ với row đủ điều kiện; validate answer membership/status/type/freshness; low/ambiguous → manual; user preview/override/skip; import service revalidate all rows and calls normal ledger domain after explicit batch confirmation. Không giữ money transaction trong lúc JEV chạy.
- **User control:** Map columns, sửa row, accept/override/skip từng row hoặc group theo contract, xem provenance, confirm batch; unresolved rows không tự commit.
- **Persistence/provenance:** Staging job/file opaque ID, row ID, parser/schema/candidate version, typed status, reviewer decision, import idempotency và ledger references sau commit. Raw file/raw prompt retention là `[Unresolved]`; không lưu raw JEV output mặc định.
- **Fallback/abstain/escalation:** JEV disabled/unavailable/timeout/schema/privacy/low confidence → preview + manual picker; parse error → row-level actionable error; file unsafe/oversized → reject trước JEV; job error → retry/cancel trước commit; no silent drop/duplicate. Ambiguous money fields escalate to manual review, never ask JEV to repair.
- **Metrics:** Zero silent row loss; zero duplicate commit on retry; 100% committed rows explicit reviewed; 100% category IDs active/correct type; per-row abstention/override/manual rate; invalid/duplicate rates from code; import completion time vs manual baseline; zero JEV-authoritative amount/date/type.
- **Disposition:** **Defer cùng CSV.** Deterministic parser/staging/preview phải tồn tại trước; row category JEV chỉ phase sau.

**Old finding được sửa:** `[Verified fact]` Transaction Automation cũ đã tách parser deterministic và row-level suggestion (`CC-JEV-TRANSACTION-AUTOMATION.md` L223–283). `[Correction]` Cụm “suggestion/error reason” phải là typed status + application localization; JEV không tạo preview prose hay batch summary. `FINAL-FINDINGS.md` L92–103 đúng về review/commit boundary nhưng cần gắn rõ `Choice/Noul`, không phải LLM narrative.

**Evidence:** `https://docs.typesafe.ai/concepts/state`; `https://docs.typesafe.ai/primitives/choice`; `https://docs.typesafe.ai/primitives/noul`; local `docs/working/jev-product-analysis/CC-JEV-TRANSACTION-AUTOMATION.md` L223–283; `docs/PRD.md` §5, L65–67.

---

### UC-05 — Duplicate detection

**Capability verdict:** `[Verified fact]` Duplicate detection là matching/idempotency/read-model problem, không phải JEV prose/classification cần thiết. Exact same idempotency key/body phải do domain xử lý; cross-owner matching bị cấm. (`docs/DOMAIN-MODEL.md` §4, L60–64; `docs/contracts/API-REVIEW.md` L39–44.)

- **Trigger:** Pre-submit preflight hoặc post-commit history scanner khi có deterministic candidate match. Network retry cùng idempotency key/body là replay semantics riêng.
- **Minimal request state:** **Không tạo System One state trong shipped design.** Code dùng owner-scoped validated fields: type, positive amount, category, HCMC occurred time, normalized description, idempotency/body fingerprint và bounded own-record candidates.
- **Typed questions / primitive:** **Không có — code-only by design.** Không dùng Noul “có vẻ trùng” hay Score similarity; JEV semantic similarity không thay exact idempotency và sẽ làm tăng false positive. Nếu future experiment muốn kiểm tra một hypothesis, Noul chỉ được xem là signal phụ trợ, không được nằm trên commit path; chưa được phép dùng.
- **Typed output:** Deterministic `same_idempotent_replay|possible_duplicate|no_signal|cannot_verify`, matched own reference, rule/fingerprint version, comparedAt/freshness. Không có JEV answer.
- **Deterministic code composition:** Check idempotency before existence; compute fingerprint/rules; recheck race at commit; high-signal warning không block wallet-sufficient payment; async scanner tạo read-only review signal; không delete/merge/reverse/refund.
- **User control:** Xem matched own record, dismiss/mark expected, sửa rồi submit, hoặc proceed explicit nếu invariants pass; correction qua normal append-only flow.
- **Persistence/provenance:** Idempotency record theo contract; optional read-model event lưu own refs, rule version, comparedAt, freshness, disposition. Existing ledger immutable. Schema/threshold/retention là `[Unresolved]`.
- **Fallback/abstain/escalation:** History stale/unavailable/race ambiguity → `cannot_verify`, cho manual review; exact idempotency vẫn deterministic. Không dùng JEV để bù dữ liệu thiếu. Nghi ngờ integrity → issue/support, không auto-action.
- **Metrics:** Zero duplicate cùng key/body; zero valid wallet-sufficient payment blocked bởi heuristic; high-signal precision/matched-reference coverage; false-positive dismiss/proceed; stale rate; zero auto-delete/merge/reversal.
- **Disposition:** **Ship/defer deterministic detector theo contract; reject JEV detector.** Trong MVP chỉ giữ idempotency guarantee canonical nếu heuristic read model chưa có.

**Old finding được sửa:** `[Verified fact]` FINAL-FINDINGS UC-04, L105–116 và Transaction Automation L285–345 đã kết luận reject JEV detector. `[Correction]` Cần bỏ mọi framing “JEV có thể semantic matcher”; System One `Choice/Noul/Score` không làm duplicate proof, và confidence không biến similarity thành authority.

**Evidence:** `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “Use code when you can”; `https://docs.typesafe.ai/confidence` — thresholds depend on stakes; local `docs/DOMAIN-MODEL.md` §4, L54–67; `docs/working/jev-product-analysis/FINAL-FINDINGS.md` L105–116.

---

### UC-06 — Anomaly detection

**Capability verdict:** `[Verified fact]` Anomaly flag cần baseline, arithmetic/aggregation, data sufficiency, freshness và rule version từ dữ liệu của chính user; SRS chỉ nêu optional intelligence, canonical chưa có anomaly contract. (`SRS..._vi.md` §1.6, L161–166; `docs/PRD.md` §5, L65–67.) `[Proposal]` JEV không làm detector; Score ở đây là unsafe vì tạo ảo giác numeric anomaly authority.

- **Trigger:** Sau committed row hoặc user mở history/dashboard khi deterministic read model có baseline đủ; không chạy để freeze/reject payment.
- **Minimal request state:** **Không có System One request trong shipped design.** Code dùng committed own transaction features, HCMC period, per-user aggregates, baseline/min-history/freshness/rule version.
- **Typed questions / primitive:** **Không áp dụng — code-only.** Không dùng Score cho `anomalyScore`, không dùng Noul cho `is_fraud`, không dùng Choice để gắn accusation. Nếu phase tương lai cần application-written explanation, phải có contract riêng; JEV chỉ có thể classify một bounded candidate sau khi code đã quyết định flag, không phải detector.
- **Typed output:** Deterministic `no_signal|possible_anomaly|insufficient_or_stale`; reason code trung tính như `higher_than_own_baseline`, period/baseline/as-of. Không gọi fraud/theft.
- **Deterministic code composition:** Reconcile/rebuild; enforce owner, HCMC, minimum history, baseline and freshness; calculate signal in code; persist derived read model after commit; never alter report/wallet/budget/payment. Corrections/new rows invalidate/recompute signal.
- **User control:** Xem transaction và basis, dismiss/mark expected, feedback/issue, mở correction append-only nếu row sai; không Auto-fix.
- **Persistence/provenance:** Owner-scoped target ref, rule/baseline version, observation period, derived feature refs, generatedAt, freshness, disposition; schema/job/retention `[Unresolved]`.
- **Fallback/abstain/escalation:** Sparse history, stale/mismatch, worker error → `insufficient_or_stale` hoặc ẩn flag; JEV off không ảnh hưởng money path. Security/integrity concern → human issue; không gọi fraud.
- **Metrics:** Zero payment freeze/reject/auto-reversal; 100% flags có basis/period/freshness; user-confirmed precision; false-positive/dismiss rate; insufficient/stale rate; zero cross-user inference.
- **Disposition:** **Defer deterministic anomaly phase; reject JEV detector/authority.**

**Old finding được sửa:** `[Verified fact]` Old report đã nói deterministic-first (`FINAL-FINDINGS.md` L118–129). `[Correction]` Các card cũ vẫn để ngỏ “JEV giải thích anomaly” theo kiểu narrative; System One không viết explanation. Chỉ application template từ structured reason, hoặc không hiển thị khi thiếu evidence; không có “JEV anomaly score”.

**Evidence:** `https://docs.typesafe.ai/primitives/score` — Score là ordered rubric, không phải arbitrary anomaly probability; `https://docs.typesafe.ai/confidence`; local `docs/working/jev-product-analysis/CC-JEV-TRANSACTION-AUTOMATION.md` L347–406; `docs/DOMAIN-MODEL.md` §4, L54–67.

---

### UC-07 — Monthly report / insight

**Capability verdict:** `[Verified fact]` Monthly report hiện là deterministic `/reports/monthly`, gồm month HCMC, opening/total income/total payment/closing và category breakdown (`docs/contracts/openapi.yaml` L246–254, L585–601). SRS mô tả AI summary/insight nhưng canonical PRD/AI-JEV defer complex prose (`SRS..._vi.md` §1.6, L120–133; `docs/AI-JEV.md` §8, L91–93). `[Proposal]` Nếu mở phase sau, JEV chỉ chọn/rank **candidate insight đã được code tạo**, còn application viết copy từ candidate/evidence.

- **Trigger:** User mở report month hoặc bấm “Điều đáng chú ý” sau khi deterministic report snapshot đã load; không gọi JEV để thay report calculation.
- **Minimal request state:**
  ```text
  month: YYYY-MM
  timezone: Asia/Ho_Chi_Minh
  sourceSnapshotVersion: opaque
  candidateInsights: [{id, type, evidenceRefs, supportedByCodeFacts, appLabel}]
  dataSufficiency: sufficient|insufficient|stale
  locale: en|vi
  ```
  `candidateInsights` do code tạo từ facts; không gửi raw ledger, raw descriptions, session hoặc provider instruction.
- **Typed questions / primitive:**
  1. `selected_insight`: **Choice** candidate IDs + `none`; “Candidate nào (nếu có) được facts hỗ trợ và phù hợp với surface này?”.
  2. `facts_support_one`: **Noul**, “Có đủ evidence trong snapshot để hiển thị một candidate mà không suy đoán nguyên nhân không?”.
  3. Không dùng Score cho “importance” khi chưa có ordered rubric; `totalPaymentVnd`, delta và ranking số do code tính.
- **Typed output:** Choice `{choice, probabilities, confidence}` + Noul `{noul}`. Output là candidate ID/`none`, evidence refs và status do code gắn; **không có summary text, causal explanation hoặc advice text từ JEV**.
- **Deterministic code composition:** Report service tính và freeze facts; candidate generator xác định facts/delta/evidence; adapter validates selected ID/support/freshness; code threshold + source checks; application map candidate ID sang localized sentence/template và link table/chart; source mismatch hoặc stale → no insight. Không để JEV tính totals, closing balance, budget, trend hoặc nguyên nhân.
- **User control:** Mở evidence table/chart, dismiss, save/pin, feedback, refresh; không có Apply-to-wallet/budget/payment. UI label tách `Số liệu từ báo cáo` và `Gợi ý tham khảo`, do application localization viết.
- **Persistence/provenance:** Report authoritative theo existing contract. Future insight snapshot có source snapshot/version, month/timezone, candidate ID, evidence refs, generatedAt/policy version, stale/superseded state và user decision; raw JEV request/response không lưu. SRS `Insight` table chỉ minh họa, không canonical (`SRS..._vi.md` §1.8, L282–295).
- **Fallback/abstain/escalation:** Report unavailable/stale/insufficient, answer `none`, low confidence, Noul vùng giữa, schema/candidate mismatch → render deterministic report/table + app-written “chưa đủ dữ liệu”; không zero giả, không prose fallback do model. Repeated unsupported candidate → feature off/review.
- **Metrics:** 100% displayed claims map tới source evidence; zero mismatch với report; candidate precision/abstention; source-open/comprehension/dismiss/feedback; stale suppression rate; zero authoritative totals generated by JEV; report works identically when JEV off.
- **Disposition:** **Ship deterministic report; defer typed insight capability** đến khi có snapshot/provenance/stale/persistence contract riêng. Reject JEV prose summary.

**Old finding được sửa (trọng tâm):** `[Verified fact]` FINAL-FINDINGS §1.1–1.2, L15–36 và UC-06, L131–142 gọi insertion point sau report là “monthly narrative/summary” và mô tả JEV “diễn đạt observation”. `[Correction]` System One không sinh text hay reasoning. Đúng capability là JEV `Choice/Noul` chọn candidate insight/abstain; application viết câu localized từ candidate + evidence. Đây là correction bắt buộc cho old product-analysis finding.

**Evidence:** `https://docs.typesafe.ai/concepts/system-one`; `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “Decompose the questions”, “Ask independent questions together, then compose their answers in code”; `https://docs.typesafe.ai/primitives/choice`; `https://docs.typesafe.ai/primitives/noul`; local `docs/contracts/openapi.yaml` L246–254, L585–601; `docs/AI-JEV.md` §8, L91–93.

---

### UC-08 — Budget status/coaching

**Capability verdict:** `[Verified fact]` Budget status (`limitVnd`, `usedVnd`, `isOverrun`, month) và warning là deterministic; overrun không authorize/reject payment. (`docs/contracts/openapi.yaml` L215–245, L559–584; `docs/DOMAIN-MODEL.md` §4, L48–67.) `[Proposal]` JEV có thể chọn một bounded coaching candidate sau khi code đã quyết định status, nhưng không được tính status/threshold hay viết câu coaching.

- **Trigger:** User mở budget/dashboard sau `BudgetSummary`, hoặc code phát hiện status đã chốt sau commit. JEV không phát hiện threshold và không chạy trong payment transaction.
- **Minimal request state:** `budgetStatus=under_limit|near_limit|overrun` (do code tính), `categoryLabel`, `month=YYYY-MM`, `availableCoachingCandidates=[review_transactions, review_budget, learn_more, none]`, `sourceSnapshotVersion`, locale. Không cần gửi raw rows, wallet, savings hay amount; used/limit hiển thị authoritative từ API, không phải JEV input để tính lại.
- **Typed questions / primitive:**
  1. `coaching_candidate`: **Choice** bounded candidates + `none`; hỏi candidate nào phù hợp với status đã cho.
  2. `is_coaching_supported`: **Noul**, “Snapshot có đủ dữ liệu để hiển thị một coaching candidate trung tính, không gây áp lực không?”.
  3. Không dùng Score cho progress/percentage/financial urgency; progress/status/near-limit threshold do code.
- **Typed output:** Choice + Noul; code map candidate ID sang static localized copy và read-only CTA. Không có `usedVnd` mới, threshold mới, budget mutation hay prose.
- **Deterministic code composition:** Budget service tính exact facts/threshold/dedupe; app tạo candidate allowlist; validate typed answer/status/freshness; only render app template if supported; CTA chỉ mở report/budget/transactions. Budget warning vẫn hiện nếu JEV unavailable; payment domain xử lý wallet sufficiency độc lập.
- **User control:** Dismiss/read/snooze/feedback coaching; mở budget/form để user tự sửa và confirm; không có Apply coaching, auto-upsert budget, payment hay savings transfer.
- **Persistence/provenance:** Budget source response giữ theo canonical contract. Future coaching artifact lưu source budget snapshot, month/category/status, candidate ID, generatedAt, stale/resolved state và user action; notification/interaction schema, throttle/retention `[Unresolved]`.
- **Fallback/abstain/escalation:** Status missing/stale, no near-limit policy, Noul uncertain, Choice `none`, schema/timeout → exact progress + deterministic warning/static copy; không gọi JEV để bù. Unsafe/shaming candidate → suppress và neutral copy; repeated issue → kill feature.
- **Metrics:** Zero payment rejection/mutation due coaching; status/used/limit UI parity 100%; candidate support precision/abstention; source-open/review action; dismiss/noise rate; stale suppression; budget path parity JEV off/on.
- **Disposition:** **Ship deterministic budget status/warning; defer typed coaching.** Reject JEV calculation, threshold and authorization.

**Old finding được sửa:** `[Verified fact]` Old report đúng khi xếp warning deterministic trước coaching (`FINAL-FINDINGS.md` L170–181). `[Correction]` Cụm “JEV chỉ viết câu ‘Bạn có thể xem lại…’” phải thay bằng Choice/Noul candidate; sentence đó là application template. JEV không phải contextual prose writer và không chọn next action trực tiếp.

**Evidence:** `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — code owns rules/side effects; `https://docs.typesafe.ai/primitives/choice`; `https://docs.typesafe.ai/primitives/noul`; local `docs/contracts/openapi.yaml` L559–584; `docs/DOMAIN-MODEL.md` §4, L54–67.

---

### UC-09 — Next-best action (NBA)

**Capability verdict:** `[Verified fact]` System One không phải agent và không tự chọn bước tiếp theo; TypeSafe yêu cầu code giữ control flow. `[Verified fact]` Campus Coin NBA candidate chỉ được mở read-only screen/form; money action vẫn normal auth/CSRF/idempotency/review. (`https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “System One is TypeSafe’s model for building AI-powered software, not agents”; `docs/working/jev-product-analysis/FINAL-FINDINGS.md` L183–194.)

- **Trigger:** Dashboard/report/budget facts đã load; application có thể hiển thị một CTA allowlist theo policy deterministic.
- **Minimal request state:** **Không có JEV state trong shipped design.** Code dùng `budgetExists/status`, report availability, recent activity, route, locale, dismiss state và allowlisted actions.
- **Typed questions / primitive:** **Không áp dụng — code-only by design.** Không dùng Choice để giao cho model chọn `view_report/review_budget/record_income`; không dùng Noul/Score để suy đoán “best” hoặc mục tiêu tài chính.
- **Typed output:** Deterministic `{actionId, appReasonKey, sourceSnapshot, freshness}`; `actionId` phải từ allowlist. Không có JEV answer/prose.
- **Deterministic code composition:** Policy pure function xếp action theo missing setup/attention; app render localized reason key và route; click chỉ navigation/open form; final mutation qua normal API. Stale source → recompute/hide. Không có model loop/tool call.
- **User control:** Click explicit, dismiss, save/pin/feedback nếu product có contract; dismiss không lặp cùng snapshot; user tự review trước mọi money action.
- **Persistence/provenance:** Optional impression/click/completion/dismiss event với source snapshot/route/locale; không money state; analytics schema/retention `[Unresolved]`.
- **Fallback/abstain/escalation:** State thiếu/stale → không show NBA hoặc static “Xem báo cáo”; no random action; JEV unavailable irrelevant. Nếu action đụng payment/savings/budget mutation → route normal form/confirmation, không escalate cho model.
- **Metrics:** Time-to-next-useful-screen; completion của read/review action; dismiss/irrelevance; zero unintended submit/payment/savings transfer; no repeated stale CTA; JEV-off parity (100% because no JEV).
- **Disposition:** **Ship deterministic navigation nếu product cần; reject JEV NBA/agent orchestration.**

**Old finding được sửa:** `[Verified fact]` FINAL-FINDINGS UC-10, L183–194 đã nói deterministic allowlist trước, JEV chỉ diễn đạt lý do. `[Correction]` “JEV chỉ diễn đạt lý do” vẫn giả định prose. NBA phải dùng `appReasonKey`/template do code chọn; không có JEV invocation và không để model “chọn next action”.

**Evidence:** `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — “AI-powered software” and “Use code when you can”; local `docs/ARCHITECTURE.md` §2, L21–27; `docs/working/jev-product-analysis/FINAL-FINDINGS.md` L183–194.

---

### UC-10 — Admin assistance

**Capability verdict:** `[Verified fact]` Admin/support chỉ triage issue đã mask, status/priority/note theo least privilege; không sửa ledger/balance/audit và không có JEV authority. (`docs/ADMIN-OPERATIONS.md` §1–7, L3–51; `docs/contracts/API-REVIEW.md` §Admin, L14–21.) `[Proposal]` Một future, human-in-the-loop classifier trên masked issue có thể giảm routing work; không được auto-triage, auto-close, đổi priority hoặc xử lý dispute.

- **Trigger:** Admin mở issue đã validate/mask; nếu có future assist thì admin explicit bấm “Gợi ý vùng xử lý”, không chạy ngầm trên toàn queue.
- **Minimal request state:** `issueTitleRedacted`, `issueDescriptionRedacted`, allowed `issueAreas=[access, ui, ledger_or_payment, category, other]`, optional safe context `hasRelatedTransaction=true|false` (không target details), locale, rubric version. Không gửi raw ledger/balance/audit/secret/Google claims/PII.
- **Typed questions / primitive:**
  1. `issue_area`: **Choice** allowed areas + `manual_review`.
  2. `is_integrity_or_security_signal`: **Noul**, “Issue có dấu hiệu cần security/owner escalation theo rubric không?”.
  3. `urgency`: **Score không chọn** trong shipped design; P0/P1/P2 policy và escalation do deterministic/admin confirmation, vì model không được tự đổi priority.
- **Typed output:** `{area: choice, integritySignal: noul, probabilities/confidence}` + `manual_review`/`escalate_for_human_review` status do code. Output chỉ là triage hint, không phải issue mutation.
- **Deterministic code composition:** Validate admin role and masked input; validate output; display suggested queue/filter with “human review required”; admin explicitly confirms/edits status/priority/assignment; audit records actor/reason/outcome. P0/P1/P2 runbook and security escalation remain deterministic/human. No JEV access to money authority.
- **User/admin control:** Admin reviews suggestion, accepts/edits/dismisses; support can request more information; security/owner decides incident. User issue remains append-only; JEV never acts as user/admin.
- **Persistence/provenance:** Masked suggestion event with issue opaque ID, rubric/candidate version, typed result, confidence/probabilities, admin decision, actor/time; no raw prompt/response or financial detail. Existing issue/audit canonical stores remain authoritative.
- **Fallback/abstain/escalation:** Feature flag off, role/privacy failure, malformed/low confidence, integrity/security signal, ambiguous issue → deterministic queue/manual triage and security escalation; no guessed priority. JEV failure never blocks issue submission or admin queue. P0 integrity incident → disable assist and preserve evidence.
- **Metrics:** 100% admin decisions explicit/human-confirmed; zero unauthorized raw-data exposure; zero auto-close/priority mutation/money action; routing agreement and abstention; escalation recall for synthetic security cases; issue resolution time only as secondary product metric; JEV-off queue works.
- **Disposition:** **Defer bounded masked classification only after role/privacy/audit contract; reject autonomous admin triage, dispute decisions and all money action.**

**Old finding được sửa:** `[Verified fact]` Old report correctly rejects autonomous admin JEV (`FINAL-FINDINGS.md` L23–25, L58; `CC-JEV-INSIGHT-COACH.md` L180–191). `[Correction]` Không nên gọi future output là “JEV triage” hay admin narrative; nếu được duyệt, chỉ là typed queue hint + abstention để admin quyết định, không phải agent orchestration.

**Evidence:** `https://docs.typesafe.ai/concepts/system-one` — typed decisions rather than generated replies; `https://docs.typesafe.ai/primitives/choice`; `https://docs.typesafe.ai/primitives/noul`; local `docs/ADMIN-OPERATIONS.md` §1–7, L3–51; `docs/contracts/openapi.yaml` L282–338.

---

### UC-11 — Correction/override feedback và learning signal

**Capability verdict:** `[Verified fact]` SRS muốn hệ thống học từ chỉnh sửa; canonical ledger correction vẫn append-only và không được silent recategorize lịch sử (`SRS..._vi.md` §1.6, L113–119; `docs/DOMAIN-MODEL.md` §5, L83–85). `[Proposal]` System One có thể cung cấp typed classification cho **feedback disposition** sau user action, nhưng learning/rule update do code/offline pipeline; không đưa correction event vào JEV như command.

- **Trigger:** User accept/override/dismiss category suggestion hoặc hoàn tất correction/feedback form; capture post-submit/async, không trong money transaction.
- **Minimal request state:** Thường **không cần gọi JEV** để ghi event. Nếu future quality review cần classify feedback text, state chỉ gồm `feedbackRedacted`, `suggestedCategory`, `finalCategory`, `eventKind`, candidate/rubric version, locale; không raw ledger, amount/balance, secret hoặc correction command.
- **Typed questions / primitive:**
  1. `feedback_disposition`: **Choice** `accepted`, `overridden`, `dismissed`, `wrong_context`, `unsafe_or_privacy`, `manual_review`.
  2. `is_feedback_about_category`: **Noul** nếu feedback text tự do cần tách category feedback với unrelated issue.
  3. Không dùng Score để tự đánh giá model quality bằng một số rồi tự retrain.
- **Typed output:** Choice + Noul; output là quality/event label. Không có “learn now”, model update, recategorization, correction role hay money mutation.
- **Deterministic code composition:** Code xác định user/owner/target/event; if existing UI action already structured, ghi event trực tiếp, không cần JEV; if future text classification, validate answer and threshold; append-only quality event; aggregate offline theo policy/version/consent; future suggestion ranking có thể dùng aggregate nhưng mỗi new suggestion vẫn candidate validation + user confirmation. Correction domain riêng tạo row mới; original immutable.
- **User control:** Accept/override/dismiss/correction reason; user được biết feedback có được dùng cho quality hay không nếu policy chốt; opt-out nếu có consent contract; không hứa retrain hoặc “đã học ngay”.
- **Persistence/provenance:** Append-only event gồm source suggestion/event, before/after category, disposition, candidate/rule version, owner scope, actor/time; retention/consent/export/delete/model adaptation `[Unresolved]`. Không raw prompt/response.
- **Fallback/abstain/escalation:** No feedback store/consent/policy, malformed/ambiguous text, privacy concern → retain manual event or do not classify; no learning update. Learning job failure cannot mutate ledger; correction remains available. Repeated cross-user/privacy concern → disable adaptation and owner review.
- **Metrics:** 100% original rows immutable; 100% feedback traceable; zero raw sensitive payload; zero automatic historical recategorization; structured event idempotency; correct-abstention rate; override trend on holdout only after evaluation; no reduction in manual safety/completion.
- **Disposition:** **Defer.** MVP may capture only explicitly approved structured instrumentation; reject autonomous learning, silent recategorization and correction mutation.

**Old finding được sửa:** `[Verified fact]` FINAL-FINDINGS UC-02, L79–90 và Transaction Automation L161–221 đã phân biệt feedback với correction. `[Correction]` Không nên nói “JEV sẽ cải thiện/ranking tương lai” như một behavior mặc định; System One chỉ trả typed judgment từng request, không tự học trong workflow. Any adaptation is a separate deterministic/offline product decision with its own evidence, consent and versioning.

**Evidence:** `https://docs.typesafe.ai/concepts/how-to-build-with-system-one` — independent questions and code composition; `https://docs.typesafe.ai/primitives/choice`; `https://docs.typesafe.ai/primitives/noul`; local `docs/DOMAIN-MODEL.md` §3, §5, L50–52, L83–85; `docs/working/jev-product-analysis/CC-JEV-TRANSACTION-AUTOMATION.md` L161–221.

---

## 5. Các use case không thuộc 11 card và không được suy diễn

**[Verified fact]** Forecasting/prediction, chat, complex AI summary, autonomous action và CSV/PDF đã bị canonical scope-cut hoặc defer; không được tạo thêm card ngầm từ SRS rộng. (`docs/PRD.md` §5, L65–67; `docs/AI-JEV.md` §8, L91–93; `docs/ARCHITECTURE.md` §8, L67–69.)

**[Proposal]** Nếu sau này có forecast, nó cần một numeric model/range/uncertainty contract trước; JEV không tính amount/date/balance và không biến estimate thành authorization. Nếu sau này có report prose, dùng application template hoặc text system riêng được phê duyệt; không gọi System One typed decisions là prose generator.

**[Unresolved]** Chưa có canonical schema cho intent/type, correction classification, CSV job/row, duplicate/anomaly read model, insight artifact, coaching interaction, NBA analytics, admin assist hoặc feedback adaptation. Handoff này không mở endpoint/schema và không biến các proposal thành canonical.

---

## 6. Explicit corrections to `jev-product-analysis`

| Old finding | Điều đúng cần giữ | Correction do System One boundary |
|---|---|---|
| `FINAL-FINDINGS.md` §1.1–1.2, L15–36: ngoài auto-category, JEV có fit ở monthly narrative, explanation, coaching và NBA; §5 UC-06/07/08/09 mô tả JEV “diễn đạt” facts | Deterministic facts trước, user control, provenance, stale và fallback là đúng | System One **không viết narrative/prose/reasoning**. Thay bằng typed `Choice/Noul` trên candidate facts; application tự map candidate → localized copy; NBA không gọi JEV vì code giữ control flow |
| `FINAL-FINDINGS.md` UC-01, L66–77: typed category suggestion, manual fallback, explicit confirmation | Đây là boundary hợp lệ và ship candidate duy nhất | Bổ sung independent `Choice` + optional `Noul` sufficiency, validate probability/confidence server-side; current public response chưa có full probabilities |
| `FINAL-FINDINGS.md` UC-03, L92–103: CSV row-level suggestion sau parse/validation | JEV chỉ nên chạy từng row sau deterministic staging | Gọi rõ `Choice` category + `Noul` description sufficiency; `invalid`, `duplicate`, amount/date/type và import commit không phải JEV outputs |
| `FINAL-FINDINGS.md` UC-04/05, L105–129: duplicate/anomaly deterministic-first | Kết luận này đúng | Làm rõ **không có System One request** trong shipped detector; Score/Noul không được dùng để tạo false authority, fraud label hoặc block payment |
| `FINAL-FINDINGS.md` UC-10, L183–194: allowlist deterministic, JEV diễn đạt reason | Allowlist và explicit click đúng | “JEV diễn đạt reason” được thay bằng deterministic `appReasonKey`; JEV không chọn next action |
| `FINAL-FINDINGS.md` L243–282: provenance, stale, fallback, control | Đây là prerequisites đúng | Provenance của typed decision lưu `choice/noul/score`, probabilities/confidence nếu cần; không có raw/prose artifact do JEV sinh |
| `CC-JEV-INSIGHT-COACH.md` L38–44, L93–106, L138–151 | Facts authoritative và coaching không mutate money state | Coaching/summary candidate chỉ là typed selection/abstention; app copy tĩnh/localized; không yêu cầu JEV trả câu ngắn |
| `CC-JEV-TRANSACTION-AUTOMATION.md` L100–159, L223–283 | Auto-category/CSV cần candidate set, review, fallback | Câu hỏi phải atomic và độc lập; “error reason”/preview text do application; JEV không parse raw file hay generate batch narrative |
| `CC-JEV-SAFETY-UX-DOMAIN.md` L117–126, L196–220 | Fact-vs-advisory, source link, user control là đúng | Explanation contract phải được application viết; TypeSafe không có reasoning/explanation output để lưu/render |

**Kết luận correction:** Old product-analysis report thường giữ đúng safety boundary nhưng vẫn dùng ngôn ngữ của LLM prose (“narrative”, “diễn đạt”, “viết câu”, “giải thích”). File này thay các vai trò đó bằng ba primitive thật: `Choice` cho finite classification/ranking candidate, `Noul` cho yes/no support/abstention, `Score` chỉ khi ordered numeric semantics được chứng minh. Mọi sequencing, threshold, arithmetic, report/budget facts, candidate membership, authorization, persistence và side effect vẫn thuộc code.

---

## 7. Release gates cho bất kỳ typed JEV capability nào

**[Proposal]** Chỉ bật một card có JEV khi tất cả điều kiện sau được chứng minh cho chính card đó:

1. State tối thiểu, redaction và owner boundary không gửi raw ledger/balance/savings/secret/PII thừa.
2. Questions atomic, criteria finite/ordered rõ; primitive khớp semantics; không dùng prose parsing.
3. Adapter validate answer type, probabilities/confidence/noul range, candidate/rubric membership và request freshness.
4. Code có deterministic threshold, composition, authorization, persistence và side-effect boundary; không có hidden loop/agent behavior.
5. User thấy source/fact-vs-suggestion và có accept/override/dismiss/manual path phù hợp.
6. Low/medium/ambiguous confidence, Noul vùng giữa, schema/privacy/timeout/disabled đều abstain/fallback/escalate.
7. JEV off/unavailable có cùng core behavior; không giữ money transaction chờ provider.
8. Provenance/stale/retention/feedback contract được chốt trước khi hứa save/history/learning.
9. Metrics đo safety (zero mutation/zero leak/zero unauthorized action) trước metrics automation.
10. UI explanation do application localization viết; không render “model reasoning”, numeric confidence như certainty hoặc raw answer không được kiểm tra.

**[Verified fact]** Các gate về manual fallback, no authority, no raw data, default-off và no JEV call in money transaction đã có trong `docs/AI-JEV.md` §3–7, L21–89 và `docs/ARCHITECTURE.md` §4–6, L35–56. Phần typed question/primitive/answer composition trong file này là re-analysis theo official TypeSafe docs, không phải thay đổi canonical/runtime.
