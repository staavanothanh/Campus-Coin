# CC-JEV-SYSTEM-ONE-ARCH-OPS — Composition, placement và vận hành an toàn

> **Trạng thái:** working handoff; không phải ADR, canonical contract hay runtime implementation.
>
> **Owner:** `SystemOneArchitectureOps`.
>
> **Phạm vi:** thiết kế cách đặt và ghép TypeSafe System One/Jev vào Campus Coin mà không biến JEV thành LLM chat, agent, nguồn sự thật tài chính hoặc bộ điều khiển workflow. File này chỉ là phân tích; không sửa source/runtime, OpenAPI, ADR, architecture, domain/auth hoặc các artifact cũ dưới `docs/working/jev-product-analysis/`.
>
> **Phân loại bằng chứng:** `[Verified fact]` chỉ dùng cho điều có trong tài liệu chính thức hoặc canonical Campus Coin; `[Proposal]` là hướng thiết kế cần Team Leader/owner phê duyệt; `[Unresolved]` là thiếu contract, policy hoặc runtime evidence và phải fail closed, không được diễn giải thành capability đã có.

## 1. Quyết định điều hành

### 1.1. Boundary chính

- **[Verified fact]** Campus Coin là sổ theo dõi do user nhập, không phải ngân hàng, không giữ tiền thật và không xử lý payment thật. Backend/domain là nguồn sự thật cho wallet, ledger, savings, budget và report; JEV không được tính tiền, authorize payment hoặc ghi/sửa/xóa money state. Evidence: `docs/PRD.md` §1, §3.2–§3.5, L3–7, L25–51; `docs/DOMAIN-MODEL.md` §1, §3–§5, L3–15, L38–85; `docs/ARCHITECTURE.md` §2, §4–§8, L21–69.
- **[Verified fact]** System One đánh giá một `state` với một map các typed `questions`, trả typed answers và probabilities; Jev không viết reply, code hoặc explanation reasoning. Questions trong cùng request nhìn cùng state nhưng được đánh giá độc lập/parallel. Evidence: TypeSafe, [System One — “How it differs from an LLM” và “Fast judgments inside a larger workflow”](https://docs.typesafe.ai/concepts/system-one); [How to build with TypeSafe — “AI-powered software”, “What makes System One composable”, “Keep control flow...”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).
- **[Verified fact]** `Choice` trả option đã chọn, toàn bộ probability và confidence; `Score` trả score probability-weighted, legend, probability và confidence; `Noul` trả probability của mệnh đề yes và **không có confidence riêng**. Không primitive nào trả prose explanation hoặc hành động kế tiếp. Evidence: [TypeSafe API — Question/Answer types](https://docs.typesafe.ai/api); [Choice](https://docs.typesafe.ai/primitives/choice); [Score](https://docs.typesafe.ai/primitives/score); [Noul](https://docs.typesafe.ai/primitives/noul).
- **[Verified fact]** Probability/confidence diễn tả phân bố và độ chắc chắn của output; calibration trên các nhóm không bảo đảm một answer riêng lẻ đúng. Ngưỡng và hành vi (act, review, abstain/escalate) do code chọn theo risk. Evidence: [Confidence — “Confidence is derived from the probabilities”, “I don’t know”, “Thresholds scale with risk”](https://docs.typesafe.ai/confidence).
- **[Proposal]** Kiến trúc Campus Coin dùng System One như **typed decision primitive** nằm giữa một bước deterministic đã chuẩn bị state và một bước deterministic tiếp theo. Luồng chuẩn là:

  ```text
  user/system trigger
    -> server auth/owner/CSRF + deterministic validation
    -> allowlist/redact + build one bounded state
    -> ask narrow typed questions (same state, independent answers)
    -> validate discriminated typed response
    -> deterministic threshold/candidate/freshness composition
    -> render typed advisory + app-owned explanation/provenance
    -> explicit user review/override (nếu có)
    -> normal deterministic domain command/read path
  ```

  JEV không chọn bước kế tiếp, không tự lặp, không gọi tool, không commit, không phát notification và không tự sinh text để UI hiển thị.

### 1.2. Sửa giả định kiến trúc của báo cáo cũ

Báo cáo cũ `docs/working/jev-product-analysis/FINAL-FINDINGS.md` vẫn được giữ nguyên làm baseline. Các đoạn sau cần được đọc lại theo capability thật:

| Finding cũ | Vấn đề khi đọc theo System One | Cách sửa trong kiến trúc mới |
|---|---|---|
| §1.2, L27–36 và §5, L233–241 nói JEV có thể “diễn đạt”/tạo source-linked explanation, monthly narrative, coaching, NBA. | **[Verified fact]** System One không generate text/reasoning và không tự chọn next action. Gọi các điểm này là “JEV narrative” đã coi JEV như prose/chat. | **[Proposal]** Backend tạo fact bundle và candidate/action allowlist; System One chỉ trả typed signal như `attention_kind`, `evidence_sufficient`, `candidate_fit` hoặc `review_needed`. Application chọn template/localized copy và CTA từ allowlist; facts, arithmetic, threshold, sequencing và action vẫn do code. |
| §3 UC-06/07/08/09, L131–181 mô tả JEV trả “một/vài câu”, tip hoặc contextual wording. | Không có output text để dùng như câu trả lời. Score/Choice/Noul không thể thay prose contract. | Nếu phase sau được duyệt, card chỉ có typed decision + app-owned copy key; có thể dùng rule/template deterministic trước và không cần JEV. Monthly report/budget facts không phụ thuộc JEV. |
| §6.2, L256–263 đặt `explanation` như nội dung advisory có thể do JEV tạo. | Dễ làm user hiểu model đã giải thích số liệu hoặc chứng minh nguyên nhân. | `explanation` (nếu cần trong artifact) phải là **template key/ứng dụng render**, không phải raw JEV text. UI tách `authoritative evidence` và `typed advisory`; không lưu/hiển thị prose model. |
| §5, L237–238 và §6.4 đặt async/read-time như nơi tạo narrative. | Placement vẫn đúng ở mức không block money path, nhưng “narrative” là capability sai. | Giữ placement async/read-time, đổi payload thành bounded typed signals. App deterministic composition có thể tạo static insight copy từ signal + facts; nếu không có template thì chỉ hiển thị facts/manual copy. |
| §1.1, L15–16 gọi JEV là lớp “giải thích” ngoài auto-category. | Overclaim capability, không chỉ overclaim authority. | JEV ngoài category chỉ có fit khi product cần một judgment typed trên dữ liệu unstructured/ambiguous; mọi explanation người dùng đọc là code-owned presentation. |

- **[Proposal]** Vì vậy, “monthly insight”, “budget coaching”, “spending change”, “next-best action” không phải use case *prose của JEV*. Chúng là software workflows: deterministic service chọn facts/candidates; nếu còn ambiguity thì System One đánh giá một hay vài thuộc tính typed; code biến kết quả thành state UI. Nếu không xác định được typed question có giá trị độc lập, dùng template/deterministic rule hoặc không ship JEV.
- **[Unresolved]** Chưa có canonical insight/coach/NBA contract, source snapshot/version, persistence, interaction hoặc template-key inventory. Không mở các capability này chỉ vì SRS có bảng `Insight`; bảng đó được ghi là ví dụ. Evidence: `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L128–165; §1.8, L282–295; `docs/PRD.md` §5, L65–67; `docs/AI-JEV.md` §8, L91–93.

## 2. Composition model: code-owned, typed-only

### 2.1. Trách nhiệm từng lớp

| Lớp | Có thể làm | Không được giao cho JEV |
|---|---|---|
| Browser/presentation | Giữ form local, trigger rõ ràng, render facts và typed label, cho user accept/override/dismiss/save/feedback; giữ input khi JEV lỗi. | Gọi provider, giữ secret, tính balance/budget/report, suy owner/role, coi suggestion là save/authorization. |
| API/application orchestration | Auth/session/CSRF/owner, validate input, redact, build state/questions, gọi adapter ngoài money transaction, timeout/quota gate, validate typed response, deterministic composition, localized UI DTO. | Parse prose/chat, cho model điều khiển sequence, gửi raw financial/session/claims/secret, chờ provider trong money transaction. |
| Domain/report/read model | Tính amount/date/period HCMC, wallet/savings/budget/report, category lifecycle, idempotency, authorization, correction và side effects. | Import SDK JEV hoặc dùng answer để bypass invariant. |
| JEV adapter | Serialize `state` + typed `questions`, nhận discriminated answers/probabilities/confidence, trả adapter result/status đã mask. | Chọn action, retry vô hạn, persist money, render explanation, gọi API/domain thay app. |
| Persistence/ops | Lưu facts, append-only financial/audit; nếu được duyệt thì lưu masked advisory metadata/interaction, idempotency và lifecycle. | Lưu raw prompt/response/secret/PII không cần thiết; coi output JEV là authoritative financial row. |

Evidence local: `docs/ARCHITECTURE.md` §2, §4–§6, L21–56; `docs/AI-JEV.md` §3–§6, L21–78; `AGENTS.md` §Backend/API và §JEV/OpenRouter, L99–141.

### 2.2. Deterministic composition contract

- **[Proposal]** Mọi answer phải qua các gate theo thứ tự: (1) request identity/freshness; (2) HTTP/transport success; (3) response is valid discriminated union; (4) question IDs/type khớp request; (5) option/level membership; (6) numerical range and probability invariants; (7) use-case threshold/abstention; (8) candidate/category/status/owner validation bằng canonical data; (9) user decision hoặc read-only render; (10) normal domain command nếu user đã xác nhận.
- **[Proposal]** `choice`/`score`/`noul` chỉ là **signals**, không phải command. Code không được gọi `answer.choice` như một function/route name, không được dùng `score` để thay `amountVnd`, và không được coi `noul` gần 1 là authorization.
- **[Proposal]** Tất cả số user thấy (VND, used/limit, wallet, report totals, date/period) lấy từ deterministic response. JEV chỉ có thể chọn một ID/level hoặc xác suất để code dùng trong policy. Nếu app không thể dựng UI từ typed fields + canonical labels + source refs thì fallback, không yêu cầu model “giải thích thêm”.
- **[Proposal]** Không có hidden agent loop. Một lần gọi có thể chứa nhiều câu hỏi độc lập; nếu workflow cần bước phụ thuộc, code mới được phép gọi bước thứ hai sau khi kiểm tra deterministic output và có budget/timeout riêng. Không để JEV quyết định có gọi bước hai hay side effect.
- **[Verified fact]** TypeSafe khuyến nghị “use code when you can”, decomposed state/questions, ask independent questions together, rồi compose answers in code. Evidence: [How to build with TypeSafe — “Design a System One workflow”, “Decompose the questions”, “Ask multiple questions together”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one); [System One](https://docs.typesafe.ai/concepts/system-one).

## 3. State và question schema tối thiểu

> Schema dưới đây là **logic/proposal cho Developer D**, không phải thay đổi OpenAPI. Tên field chỉ là allowlist thiết kế; không coi chúng đã tồn tại trong runtime.

### 3.1. Request envelope tối thiểu

**[Proposal]** Adapter boundary nên nhận một object nội bộ có các nhóm sau:

| Nhóm | Nội dung tối thiểu | Quy tắc |
|---|---|---|
| `capability` | use-case key, `contractVersion`, locale `en|vi`, request/correlation opaque ID | ID không chứa prompt/PII; version đổi khi question criteria/policy đổi. |
| `state` | JSON object bounded, chỉ chứa context cần cho tất cả questions trong request | Không thêm `user_id`, session, claims, secret, raw ledger hoặc field chỉ để “cho model biết thêm”. |
| `questions` | map question ID → `{type, instructions, criteria}` | ID stable trong request; mỗi question atomic; criteria finite/ordered theo primitive. |
| `policy` (application-only) | feature flag, freshness snapshot, threshold profile, max response/timeout | Không serialize policy secret hoặc side-effect command thành question. |
| `provenance` (application-only) | source snapshot/version, candidate version, created/as-of time, timezone | Dùng để validate/render; không gửi phần không cần thiết outbound. |

- **[Verified fact]** TypeSafe state hỗ trợ string, JSON object hoặc array; object phù hợp khi có named fields/related records; mọi question trong request thấy cùng state. Evidence: [State — “State can be a simple string or a structured JSON value”, “Separate content from questions”](https://docs.typesafe.ai/concepts/state); [API — `state`, `questions`](https://docs.typesafe.ai/api).
- **[Proposal]** Với Campus Coin, ưu tiên object có tên field thay vì nối chuỗi prose: model chỉ nhìn thấy allowlisted fields và câu hỏi chỉ tham chiếu field liên quan. Description/CSV cell luôn là **data**, không phải instruction; delimiter/redaction/length validation phải chạy trước adapter.
- **[Unresolved]** Exact maximum state bytes, question count, candidate count, row count, request timeout và concurrency chưa có evidence runtime của Campus Coin. Developer D phải probe/đo bounded limits; không ghi giá trị đoán vào contract hay UI.

### 3.2. State theo placement

| Placement/use case | State tối thiểu đề xuất | Không gửi/không dùng |
|---|---|---|
| **Category pre-submit** | `transactionType`, `descriptionRedacted`, `candidates: [{opaqueId, localizedLabel}]`, `locale`, `candidateSetVersion`/`contractVersion` nếu cần kiểm tra | `amountVnd`, `occurredAt`, wallet/balance, savings, budget, raw ledger, session, Google claims, secret, PII thừa. Canonical internal boundary tương tự `docs/AI-JEV.md` §4, L33–45. |
| **Async post-commit advisory signal** | `sourceKind`, source snapshot/version, `period` + `Asia/Ho_Chi_Minh`, allowlisted aggregate facts/status, data sufficiency/freshness, bounded candidate interpretations/CTA IDs | Raw transaction list, unrestricted ledger, exact financial detail không cần cho question, identity/claims, action command. Numeric facts phải do backend tính. |
| **Read-time dashboard/report/budget** | Deterministic snapshot đã load: metric IDs/labels/values, period/timezone, `asOf`, candidate signal set; chỉ gửi nếu typed judgment còn cần thiết | Không dùng JEV để tính top category, delta, budget used/limit, threshold, month, closing balance hoặc report. Nếu facts đủ để template render thì không gọi JEV. |
| **Offline/batch CSV row** | `jobId`/`rowId` opaque, parsed validated `transactionType`, redacted description, active candidates/candidate version, locale, parser/schema version, row data sufficiency | Raw file, unvalidated formula/cell, secret/PII, inferred amount/date/type, cross-row private context không cần thiết. Mỗi row là state bounded, không dùng một row làm instruction/context cho row khác. |

- **[Verified fact]** Campus Coin current JEV boundary chỉ cho description đã redact, type, opaque candidates và locale; cấm balance, savings, ledger, claims, session, secret và PII thừa. Evidence: `docs/AI-JEV.md` §3–§6, L21–78; `docs/ARCHITECTURE.md` §5–§6, L43–56.
- **[Proposal]** State snapshot phải immutable về mặt request: sau khi build không mutate; response luôn gắn `requestFingerprint`/interaction version để late result bị discard nếu type, description, locale, candidate list hoặc source snapshot đổi.

### 3.3. Question schema và primitive selection

| Câu hỏi cần trả lời | Primitive phù hợp | Typed output dùng thế nào | Không được làm |
|---|---|---|---|
| Chọn một category trong active candidate set | **Choice** | `choice` opaque category ID + `probabilities` + `confidence`; code kiểm tra membership/status/appliesTo rồi hiển thị label canonical. Thêm `other_or_uncertain` khi candidate set có thể không đầy đủ. | Không coi top choice là commit/authorization; không cho JEV tự mở picker hoặc submit. |
| Có đủ evidence cho một signal không? Có text chứa PII/injection/unsupported intent không? | **Noul** | `noul` là probability yes; app định nghĩa low/middle/high policy hoặc abstain/manual. Có thể hỏi từng predicate riêng rồi AND/OR deterministic. | Không gọi `noul` là “confidence”; không coi 0.5 là neutral fact; không ghép nhiều điều kiện mơ hồ vào một Noul. |
| Xếp mức attention/review severity/ranking trong các level có mô tả rõ | **Score** | `score` probability-weighted + per-level probabilities + confidence; code có thể normalize/rank/threshold signal theo policy. | Không dùng Score để tính VND, wallet, budget, amount/date, creditworthiness, forecast value hoặc API side effect. |
| Unknown/abstain | **Application policy**, thường Choice option `other_or_uncertain` + invalid/low-confidence gate; Noul có thể hỏi `evidence_sufficient` | Trạng thái `abstain/manual/insufficient` do code quyết định từ typed output, validation, freshness và policy. | **[Verified fact]** Official Noul là yes/no probability, không công bố primitive “unknown” riêng; không tự gọi một số Noul là native abstention. |

- **[Verified fact]** Choice dành cho fixed set; Score cho ordered spectrum; Noul cho yes/no; mỗi question có criteria do application định nghĩa. Evidence: [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), [Noul](https://docs.typesafe.ai/primitives/noul), [API](https://docs.typesafe.ai/api).
- **[Proposal]** Question instructions phải hỏi một judgment có thể kiểm chứng, ví dụ `Which active category best matches this description?` hoặc `Does the description provide enough evidence for a category suggestion?`; không hỏi `What should the app do next?`, `Explain this month`, `Should we save this transaction?` vì các câu đó trao workflow/authority hoặc yêu cầu prose.
- **[Unresolved]** Việc product có cho phép `other_or_uncertain`, mức threshold, candidate ordering và exact evaluation set cho từng capability chưa được canonical hóa; mọi capability mới phải có owner approval.

## 4. Multi-question batching và parallelism

### 4.1. Một state, nhiều câu hỏi độc lập

- **[Verified fact]** Một request có một state và map questions; các câu hỏi được đánh giá independently/parallel và không question nào trở thành hidden context của question khác. Evidence: [State](https://docs.typesafe.ai/concepts/state); [How to build with TypeSafe — “What makes System One composable”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one); [OpenRouter System One API — `POST /systemone` description and `questions`](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).
- **[Proposal]** Gộp các câu hỏi thật sự cùng state/use-case vào một request: ví dụ category `Choice`, `evidence_sufficient` `Noul`, `contains_sensitive_input` `Noul`. Code chỉ dùng các answers cần cho policy hiện tại; answer không dùng không được biến thành action. Điều này phù hợp hơn nhiều request tuần tự và giữ dependency rõ.
- **[Proposal]** Nếu câu hỏi có quan hệ điều kiện, vẫn có thể đặt trong batch nhưng phải coi câu hỏi phụ là speculative: code chỉ đọc answer sau khi deterministic `primary` đủ điều kiện. Không giả định Jev đã biết kết quả primary; nếu thực sự phụ thuộc dữ liệu mới, chạy request kế tiếp bằng code sau khi gate.
- **[Proposal]** Không dùng multi-question batch để “xin explanation”, “xin plan”, “xin action list” hoặc tạo agent loop. Mỗi answer phải có type, criteria và consumer deterministic rõ ràng.

### 4.2. Batch rows/offline và concurrency

- **[Proposal]** Với CSV tương lai: parse/validate/stage toàn bộ file deterministic trước; tạo một state/question map cho mỗi row đủ điều kiện; worker pool bounded gửi các request độc lập. Giữ `rowId` opaque, giới hạn concurrency và số rows/request theo probe; response out-of-order được reassemble deterministic theo row order, không dùng thứ tự trả về để commit.
- **[Proposal]** Mỗi row có status riêng `suggested|manual|abstained|invalid|duplicate`; một row lỗi không làm mất rows khác và không được silent drop. User review/override/skip trước khi import; accepted rows mới đi qua normal domain idempotency/authorization.
- **[Proposal]** Nếu một use-case cần nhiều questions/row, gộp questions trong row request trước khi tăng concurrency giữa rows. Tách row batches khi đạt bounded request size; không gộp states của nhiều owner hoặc dùng state một row để suy luận row khác.
- **[Unresolved]** OpenRouter System One page chứng minh `POST /systemone` typed request/response; không coi đó là bằng chứng đã có provider-side bulk/offline job contract. Batch orchestration, queue, retry, partial-commit và row retention cần contract riêng. Current CSV cũng ngoài MVP: `docs/PRD.md` §5, L65–67; `docs/ARCHITECTURE.md` §8, L67–69.

### 4.3. Khi nào không batch

- **[Proposal]** Không batch nếu questions cần state khác nhau, privacy scope khác nhau, owner khác nhau, retention khác nhau hoặc một result có thể khiến câu hỏi sau thay đổi. Tách request giúp provenance và fallback chính xác.
- **[Proposal]** Không giữ database/money transaction mở để gom hoặc chờ questions. Transaction create/correction/savings phải kết thúc theo domain trước mọi post-commit advisory call. Evidence: `docs/DOMAIN-MODEL.md` §5, L75–85; `docs/ARCHITECTURE.md` §4–§6, L35–56; `AGENTS.md` L104–107, L133–141.

## 5. Placement matrix và use-case cards

### 5.1. Placement tổng quát

| Placement | JEV role hợp lệ | Điều kiện/sequence | Fallback | Disposition |
|---|---|---|---|---|
| **Synchronous pre-submit** | Category Choice và predicate Noul tùy chọn | Explicit user trigger; deterministic validation/redaction trước; call ngoài money transaction; user review; normal domain Save sau đó | Giữ form + manual picker | Current MVP fit; default-off/enablement gate |
| **Async post-commit** | Typed quality/attention/eligibility signal trên committed fact snapshot; không tạo prose | Commit authoritative trước; enqueue idempotent; worker bounded; persist masked artifact nếu contract có; read-time revalidate freshness | Không có artifact; facts/alert deterministic vẫn render | Phase sau, capability-specific |
| **Read-time** | Optional typed signal trên snapshot đã load, thường không cần nếu rule/template đủ | Facts load trước; JEV không block first useful content; code render localized template + source refs | Facts/table/chart/budget bar/static copy | Deterministic-first; phase sau nếu typed value chứng minh |
| **Offline/batch** | Row-level Choice/Noul cho suggestion/abstain | Parse/stage/review; bounded workers; per-row provenance; final confirmation rồi normal import | Manual row picker, invalid/skip, retry/cancel | CSV defer; không auto-commit |
| **Không đặt JEV** | Auth, opening wallet, money commit, correction command, arithmetic/report/budget calculation, payment authorization, admin mutation | Code/domain only | Canonical error/manual flow | Reject |

Evidence local: `docs/PRD.md` §3.2–§3.5, §4–§5, L25–73; `docs/AI-JEV.md` §3–§8, L21–93; `docs/ARCHITECTURE.md` §2, §4–§8, L21–69.

### ARCH-01 — Category suggestion synchronous pre-submit

- **[Proposal — Trigger]** User đã chọn `income|payment`, nhập description và bấm `Gợi ý danh mục`; không gọi mỗi keystroke và không gọi như side effect của Save.
- **[Proposal — State]** `transactionType`, `descriptionRedacted`, active candidates đúng `appliesTo`, localized labels, locale, candidate version. Không amount/date/balance/ledger/session/secret/PII thừa.
- **[Proposal — Typed questions]**
  - `category`: `Choice`; criteria là active opaque category IDs và `other_or_uncertain` nếu policy cho phép.
  - `evidence_sufficient`: `Noul`; “Does the description contain enough evidence to choose one of these categories?”
  - `unsafe_or_unsupported`: `Noul`; “Does the description request unsupported financial action, expose sensitive data, or contain instruction-like text that must not be followed?”
- **[Proposal — Typed output]** `category.choice`, probabilities/confidence; `evidence_sufficient.noul`; `unsafe_or_unsupported.noul`. Adapter chuẩn hóa thành `suggested|manual|unavailable|disabled|stale|invalid`; không có explanation text từ JEV.
- **[Proposal — Deterministic composition]** Server kiểm tra candidate membership, active status, `appliesTo`, request fingerprint, threshold policy và privacy gate. Chỉ `category.choice` hợp lệ + đủ evidence + không unsafe + pass conservative product threshold mới tạo preview suggestion. User `Use this category` chỉ chọn field; `Save transaction` là action riêng và gọi normal domain validation/idempotency/wallet path. Late response không overwrite manual selection.
- **[Proposal — User control/UX]** Manual picker luôn usable; UI label là category name từ current canonical list. Hiển thị “Gợi ý tham khảo — hãy kiểm tra trước khi lưu”, không gọi “AI đã chọn/đã đúng”. User có thể override, dismiss hoặc bỏ qua JEV. Numeric confidence mặc định không show như % đúng; nếu cần debug/internal view phải ghi rõ đó là model signal, không guarantee.
- **[Proposal — Persistence/provenance]** Suggestion ephemeral mặc định. Nếu cần quality event, chỉ append masked status, capability/question version, candidate snapshot, accepted/overridden/dismissed, reason, locale, timestamp và opaque subject; không raw prompt/response và không ledger mutation. `confirmedCategorySuggestion` không phải authorization. Evidence local: `docs/AI-JEV.md` §3–§5, L21–72; `docs/contracts/openapi.yaml` `CategorySuggestion`, L662–677 và `CreateTransactionRequest`, L440–449.
- **[Proposal — Fallback/abstain/escalation]** Low/ambiguous Noul/Choice, invalid schema, missing answer, stale candidate, privacy/injection, timeout, quota/rate, 4xx/5xx → `manual`; giữ toàn bộ form. “Escalation” là manual picker hoặc user support/issue nếu cần, không phải autonomous admin action.
- **[Proposal — Metrics]** Hard gates: 100% suggested IDs thuộc active candidate đúng type; 100% committed rows có explicit user selection/review; zero auto-commit; zero raw sensitive outbound/log; JEV-off completion không suy giảm so với manual baseline. Quality metrics tách `en|vi` × `income|payment`, coverage, correct abstention, override và stale discard; threshold chưa được tự đặt.
- **[Proposal — Disposition]** Manual/core ship; JEV chỉ enable sau compatibility/privacy/schema/UX gate. Đây là use case duy nhất hiện có canonical product/API fit.

### ARCH-02 — Async post-commit typed advisory signal

- **[Proposal — Trigger]** Sau transaction/correction/budget/report projection đã commit và reconcile; hoặc sau snapshot/report month-close theo policy. Trigger deterministic, không do JEV tự phát.
- **[Proposal — State]** Allowlisted aggregate fact bundle: source snapshot/version, period + `Asia/Ho_Chi_Minh`, category/metric IDs, direction/status đã code tính, sufficiency/freshness, candidate signals/CTA IDs. Không raw ledger, identity/claims, secret hoặc command.
- **[Proposal — Typed questions]** Tùy capability, mỗi question một judgment: `which_attention_kind` `Choice` trên allowlist (`review_category`, `review_budget`, `view_report`, `none`); `has_sufficient_evidence` `Noul`; `attention_level` `Score` chỉ nếu product có ordered levels mô tả rõ. Không hỏi “write a monthly summary”.
- **[Proposal — Typed output]** Typed IDs/probabilities/confidence hoặc noul/score; application maps ID → localized template key + evidence refs. Text hiển thị nếu có là static/template do application viết; JEV không viết.
- **[Proposal — Deterministic composition]** Post-commit worker kiểm tra source version và idempotency; validate answer; apply threshold/abstain; ensure candidate CTA allowlist and user scope; persist advisory artifact only if separate artifact contract exists. No answer can create payment/budget/savings/correction or notification send. Read-time checks source still current; changed source marks stale/superseded.
- **[Proposal — User control]** User sees fact block first, then optional “Gợi ý tham khảo” card; source link, as-of/stale badge, dismiss/save/feedback if interaction contract exists. CTA only navigates to report/budget/transactions/form; final mutation needs normal review/CSRF/idempotency.
- **[Proposal — Persistence/provenance]** Artifact envelope should include opaque artifact ID, source kind/snapshot/version, period/timezone, question/capability version, typed answer metadata (not raw response), generatedAt, asOf, status, user decision and stale reason. Refresh creates new version; saved snapshot is not silently overwritten. Exact schema/retention/export/delete is unresolved.
- **[Proposal — Fallback/abstain/escalation]** Queue unavailable, timeout, exhausted retry, malformed output, stale source, low confidence or policy unsafe → no advisory artifact; deterministic dashboard/report/budget continues. Repeated safety/privacy failures kill-switch this capability, not money path.
- **[Proposal — Metrics]** 100% artifact claims map to source refs/templates; zero money side effects; queue success/fallback/stale rate bounded; user source-open/dismiss/feedback; no claim that JEV generated or proved a cause.
- **[Proposal — Disposition]** Phase after fact snapshot, artifact/interaction contract and bounded worker are approved. Do not extend current category endpoint implicitly.

### ARCH-03 — Read-time dashboard/report/budget composition

- **[Proposal — Trigger]** User opens dashboard, monthly report or budget. Deterministic endpoint loads first; optional typed decision is explicit/lazy only when a question remains after facts are available.
- **[Proposal — State]** Current authoritative facts (`currentMonth`, category aggregates, `usedVnd`, `limitVnd`, `isOverrun`, report period, source version, freshness) plus a finite allowlist of possible UI signals. No arithmetic task is sent to JEV.
- **[Proposal — Typed questions]** If needed: `which_fact_needs_review` `Choice`; `is_data_sufficient_for_highlight` `Noul`; optional `attention_level` `Score` on clearly described UX attention levels. Direction, delta, top category, budget threshold and period are deterministic code outputs.
- **[Proposal — Typed output]** Signal only. Application chooses a known copy key such as `review_category_transactions` or `review_budget`; source metric and exact VND values remain from backend response. If no signal or no approved template, render facts without JEV.
- **[Proposal — Deterministic composition]** Code checks owner/snapshot freshness/HCMC period, computes all numeric facts, validates JEV IDs against allowlist, and renders `fact` and `advisory` regions separately. JEV cannot change order, threshold, report value, warning semantics or route to a mutation.
- **[Proposal — User control]** Chart/table equivalent and source details always available. Card labels “Số liệu từ báo cáo” vs “Gợi ý tham khảo”; show `asOf`/stale; dismiss/save/feedback optional. No `Apply`, `Save to wallet`, `Set budget`, `Pay` or `Transfer` action from typed output.
- **[Proposal — Persistence/provenance]** Current facts use canonical report/budget provenance. Optional signal artifact stores source snapshot/version, typed signal, template key, generatedAt, locale and user interaction; no raw model prose because there is none. Stale after payment/correction/category/budget/report rebuild/locale-policy change.
- **[Proposal — Fallback/abstain/escalation]** JEV unavailable or insufficient → exact dashboard/report/table/budget bar and localized static help; never zero placeholder or stale card labelled current. If authoritative endpoint fails, do not call JEV to fabricate replacement numbers.
- **[Proposal — Metrics]** Zero discrepancy between rendered facts and authoritative endpoint; zero unsupported causal claims; users can identify source/fact-vs-advisory in comprehension test; JEV-off first useful content remains available. Metrics are proposals, not runtime claims.
- **[Proposal — Disposition]** Ship deterministic surfaces first. Only add typed decision if it removes a demonstrated ambiguity that deterministic rules/templates cannot solve; monthly prose/narrative remains outside current MVP.

### ARCH-04 — Offline/batch CSV row classification

- **[Proposal — Trigger]** Future user upload after parser/staging/preview; not current MVP. Offline means only local staging/read cache unless a separate online sync contract is approved.
- **[Proposal — State]** One validated row state at a time: opaque `jobId`/`rowId`, parsed `transactionType`, redacted description, active candidate snapshot, locale, parser/schema version, row sufficiency. Raw file/cell instruction is not sent.
- **[Proposal — Typed questions]** `row_category` `Choice` + `other_or_uncertain`; `evidence_sufficient` `Noul`; optional `row_needs_manual_review` `Noul`. JEV never fills amount/date/type or import command.
- **[Proposal — Typed output]** Per-row suggestion/abstain signal + probabilities/confidence/noul values and status. Preview shows parsed fields, validation state, category suggestion and provenance; no row is “imported” before confirmation.
- **[Proposal — Deterministic composition]** Parser/encoding/size/schema/type/date/VND/owner/duplicate checks first. Bounded row calls; then validate membership/status/version. User maps, edits, accepts/overrides/skips rows; final import calls normal domain semantics with idempotency and explicit partial-failure policy. A JEV answer never commits a row.
- **[Proposal — User control]** Review all non-manual rows or an explicitly approved grouped review; unresolved rows remain manual/skip. Show row ID/source, status, stale state and `Use/Change/Skip`; no auto-commit and no silent row loss.
- **[Proposal — Persistence/provenance]** Import job, file hash/opaque ID, parser/schema/candidate version, row decision, typed result metadata and final ledger refs require a future contract. Raw file retention, consent, export/delete and partial commit are unresolved.
- **[Proposal — Fallback/abstain/escalation]** JEV off/unavailable/timeout/schema/privacy/low confidence → manual row picker; invalid/duplicate row → actionable row state; worker failure → retry/cancel before commit. Offline cache is stale/read-only and never financial authority.
- **[Proposal — Metrics]** Zero silent row loss/duplicate; 100% committed rows explicitly reviewed; zero JEV-authored amount/date/type; per-row provenance and fallback complete; compare time-to-review against manual baseline only after product approves evaluation.
- **[Proposal — Disposition]** Defer with CSV; deterministic parser/preview must exist first. Current canonical scope excludes CSV.

### ARCH-05 — Paths where JEV is prohibited

- **[Verified fact]** Auth/onboarding, opening wallet, payment authorization, wallet/savings/budget/report arithmetic, ledger/correction mutation, admin financial triage and side effects remain deterministic/domain paths. Evidence: `docs/DOMAIN-MODEL.md` §1, §4–§5, L3–15, L54–85; `docs/ARCHITECTURE.md` §2, §4–§8, L21–69; `docs/AI-JEV.md` §3, §8, L21–31, L91–93; `docs/PRD.md` §3.2–§3.5, §5, L25–67.
- **[Proposal]** If an answer would need to choose a correction role, authorize/reject a payment, compute a balance/budget/report, infer a bank fact, send a notification, mutate a record, or select its own next action, reject that design and keep JEV out of the path.

## 6. Confidence, probability, abstain và escalation

### 6.1. Đọc đúng từng primitive

| Primitive | Giá trị returned | Cách code nên dùng | Cách không được diễn giải |
|---|---|---|---|
| Choice | `choice`, `probabilities` cho mỗi option, `confidence` derived | Candidate eligibility, ranking signal, threshold/abstain; đọc cả top option và distribution | Không phải xác suất giao dịch/correctness tuyệt đối; không phải explanation. |
| Score | `score` là probability-weighted position, `probabilities` per level, `legend`, `confidence` | Ordered attention/review ranking nếu levels có semantics; code quyết định threshold/weight | Không phải số tiền, tỷ lệ tiết kiệm, balance, forecast hay severity “đúng thật”. Cùng score có thể do distributions khác nhau. |
| Noul | `noul` probability yes, 0–1 | Một predicate độc lập; code dùng three-way band hoặc binary policy | Không có `confidence` field; `noul=0.8` không phải “80% đúng” và không phải native abstain. |

- **[Verified fact]** Choice/Score confidence được derive từ probability distribution; Noul không có confidence riêng. Evidence: [Confidence](https://docs.typesafe.ai/confidence); [API](https://docs.typesafe.ai/api); [Noul — “Reading a Noul”](https://docs.typesafe.ai/primitives/noul).

### 6.2. Policy ba đường

- **[Proposal]** Application có ba outcome độc lập với primitive: `eligible_advisory`, `manual_review/confirm`, `abstain/unavailable`. Boundaries là config của capability, không hard-code vào JEV question và không ghi exact number trước evaluation.
- **[Proposal]** `eligible_advisory` vẫn **không** auto-commit ở Campus Coin. High confidence chỉ cho phép hiển thị suggestion rõ hơn; user confirmation vẫn bắt buộc trước category/money action. Medium confidence → hiển thị có cảnh báo và yêu cầu user chọn/confirm; low confidence, flat distribution, missing/contradictory facts → manual/abstain.
- **[Proposal]** Với Choice, code có thể xét confidence, top probability, top-vs-second margin, `other_or_uncertain`, candidate status và freshness. Với Noul, code xét `noul` theo positive/negative/middle bands; với Score, xét normalized/level probabilities và confidence. Tất cả thresholds phải risk-specific và kiểm chứng trên synthetic/anonymized evaluation slices.
- **[Verified fact]** Confidence threshold phụ thuộc hậu quả; TypeSafe mô tả high/medium/low paths và khuyến nghị ngưỡng theo risk, nhưng không cung cấp Campus Coin threshold. Evidence: [Confidence — “Three paths for using confidence” và “Thresholds scale with risk”](https://docs.typesafe.ai/confidence).
- **[Proposal]** “Escalation” trong Campus Coin nghĩa là: manual picker; yêu cầu user mở source/review; đánh dấu `insufficient/stale`; hoặc issue/support flow khi user thấy dữ liệu sai. Không escalate sang JEV loop, admin autonomous action hay payment blocker.
- **[Unresolved]** Threshold từng capability, calibration set/metric, `other_or_uncertain` policy, và có hiển thị numeric confidence cho internal operators hay không chưa được chốt. Không ship auto-action để lấp khoảng trống này.

### 6.3. Abstain là outcome hợp lệ

- **[Verified fact]** TypeSafe confidence docs coi “I don’t know” là tín hiệu hữu ích; low confidence có thể route review, ask clarification hoặc fallback. Evidence: [Confidence — “I don’t know is a useful signal”](https://docs.typesafe.ai/confidence).
- **[Proposal]** JEV phải abstain/manual khi text mơ hồ, candidate set không bao phủ, category disabled/retired, input chứa injection/PII/secret, response thiếu/không hợp lệ, snapshot stale, hoặc deterministic policy không cho phép. Không ép top choice để tăng coverage.
- **[Proposal]** UI gọi đây là “Chưa đủ thông tin — chọn thủ công”/“Insufficient information — choose manually”, không gọi là lỗi model hay bịa một category gần nhất.

## 7. Vận hành: latency, timeout, quota, privacy và lỗi

> Không phân tích provider/cost. Các mục dưới đây là technical prerequisites/fallback policy; exact runtime values chỉ được ghi sau probe đã user yêu cầu.

### 7.1. Latency và timeout theo placement

- **[Proposal] Synchronous pre-submit:** request chỉ bắt đầu sau explicit click; dùng timeout bounded riêng cho suggestion; không chặn manual picker hoặc final Save. Khi timeout, hủy/ignore late result, giữ input và trả `manual/unavailable` localized. Không giữ MySQL transaction mở.
- **[Proposal] Async post-commit:** commit transaction trước; enqueue idempotent advisory job; worker timeout/retry bounded; job không làm rollback/mutate financial row. Exhausted retry → unavailable/dead-letter operational signal, UI vẫn dùng deterministic facts.
- **[Proposal] Read-time:** tải authoritative facts trước/đồng thời theo dependency rõ; JEV không block first useful content. Nếu chưa có typed result, render facts + static localized label; refresh explicit hoặc async update không cướp focus.
- **[Proposal] Offline/batch:** không gọi JEV khi offline; nếu online replay được duyệt, queue item có idempotent job/row key, expiry và privacy gate. Batch worker bounded timeout từng request/row; một timeout không làm mất preview các row khác.
- **[Unresolved]** TypeSafe docs có mô tả mục tiêu “fast” nhưng Campus Coin không được suy ra SLA/p95/runtime claim. Developer D phải ghi evidence probe (latency distribution, timeout behavior, cancellation) trước khi đặt UX promise.

### 7.2. Quota, rate và bounded work

- **[Proposal]** Feature flag `JEV_CATEGORY_SUGGESTION_ENABLED` default-off; server-only adapter; giới hạn input length, candidate count, questions/request, rows/job, concurrency, request frequency và retries. Không retry mặc định trên click; async retry chỉ cho operation idempotent và không làm duplicate.
- **[Verified fact]** OpenRouter System One reference mô tả typed `POST /systemone`, response `answers/model/usage`, và các lỗi 400/401/402/403/404/413/429/500/502/503/524/529. Evidence: [OpenRouter — Submit a System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md), operation `POST /systemone`, response/errors.
- **[Verified fact]** URL bắt buộc cũ `https://openrouter.ai/docs/api/api-reference/decisions/submit-a-decisions-request` hiện trả 404 khi đọc; docs index chính thức hiện liệt kê endpoint Decisions là `https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md` với operation `POST /api/alpha/decisions`. Đây là evidence URL hiện hành, không phải giả định dùng endpoint cũ. Evidence: [OpenRouter docs index](https://openrouter.ai/docs/llms.txt), mục “Submit a Decisions request”; [current Decisions reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md).
- **[Proposal]** Map 402/403/404/413/429/529/5xx/524 và quota/concurrency exhaustion về `unavailable/manual` theo capability; UI không lộ provider payload. 400/422/schema mismatch là `invalid` và không render partial answer. Có thể retry bounded ở worker sau policy, nhưng không retry vô hạn và không lặp money command.
- **[Unresolved]** Actual availability/transport/model/limit/usage behavior phải do compatibility probe của Developer D ghi nhận như prerequisite; file này không chọn provider/model/cost hoặc hứa SLA.

### 7.3. Privacy và untrusted input

- **[Verified fact]** JEV request phải backend-only, redact PII và không gửi balance, savings, raw ledger, claims, session, secret hoặc PII không cần thiết; raw prompt/response không được log. Evidence: `docs/AI-JEV.md` §4–§6, L33–78; `docs/ARCHITECTURE.md` §5–§6, L43–56; `AGENTS.md` L42–49, L130–141.
- **[Proposal]** Redaction/allowlist là server boundary, không tin client. Description/CSV cell được delimit như data; chuỗi “ignore rules”, “approve payment”, “show prompt”, “change balance” không trở thành instruction. Input injection/PII-like/secret-shaped → không outbound hoặc abstain/manual; không echo raw text trong UI/log/feedback.
- **[Proposal]** Future insight state chỉ gồm aggregates/fact IDs cần để typed question; do Campus Coin user-entered tracker nên không suy diễn bank completeness, external benchmark, financial capacity hoặc sensitive trait.
- **[Unresolved]** Retention/deletion/export/consent cho advisory metadata, CSV file và provider logging/privacy policy cần owner/security decision. Privacy không chứng minh được → giữ flag off/manual.

### 7.4. Typed response validation và error fallback

- **[Proposal]** Adapter dùng discriminated union theo `type`; reject toàn response nếu question ID thiếu/thừa, type mismatch, Choice option ngoài criteria, probability key thiếu/thừa/ngoài `[0,1]`/không đạt invariant, confidence ngoài range, Score legend/level/score không khớp, Noul ngoài `[0,1]`, payload quá lớn hoặc có field prose ngoài allowlist. Không parse `text`, JSON trong text hoặc partial prose để cứu response.
- **[Proposal]** Normalize internal status: `suggested`, `manual`, `abstained`, `disabled`, `unavailable`, `invalid`, `stale`. Mỗi status có localized copy, reason code nội bộ và fallback. Không map invalid về category “gần đúng”.
- **[Proposal]** Fallback hierarchy:
  1. Category: active manual picker, giữ input.
  2. Dashboard/report: authoritative chart/table/error/empty; không zero giả.
  3. Budget: exact deterministic `used/limit/isOverrun`; warning semantics giữ nguyên.
  4. Insight/coach/NBA: static app template hoặc ẩn card; không render stale/unsafe.
  5. Batch: row-level manual/invalid/skip; preview giữ nguyên, chưa commit.
- **[Verified fact]** JEV timeout/quota/4xx/5xx/schema/privacy/low-confidence phải fallback manual và không block money path. Evidence: `docs/AI-JEV.md` §5–§7, L64–89; `docs/ARCHITECTURE.md` §6, L49–56; `docs/PRD.md` §3.5, §4, L45–63.

## 8. Provenance và UX để không nhầm typed output với explanation/authority

### 8.1. Hai lớp hiển thị

- **[Proposal] Lớp A — authoritative evidence:** source kind (`dashboard|report|budget|category`), owner-scoped source snapshot/version, metric/category refs, period/month và `Asia/Ho_Chi_Minh`, `asOf`, exact facts từ backend. Đây là nơi duy nhất được dùng cho amounts, balances, totals, used/limit, date/period.
- **[Proposal] Lớp B — typed advisory:** capability/question version, selected opaque ID/level hoặc bounded probability signal, confidence (internal signal), generatedAt, status, stale reason, app template/copy key, user decision. Không gọi đây là “reasoning”, không lưu raw model prose vì model không trả prose.
- **[Proposal]** UI phải trả lời bốn câu hỏi bằng application-owned copy:
  1. “Dựa trên dữ liệu nào?” — source + period + as-of.
  2. “Đây là fact hay gợi ý?” — badge `Số liệu authoritative` vs `Gợi ý tham khảo`.
  3. “Có còn fresh không?” — current/stale/insufficient/unavailable.
  4. “Tôi kiểm soát gì?” — manual/accept/override/dismiss/save/feedback/source link.
- **[Proposal]** Không hiện model/provider/cost trong user-facing surface; không hiển thị numeric confidence như tỷ lệ đúng; nếu một operator view cần signal thì ghi rõ “model confidence — not correctness guarantee”.
- **[Verified fact]** SRS yêu cầu AI classification/summary advisory và user review/override; canonical UI phải có en/vi, loading/error/accessibility states; domain facts authoritative. Evidence: SRS §1.5, L65–71; `docs/PRD.md` §3.3–§3.5, L33–51; `AGENTS.md` L87–97; `docs/DOMAIN-MODEL.md` §1, §4, L3–15, L54–67.

### 8.2. UX state machine

| State | Điều kiện | Hiển thị/control | Cấm |
|---|---|---|---|
| `manual-ready` | Feature off/chưa trigger | Picker/form usable; explanation tĩnh | Không giả đã gọi JEV. |
| `loading` | User trigger hợp lệ | Giữ input; busy indicator + cancel/continue manual; `aria-live` phù hợp | Không khóa Save vô hạn/cướp focus. |
| `suggested` | Typed result valid + gates pass | Label canonical, typed advisory badge, source/criteria summary do app viết; Use/Override/Dismiss | Không gọi “đã chọn/đã đúng”, không auto-submit. |
| `abstained/manual` | Low confidence, unknown, unsafe, insufficient | “Chưa đủ thông tin — chọn thủ công”; picker remains | Không đoán gần đúng. |
| `invalid` | Schema/question/candidate mismatch | Generic unavailable/manual; no partial answer | Không parse prose/partial JSON. |
| `unavailable` | Timeout/quota/4xx/5xx/offline | Manual/facts fallback; retry explicit bounded | Không claim provider reason/raw payload; không block core. |
| `stale` | Input/category/source/locale/policy changed | Discard or badge stale; refresh/choose manually | Không render as current. |
| `accepted`/`overridden` | Explicit user selection | Show selected category/decision; Save still separate | Không treat acknowledgement as authorization. |
| `fresh` advisory artifact | Source snapshot valid | Fact + typed advisory/template; source link; dismiss/save/feedback | Không call insight financial authority. |
| `insufficient`/`unsafe` | Facts insufficient or output policy blocked | Deterministic facts/static guidance only | Không “clean” partial unsafe output. |
| `saved`/`dismissed` | Explicit interaction | Truthful outcome; saved snapshot can become stale; dismiss local surface | Không mutate ledger/budget/report. |

- **[Proposal]** Screen readers đọc rõ `advisory`, `stale`, `manual fallback`, period/timezone và fact-vs-interpretation. Chart luôn có table/text equivalent; status không truyền bằng màu duy nhất. Evidence local: `AGENTS.md` L87–97; `docs/working/jev-product-analysis/CC-JEV-SAFETY-UX-DOMAIN.md` §8, L261–292.
- **[Unresolved]** Artifact endpoint, interaction schema, retention, exact copy keys và `confirmedCategorySuggestion` binding chưa canonical. Không tạo field/endpoint trong handoff.

## 9. Prerequisites cho Developer D và Team Leader

### 9.1. Developer D — implementation-readiness checklist (không phải runtime change trong file này)

1. **Compatibility probe:** chứng minh server-only route, request `state` object + typed questions, response discriminated answers, probabilities/confidence/Noul semantics, HTTP errors, timeout/cancel, actual limits và privacy settings. Ghi exact URL/operation; old Decisions URL 404 phải được ghi lại, current official URL phải được đối chiếu. **[Verified prerequisite from docs; runtime evidence Unresolved]**
2. **Typed adapter boundary:** xây (sau khi được giao) schema validator cho Choice/Noul/Score, reject unknown/malformed/prose fields, validate question IDs/type/criteria membership/ranges; không fallback bằng text parsing.
3. **State builder + redaction:** allowlist từng capability; redact PII/secret; input description/CSV data untrusted; bounded size; immutable request fingerprint; không log raw state/response.
4. **Application composition:** code-owned gates cho candidate membership, active/appliesTo, freshness, confidence/probability policy, abstention, localized template key, source refs và user-control state. Không đưa arithmetic/authorization vào JEV.
5. **Placement isolation:** synchronous calls ngoài money transaction; post-commit jobs có idempotency/retry bounds; read-time facts render trước; batch row isolation and reassembly; no browser/provider call.
6. **Fallback + observability:** explicit statuses/reason buckets (`manual`, `abstained`, `invalid`, `stale`, `unavailable`), timeout/quota/schema/privacy metrics masked, no raw provider payload; preserve unsaved form and truthful UI outcome.
7. **Evaluation harness:** synthetic/anonymized en/vi slices for income/payment/category ambiguity, `other_or_uncertain`, injection/PII, disabled category, stale response, malformed answer, timeout/quota. Measure eligible precision, correct abstention, override, fallback completeness, latency distribution, stale discard and no-authority invariants. Exact thresholds are owner decisions.
8. **UX/a11y smoke:** verify keyboard/focus/live region, en/vi copy, manual path with flag off, late response after override, stale artifact, chart/table/source labels. This handoff does not run tests or add code.

### 9.2. Team Leader/owners — decisions required before enablement

| Gate | Decision/evidence required | Fail-closed disposition |
|---|---|---|
| Capability scope | Approve only category suggestion now; separately approve each future typed signal/use case. | Keep feature off/manual. |
| Question semantics | Approve question IDs, criteria, primitive, candidate/level set, `other_or_uncertain`, and consumer code. | Do not call JEV. |
| Threshold/abstain | Approve risk-specific thresholds and calibration/evaluation slices; confirm high confidence never bypasses user confirmation. | Always manual/abstain. |
| Contract/provenance | Approve state allowlist, response union, source snapshot/version, stale status, template-key ownership, retention and interaction semantics. | Do not persist/render advisory artifact. |
| Placement/worker | Approve timeout, bounded concurrency/retry, post-commit queue/idempotency, read-time behavior and offline policy. | Deterministic-only; no async JEV. |
| Privacy/security | Approve redaction, logging mask, provider privacy evidence and kill switch. | Flag off if unknown. |
| Product UX | Approve en/vi labels, fact-vs-advisory copy, source link, dismiss/save/feedback and accessibility states. | Hide typed result; keep manual/facts. |
| Release gate | Review JEV-off parity, no side effects, malformed/error replay, stale/race, owner scope and synthetic eval evidence. | No JEV enablement; core may ship deterministic. |

- **[Unresolved]** Đây là prerequisites/decision list, không phải yêu cầu sửa API/ADR/architecture trong handoff. Team Leader phải chọn artifact/canonical owner nếu muốn biến proposal thành implementation contract.
- **[Verified fact]** Current canonical default là JEV optional/default-off, backend-only, typed-only sau compatibility probe; JEV failure không làm hỏng money path. Evidence: `docs/PRD.md` §3.5, §4, L45–63; `docs/AI-JEV.md` §1–§7, L5–89; `docs/ARCHITECTURE.md` §5–§6, L43–56.

## 10. Acceptance checklist cho composition/ops

- [ ] Mỗi capability có state allowlist và typed questions atomic; không có question “what should system do next?” hoặc prose explanation.
- [ ] Primitive dùng đúng semantics: Choice cho finite category/intent, Noul cho yes/no predicate, Score chỉ cho ordered numeric/ranking/threshold signal có product semantics.
- [ ] Answers/questions cùng request được xử lý độc lập; code không giả hidden context; dependent steps do code sequence.
- [ ] Code kiểm tra discriminated schema, answer IDs, membership, probability/range/confidence/score/noul invariants; không parse prose.
- [ ] Category suggestion là synchronous pre-submit ngoài transaction; user review/override và final Save riêng; high confidence không auto-commit.
- [ ] Post-commit worker không block/rollback money path; read-time facts render trước; batch không commit trước review.
- [ ] Timeout/quota/rate/privacy/schema/stale/low-confidence đều manual/abstain/facts fallback; không zero giả và không retry vô hạn.
- [ ] No raw balance/ledger/session/claims/secret/PII outbound/log; description/CSV data treated as untrusted data.
- [ ] Provenance tách authoritative evidence khỏi typed advisory; app-owned localized copy, không model prose; user thấy source/as-of/stale/control.
- [ ] JEV off/manual baseline vẫn tạo income/payment, đọc report/budget/dashboard, correction và issue flow bình thường.
- [ ] Offline/batch cache không được coi là current authority; no offline new JEV call.
- [ ] Old prose-based claims are explicitly corrected; no current report section says JEV writes monthly explanation/tip/coaching/NBA prose.

## 11. Evidence index

### Official TypeSafe

- [System One](https://docs.typesafe.ai/concepts/system-one) — typed decisions/probabilities, not generated text; code composes answers and controls workflow.
- [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) — AI-powered software boundary, code/control flow, state decomposition, atomic questions, parallel questions, deterministic composition.
- [State](https://docs.typesafe.ai/concepts/state) — state string/object/array; one state with multiple independent questions.
- [Confidence](https://docs.typesafe.ai/confidence) — probability distribution, confidence, uncertainty, risk-specific threshold and review/escalation.
- [API](https://docs.typesafe.ai/api) — request `state`/`model`/`questions`; typed Noul/Choice/Score request and answer shapes.
- [Choice](https://docs.typesafe.ai/primitives/choice) — finite option, choice/probabilities/confidence, `other`/none-of-the-above and independent multi-question guidance.
- [Noul](https://docs.typesafe.ai/primitives/noul) — yes/no probability, no separate confidence, threshold/three-way handling and separate predicates.
- [Score](https://docs.typesafe.ai/primitives/score) — ordered descriptive levels, probability-weighted score, probabilities/confidence; combine only in code.

### Official OpenRouter

- [System One API — Submit a System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md) — `POST /systemone`, typed questions/answers, model/provider/usage response and documented HTTP errors.
- [OpenRouter docs index](https://openrouter.ai/docs/llms.txt) — lists the current Decisions reference path.
- [Decisions API — current official page](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md) — current index-listed `POST /api/alpha/decisions` reference. The requested non-alpha URL `https://openrouter.ai/docs/api/api-reference/decisions/submit-a-decisions-request` returned 404 on retrieval; do not cite it as an available endpoint.

### Campus Coin canonical/local

- `AGENTS.md` §Tooling và kiến trúc, §Không được đụng, §JEV/OpenRouter, L26–39, L51–63, L99–141 — layered boundary, no provider in domain/transaction, default-off typed JEV, privacy/fallback.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.4–§1.6, L57–165 — user-entered/no bank, advisory AI/override, broad future summary/tips/CSV/optional intelligence (not automatic MVP authority).
- `docs/PRD.md` §1, §3.2–§3.5, §4–§6, L3–73 — deterministic core, category-only optional JEV, confirmation/fallback, out-of-scope complex AI/prediction/autonomous action.
- `docs/DOMAIN-MODEL.md` §1, §3–§5, L3–15, L38–85 — authoritative formulas/invariants, immutable ledger, owner/authorization, no JEV authority.
- `docs/ARCHITECTURE.md` §1–§8, L3–69 — browser/API/domain/persistence boundaries, JEV adapter, no money transaction provider calls.
- `docs/AI-JEV.md` §1–§8, L5–93 — typed compatibility gate, allowed category input/output, redaction, bounded errors/fallback, deferred prose/prediction.
- `docs/contracts/openapi.yaml` `/ai/category-suggestion`, `/ledger/transactions`, `/budgets*`, `/reports/*`, L102–129, L215–260, L338–348, L440–449, L533–677 — current category/money/read shapes; do not infer new insight/batch contract.
- `docs/contracts/API-REVIEW.md` §Cổng bảo mật, §Ledger correction, §Response và pagination, §Domain scope, L5–48 — owner/CSRF/idempotency/correction/date and warning semantics.
- `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1.2, §3, §5–§8, L27–36, L62–207, L231–300 — read-only baseline whose prose-based JEV assumptions are corrected in §1.2 of this handoff; old file remains unchanged.
- `docs/working/jev-product-analysis/CC-JEV-INSIGHT-COACH.md` §2–§7, L28–294 — deterministic facts-first placement and provenance ideas; narrative wording must be reinterpreted as application-owned templates, not Jev prose.
- `docs/working/jev-product-analysis/CC-JEV-TRANSACTION-AUTOMATION.md` §3–§4, L44–283 — pre-submit/batch deterministic boundary, candidate validation, abstain/fallback and no auto-commit.
- `docs/working/jev-product-analysis/CC-JEV-SAFETY-UX-DOMAIN.md` §3–§9, L48–300 — user control, provenance, stale/error/a11y/privacy policy; old artifact remains read-only.

**Kết luận:** Campus Coin có thể dùng System One an toàn khi coi Jev là một batch of narrow typed judgments, không phải người viết narrative hay agent. Synchronous category suggestion là placement hiện có fit rõ nhất; async post-commit, read-time và offline/batch chỉ nên mở cho typed signals sau khi có deterministic facts, provenance, fallback, privacy và interaction contract. Mọi authority, sequence, arithmetic, authorization, persistence và side effect thuộc về application/domain code; JEV off/unavailable luôn rơi về manual hoặc deterministic baseline.
