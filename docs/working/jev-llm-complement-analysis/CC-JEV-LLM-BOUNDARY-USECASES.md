# CC-JEV-LLM-BOUNDARY-USECASES

> **Trạng thái:** working analysis/handoff; không phải ADR, canonical contract, OpenAPI amendment hoặc runtime implementation.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa SRS, ADR, architecture, domain, auth, OpenAPI, source runtime, `docs/working/jev-system-one-analysis/` hoặc `docs/working/jev-product-analysis/`.
>
> **Mục tiêu:** xác định ranh giới giữa JEV TypeSafe System One (`Choice`/`Noul`/`Score`) và một generative LLM API giả định cho Campus Coin. Generative LLM chỉ là lớp bổ sung tùy chọn cho explanation/copy hoặc structured extraction; không thay JEV, code/domain, authorization, arithmetic, ledger, budget hoặc savings.

## 0. Kết luận điều hành

### 0.1 Quyết định đề xuất

- **[Verified fact]** JEV/System One là typed decision primitive: nhận một `state` và typed questions, trả answer theo primitive cùng probability/confidence khi primitive hỗ trợ. JEV không phải chat/prose writer, không giải thích reasoning và không chọn next action. Bằng chứng: TypeSafe [System One](https://docs.typesafe.ai/concepts/system-one), [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [API](https://docs.typesafe.ai/api), [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score).
- **[Verified fact]** Campus Coin có hai transaction type canonical là `income` và `payment`; backend/domain là authority của wallet, ledger, savings, budget và report. Ledger/audit immutable/append-only, budget overrun chỉ là warning, và JEV không được tính tiền, authorize hoặc ghi money state (`docs/PRD.md` §1, §3.2–§3.5; `docs/DOMAIN-MODEL.md` §1, §3–§5; `docs/ARCHITECTURE.md` §2, §4–§8; `docs/AI-JEV.md` §3–§8).
- **[Verified fact]** Canonical JEV MVP chỉ là category suggestion trước submit, backend-only, default-off, active candidate set, user confirm/override và manual fallback (`docs/PRD.md` §3.5; `docs/AI-JEV.md` §3–§7; `docs/contracts/openapi.yaml` `/ai/category-suggestion`).
- **[Proposal]** Nên bổ sung generative LLM **chỉ như một adapter không-authority**, ưu tiên sau deterministic facts và ngoài critical response. LLM có thể tạo approved display text hoặc trích xuất candidate fields vào strict JSON để người dùng review; nó không được quyết định hay ghi money state.
- **[Proposal]** JEV và LLM là hai capability khác nhau:
  - **JEV:** finite classification, một proposition yes/no hoặc ordered rubric; output typed, không prose.
  - **Generative LLM:** diễn đạt/copy hoặc extraction từ unstructured text sau khi application đã giới hạn context; output phải schema-validated hoặc approved display text.
  - **Code/domain:** tính toán, fact snapshot, threshold, period `Asia/Ho_Chi_Minh`, owner/authz/CSRF, idempotency, persistence, side effects, stale và fallback.
- **[Proposal]** Không đưa LLM vào money critical path. `POST /ledger/transactions`, savings transfer, correction commit, payment authorization và budget calculation phải hoàn tất bằng đường deterministic; không giữ DB transaction/lock khi gọi JEV hoặc LLM; không parse prose để tạo money write.
- **[Proposal]** Bắt đầu bằng deterministic report/dashboard/budget và app-owned templates. Chỉ thêm LLM khi có pain point đo được mà template không giải quyết; ưu tiên async post-response/worker hoặc precompute. Monthly summary/explanation là **LLM complement**, không phải JEV capability.
- **[Unresolved]** Chưa có contract canonical cho generative LLM, insight/tip artifact, CSV/OCR, retention/consent/export/delete, provider privacy, model/endpoint, schema support, availability, timeout, latency distribution, quota hoặc token/cost limits. Chưa được coi là implementation-ready.

### 0.2 Phán quyết ngắn theo lớp

| Lớp | Câu hỏi hợp lệ | Output hợp lệ | Không được làm |
|---|---|---|---|
| **Deterministic code/domain** | `wallet`, `budget_used`, report totals, period, owner, idempotency, duplicate/anomaly rules | Exact VND/period/status, source snapshot, command authorization | Giao arithmetic hoặc authority cho model |
| **JEV/System One** | “Category nào trong finite candidates?”, “Có đủ evidence không?”, “Pattern thuộc nhãn nào?” | `Choice`/`Noul`/`Score` + probabilities/confidence theo native contract | Viết prose, lý do, CTA, tool call, money decision |
| **Generative LLM** | “Diễn đạt các facts đã cung cấp trong locale này”, “Trích xuất candidate fields từ text/OCR sau staging” | Strict JSON/schema hoặc approved plain display text có fact refs | Tính/đoán số, tự tạo fact, authorize, sửa ledger, tự hành động |
| **Application/UI** | Fact-vs-advisory, user decision, localization, accessibility, stale/fallback | App-owned `en`/`vi` labels, chart/table, manual controls | Hiển thị model output như authority/consent |

### 0.3 Câu trả lời trực tiếp cho câu hỏi “có nên bổ sung LLM không?”

- **[Proposal] Có, nhưng chỉ ở lớp complement và sau khi deterministic core đã đủ dùng.** Giá trị hợp lý nhất là monthly summary/explanation/copy và structured extraction; không phải thay JEV category suggestion.
- **[Proposal] JEV vẫn là đường typed cho category và các bounded labels.** LLM không được dùng để giả lập System One bằng chat completion rồi parse JSON/prose.
- **[Proposal] LLM không được làm phản hồi bắt buộc để Save/Pay/Transfer/Correct.** LLM lỗi, timeout, schema refusal, stale snapshot, privacy block hoặc hết budget đều phải rơi về manual/static/deterministic path.
- **[Unresolved]** Không được kết luận LLM sẽ nhanh, rẻ, sẵn sàng, bilingual, multimodal hoặc tương thích với Campus Coin trước probe. Không hứa p50/p95/p99 khi chưa đo.

## 1. Bằng chứng và ranh giới claim

### 1.1 Campus Coin local evidence

- **[Verified fact]** SRS mô tả nhu cầu rộng: category suggestion, CSV import, monthly AI summary, personalized tips, anomaly/duplicate và forecasting (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1, §1.5–§1.7). SRS cũng nói AI classification/summary chỉ advisory và user được xem xét/ghi đè (§1.5).
- **[Verified fact]** PRD canonical scope JEV ở category suggestion, default-off, user confirmation/manual fallback; complex AI summary, CSV, prediction, chat và autonomous action nằm ngoài MVP (`docs/PRD.md` §3.5, §5).
- **[Verified fact]** `docs/AI-JEV.md` cấm JEV tính wallet/savings/budget/amount/date, authorize, ghi/sửa/xóa ledger và yêu cầu backend-only, redaction, bounded work, manual fallback; monthly prose/OCR/CSV/recurring/prediction/chat nằm phần để sau.
- **[Verified fact]** `docs/DOMAIN-MODEL.md` giữ công thức wallet/budget/report và append-only correction; `docs/ARCHITECTURE.md` tách browser/API/domain/persistence và cấm gọi provider trong money transaction.
- **[Verified fact]** OpenAPI hiện có endpoint category suggestion và các read model deterministic `/reports/monthly`, `/reports/dashboard`, `/budgets/summary`; chưa có public contract cho generative summary, tips, extraction hoặc LLM artifact (`docs/contracts/openapi.yaml` paths và schemas).
- **[Verified fact]** Auth là Google OAuth + opaque server-side session; owner lấy từ session, JEV không có role/session/authorization (`docs/AUTHENTICATION.md` §1–§6). Admin chỉ triage issue/content được cấp quyền, không sửa ledger/balance/audit (`docs/ADMIN-OPERATIONS.md` §1–§10; `docs/contracts/API-REVIEW.md` §Admin).
- **[Verified fact]** Delivery plan yêu cầu JEV-off/manual path, money path không phụ thuộc provider; Day 1 phải probe typed endpoint/model/quota/timeout/privacy và Day 5 chỉ bật sau evidence (`docs/DELIVERY-PLAN.md` §4, §8–§12).

### 1.2 Official capability evidence

- **[Verified fact]** TypeSafe mô tả System One khác LLM ở chỗ trả typed decisions/probabilities thay vì reply/code/explanation; control flow, deterministic rules và side effects nằm trong code. Nguồn: [System One](https://docs.typesafe.ai/concepts/system-one), [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).
- **[Verified fact]** TypeSafe `state` là content của request hiện tại; nhiều questions dùng cùng state và được evaluate độc lập. State không phải memory, live database, provenance hoặc stale detector. Nguồn: [State](https://docs.typesafe.ai/concepts/state), [API](https://docs.typesafe.ai/api).
- **[Verified fact]** `Choice` dành cho finite option set; `Noul` là proposition yes/no và không có confidence riêng; `Score` là ordered spectrum. Không primitive nào là prose contract. Nguồn: [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score).
- **[Verified fact]** TypeSafe confidence là tín hiệu từ probability distribution, không bảo đảm từng answer đúng; threshold và hành vi review/fallback do code theo risk. Nguồn: [Confidence](https://docs.typesafe.ai/confidence).
- **[Verified fact]** OpenRouter System One reference mô tả typed request/response; đó không phải chat completion. Nguồn: [OpenRouter System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).
- **[Verified fact]** Một trang official về Structured Outputs của một API generative mô tả JSON Schema response có thể được dùng cho schema-constrained output và extraction; trang safety khuyến nghị adversarial testing, human review khi phù hợp, input/output limits, validated backend material và truyền đạt limitations. Nguồn tham khảo thiết kế: [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices).
- **[Unresolved]** Các trang generative API ở trên không chứng minh provider/model/endpoint cụ thể được chọn cho Campus Coin, cũng không chứng minh `GPT 5.6 luna`, availability, latency, quota, retention hoặc production readiness của bất kỳ deployment nào.

### 1.3 Ghi chú bắt buộc về `GPT 5.6 luna`

- **[Unresolved]** `GPT 5.6 luna` là ví dụ model do user nêu, chưa có evidence official/provider/API contract trong phạm vi đã đọc. Không ghi model ID này vào canonical contract, không giả định model tồn tại, không giả định có structured output, vision/OCR, bilingual quality, speed hoặc availability.
- **[Proposal]** Nếu owner muốn probe model đó, probe phải server-only và ghi riêng: model/endpoint exact, auth/secret boundary, request/response schema, refusal/malformed behavior, limits, timeout/cancellation, latency distribution, privacy/retention, token/cost budget enforcement và fallback. Probe fail hoặc evidence thiếu ⇒ feature disabled/manual; không thay bằng retry/repair model.
- **[Verified fact]** Assignment này không re-litigate provider/pricing/cost. Chỉ yêu cầu **token/cost budget như một design control**: mỗi capability có budget ceiling, max input/output, bounded concurrency, rate limit, queue policy và kill switch do owner phê duyệt; không điền giá trị chưa đo.

## 2. Boundary contract chung: code → JEV/LLM → UI

### 2.1 Fact bundle là đầu vào, không phải model authority

- **[Proposal]** Trước mọi call, application phải lấy deterministic snapshot và tạo allowlist tối thiểu: `sourceSnapshotId`, `sourceKind`, period + `Asia/Ho_Chi_Minh`, fact IDs, exact aggregate values cần hiển thị, locale và candidate/template IDs. Model chỉ được diễn giải/extract trong phạm vi bundle.
- **[Proposal]** Không gửi `session`, Google claims, secret, token, cookie, raw ledger, full balance/savings, owner ID hoặc PII thừa. Nếu explanation cần số, chỉ gửi aggregate/fact refs đã allowlist; không gửi dữ liệu chỉ để model “tự hiểu thêm”.
- **[Verified fact]** User description, CSV cell, OCR text và issue text là untrusted data, không phải instruction. Redaction/length/encoding/secret checks là deterministic boundary; prompt-injection detection bằng model không phải security authority.
- **[Proposal]** Fact bundle nên immutable theo request. Khi transaction, correction, category policy, budget, locale hoặc report snapshot đổi, response/artifact cũ bị discard hoặc đánh dấu stale; JEV/LLM không tự biết thay đổi đó.

### 2.2 JEV native output và application envelope

- **[Verified fact]** Native JEV answer là primitive-specific: `Choice` có `choice`, probabilities, confidence; `Noul` có `noul`; `Score` có `score`, levels/probabilities/legend và confidence khi contract hỗ trợ.
- **[Proposal]** Adapter validate discriminated schema, question IDs, option/level membership, probability/range invariants, candidate active status, `appliesTo`, request fingerprint và freshness. `suggested|manual|disabled|unavailable|invalid|stale|abstain` là **application statuses**, không phải native JEV answers.
- **[Proposal]** JEV output chỉ là inert signal. Code mới được map signal → localized UI label/template hoặc manual route; không map signal → route mutation, amount, date, ledger command, authorization hay CTA execution.
- **[Verified fact]** `confirmedCategorySuggestion` trong OpenAPI là acknowledgement/UI input, không thay server validation, authorization hoặc idempotency (`docs/contracts/openapi.yaml` transaction schema).

### 2.3 Generative LLM output contract

> Các schema dưới đây là proposal nội bộ cho boundary analysis, **không phải OpenAPI change** và không claim provider support.

#### A. Strict structured explanation/copy

- **[Proposal]** Preferred provider response là strict JSON, `additionalProperties: false`, bounded array/string lengths, enum-only keys và no arbitrary HTML/Markdown/URL/command:

```json
{
  "schemaVersion": "llm-explanation-v1",
  "items": [
    {
      "copyKey": "spending_change|monthly_observation|budget_tip|issue_summary",
      "factRefs": ["fact_id_from_input_allowlist"],
      "approvedDisplayText": "plain text, advisory only",
      "caveatKey": "insufficient_data|stale_risk|null"
    }
  ],
  "unsupportedClaim": false,
  "needsManualReview": false
}
```

- **[Proposal]** `factRefs` chỉ được chọn từ allowlist do application gửi; model không được phát minh fact ID, source link, amount, date, balance, category, CTA hoặc policy. `copyKey`/`caveatKey` phải thuộc enum; `approvedDisplayText` là optional advisory copy, không phải source of truth.
- **[Proposal]** Exact numbers, labels, period, source link và CTA nên được code chèn/render từ fact snapshot. Nếu vẫn cho model viết `approvedDisplayText`, validator phải kiểm tra claim refs, length, locale, prohibited claims, unsupported numeric tokens, HTML/control characters và stale snapshot; fail ⇒ dùng app template/hide card.
- **[Proposal]** Public response phải tách `authoritativeFacts` khỏi `advisoryInterpretation`; không trả raw prompt, raw provider response, chain-of-thought, provider error hoặc secret.

#### B. Structured extraction

- **[Proposal]** Extraction response chỉ là candidate fields, luôn có status và unresolved list:

```json
{
  "schemaVersion": "llm-extraction-v1",
  "status": "candidate|insufficient|unsupported|needs_manual_review",
  "fields": {
    "description": {"value": "string|null", "evidenceRef": "span-or-null"},
    "transactionType": {"value": "income|payment|null", "evidenceRef": "span-or-null"},
    "amountText": {"value": "string|null", "evidenceRef": "span-or-null"},
    "occurredAtText": {"value": "string|null", "evidenceRef": "span-or-null"},
    "categoryHint": {"value": "opaque-candidate-or-null", "evidenceRef": "span-or-null"}
  },
  "unresolvedFields": ["amountText"],
  "warnings": ["ambiguous_date|ambiguous_amount|possible_injection"]
}
```

- **[Proposal]** `amountText`/`occurredAtText` là untrusted candidate strings, **không phải canonical VND/date**. Deterministic parser và user review phải normalize/validate; không parse generated prose, không dùng extraction response trực tiếp làm money write.
- **[Proposal]** `categoryHint` nếu có phải match active server candidates; JEV `Choice` có thể chạy sau staging để phân loại row, nhưng user review và normal domain commit vẫn bắt buộc.
- **[Unresolved]** OCR coordinates, image/file modality, evidence span format, max file/row limits và partial failure semantics chưa có canonical contract; không coi JEV System One text-only là OCR engine.

#### C. Approved display text only

- **[Proposal]** Nếu capability chỉ cần copy, output duy nhất được phép render là field `approvedDisplayText` trong schema đã validate; UI app-owned thêm badge advisory, source/period/as-of, locale, accessibility semantics và controls. Không dùng text đó làm input cho another model/financial parser.
- **[Proposal]** Generated text không được chứa “Pay/Transfer/Save/Set budget/Reverse now” command hoặc cam kết tiết kiệm/số dư. CTA/action ID do deterministic policy chọn; nếu copy đề xuất action, chỉ được tham chiếu allowlisted screen và vẫn cần explicit click.
- **[Proposal]** Nếu locale mismatch, text quá dài, unsafe, thiếu fact refs, stale hoặc refusal ⇒ app template/static copy/manual. Không sửa output bằng hidden prose-repair loop.

### 2.4 Output validation và failure semantics

- **[Proposal]** Validate toàn bộ response trước khi render: HTTP/transport → body present → schema/discriminator → enums/lengths → fact/candidate refs → source version/freshness → policy → UI. Reject toàn response khi thiếu/thừa key, malformed JSON, unknown enum, unsupported fact, refusal ngoài contract hoặc text chứa prohibited content.
- **[Proposal]** Không parse free-form prose thành amount/date/category/command. Không lấy JSON nằm trong text làm “repair”. Không retry vô hạn; retry bounded chỉ ở worker operation không tạo duplicate và không giữ money lock.
- **[Proposal]** App-owned statuses gồm `generated`, `manual`, `deterministic_only`, `stale`, `unavailable`, `refused`, `schema_invalid`, `privacy_blocked`, `budget_exhausted`; chúng không phải model claims.
- **[Verified fact]** JEV timeout/quota/4xx/5xx/schema/privacy/low-confidence phải fallback manual và không block money path (`docs/AI-JEV.md` §5–§7). LLM complement phải giữ cùng nguyên tắc và thêm refusal/schema/stale handling.

## 3. Performance-first placement

### 3.1 Critical path definition

- **[Verified fact]** Money path gồm opening wallet, create `income`/`payment`, savings transfer, correction/append-only domain command, wallet lock/idempotency/authorization và budget/report arithmetic (`docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`).
- **[Proposal]** Không gọi LLM/JEV trong DB transaction, không chờ provider trước khi payment commit, không để LLM output quyết định whether payment/correction succeeds. Critical response phải có deterministic result hoặc deterministic error mà không phụ thuộc model.
- **[Proposal]** “Blocking” trong các card dưới đây chỉ được phép là blocking một **optional advisory surface** (ví dụ chờ preview nếu user chủ động bấm), không phải blocking Save/Pay/Transfer/Correct hoặc first useful report facts.

### 3.2 Chiến lược và khuyến nghị

| Strategy | Phù hợp | Tác động | Quyết định |
|---|---|---|---|
| **JEV-only** | Category `Choice`, bounded intent/type, finite pattern signal | Có thể chậm ở nút Suggest nhưng manual/Save vẫn dùng được | **Khuyến nghị cho category**; không thay prose bằng JEV |
| **LLM-only** | Monthly summary, approved explanation/copy, masked feedback summary, extraction sau staging | Không nên chặn first useful response; failure → template/manual | **Khuyến nghị cho narrative/extraction ở async/read-time sau facts** |
| **Parallel fan-out** | Deterministic report facts chạy cùng một advisory request khi hai nhánh không phụ thuộc và facts trả về trước | Chỉ hợp lệ nếu response critical không cần advisory; không coi song song là “nhanh” nếu user vẫn phải chờ cả hai | **Chỉ dùng khi thật sự non-blocking**; đo trước/sau |
| **JEV-gated LLM cascade** | JEV typed signal lọc eligibility/candidate rồi LLM diễn đạt một artifact đã được code chuẩn bị | Thêm một hop và latency; failure của LLM không được làm mất JEV/manual path | **Chỉ dùng khi gate JEV loại bỏ work có giá trị rõ**; không phải default |
| **Async post-response/worker** | Monthly artifact, tips, feedback labels, admin masked summary, duplicate/anomaly explanation | Commit/read facts hoàn tất trước; worker bounded/idempotent; UI nhận artifact sau | **Mặc định ưu tiên** cho LLM |
| **Cache/precompute** | Artifact theo immutable source snapshot + locale + contract/policy/model snapshot | Phải owner-scope, retention-safe, stale/invalidate khi facts/correction/locale đổi | **Nên dùng sau khi có artifact contract** |

- **[Proposal]** Dashboard/report nên trả facts/chart/table ngay; explanation có thể load sau hoặc bị ẩn. Monthly summary/tips nên precompute sau report snapshot hoặc tạo trong worker sau response.
- **[Proposal]** `JEV-only`, `LLM-only` và parallel không được hiểu là SLA. Chỉ benchmark bằng synthetic/anonymized workloads và real bounded smoke sau compatibility probe; không viết p50/p95/p99 dự kiến vào contract.
- **[Unresolved]** Exact timeout, queue/concurrency, cache TTL, retry budget, max tokens, daily/monthly token/cost ceiling và invalidation trigger cần owner/security/ops phê duyệt sau probe; không invent values.

### 3.3 Luồng an toàn mẫu

```text
User submit payment
  -> API validate/authz/idempotency
  -> domain lock wallet + commit immutable row
  -> response authoritative (không JEV/LLM)
  -> budget/report projection deterministic
  -> optional bounded worker: JEV typed signal hoặc LLM advisory artifact
  -> UI đọc artifact cùng sourceSnapshot/asOf/stale state
```

```text
User mở monthly report
  -> report facts/chart/table deterministic trả trước
  -> optional LLM call trên allowlisted fact bundle (hoặc cache hit)
  -> validate schema/factRefs/locale/safety
  -> render advisory text; nếu fail thì facts/static template vẫn đủ
```

## 4. Ma trận disposition

> `JEV fit` nói về typed decision fit; `LLM fit` nói về generation/extraction fit có điều kiện. `Overall` là disposition đề xuất, không phải runtime evidence.

| Use case | JEV fit | LLM fit | Overall disposition | Placement ưu tiên |
|---|---|---|---|---|
| Category suggestion | **Fit rõ**: `Choice`, optional `Noul` sufficiency | Không cần; copy do app/template | **JEV-only** (manual-first, default-off) | Explicit pre-submit suggestion, không block Save |
| Transaction intent/type | **Fit có điều kiện**: finite `Choice`/`Noul` | **Fit có điều kiện**: extract intent candidate từ text | **Both chỉ ở experiment deferred**; manual/type explicit thắng | Non-blocking prefill hoặc offline review |
| Correction/help | **Fit route-only**: `Noul` + `Choice` area | **Fit extract/summarize masked request** | **Both bounded, defer**; authority reject | Async assist sau khi user gửi issue |
| Dashboard/report explanation | **Optional typed pattern**; không prose | **Fit bounded explanation** sau fact snapshot | **LLM-led optional; JEV optional**; deterministic template trước | Read-time async/worker, facts trước |
| Monthly summary | Không fit cho prose; optional pattern gate | **Fit rõ** sau deterministic report | **LLM-only complement** (JEV prose reject) | Async post-response/cache |
| Budget coaching/tips | Core không cần; optional relevance `Choice`/`Noul` | **Fit copy** từ allowlisted facts/tips | **Code-only default + LLM optional**; no JEV NBA | Static template/read-time/worker |
| CSV/OCR/extraction | Row category `Choice` sau staging | **Fit extraction có điều kiện modality/provider** | **Both future, defer**; parser/code authority | Bounded staging/preview/worker |
| Feedback/learning | Không có memory/retrain fit | Optional masked label/summary | **Code-only default; LLM optional telemetry** | Async, no policy mutation |
| Duplicate/anomaly | **Reject detector/authority** | **Chỉ fit explanation sau code flag** | **Code-only detection**; optional LLM wording | Deterministic scanner, advisory async |
| Admin | Bounded topic/urgency hint có thể fit | Masked issue summary/extraction có thể fit | **Both optional bounded, human/code-owned**; autonomous reject | Async assist, admin review |
| Chat/financial advice/forecast/autonomous action | **Reject** | **Reject/defer** trong scope này | **Reject** | Không outbound hoặc static help |

## 5. Use-case cards

### UC-01 — Category suggestion trước submit

- **Classification — [Verified fact]/[Proposal]:** JEV fit rõ (`Choice` trên active candidates; optional `Noul` sufficiency). Generative LLM không đem lại lợi ích cần thiết; category label/copy là app-owned. **Disposition: JEV-only, manual-first, default-off.**
- **Trigger — [Verified fact]/[Proposal]:** User đã chọn `income|payment`, nhập description hợp lệ và chủ động bấm “Gợi ý danh mục”; không gọi mỗi keystroke. Manual picker phải usable trước khi request.
- **Minimal state — [Proposal]:** `transactionType`, description đã validate/redact, active candidate snapshot (`id`, semantic label, `appliesTo`, version), locale, contract version. Không gửi amount/date/balance/savings/raw ledger/session/claims/secret/PII thừa.
- **Output contract — [Verified fact]/[Proposal]:** JEV native `Choice {choice, probabilities, confidence}` và optional `Noul {noul}`. Adapter map thành application `suggested|manual|disabled|unavailable|stale|invalid`; các status này không phải JEV output. UI copy “Gợi ý — hãy kiểm tra trước khi lưu” do app/localization viết. Không dùng LLM để tạo rationale.
- **Blocking/non-blocking — [Proposal]:** Suggestion call có thể chờ trong phạm vi nút Suggest, nhưng không được khóa manual picker, không giữ money transaction và không block final Save. JEV timeout không làm mất form.
- **User control — [Verified fact]/[Proposal]:** User `Use this category`, override, dismiss hoặc chọn manual; Save riêng. Server revalidate active category, `appliesTo`, owner, amount/date, CSRF và idempotency; confirmation không phải authorization.
- **Fallback — [Verified fact]:** Flag off, privacy/injection concern, timeout, quota/HTTP error, malformed answer, candidate mismatch, stale hoặc policy low-confidence ⇒ manual picker; không map gần đúng và không retry prose.
- **Metrics — [Proposal]:** 100% accepted category active/đúng `appliesTo`; zero auto-select/auto-commit; JEV-off completion parity; override/manual/abstention/fallback/schema-invalid/stale rates theo `en|vi × income|payment`; zero sensitive outbound/log.
- **Disposition — [Proposal]:** Giữ đây là canonical JEV lane. Không mở `/ai/category-suggestion` thành prose endpoint; nếu muốn giải thích category, dùng template tĩnh, không cần LLM.

### UC-02 — Transaction intent/type

- **Classification — [Proposal]:** JEV fit cho finite `Choice`/`Noul` khi user chưa chọn type. LLM fit có điều kiện cho extraction candidate từ free text, nhưng không phải type authority. **Disposition: both chỉ là capability deferred; default manual/type explicit.**
- **Trigger — [Proposal]:** User chủ động bấm “Gợi ý loại giao dịch” khi type chưa explicit hoặc yêu cầu kiểm tra lại; không gọi khi user đã chọn type trừ khi user yêu cầu.
- **Minimal state — [Proposal]:** Redacted description, locale, screen context bounded và candidate set `{income,payment,not_a_transaction,manual_required}`. Không gửi amount/date/balance/raw ledger/session. Domain không nhận `expense` hoặc `transfer` làm transaction type.
- **Output contract — [Proposal]:** JEV: `transaction_intent: Choice` + optional `is_recordable_transaction: Noul`; app map thành `suggestedType|manual|not_transaction`. LLM (nếu experiment được duyệt): strict JSON `status`, `transactionType: income|payment|null`, `evidenceRefs`, `unresolvedFields`; không có `CreateTransactionRequest`, amount, date hoặc command. Mọi enum/membership phải validate server-side.
- **Blocking/non-blocking — [Proposal]:** Không block form, Save hoặc first useful response. Prefill chỉ là pending suggestion; nếu LLM/JEV chậm, native type picker vẫn hoạt động. Không chạy cascade trên critical Save.
- **User control — [Verified fact]/[Proposal]:** Explicit type của user luôn thắng; user đổi/dismiss; final review kiểm tra type/category/amount/date. Không auto-route description vào ledger.
- **Fallback — [Proposal]:** Unclear, unsupported, injection-shaped, schema/refusal/timeout/stale ⇒ manual type picker/static help. Text yêu cầu correction/authorization/transfer ⇒ route help/manual, không ép thành `income|payment`.
- **Metrics — [Proposal]:** Agreement với final type; override/abstention/manual completion; zero enum/category mismatch; zero suggestion-induced failed Save; no difference in JEV/LLM-off completion; extraction unresolved rate.
- **Disposition — [Proposal]:** Không cần LLM nếu JEV/manual đủ. Nếu thử cả hai, chạy non-blocking trên synthetic/holdout and explicit user review; không mở rộng thành form-filling agent.

### UC-03 — Correction/help classification và issue summary

- **Classification — [Proposal]:** JEV fit chỉ để route bounded help area (`Noul` + `Choice`). LLM fit để extract fields hoặc tạo summary masked cho user/admin review. **Disposition: both bounded, defer; correction authority reject.**
- **Trigger — [Verified fact]/[Proposal]:** User mở help/correction hoặc gửi issue text và chủ động yêu cầu phân loại; không gọi trong correction transaction và không tự sửa history.
- **Minimal state — [Proposal]:** Redacted message, opaque `targetContext`, finite area `{category, amount, occurred_at, possible_duplicate, other, manual_required}`, locale. Không gửi raw ledger, full balance, session, correction command, secret hoặc cross-owner data.
- **Output contract — [Proposal]:** JEV: `is_correction_request: Noul` + `correction_area: Choice`; chỉ route hint. LLM: strict JSON `{topic, requestedHelp, missingFields[], targetReferencePresent, approvedDisplayText?}` với enum allowlist; không trả `correctionRole`, `newAmountVnd`, `newCategoryId`, target command, priority quyết định hoặc SQL. Summary nếu có phải gắn nhãn generated/advisory và không thay original user issue.
- **Blocking/non-blocking — [Proposal]:** User luôn submit manual issue/static correction form mà không chờ model. LLM summary có thể async sau issue creation; không block correction/help availability và không gọi trong append-only commit.
- **User control — [Verified fact]/[Proposal]:** User chọn target/reason/area, sửa nội dung và confirm normal correction/issue flow. Admin không accept correction thay user; server kiểm tra owner và correction role policy.
- **Fallback — [Verified fact]/[Proposal]:** Manual menu/static help nếu model off/unavailable/stale/privacy/schema/refusal; dispute/integrity ambiguity → support/human escalation. Không đoán reversal/adjustment/replacement.
- **Metrics — [Proposal]:** Route-to-correct-form; manual completion; LLM extraction unresolved/refusal/schema rates; zero JEV/LLM-created correction; zero original-row mutation; zero wrong-owner exposure; issue audit/masking completeness.
- **Disposition — [Proposal]:** Có thể thử cả hai ở non-critical assist sau khi correction/help contract, retention và privacy được duyệt. Domain correction vẫn code-only append-only (`docs/DOMAIN-MODEL.md` §5; `docs/contracts/API-REVIEW.md` §Ledger correction).

### UC-04 — Dashboard/report explanation (“what changed?”)

- **Classification — [Proposal]:** JEV chỉ có optional typed `pattern_kind`/`needs_review`; LLM có fit cho bounded explanation sau deterministic snapshot. **Disposition: LLM-led optional; JEV optional; deterministic template first.**
- **Trigger — [Verified fact]/[Proposal]:** User mở `/reports/dashboard` hoặc `/reports/monthly` sau khi facts load và chủ động mở card explanation; không gọi trong report arithmetic, payment hoặc DB transaction.
- **Minimal state — [Proposal]:** Allowlisted fact IDs/values, current-vs-baseline đã code tính, period/timezone HCMC, completeness/freshness, source snapshot/version, locale và candidate copy keys. Không raw ledger hoặc unrestricted transaction list.
- **Output contract — [Proposal]:** JEV (nếu có): `pattern_kind: Choice` (`increase|decrease|no_clear_change|insufficient_data`) + optional `needs_review: Noul`; không prose. LLM: strict `items[{copyKey, factRefs, approvedDisplayText, caveatKey}]`, no generated CTA/amount/date/source URL. Code kiểm tra factRefs thuộc input, chèn exact values/source links và tách `authoritativeFacts`/`advisoryInterpretation`.
- **Blocking/non-blocking — [Proposal]:** Facts/chart/table/first useful response không chờ LLM. Parallel fan-out chỉ được dùng nếu advisory thực sự không block critical response; read-time late result không cướp focus. Worker/cache là mặc định.
- **User control — [Proposal]:** Xem bảng/chart nguồn, mở fact detail, dismiss/save/feedback/refresh; không `Apply-to-wallet`, không tự sửa budget/payment. Stale badge phải rõ.
- **Fallback — [Proposal]:** Missing/stale/incomplete facts, invalid pattern, schema/refusal/provider/budget/privacy failure ⇒ facts + app-owned static copy hoặc hide card; không zero giả và không dùng old artifact như current.
- **Metrics — [Proposal]:** 100% claim-to-source/factRefs hợp lệ; zero stale-as-current; zero unsupported causal claim; source-open/comprehension/dismiss/feedback; first useful response parity khi LLM off; schema/refusal/latency/cache-hit rates.
- **Disposition — [Proposal]:** LLM có thể tạo câu chữ ở đây, **nhưng chỉ sau facts và trong approved display-text contract**. JEV không trở thành narrative writer. Baseline System One F1/F3/F6/F9 vẫn đúng.

### UC-05 — Monthly summary

- **Classification — [Verified fact]/[Proposal]:** SRS yêu cầu summary tùy chọn nhưng canonical MVP scope-cut complex AI summary. JEV không fit cho prose; LLM fit sau report deterministic. **Disposition: LLM-only complement, deferred; no JEV narrative.**
- **Trigger — [Proposal]:** User mở một month HCMC đã có deterministic report, hoặc worker tạo artifact sau report snapshot; không tạo trong `POST /ledger/transactions` và không làm report endpoint phụ thuộc generation.
- **Minimal state — [Proposal]:** `sourceSnapshotId/version`, month + `Asia/Ho_Chi_Minh`, completeness, fact IDs và exact aggregates đã code tính (`totalIncome`, `totalPayment`, category breakdown, current-vs-baseline). Không raw ledger/session/Google claims; chỉ gửi field cần diễn đạt.
- **Output contract — [Proposal]:** Strict JSON:

```json
{
  "schemaVersion": "monthly-summary-v1",
  "items": [
    {
      "kind": "observation|comparison|caveat",
      "factRefs": ["fact_id_from_allowlist"],
      "approvedDisplayText": "plain advisory text",
      "caveatKey": "insufficient_data|stale_risk|null"
    }
  ],
  "unsupportedClaim": false
}
```

  JEV chỉ có thể cung cấp optional `pattern_kind: Choice` trước đó; không có `summaryText` native. Code phải reject item thiếu factRefs, bịa causal claim, sai locale, sai period hoặc đưa số không khớp facts. Nếu policy muốn chắc chắn số không bị paraphrase, app render numbers từ facts và dùng LLM cho copy fragments/template slots.
- **Blocking/non-blocking — [Proposal]:** Report facts và table/chart trả ngay; summary generation async/read-time after response hoặc cache. LLM failure không làm report unavailable.
- **User control — [Verified fact]/[Proposal]:** User xem source table/chart, dismiss/save/pin/feedback/refresh; artifact không có Apply-to-money/budget/payment. Nhãn “Gợi ý tham khảo/AI-generated” và `asOf`/stale phải app-owned.
- **Fallback — [Proposal]:** Deterministic report + static localized summary template; thiếu baseline hoặc stale ⇒ “chưa đủ dữ liệu”/hide interpretation, không summary cũ/zero giả. Refusal/schema/provider/privacy/budget failure ⇒ giữ report.
- **Metrics — [Proposal]:** Fact/claim exactness; zero unsupported causal/financial-advice claim; comprehension/source-open; stale suppression; LLM-off report parity; schema/refusal/output-length/queue/cache rates; no first-content regression.
- **Disposition — [Proposal]:** Đây là lý do hợp lý nhất để khảo sát generative LLM, nhưng phải là artifact riêng có provenance/retention/stale contract. Không sửa finding rằng **JEV không sinh monthly prose**; chỉ bổ sung rằng một LLM khác có thể sinh approved copy sau deterministic facts.

### UC-06 — Budget coaching và saving tips

- **Classification — [Verified fact]/[Proposal]:** Budget arithmetic/status/threshold/dedupe là code-only. JEV không nên chọn NBA hoặc viết coaching; có thể thử typed relevance signal. LLM có fit cho wording low-pressure từ allowlisted tip/facts. **Disposition: code-only default + optional LLM; JEV optional, not required.**
- **Trigger — [Verified fact]/[Proposal]:** Budget summary/warning deterministic đã load sau commit hoặc user mở budget/tips; không gọi để quyết định có cho phép payment.
- **Minimal state — [Proposal]:** `categoryId`, `usedVnd`, `limitVnd`, `isOverrun`, month HCMC, source snapshot/as-of, data sufficiency và allowlisted `tipKey` candidates. Code tính threshold/dedupe; không gửi raw ledger/goal suy đoán hoặc action command.
- **Output contract — [Proposal]:** JEV optional `is_review_prompt_relevant: Noul` hoặc `attention_kind: Choice`; không hỏi “what should user do?”. LLM strict `{tipKey, factRefs, approvedDisplayText, caveatKey}`; `tipKey`/CTA phải allowlist, nhưng CTA do code policy chọn hoặc bị bỏ khỏi model output. Không trả guaranteed saving, amount recommendation tự do, budget mutation hay payment command.
- **Blocking/non-blocking — [Proposal]:** Exact `used/limit/isOverrun` và warning không chờ model. LLM copy async/cache; stale/unavailable chỉ bỏ card, không block payment và không block budget read.
- **User control — [Verified fact]/[Proposal]:** User mở source transactions/budget, dismiss/snooze/pin/feedback; click chỉ mở review screen. Không auto-upsert budget, payment hoặc savings transfer.
- **Fallback — [Proposal]:** Deterministic progress/warning hoặc app-owned tip template; thiếu data/stale/refusal/schema/privacy/budget exhaustion ⇒ hide optional card. Overrun vẫn warning-only, wallet-sufficient payment vẫn được phép.
- **Metrics — [Proposal]:** Budget comprehension; source-open/review completion; useful/dismiss/alert-noise; zero payment rejection/mutation; zero unsupported saving guarantee/shaming; JEV/LLM-off parity; schema/stale/fallback rates.
- **Disposition — [Proposal]:** Code/template trước. LLM chỉ được paraphrase hoặc chọn copy artifact đã được allowlist; JEV typed signal chỉ đáng thử nếu có ambiguity không giải quyết được bằng rule. Baseline correction F2/F3/F12 giữ nguyên: model không chọn action, threshold hay arithmetic.

### UC-07 — CSV/OCR/structured extraction

- **Classification — [Verified fact]/[Proposal]:** CSV nằm ngoài canonical MVP; JEV có fit row-level category sau deterministic staging; generative LLM có fit extraction từ bounded text/OCR candidate nếu modality/provider qua probe. **Disposition: both future/defer; parser/code authority.**
- **Trigger — [Proposal]:** User upload/scan sau khi feature được duyệt; deterministic file limits, encoding/header/parser hoặc OCR preprocessing đã chạy; chỉ gọi model cho row/document bounded và user yêu cầu.
- **Minimal state — [Proposal]:**
  - CSV: `jobId/rowId` opaque, validated `income|payment` nếu đã parse, redacted description, active candidates, locale, parser/schema version. Không gửi raw file, unvalidated amount/date, session hoặc cross-row private context.
  - OCR: bounded OCR text/crop reference hoặc modality input chỉ khi adapter probe chứng minh support; không giả định JEV nhận image (System One evidence là text-only). Không gửi secrets/PII thừa.
- **Output contract — [Proposal]:** LLM strict extraction schema với candidate `transactionType`, `amountText`, `occurredAtText`, `description`, `categoryHint`, `evidenceRefs`, `unresolvedFields`, `warnings`; tất cả candidate strings chưa canonical. Code parser/normalizer kiểm tra integer VND, date/HCMC, enum, owner, duplicate/idempotency. JEV `Choice`/optional `Noul` chỉ chạy per validated row để chọn active category/sufficiency. Không prose parse, không auto-import.
- **Blocking/non-blocking — [Proposal]:** Preview worker có thể chờ optional extraction nếu user chọn, nhưng import commit không chờ model ngoài bước explicit review; unresolved rows/manual picker luôn tiến được. Không giữ DB transaction trong extraction.
- **User control — [Proposal]:** Map columns/crop, xem evidence, sửa amount/date/type/category, accept/override/skip từng row, explicit batch confirm. Row chưa rõ không commit; không silent drop/zero fill.
- **Fallback — [Verified fact]/[Proposal]:** CSV parser/OCR/model off, file oversized/unsafe, timeout/refusal/schema/privacy/stale ⇒ actionable row/document error + manual entry; giữ preview. Không coi OCR candidate là fact và không đổi ledger cũ.
- **Metrics — [Proposal]:** Zero silent row loss/duplicate; 100% committed rows explicit reviewed; extraction field unresolved/override/error; 100% committed category active/đúng type; import time vs manual baseline; zero LLM/JEV authority for amount/date/type; per-modality privacy incidents.
- **Disposition — [Proposal]:** Deterministic parser/staging/preview là prerequisite. JEV row category và LLM extraction có thể cùng tồn tại sau contract, nhưng **both không được biến thành batch agent**. OCR modality, retention, file hash, partial failure và evidence spans là `[Unresolved]`.

### UC-08 — Feedback/learning từ accept, override, correction

- **Classification — [Verified fact]/[Proposal]:** JEV request không tự có memory/retraining side effect. Feedback persistence là code-only; LLM có thể label/summarize masked feedback async nếu cần vận hành. **Disposition: code-only default; optional LLM telemetry; JEV not required.**
- **Trigger — [Verified fact]/[Proposal]:** User accept/override/dismiss category, submit correction hoặc gửi feedback text; event capture sau interaction, không gọi trong money transaction.
- **Minimal state — [Proposal]:** Owner-scoped opaque event, capability/version, suggested/final category IDs, type, locale, disposition, source snapshot/version và masked feedback text nếu được consent. Không raw prompt/response, raw ledger, secret, cross-user data hoặc full financial detail.
- **Output contract — [Proposal]:** Code append-only event `{eventType, before, after, reasonCode, version, actor, time}`. Optional LLM strict `{feedbackKind: wrong_category|missing_candidate|unclear_copy|technical_issue|other, unresolved:false, approvedDisplayText?:string}`; không output policy update, retrain command hoặc recategorization list. JEV chỉ có thể classify a new future candidate request, không “học” từ event tự động.
- **Blocking/non-blocking — [Proposal]:** Không block user Save/correction/UI. Worker failure chỉ mất optional label; original event/domain behavior giữ nguyên.
- **User control — [Proposal]:** User có thể dismiss/override/correction; opt-out/retention/export/delete/consent phải có contract trước khi thu feedback. Không tuyên bố “đã học ngay”.
- **Fallback — [Proposal]:** No store/consent/privacy/schema/refusal/worker failure ⇒ giữ event tối thiểu hoặc bỏ optional classification theo policy; không update rule/model và không âm thầm recategorize history.
- **Metrics — [Proposal]:** 100% original rows immutable; zero raw PII/secret; zero historical auto-recategorization; event traceability/retention compliance; override/correct-abstention on holdout only after versioned policy; LLM label quality/refusal/fallback; no cross-owner leakage.
- **Disposition — [Proposal]:** Code-only telemetry trước. LLM label là operational enrichment, không phải learning guarantee. Baseline correction F13 remains: JEV không persist memory/retrain side effect.

### UC-09 — Duplicate và anomaly

- **Classification — [Verified fact]/[Proposal]:** Exact idempotency, duplicate matching, anomaly baseline, arithmetic, freshness và warning là code-only. JEV/LLM không là detector hoặc authority; LLM chỉ có thể viết explanation sau khi code đã tạo read-only flag. **Disposition: code-only detection; optional LLM explanation; JEV detector reject.**
- **Trigger — [Verified fact]/[Proposal]:** Pre-submit idempotency check, post-commit scanner hoặc user mở history/dashboard; detection không được freeze/reject payment chỉ vì heuristic.
- **Minimal state — [Proposal]:** Code dùng owner-scoped validated fields, idempotency/body fingerprint, HCMC period, own-record refs, baseline/rule version và freshness. Nếu LLM explanation được gọi, chỉ gửi deterministic flag, neutral reason, fact refs và matched own references đã mask; không raw cross-owner ledger.
- **Output contract — [Verified fact]/[Proposal]:** Code output `same_idempotent_replay|possible_duplicate|no_signal|cannot_verify` hoặc `possible_anomaly|insufficient_or_stale` với rule/baseline/source refs. JEV `Score`/`Noul` không tạo duplicate/anomaly score. Optional LLM strict `{reasonKey, factRefs, approvedDisplayText}` chỉ diễn đạt flag; cấm `fraud|theft` accusation, merge/delete/reverse/freeze command.
- **Blocking/non-blocking — [Proposal]:** Exact idempotency/reconciliation remains synchronous code path; optional LLM explanation always async/nonblocking. A stale scanner must not block valid wallet-sufficient payment.
- **User control — [Proposal]:** Inspect matched facts/basis, dismiss/mark expected, open issue/correction; no auto-fix, auto-delete, merge, reversal hoặc freeze.
- **Fallback — [Proposal]:** History stale/insufficient/worker/model failure ⇒ `cannot_verify`/`insufficient_or_stale` hoặc hide explanation; normal money/report path unchanged. Không dùng LLM để bù missing facts.
- **Metrics — [Proposal]:** Zero duplicate same key/body; zero valid payment blocked; deterministic precision/false-positive/dismiss/mark-expected; 100% flags có basis/period/freshness; zero fraud overclaim; LLM explanation factRefs/schema/stale rates.
- **Disposition — [Proposal]:** Giữ baseline reject JEV detector. Generative LLM chỉ là presentation complement sau deterministic evidence, không biến cảnh báo thành authority.

### UC-10 — Admin issue assistance

- **Classification — [Verified fact]/[Proposal]:** JEV có thể bounded `Choice` topic và có thể cân nhắc ordered `Score` urgency nếu rubric được owner duyệt; LLM có thể summarize/extract masked issue. **Disposition: both optional bounded, async/human-in-loop; autonomous admin triage reject.**
- **Trigger — [Verified fact]/[Proposal]:** Admin mở issue đã authz/mask qua canonical route; model assist chỉ sau khi user issue được tạo và không làm mất queue nếu model unavailable.
- **Minimal state — [Proposal]:** Masked issue fields đã được security owner allowlist, issue type/status context cần thiết, locale, finite topic/rubric. Không gửi raw ledger/balance, secrets, Google claims, unrestricted cross-owner history hoặc admin credentials.
- **Output contract — [Proposal]:** JEV `issue_topic: Choice` và optional `urgency: Score` chỉ là hint. LLM strict `{topic, missingInformation[], neutralSummary, safetyFlag}` hoặc approved display text; không trả/thi hành `priority`, `status`, assignment, incident command, ledger correction hoặc payment action. Code/admin giữ state machine, audit và escalation.
- **Blocking/non-blocking — [Proposal]:** Admin queue/list/detail/status/note hoạt động không model. Assist async; không block P0/P1 escalation, không chờ LLM trong incident path.
- **User control — [Verified fact]/[Proposal]:** Admin tự inspect source/masked issue, accept/edit/reject hint và tự ghi status/priority/note theo role; generated summary không ghi đè user issue. Security/owner có kill switch; support không được xem raw financial data.
- **Fallback — [Verified fact]/[Proposal]:** Model off/refusal/schema/privacy/timeout ⇒ deterministic manual triage và human escalation; không đoán priority, không expose raw data, không auto-close issue.
- **Metrics — [Proposal]:** Zero privilege/owner leak; 100% admin actions/audit complete; masked-field compliance; human agreement/override; P0/P1 handling unaffected; schema/refusal/fallback/queue latency; no model-authored mutation.
- **Disposition — [Proposal]:** Có thể pilot cả JEV topic hint + LLM masked summary sau least-privilege, retention, audit và red-team gates. Reject autonomous triage/dispute/money action; baseline System One F2/F8 và admin contract vẫn giữ nguyên.

### UC-11 — Chat tự do, financial advice, forecast hoặc autonomous action

- **Classification — [Verified fact]/[Proposal]:** JEV không fit prose/agent/action; LLM cũng không được làm financial authority, forecast authority hoặc autonomous action trong boundary này. **Disposition: reject.**
- **Trigger — [Proposal]:** User yêu cầu “chat với app”, lời khuyên tài chính tự do, dự báo số dư/khả năng trả tiền, tự chuyển savings, tự sửa ledger hoặc “next best action” có mutation.
- **Minimal state — [Proposal]:** Không cần outbound model call; app trả facts/static help hoặc route manual. Nếu product tương lai muốn research, phải có product/safety contract riêng, không suy ra từ cards này.
- **Output contract — [Proposal]:** Không có model output. Chỉ app-owned localized help, exact facts và allowlisted navigation; no generated financial advice/command.
- **Blocking/non-blocking — [Proposal]:** Không block core flow; reject surface rõ ràng và vẫn cho manual/report path.
- **User control — [Proposal]:** User xem source, mở issue, chọn manual form; không có Apply/Pay/Transfer/Auto-fix từ model.
- **Fallback — [Verified fact]:** Deterministic report/history/manual support; forecasting và complex AI là scope-cut (`docs/PRD.md` §5; `docs/AI-JEV.md` §8; `docs/DELIVERY-PLAN.md` §9).
- **Metrics — [Proposal]:** Zero autonomous money action; zero fabricated forecast/advice; no critical-path regression; clear user comprehension of advisory boundary.
- **Disposition — [Proposal]:** Reject under this complement analysis. Không dùng generative LLM để lách giới hạn JEV hoặc biến app thành agent.

## 6. Explicit correction to old reports and System One baseline

> Các artifact cũ giữ nguyên. Bảng này chỉ nói finding nào được **mở rộng/correct về actor** khi có thêm một generative LLM; không biến handoff mới thành canonical decision.

| Finding cũ/baseline | Điều vẫn đúng | Correction/extension khi có LLM complement |
|---|---|---|
| `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1.1–§1.2 gọi JEV là source-linked explanation, monthly insight, coaching, wording và NBA | Product pain point và placement sau deterministic facts vẫn có thể hợp lý | **JEV không làm các việc đó.** LLM khác có thể generate approved display text sau fact snapshot; code vẫn tạo facts, source refs, CTA và authority. |
| Old UC-06 Monthly summary và UC-07 spending change | Report arithmetic/baseline/HCMC/source thuộc code; stale/fallback cần thiết | LLM có thể diễn đạt observation từ allowlisted facts; output strict schema/factRefs, không tự tổng hợp số/cause. JEV chỉ optional `pattern_kind`, không prose. |
| Old UC-08 personalized tips và UC-09 budget coaching | Budget status, threshold, warning-only và no payment block thuộc code | LLM có thể paraphrase allowlisted tip/copy. Không để LLM/JEV chọn threshold, guarantee saving, CTA mutation hoặc financial advice. |
| Old UC-10 NBA | Allowlisted navigation và explicit click là đúng hướng | Code chọn CTA. LLM tối đa giải thích CTA đã chọn bằng approved copy; không hỏi model “what should app do next?” và không tự navigate/submit. |
| Baseline `FINAL-FINDINGS.md` §1.1, §3, §4; `CC-JEV-SYSTEM-ONE-REVIEW.md` F1–F3/F6 | Correction rằng System One không generate prose/reasoning/CTA vẫn hoàn toàn đúng | Bổ sung một adapter **khác** cho generative LLM; không gọi LLM prose là JEV capability và không reuse typed endpoint cho chat. |
| Baseline F4/F5: status/abstain/low-confidence là application policy, không native JEV | Vẫn đúng | LLM thêm `refused/schema_invalid/stale` nhưng các status cũng do adapter/code map; không coi model text hoặc refusal là proof/consent. |
| Baseline F8 prompt injection | Deterministic redaction/allowlist là primary boundary; JEV không phải security gate | Generative LLM tăng bề mặt injection; cần input delimiting, max input/output, output allowlist, adversarial tests và manual fallback. LLM safety signal không thay authz/redaction. |
| Baseline F9 stale và F10 confirmation | State không phải memory; confirmation không phải authorization | LLM artifact phải bind `sourceSnapshotId/asOf/locale/contractVersion`; late/stale output discard. Generated text không phải user consent. |
| Baseline F11 localization/a11y | App-owned `en`/`vi`, aria, chart/table và keyboard/focus vẫn bắt buộc | LLM có thể sai locale/length/accessibility; app translation keys, plain-text sanitizer, max length, screen-reader labels và deterministic fallback vẫn sở hữu UI. |
| Baseline F12 arithmetic/fact authority | Không model nào tính wallet/savings/budget/report authoritative | LLM chỉ restate facts đã supplied; exact numbers/period/links do code. Unsupported/mismatched claim ⇒ hide/template. |
| Baseline F13 “JEV học từ correction” | Feedback phải append-only, versioned, không recategorize history | LLM chỉ có thể label/summarize masked feedback async; không retrain/rewrite ngay, không cross-user learning nếu chưa có consent/contract. |
| Baseline F14 CSV và F15 Score | Parser/import/amount/date và primitive semantics vẫn code-owned | LLM structured extraction là candidate only; JEV `Choice` row category sau staging. `Score` không là extraction confidence, anomaly score hay VND. |
| Baseline F16 no prose repair loop | Typed/schema validation và bounded fallback cần giữ | Strict LLM schema cũng không cho phép parse prose/JSON-in-text, hidden repair, infinite retry hoặc model cascade làm mất manual path. |
| `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` kết luận “JEV typed decision primitive, không phải LLM writer/agent” | Đây là boundary chính xác | File này chỉ bổ sung: generative LLM **có thể** là separate explanation/extraction adapter với fact-bounded schema; mọi authority/side effect vẫn application/domain. |

## 7. Cross-cutting safety, privacy, UX và operations gates

### 7.1 Security and privacy

- **[Verified fact]** Secrets/provider call phải ở server; browser không gọi provider và không giữ key (`AGENTS.md` §.env, §Backend/API, §JEV/OpenRouter; `docs/ARCHITECTURE.md` §2, §5–§6).
- **[Proposal]** Model allowlist, capability allowlist, tenant/user owner scope, request-size/input-output-token bounds, rate/concurrency/queue bounds và server-side kill switch phải áp dụng riêng cho JEV và LLM. Client feature flag không có quyền bật model.
- **[Proposal]** Redact PII/secret-shaped values trước outbound; không gửi raw ledger, full balance, savings, session, Google claims, admin raw data hoặc raw CSV/file nếu không có contract. Không log raw prompt, raw response, OCR image, token, cookie hoặc financial detail không cần thiết.
- **[Proposal]** Treat output as untrusted: validate JSON Schema/discriminator, enums, max lengths, factRefs, candidate IDs, locale, prohibited claims and plain-text safety; reject unknown fields and HTML/command-like content. Không dựa vào moderation/model refusal làm authorization.
- **[Unresolved]** Provider retention/training/privacy policy, data residency, deletion/export, consent và incident process chưa được verified cho model/API cụ thể; privacy không đạt ⇒ feature off/manual.

### 7.2 No money critical path

- **[Verified fact]** Payment lock/check/insert/projection, savings lock order, correction append-only, budget/report formulas và owner/authz do domain code (`docs/DOMAIN-MODEL.md` §3–§5; `docs/ARCHITECTURE.md` §4–§6).
- **[Proposal]** Không dùng generated `amountText`, `dateText`, summary number, category prose, tip hoặc anomaly explanation để dựng `CreateTransactionRequest`, `CreateCorrectionRequest`, savings transfer, budget update hoặc admin mutation.
- **[Proposal]** First useful facts and manual flow must survive JEV/LLM off, timeout, quota, malformed output, privacy block, refusal, stale snapshot and queue outage. Đây là parity gate, không phải UX nice-to-have.

### 7.3 Prompt-injection và untrusted content

- **[Verified fact]** Official generative safety guidance khuyến nghị adversarial testing, giới hạn input/output và human review khi phù hợp; validated backend materials an toàn hơn output novel không kiểm soát ([Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)).
- **[Proposal]** Delimit user text/CSV/OCR/issue text như data; instruction trong nội dung không thay đổi policy. Chuỗi “ignore rules”, “reveal prompt”, “authorize payment”, “change balance” ⇒ deterministic suspicious flag/manual/no outbound, không echo raw.
- **[Proposal]** Test injection-shaped descriptions, multilingual/diacritics, Unicode/control chars, oversized input, secret-shaped text, malicious HTML/links, false fact refs, refusal, extra keys và stale replay. LLM signal chỉ defense-in-depth.

### 7.4 Localization, accessibility và user control

- **[Verified fact]** Campus Coin yêu cầu `en`/`vi`, VND, HCMC, chart/table equivalent, keyboard/focus/loading/error/accessibility states (`docs/PRD.md` §3.3–§3.4; `AGENTS.md` §React/frontend).
- **[Proposal]** App owns translation keys, aria labels/live status, fact-vs-advisory badge, period/as-of/stale text, error/fallback copy và action labels. Generated text là optional plain text, không được là sole information channel.
- **[Proposal]** Mọi artifact cho phép inspect source, dismiss, save/pin/feedback tùy contract; no automatic navigation or mutation; late generation không overwrite manual selection. Generated text quá dài/không đúng locale/khó đọc ⇒ template/hide.
- **[Unresolved]** UX artifact endpoint, save/dismiss/feedback schema, user opt-out, generated-content disclosure wording và retention chưa canonical.

### 7.5 Provenance, stale, retention

- **[Proposal]** Mỗi advisory artifact gắn `sourceKind`, owner scope server-side, `sourceSnapshotId/version`, period/timezone HCMC, factRefs, template/schema/policy version, generated/observed time, locale, stale reason và user disposition. Raw prompt/response không persist mặc định.
- **[Proposal]** Mutation, correction, category lifecycle, budget change, report rebuild, locale/policy/model contract change có thể làm artifact stale; refresh tạo version mới/supersedes, không silent overwrite. Cache key phải owner-scoped và gồm relevant source/contract/locale/model snapshot.
- **[Unresolved]** Canonical persistence table/endpoint, retention, export/delete/consent, cache TTL và invalidation fan-out chưa được chốt; không dùng SRS illustrative `Insight` table làm schema.

### 7.6 Token/cost and operational budget controls

- **[Proposal]** Mỗi capability có `maxInput`, `maxOutput`, request rate/concurrency, queue depth, retry count, per-user/tenant/day/month token-cost bucket và kill switch. Values phải đo/probe và owner phê duyệt; không invent.
- **[Proposal]** Log masked metadata: capability, status, schema/policy/model snapshot, latency, fallback reason, token/cost bucket; không log raw prompt/response or financial payload. Alert budget exhaustion ⇒ deterministic fallback, not silent unlimited retries.
- **[Unresolved]** Actual limits/usage fields/price/quotas/provider availability chưa được claim; chỉ probe khi owner authorizes and record evidence separately.

## 8. Gate và rollout đề xuất

- **[Proposal] Gate A — deterministic baseline:** Auth/owner/CSRF, manual category, `income|payment`, immutable ledger/correction, savings, budget warning-only, deterministic dashboard/report, HCMC, `en`/`vi`, chart/table/a11y và admin least privilege pass; LLM/JEV off vẫn hoàn chỉnh.
- **[Proposal] Gate B — JEV category:** Compatibility probe typed endpoint/model, candidate membership/status, redaction, exact schema validation, stale/race discard, manual fallback, explicit confirmation, synthetic/holdout evaluation and kill path. Không đạt ⇒ JEV off.
- **[Proposal] Gate C — LLM copy pilot:** Chốt one capability (ưu tiên monthly summary hoặc dashboard explanation), fact bundle allowlist, strict schema/approved text validator, source refs, stale/invalidation, locale/a11y, retention/consent, token/cost budget, async worker/cache, red-team và human review. LLM failure must preserve report facts.
- **[Proposal] Gate D — extraction:** Chỉ sau parser/staging/preview contract, row/document review, idempotency, partial failure, evidence spans, modality probe, retention/privacy và no-auto-import. LLM output candidate-only; JEV row category sau validated staging.
- **[Proposal] Gate E — admin/feedback:** Least privilege, masked data, append-only events, audit, consent/retention, human override and incident kill switch. Không autonomous triage or retrain.
- **[Proposal] Đo lường performance:** Run JEV-only, LLM-only, parallel (chỉ nonblocking), JEV-gated cascade, async worker, cache/precompute variants against same synthetic/anonymized cases. Record end-to-end critical response, first useful facts, advisory completion, timeout/refusal/schema/fallback, queue depth, cache hit/stale and token/cost bucket. Do not promise p50/p95/p99 before measurement.
- **[Proposal] Rollback:** Tắt LLM/JEV feature flag trước; preserve deterministic facts/manual picker; discard/stale advisory artifacts safely; never delete/rewrite ledger. Align with `docs/ADMIN-OPERATIONS.md` §7 and `docs/DELIVERY-PLAN.md` §11.

## 9. Final recommendation

- **[Proposal]** Bổ sung generative LLM là hợp lý **chỉ như optional, server-only, non-authoritative complement**. Use case đầu tiên nên là monthly/dashboard approved explanation sau deterministic snapshot, chạy async hoặc cache; nếu app-owned template đã đủ hiểu thì không gọi LLM.
- **[Proposal]** Giữ JEV cho category `Choice` và các typed signals hữu hạn có measurable ambiguity. Không dùng JEV để viết prose và không dùng LLM để thay typed contract.
- **[Proposal]** Structured extraction có thể mở sau cho CSV/OCR/help, nhưng mọi output chỉ là candidate JSON, phải parser/schema/user review/manual fallback; tuyệt đối không parse prose để money writes.
- **[Proposal]** Budget/tips, duplicate/anomaly và admin nên code/human-owned; LLM chỉ diễn đạt hoặc tóm tắt bounded facts sau khi code đã quyết định status, không chọn action/priority/authority.
- **[Verified fact]** JEV-off/manual-first là canonical requirement; generative LLM-off phải có cùng parity cho critical path.
- **[Unresolved]** Nếu không chứng minh được schema, privacy, stale/provenance, accessibility, bounded budget, fallback hoặc nonblocking performance cho capability cụ thể, disposition là defer/off — không mở rộng scope để lấp khoảng trống.

## 10. Evidence index

### Local canonical sources đã đối chiếu

- `AGENTS.md` — stack/boundaries, secret handling, domain/JEV constraints, API bounds, accessibility, performance và definition of done.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` — §1.1–§1.7 product needs, AI advisory/override, CSV, reports, summaries, tips, budget, anomaly/forecast và accessibility.
- `docs/PRD.md` — §1, §3.2–§3.5 deterministic authority, JEV category-only/default-off/manual fallback; §5 scope cut.
- `docs/DOMAIN-MODEL.md` — §1, §3–§5 VND, formulas, HCMC, immutable ledger, correction, budget warning-only, JEV non-authority.
- `docs/ARCHITECTURE.md` — §2, §4–§8 browser/API/domain/persistence/JEV adapter, no provider in money transaction, out-of-scope.
- `docs/AI-JEV.md` — §1–§8 System One boundary, request/response, redaction, fallback, evaluation, deferred prose/OCR/CSV/prediction.
- `docs/contracts/openapi.yaml` — current auth/wallet/ledger/correction/budget/report/admin/category suggestion paths and schemas.
- `docs/contracts/API-REVIEW.md` — response envelope, correction, HCMC, admin least privilege, owner/idempotency/domain scope.
- `docs/ADMIN-OPERATIONS.md` — issue triage, masking, audit, JEV kill/fallback, no ledger/balance authority.
- `docs/AUTHENTICATION.md` — Google-only, opaque session, owner scope, CSRF, redaction and fail-closed provider/DB behavior.
- `docs/DELIVERY-PLAN.md` — Day 1 probes, gates, JEV-off path, scope cut, rollback and blockers.

### Working baselines đã đọc, không sửa

- `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` — corrected System One capability and typed use-case boundary.
- `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-REVIEW.md` — adversarial findings F1–F16, especially no prose/CTA/arithmetic/authority.
- `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-CAPABILITY.md` — primitive semantics, adapter envelope, use-case cards and rejection rules.
- `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-ARCH-OPS.md` — placement, parallelism, async/read-time, fallback, provenance and operations.
- `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-USECASES.md` — detailed typed cards and baseline corrections.
- `docs/working/jev-product-analysis/FINAL-FINDINGS.md` — historical old product analysis, kept unchanged; its JEV-narrative claims are corrected by the System One baseline and this separate LLM complement analysis.

### Official sources đã đọc

- TypeSafe: [System One](https://docs.typesafe.ai/concepts/system-one), [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [State](https://docs.typesafe.ai/concepts/state), [API](https://docs.typesafe.ai/api), [Confidence](https://docs.typesafe.ai/confidence), [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score).
- OpenRouter: [System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).
- Generative API design references: [Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices). These are reference material for schema/safety patterns only, not verification of a Campus Coin provider/model.

## 11. Verification note

- **[Verified fact]** Artifact này chỉ viết `docs/working/jev-llm-complement-analysis/CC-JEV-LLM-BOUNDARY-USECASES.md`; không sửa canonical/runtime hoặc các working analysis cũ.
- **[Verified fact]** Không chạy formatter, linter, build hoặc tests theo locked scope; đây là document analysis, không có source/runtime behavior để smoke-test.
- **[Unresolved]** Provider/model/API, including `GPT 5.6 luna`, chưa được claim verified; mọi enablement phải qua prerequisite/probe và các gates nêu trên.
