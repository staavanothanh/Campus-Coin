# CC-JEV-SYSTEM-ONE-CAPABILITY

> **Trạng thái:** working analysis/handoff; không phải ADR, canonical contract hoặc runtime implementation.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa `docs/working/jev-product-analysis/`, SRS, ADR, architecture, domain, auth, OpenAPI hoặc source/runtime.
>
> **Phân loại bằng chứng:** `[Verified fact]` = nội dung quan sát được trong tài liệu chính thức hoặc canonical local source; `[Proposal]` = cách áp dụng/thiết kế cần owner phê duyệt; `[Unresolved]` = thiếu contract, probe hoặc quyết định, không được diễn giải thành capability đã có.
>
> **Kết luận một câu:** JEV/System One là mô hình **typed decision**: nhận một `state` và các câu hỏi typed, trả câu trả lời bị ràng buộc bởi primitive cùng probability/confidence; JEV **không sinh prose, không giải thích reasoning, không chọn next action và không điều khiển workflow**. Với Campus Coin, capability an toàn/canonical hiện tại là **gợi ý category trước submit bằng `Choice`, advisory, backend-only, user confirm/override**; mọi tiền, tính toán, validation, control flow và side effect vẫn thuộc code/domain.

## 1. Phạm vi nguồn và kết quả đọc

### 1.1. Official TypeSafe/OpenRouter sources

| Nguồn | `[Verified fact]` được dùng trong phân tích |
|---|---|
| [TypeSafe — System One](https://docs.typesafe.ai/concepts/system-one) — “How it differs from an LLM”, “Fast judgments inside a larger workflow” | System One trả typed decisions/probabilities, không viết replies/code/giải thích reasoning; Jev nhận text-only; code kết hợp answers và quyết định route/review. |
| [TypeSafe — How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) — summary, “What makes System One composable”, workflow steps | Giữ control flow, deterministic rules và side effects trong code; phân rã thành câu hỏi hẹp; các câu hỏi chạy độc lập/song song; code kết hợp output và route theo uncertainty. |
| [TypeSafe — State](https://docs.typesafe.ai/concepts/state) — “State”, “State can be a simple string or a structured JSON value” | Mỗi request đánh giá một state với một hoặc nhiều questions; mọi question thấy cùng state và được đánh giá độc lập; state có thể là string/object/array của text. |
| [TypeSafe — Confidence](https://docs.typesafe.ai/confidence) — “Confidence is derived from the probabilities”, “Three paths for using confidence in your code” | Choice/Score có probability distribution và confidence 0–1; confidence là thống kê từ distribution, không bảo đảm answer cá thể đúng; threshold/risk do code quyết định. Noul không có field `confidence` riêng. |
| [TypeSafe — API](https://docs.typesafe.ai/api) — “Request body”, “Question types”, “Response body”, “Answer types” | Request gồm `state`, `model`, `questions`; question IDs do caller đặt và answer trả về cùng IDs; instructions/criteria có thể structured; response typed theo primitive. |
| [TypeSafe — Choice](https://docs.typesafe.ai/primitives/choice) | Choice chọn một option trong set cố định; trả `choice`, mọi `probabilities`, `confidence`; option descriptions là rubric do application định nghĩa. |
| [TypeSafe — Noul](https://docs.typesafe.ai/primitives/noul) | Noul là yes/no proposition, trả một số `noul` là xác suất “yes” từ 0 đến 1; không phải thang đo mức độ và không có native `unknown`/abstain field được tài liệu hóa. |
| [TypeSafe — Score](https://docs.typesafe.ai/primitives/score) | Score đánh giá theo các level có thứ tự; trả probability theo level, probability-weighted `score` có thể nằm giữa level, `legend`, `confidence`. |
| [OpenRouter — System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md) — `POST /systemone`, `DecisionsRequest`/`DecisionsResponse` | OpenRouter mô tả request là state + typed questions gửi tới System One/Jev, compatible với TypeSafe SDK; response có answers/model/provider/usage và các HTTP error classes. |
| [OpenRouter docs index](https://openrouter.ai/docs/llms.txt) và [current Decisions request page](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md) | Link user cung cấp `.../api-reference/decisions/submit-a-decisions-request` trả 404 khi đọc. Docs index hiện liệt kê path chính thức `.../api-reference/alphadecisions/submit-a-decisions-request.md`, endpoint `/api/alpha/decisions`. Đây là evidence về URL tài liệu hiện hành, không phải cam kết runtime availability cho Campus Coin. |

**OpenRouter scope note:** User đã xác minh prerequisite provider/pricing; tài liệu này không đánh giá lại provider, model, quota, cost, SLA hoặc latency. Chỉ ghi transport/schema prerequisite khi cần cho capability boundary.

### 1.2. Campus Coin sources đối chiếu

- `[Verified fact]` Campus Coin là tracking do user nhập, không phải ngân hàng/tiền thật; backend/domain là nguồn sự thật cho wallet, budget và report deterministic: `docs/PRD.md` §1, L3–7; `docs/DOMAIN-MODEL.md` §1, L3–14.
- `[Verified fact]` JEV MVP chỉ được phép gợi ý category trước submit từ tập ứng viên giới hạn; user phải confirm/override; JEV không tính tiền, authorize hoặc ghi money state: `docs/PRD.md` §3.5, L45–51; `docs/AI-JEV.md` §3, L21–31; `docs/ARCHITECTURE.md` §5, L43–47.
- `[Verified fact]` JEV optional, backend-only, default-off; lỗi/timeout/schema/privacy/low-confidence phải quay về manual path: `docs/AI-JEV.md` §5–7, L64–89; `AGENTS.md` §JEV/OpenRouter, L133–141.
- `[Verified fact]` Ledger/audit append-only, payment/wallet/savings/budget/report do domain deterministic; output JEV không bypass validation/calculation/authorization: `docs/DOMAIN-MODEL.md` §3–5, L38–85.
- `[Verified fact]` OpenAPI hiện có `/ai/category-suggestion` advisory và schema `transactionType`, `description` (1–500), `locale`, output `suggested|manual|disabled|unavailable`, `categoryId`, `confidence`, `reasonCode`: `docs/contracts/openapi.yaml` L338–348, L662–677.
- `[Verified fact]` SRS mô tả thêm monthly narrative, tips, CSV, anomaly và forecast; canonical MVP đã scope-cut complex AI summary/prediction/autonomous action/CSV. SRS §1.6, L113–166; `docs/PRD.md` §5, L65–67; `docs/AI-JEV.md` §8, L91–93.
- `[Unresolved]` Requested path `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` không tồn tại trong workspace tại thời điểm đọc; không dùng path này làm evidence cho kết luận mới. Các boundary UX được dẫn từ canonical docs và existing `docs/working/jev-product-analysis/` report.

## 2. System One thật sự nhận và trả gì

### 2.1. Request state và typed questions

`[Verified fact — TypeSafe]` Request là phép đánh giá một `state` đối với map các `questions` typed:

```json
{
  "state": "string | object | array",
  "model": "jev-latest",
  "questions": {
    "question_id_chosen_by_application": {
      "type": "choice | noul | score",
      "instructions": "string | object | array",
      "criteria": "primitive-specific"
    }
  }
}
```

Evidence: [TypeSafe API — Request body/Question types](https://docs.typesafe.ai/api); [TypeSafe State — State](https://docs.typesafe.ai/concepts/state).

- `[Verified fact]` `state` là nội dung để evaluate: string hoặc structured JSON object/array. Object phù hợp khi cần đặt tên các record/field liên quan; array phù hợp sequence. Jev hiện nhận text only: string, JSON object/array của text; không nhận image/audio/video theo tài liệu System One/State.
- `[Verified fact]` `questions` là map; mỗi key do application chọn, answer trả dưới key đó; question ID không gửi cho model và không tham gia inference. `instructions` có thể là string/object/array; dữ liệu tham chiếu có thể đặt cạnh câu hỏi trong structured object.
- `[Verified fact]` Mỗi question có primitive và rubric (`criteria`) do application định nghĩa. Rubric là answer space, không phải yêu cầu model viết giải thích.
- `[Proposal]` Campus Coin chỉ nên assemble state ở server boundary từ dữ liệu tối thiểu đã validate/redact, ví dụ `transactionType`, `description`, locale và active candidate snapshot. Không đưa `amount`, `occurredAt`, balance, savings, raw ledger, session, Google claims, secret hoặc PII thừa vào category state. Căn cứ local: `docs/AI-JEV.md` §3–4, L21–45, §6, L74–78.
- `[Unresolved]` Public Campus Coin OpenAPI không công bố provider-state shape/candidate snapshot; request nội bộ có candidate list trong `docs/AI-JEV.md` §4, L33–45. Adapter phải có contract/probe riêng trước khi coi field nội bộ là stable.

**Ví dụ state/question cho category suggestion (minh họa capability, không phải thay đổi OpenAPI):**

```json
{
  "state": {
    "transaction_type": "payment",
    "description": "Campus Cafe",
    "locale": "vi",
    "active_candidates": [
      {"id": "food", "label": "Đồ ăn"},
      {"id": "transport", "label": "Đi lại"},
      {"id": "academics", "label": "Học tập"},
      {"id": "other_or_uncertain", "label": "Khác/chưa chắc"}
    ]
  },
  "model": "jev-latest",
  "questions": {
    "category": {
      "type": "choice",
      "instructions": "Which active candidate category best matches `description` for this transaction type?",
      "criteria": {
        "food": "Food, cafeteria, drinks or meals; not transport or study",
        "transport": "Bus, ride, parking or other travel; not food or study",
        "academics": "Books, tuition, stationery or study materials; not food or transport",
        "other_or_uncertain": "No candidate is a clear fit or the description is insufficient"
      }
    }
  }
}
```

`[Proposal]` `other_or_uncertain` là một Choice option để code có một out-of-set/ambiguous branch. Đây không phải native abstention của Noul/Choice; code vẫn phải threshold/validate và đưa về manual picker. Candidate IDs opaque/local; model không được phép phát minh category ngoài criteria.

### 2.2. Shared state, independent questions, parallelism

`[Verified fact — TypeSafe]` Một request có một state dùng chung cho tất cả questions. Các question thấy cùng state và được evaluate độc lập; TypeSafe hướng dẫn hỏi nhiều câu hẹp trong một request, chạy parallel, sau đó code kết hợp output. Một answer không trở thành hidden context làm thay đổi answer khác. Evidence: [State](https://docs.typesafe.ai/concepts/state); [How to build with System One — “Ask a lot of questions”/“Combine question outputs in code”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

Hệ quả cho Campus Coin:

1. `[Verified fact]` Application phải chuẩn bị state trước khi gọi; JEV không tự đọc database, gọi tool, lấy thêm ledger hay hỏi vòng tiếp theo.
2. `[Proposal]` Nếu cần nhiều tín hiệu, gửi cùng request, ví dụ `category` (Choice) và `description_is_sufficient` (Noul), rồi code áp dụng policy: chỉ accept candidate khi category thuộc candidate, confidence đạt ngưỡng đã duyệt và description đủ; nếu không thì manual. Đây là composition của application, không phải JEV tự chọn workflow.
3. `[Proposal]` Không suy ra rằng câu hỏi sau được “contextualized” bởi answer trước. Nếu một câu chỉ có nghĩa khi branch khác xảy ra, code có thể gửi speculative question cùng request rồi bỏ qua answer không liên quan, hoặc thực hiện request thứ hai do code; cả hai đều không biến JEV thành agent.
4. `[Verified fact]` TypeSafe khuyến nghị dùng deterministic rules khi có thể, decomposition narrow/atomic và route theo uncertainty trong code: [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

### 2.3. Primitive map: chọn đúng semantics

| Primitive | Khi nào đúng | Typed output được tài liệu hóa | Campus Coin use | Không được hiểu là |
|---|---|---|---|---|
| **Choice** | Một option trong finite set cố định; category/intent/label | `type: "choice"`, `choice` là option xác suất cao nhất, `probabilities` cho mọi option, `confidence` 0–1 | **Canonical category suggestion** từ active candidate set có `other_or_uncertain` | Quyền chọn/commit transaction; `choice` chỉ là model signal cần code validate và user review |
| **Noul** | Một proposition yes/no; `noul` là xác suất “yes” | `type: "noul"`, `noul` 0–1; không có confidence field riêng | Có thể dùng cho signal phụ hẹp như “description có đủ dấu hiệu để tiếp tục hỏi category không?” nếu product thật sự cần | Score mức độ, native unknown, lý do/prose, hoặc bằng chứng đúng tuyệt đối |
| **Score** | Vị trí trên ordered spectrum có các level mô tả rõ; numeric/ranking/threshold signal | `type: "score"`, `score` probability-weighted, `probabilities`, `legend`, `confidence` | Chỉ dùng khi có semantics sản phẩm rõ (ví dụ severity của một signal không-authoritative); **không dùng cho VND/balance/budget arithmetic** | Số tiền, công thức tài chính, độ chính xác đo lường hoặc hành động tự động |

Official evidence: [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score), [TypeSafe API — Question/Answer types](https://docs.typesafe.ai/api).

**Abstention/unknown boundary:**

- `[Verified fact]` Các primitive được tài liệu hóa không có một output chung tên `abstain`/`unknown`. Noul chỉ trả xác suất yes; Choice trả option đã định nghĩa; Score trả vị trí trên levels.
- `[Proposal]` Campus Coin biểu diễn uncertainty bằng explicit `other_or_uncertain` Choice option, Noul/Choice/Score threshold do code, và manual fallback. Không gọi `confidence` hoặc `noul ≈ 0.5` là “JEV đã abstain” nếu application chưa định nghĩa policy.
- `[Unresolved]` Ngưỡng cụ thể, candidate minimum, “đủ dấu hiệu” và policy low-confidence chưa có canonical numeric contract. Không invent threshold trong tài liệu này.

### 2.4. Typed answers, probabilities và confidence

`[Verified fact]` TypeSafe response có một answer cho mỗi question ID. Choice/Score có probabilities và confidence; Noul chỉ có `noul`. OpenRouter System One response còn có `model`, `provider`, `id` và `usage` theo schema/examples, nhưng những metadata này không phải reasoning.

| Output | Ý nghĩa | Cách code được phép dùng |
|---|---|---|
| Choice `choice` | Option có probability cao nhất | Làm input cho membership/status/threshold policy; không tự commit |
| Choice `probabilities` | Distribution trên **tất cả** options (TypeSafe docs nói tổng bằng 1) | So sánh/ranking hoặc phát hiện ambiguity; code quyết định threshold/branch |
| Choice `confidence` | Statistic tóm tắt độ tập trung của distribution | Route high/medium/low theo risk; không hiển thị như guarantee đúng |
| Noul `noul` | Xác suất proposition yes; gần 0.5 là uncertain giữa yes/no | Threshold do code; middle range manual/review nếu policy cần |
| Score `score` | Tổng `level × probability`, có thể nằm giữa các level | Ranking/threshold signal khi level order có nghĩa; không dùng thay formula authoritative |
| Score `probabilities`, `legend`, `confidence` | Distribution/level descriptions/uncertainty | Giữ signal và rubric version để code/audit; không lấy legend làm generated explanation |

- `[Verified fact]` Calibration tối ưu uncertainty ở groups of predictions, không bảo đảm một answer cá thể đúng. Confidence được tính từ probability spread; flat distribution thấp hơn, peak tập trung cao hơn: [Confidence](https://docs.typesafe.ai/confidence).
- `[Verified fact]` TypeSafe nêu ba hướng dùng confidence: high confidence có thể act, medium có thể confirm/review, low không act và route human/clarification/fallback; threshold phụ thuộc risk. Campus Coin có tiền/user confirmation nên application phải conservative hơn ví dụ low-stakes, nhưng exact threshold là `[Unresolved]`.
- `[Proposal]` UI Campus Coin nên hiển thị “Gợi ý — hãy kiểm tra trước khi lưu”, candidate/nguồn và trạng thái manual; không biến numeric confidence thành lời hứa “đúng”. Confidence có thể giữ trong masked metadata/evaluation nếu contract được duyệt.

### 2.5. Text-only và các giới hạn không được suy diễn

`[Verified fact]` System One/Jev hiện nhận text only; state là string hoặc JSON object/array của text, không có image/audio/video theo [System One](https://docs.typesafe.ai/concepts/system-one) và [State](https://docs.typesafe.ai/concepts/state).

Hệ quả:

- Description giao dịch là phù hợp nếu đã validate/redact.
- Raw CSV/file/image không tự trở thành state hợp lệ; CSV phải deterministic parse/stage/validate trước, rồi mới gửi các field text cần thiết nếu feature được duyệt.
- OCR, file extraction, chart/image understanding, audio hoặc video không phải capability của JEV System One.
- Không gọi model chat rồi parse prose/JSON để giả lập typed System One; local canonical cấm substitution: `docs/AI-JEV.md` §2, L15–19; `docs/ARCHITECTURE.md` §5, L43–47.

## 3. Ranh giới model và ranh giới code

### 3.1. Code phải sở hữu

`[Verified fact]` TypeSafe yêu cầu code giữ control flow, deterministic rules và side effects; model chỉ xử lý narrow common-sense judgment trên unstructured data. Campus Coin canonical đặt domain/backend làm authority. Evidence: [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one); `docs/ARCHITECTURE.md` §2, §4–6, L21–56; `docs/DOMAIN-MODEL.md` §4–5, L54–85.

Code/application/domain **phải** sở hữu:

1. **State assembly và privacy:** chọn field cần thiết, validate length/type/locale, redact PII/secret, treat user description/CSV cell as untrusted data.
2. **Candidate membership:** lấy candidate active đúng `appliesTo`, giữ ID/label/version; reject option không thuộc server candidate snapshot, disabled/retired hoặc stale.
3. **Control flow:** lúc nào gọi, có gọi không, có cần request khác không, bỏ qua answer nào, timeout/cancel/race/stale response và feature flag.
4. **Deterministic validation:** schema answer, range, `choice ∈ candidates`, probability shape, confidence range, Noul range, Score legend/level consistency; rồi validate transaction/domain lần nữa.
5. **Deterministic calculation/rules:** VND arithmetic, wallet, savings, budget used/limit/overrun, date/period `Asia/Ho_Chi_Minh`, reports, idempotency, duplicate rules, source baseline và threshold.
6. **Risk policy:** threshold, high/medium/low branch, manual picker, escalation, no-action; không để model tự đặt risk tolerance.
7. **User control:** explicit trigger, preview, confirm/override/dismiss/save/feedback khi capability có UI; final Save/Submit là action riêng.
8. **Authorization/side effects:** session/owner/CSRF, payment authorization, ledger/savings/budget writes, correction/audit, notifications, email, navigation/CTA và admin permissions.
9. **Provenance/persistence:** source endpoint/read-model, candidate/rubric/contract version, period/timezone, generated/observed time, stale status, user decision; raw prompt/response không mặc định persist.
10. **Fallback/observability:** manual path khi flag off/unavailable/timeout/schema/privacy/low confidence; masked status/latency/model snapshot/fallback reason nếu logging contract cho phép; JEV error không chặn money path.

### 3.2. JEV **không** có và không được trao

`[Verified fact]` System One docs nói rõ model không write replies, code hoặc reasoning explanations và không phải agent; model không choose its own next action. Campus Coin local docs còn cấm money authority. Evidence: [System One](https://docs.typesafe.ai/concepts/system-one); [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one); `docs/AI-JEV.md` §3, L21–31; `AGENTS.md` L133–141.

JEV không được:

- sinh narrative, coaching copy, source-linked prose, “why” explanation, financial advice, chat reply hoặc code;
- trả chain-of-thought/reasoning hoặc giả vờ rằng `criteria` là explanation của answer;
- tự chọn next action, route/CTA, thứ tự workflow, retry, tool call hay agent loop;
- tự tính/điều chỉnh `amount`, `date`, VND, wallet balance, savings, budget, report, trend delta hoặc forecast;
- authorize/reject payment, quyết định correction/reversal, ghi/sửa/xóa ledger, savings, budget hoặc audit;
- đọc raw ledger/balance/session/Google claim/secret/PII thừa hoặc tự gọi database/provider/tool;
- biến `choice`, `score`, `noul`, probabilities hoặc confidence thành authorization;
- coi probability/confidence là proof of correctness, source citation, user consent hoặc user confirmation;
- tự tạo category ngoài candidate set, tự map gần đúng khi out-of-set, hoặc tự coi unknown là một category;
- điều khiển admin triage/dispute/least privilege hoặc autonomous financial action;
- thay thế deterministic report/chart/table/manual picker khi JEV off/unavailable.

**Important correction:** Application có thể tự viết một câu UI dựa trên typed answer/fact (`category = food` → template “Danh mục gợi ý: Đồ ăn”) nhưng câu đó là **copy do application**, không phải JEV prose. Source link/evidence ref cũng do application tạo từ deterministic source snapshot, không phải model “cung cấp citation”.

## 4. Campus Coin capability map

### 4.1. Canonical current boundary

| Capability | Status | System One fit | Code authority |
|---|---|---|---|
| Category suggestion trước submit | `[Verified fact]` canonical allowed, default-off/backend-only/advisory | Choice trên active candidate set; có thể kèm hẹp Noul nếu product chứng minh cần | Validate type/candidate/status, user confirm/override, normal transaction validation/commit |
| Wallet/balance/savings/budget/report arithmetic | `[Verified fact]` cấm JEV | Không dùng primitive; deterministic domain | Công thức/invariant/report service |
| Payment authorization/ledger/savings/budget mutation | `[Verified fact]` cấm JEV | Không dùng primitive | Auth/domain/persistence/audit |
| Monthly narrative/source-linked explanation | `[Verified fact]` current JEV không hỗ trợ prose; SRS nhu cầu là deferred | Không thể dùng JEV để sinh text; future design chỉ có thể dùng typed signals + app-authored templates hoặc một capability/model khác sau decision | Backend facts, source refs, copy/template, stale/persistence |
| Budget coaching/next-best action | `[Verified fact]` JEV không chọn next action/không sinh coaching prose | Không cho JEV chọn CTA hay wording | Deterministic policy chọn allowlist CTA; app copy; explicit user navigation |
| CSV row classification | `[Proposal]` future only, cùng CSV staging/import contract | Choice per validated row, không raw file; user review từng row | Parse/validate/stage/idempotency/import commit |
| Duplicate/anomaly/forecast | `[Proposal]` deterministic-first/deferred; không dùng JEV làm authority | JEV không cần cho detector/arithmetic; nếu có typed signal riêng phải qua safety decision | Matching/baseline/calculation/threshold/freshness |
| Admin triage/dispute/financial action | `[Verified fact]` reject | Không dùng JEV autonomous | Admin role/audit/issue workflow |

### 4.2. Adapter boundary: provider answer ≠ Campus Coin response

`[Verified fact]` TypeSafe native category output là `ChoiceAnswer` (`choice`, `probabilities`, `confidence`, `type`). Campus Coin OpenAPI lại công bố application envelope `CategorySuggestion` (`status`, `categoryId`, `confidence`, `reasonCode`). Vì vậy:

1. Adapter nhận provider typed answer.
2. Server kiểm tra schema/range, candidate membership, active status, `appliesTo`, snapshot/race và confidence policy.
3. Server map sang `suggested|manual|disabled|unavailable`; `categoryId` là local authoritative ID/opaque key.
4. UI hiển thị suggestion; user chọn/đổi; normal transaction endpoint validate/authorize/commit.

`status`, `categoryId`, `reasonCode` **không phải** JEV native output; chúng là application composition. Evidence: `docs/contracts/openapi.yaml` L662–677; `docs/AI-JEV.md` §4–5, L33–72.

## 5. Use-case capability cards

> Các card sau map capability thật của System One vào use case Campus Coin. `Typed questions` mô tả câu hỏi model có thể trả; mọi output ngoài primitive native là application wrapper. Card nào ghi “không áp dụng” là chủ ý từ chối capability, không phải thiếu implementation.

### UC-01 — Gợi ý category trước submit

**Disposition:** `[Verified fact]` Đây là use case canonical duy nhất hiện được phép; manual-first, JEV optional/default-off, không nằm trong money transaction. `docs/PRD.md` §3.5, L45–51; `docs/AI-JEV.md` §3, §5–7, L21–31, L64–89.

- **Trigger:** `[Proposal]` User đã chọn `income|payment`, nhập description và bấm “Gợi ý danh mục”; không gọi mỗi keystroke.
- **State:** `[Proposal]` Server gửi `transactionType`, description đã validate/redact, locale và active candidate snapshot (opaque ID + semantic label + rubric). Không gửi amount/date/balance/savings/raw ledger/session/claims/secret/PII thừa. Local request shape evidence: `docs/AI-JEV.md` §4, L33–45.
- **Typed questions:** `[Proposal]` Một `Choice` `category` với options đúng active candidate set và `other_or_uncertain`. Có thể thêm Noul `description_is_sufficient` chỉ nếu product có policy rõ; không dùng Noul để giả native abstain.
- **Chosen primitive:** `Choice` cho finite category set; `Noul` chỉ là optional secondary yes/no signal; không dùng Score vì category không có thứ tự.
- **Typed output:** `[Verified fact]` Native: `choice`, `probabilities`, `confidence`, `type`. Application envelope: `status`, `categoryId`, `reasonCode`, `confidence`; status/reason do server map, không phải prose. `docs/contracts/openapi.yaml` L669–677.
- **Deterministic code composition:** `[Verified fact/Proposal]` Validate response schema/ranges → `choice` thuộc candidate snapshot → category còn active/đúng `appliesTo`/không stale → confidence/uncertainty policy → render preview. Final transaction flow tự validate type/category/amount/date/owner/CSRF/idempotency/wallet và commit immutable; JEV không commit. `docs/DOMAIN-MODEL.md` §4–5, L54–85.
- **User control:** `[Verified fact]` User phải confirm/override; manual picker luôn usable; final Save riêng; suggestion lỗi không được mất form hoặc khóa Save. `docs/AI-JEV.md` §3, §5–7, L21–31, L64–89.
- **Persistence/provenance:** `[Proposal]` Suggestion mặc định ephemeral; nếu đo quality, chỉ lưu masked owner-scoped event: contract/rubric/candidate snapshot version, status, accepted/overridden/dismissed, timestamp, fallback reason. Không lưu raw prompt/response mặc định. `[Unresolved]` API chưa chốt suggestion ID/ack binding/retention.
- **Fallback/abstain/escalation:** `[Verified fact/Proposal]` Flag off, unavailable, timeout, 4xx/5xx, 413, schema/privacy failure, candidate mismatch hoặc low-confidence → `manual`/manual picker; không đoán gần đúng. Nếu Noul/Choice ở vùng policy không rõ → manual/review. JEV không tự “abstain” ngoài policy code.
- **Metrics:** `[Proposal]` JEV-off completion parity; zero auto-submit/auto-commit; 100% committed category active/đúng type; acceptance/override/manual completion/abstention/fallback/schema failure; `en|vi × income|payment` parity; không tối ưu accuracy bằng cách làm mất manual control.
- **Disposition:** Ship manual path; enable JEV chỉ sau compatibility/privacy/safety/UX gates. Không mở rộng thành narrative/chat.

### UC-02 — Monthly summary / spending change / dashboard “what changed?”

**Disposition:** `[Verified fact]` SRS nêu nhu cầu summary/insight; canonical `docs/AI-JEV.md` §8, L91–93 và `docs/PRD.md` §5, L65–67 loại complex AI summary khỏi MVP. `[Proposal]` Nếu làm future, phải là capability typed signal + application-authored copy, **không phải JEV prose**.

- **Trigger:** `[Proposal]` User mở dashboard/monthly report sau khi deterministic snapshot đã load; không gọi trong calculation/money transaction.
- **State:** `[Proposal]` Allowlisted deterministic aggregates, category IDs/labels, current/baseline period HCMC, snapshot/version, completeness/freshness và source refs. Không raw ledger; số do backend tính.
- **Typed questions:** `[Proposal]` Nếu thật sự cần JEV, hỏi các signal hẹp như `has_material_change` (`Noul`) hoặc `change_kind` (`Choice`: `food_up`, `transport_up`, `academics_up`, `no_material_change`, `insufficient_data`). Không hỏi “hãy viết summary/giải thích vì sao”.
- **Chosen primitive:** `Noul` cho proposition; `Choice` cho finite observation label; `Score` chỉ khi ordered severity/ranking có semantics đã duyệt. Không primitive nào sinh câu văn.
- **Typed output:** Native `noul`/`choice`/optional `score` + probabilities/confidence/legend. Application lấy output để chọn template đã viết sẵn và source link; JEV không trả `summaryText`, reason, causal claim hay citation.
- **Deterministic code composition:** Backend tính delta/baseline/threshold/source refs; code kiểm tra stale/completeness; code chọn allowlisted template + metric values + links; UI render authoritative facts tách khỏi “diễn giải tham khảo”. JEV không tính delta và không dựng narrative.
- **User control:** `[Proposal]` User xem chart/table nguồn, dismiss/save/feedback/refresh; không có Apply-to-wallet/budget/payment. Nếu không có snapshot/typed signal, hiển thị report deterministic/copy application tĩnh.
- **Persistence/provenance:** `[Proposal/Unresolved]` Cần artifact contract gồm source snapshot/version, period/timezone, evidence refs, generated/observed time, stale state, user decision. Không coi SRS minh họa `Insight` là schema canonical (`SRS..._vi.md` §1.8, L282–295).
- **Fallback/abstain/escalation:** Missing/stale/insufficient facts, low-confidence, schema/provider failure → không hiển thị interpretation hoặc dùng template deterministic an toàn; report/chart/table vẫn chạy. Không sinh prose fallback từ JEV.
- **Metrics:** `[Proposal]` Claim-to-source validity 100%; zero stale-as-current; source-open/comprehension/dismiss/feedback; zero unsupported causal/financial-advice claim; JEV-off report parity.
- **Disposition:** Defer; không reuse `/ai/category-suggestion` để tạo prose. Future contract phải gọi đây là typed signal/templating, hoặc chọn một text-generation capability riêng được phê duyệt — không gọi đó là System One capability.

### UC-03 — Budget coaching và next-best action

**Disposition:** `[Verified fact]` Budget status/used/limit/isOverrun và payment authorization là deterministic; System One không chọn next action hoặc sinh coaching text. `docs/DOMAIN-MODEL.md` §4, L54–67; `docs/ARCHITECTURE.md` §2, L21–27; TypeSafe [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

- **Trigger:** `[Proposal]` User mở budget/dashboard hoặc backend tạo warning sau commit; core warning không phụ thuộc JEV.
- **State:** `[Proposal]` Allowlisted budget facts (`category`, `usedVnd`, `limitVnd`, `isOverrun`, month HCMC, source snapshot) nếu future typed signal cần; không raw ledger/amount arithmetic input để model tính.
- **Typed questions:** Safe default **không có JEV question**; code đã biết status. Nếu product chứng minh cần signal phụ, chỉ hỏi proposition/label hẹp (ví dụ `is_review_prompt_relevant` Noul) và ignore answer khi uncertainty; không hỏi “what should user do next?” để model chọn CTA.
- **Chosen primitive:** None for core. Optional Noul/Choice signal only after separate contract; never Score for money amount/threshold.
- **Typed output:** Core output là backend `used/limit/isOverrun`; future JEV signal remains typed only. CTA allowlist (`view_report`, `review_budget`, `review_transactions`) và wording do application policy/template.
- **Deterministic code composition:** Code tính threshold/dedupe/status, chọn CTA theo allowlist và route; JEV không quyết định threshold, notification, navigation hoặc mutation.
- **User control:** `[Verified fact/Proposal]` User có thể xem source, dismiss/snooze/feedback; click chỉ mở review screen; final budget/payment action normal CSRF/idempotency flow; overrun không chặn wallet-sufficient payment.
- **Persistence/provenance:** `[Proposal/Unresolved]` Alert/read state, source summary, snapshot/version, stale/resolved status và interaction contract chưa canonical; không persist JEV prose vì JEV không tạo prose.
- **Fallback/abstain/escalation:** Deterministic progress/warning luôn hiển thị; JEV unavailable/low-confidence → bỏ optional signal/card, không block payment.
- **Metrics:** Correct budget comprehension, review-action completion, duplicate/noise/dismiss, zero payment rejection/mutation, JEV-off parity.
- **Disposition:** Ship deterministic status/warning; defer optional typed signal. Reject JEV-generated coaching/NBA prose and reject JEV selecting/executing action.

### UC-04 — CSV row category assist (future, cùng import contract)

**Disposition:** `[Verified fact]` CSV/batch nằm ngoài canonical MVP: `docs/PRD.md` §5, L65–67; SRS §1.6, L77–84, L113–119. `[Proposal]` Nếu mở, JEV chỉ classify validated row, không xử lý raw file hay commit.

- **Trigger:** `[Proposal]` User upload file; deterministic parser/staging/preview hoàn thành; worker gửi bounded rows sau validation.
- **State:** Parsed row ID, validated `income|payment`, redacted description, active candidate snapshot, locale, parser/schema version. Không gửi raw file, session, balance, unvalidated amount/date hoặc CSV cell instruction.
- **Typed questions:** `Choice` `row_category` từ active candidates + `other_or_uncertain`; optional Noul `row_has_sufficient_description` nếu contract cần. One row/question or bounded batch; questions over one state remain independent.
- **Chosen primitive:** Choice; Noul optional for proposition; no Score for amount/date/type.
- **Typed output:** Typed `choice/probabilities/confidence` per row; application adds `suggested|manual|invalid|duplicate|abstain` status and parser/import errors. Status is application-owned.
- **Deterministic code composition:** Parse/size/encoding/schema/type/date/amount/owner/idempotency/duplicate first; validate candidate after answer; user review/override/skip; normal import transaction commits only explicit reviewed rows.
- **User control:** Preview every row, edit/map/accept/override/skip, explicit batch confirm; unresolved/low-confidence rows stay manual.
- **Persistence/provenance:** `[Unresolved]` Need job/file hash/retention, row decision, parser/rubric/candidate version, import idempotency and partial-failure semantics; no raw JEV payload by default.
- **Fallback/abstain/escalation:** JEV off/unavailable → manual row picker; parser error → actionable row error; no silent drop/auto-import.
- **Metrics:** Zero silent row loss/duplicate, 100% committed rows explicitly reviewed, manual fallback completion, row override/abstention, import time improvement.
- **Disposition:** Defer with CSV; not a current JEV capability.

### UC-05 — Duplicate/anomaly/forecast detection

**Disposition:** `[Verified fact]` Campus Coin domain owns idempotency, arithmetic, periods and projections; SRS optional intelligence does not create a JEV authority. `docs/DOMAIN-MODEL.md` §3–5, L38–85; SRS §1.6, L161–166.

- **Trigger:** `[Proposal]` Pre-submit/post-commit scanner or read-time report; deterministic candidate records/baseline must exist first.
- **State:** Owner-scoped normalized fields and deterministic features only if a future detector contract is approved; never cross-owner/raw claims/session.
- **Typed questions:** Safe default none: deterministic exact idempotency/matching/baseline is more appropriate. Do not ask JEV to calculate duplicate similarity, anomaly score, forecast amount/date/balance or infer fraud.
- **Chosen primitive:** None for current safe design. A future narrowly defined Noul/Choice may classify a precomputed signal, but it cannot create the signal or action.
- **Typed output:** Deterministic `no signal|possible duplicate|insufficient/stale` or anomaly label with rule/baseline/source refs; not JEV prose/authority.
- **Deterministic code composition:** Code owns matching, arithmetic, baseline, threshold, freshness, warning and append-only correction path; JEV cannot delete/merge/reverse/block payment.
- **User control:** View evidence, dismiss/mark expected, open issue or normal correction; no auto-fix/freeze.
- **Persistence/provenance:** Rule/baseline version, compared period, freshness, matched own references, disposition; schemas unresolved.
- **Fallback/abstain/escalation:** Insufficient/stale data → “chưa thể xác minh”, not unique/fraud claim; scanner failure does not block money path.
- **Metrics:** Zero duplicate same-key/body; zero valid payment blocked; precision/false-positive/stale rates; forecast calibration only after separate product decision.
- **Disposition:** Reject JEV as detector/calculator; defer deterministic capability and separate safety decision.

### UC-06 — Correction learning và admin triage

**Disposition:** `[Verified fact]` JEV không có quyền correction/learning side effect, admin authority hoặc dispute decision. `docs/DOMAIN-MODEL.md` §5, L83–85; `docs/ARCHITECTURE.md` §2, L21–27; `docs/contracts/openapi.yaml` L262–338.

- **Trigger:** User override/correction or issue submission; these are application/domain events, not prompts for JEV authority.
- **State:** If future quality evaluation exists, masked event metadata only (suggested/final category, candidate/rubric version, outcome, actor scope); no raw ledger/session/secret.
- **Typed questions:** None for correction commit/admin decision. A separate offline evaluator may ask `Choice`/`Noul` about a masked text signal, but output cannot mutate history, assign admin authority or resolve dispute.
- **Chosen primitive:** None in money/admin path.
- **Typed output:** Append-only feedback/correction event from code; no JEV answer is an authorization or “learned truth”.
- **Deterministic code composition:** Code validates owner/role/reason/reference/audit/idempotency and creates correction row or issue event; no SQL update/delete of original ledger; no silent historical recategorization.
- **User control:** User explicitly chooses category/correction reason and submits; admin triages within least privilege; user can dismiss/feedback where a separate advisory card exists.
- **Persistence/provenance:** Append-only event with actor/target/reason/version/time; learning scope/retention/consent/export/delete unresolved.
- **Fallback/abstain/escalation:** Unclear correction/issue → manual review; JEV unavailable never blocks correction/issue or changes state.
- **Metrics:** Zero mutation outside append-only contract, zero privilege bypass, traceable feedback, no cross-owner leakage.
- **Disposition:** Reject autonomous JEV learning/admin/money action; defer any quality-signal feature to a separate contract.

## 6. Corrections to `FINAL-FINDINGS.md` (old product analysis)

`docs/working/jev-product-analysis/FINAL-FINDINGS.md` remains unchanged. The following findings are corrected here because the old report treated JEV as a prose/coach layer, while official System One docs define typed decisions without generated text or next-action orchestration.

| Old finding | Correction based on actual System One capability |
|---|---|
| `FINAL-FINDINGS.md` §1.1, L15–21: ngoài auto-category, đề xuất JEV ở source-linked explanation, monthly insight, spending-change explanation, budget coaching/nudge; §1.2, L27–36 gọi đây là “lớp diễn giải” và “JEV chỉ viết lý do”. | **Corrected:** JEV không viết câu, không tạo explanation/reasoning/source-linked prose. Future surface có thể dùng typed `Choice`/`Noul`/`Score` signals để code chọn facts/template; application viết copy và link source. Nếu cần free-form narrative, đó không phải System One capability và cần quyết định/capability khác. Official: [System One](https://docs.typesafe.ai/concepts/system-one), “How it differs from an LLM”; [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one). |
| `FINAL-FINDINGS.md` §3 UC-06, L131–142: monthly summary cho phép “JEV chỉ diễn đạt observation → evidence → caveat”. | **Corrected:** JEV không diễn đạt observation/evidence/caveat bằng prose. Backend phải tính observation/evidence/caveat; code render template/copy đã kiểm soát. JEV chỉ có thể trả typed signal nếu có contract riêng; current JEV category endpoint không làm summary. |
| `FINAL-FINDINGS.md` §3 UC-07, L144–155: spending change cho phép JEV diễn đạt “tăng/giảm so với…” và nêu caveat. | **Corrected:** backend tính direction/delta/baseline; app-authored template nói “tăng/giảm so với…”; JEV không được tính delta, viết câu hoặc suy đoán nguyên nhân. |
| `FINAL-FINDINGS.md` §3 UC-08, L157–168: personalized tips cho phép JEV paraphrase bounded candidate và nêu tip. | **Corrected:** JEV không paraphrase/generate tip. Candidate generator/policy và copy thuộc code; nếu cần typed fit/eligibility signal, dùng primitive phù hợp rồi code chọn một tip đã duyệt. Không để JEV hứa savings, khuyên financial action hoặc thay budget. |
| `FINAL-FINDINGS.md` §3 UC-09, L170–181: budget coaching cho phép JEV viết contextual wording/coaching. | **Corrected:** budget facts, threshold, dedupe và warning do code; wording do app template/copy. JEV không tính `used/limit`, không chọn threshold, không gửi notification và không block payment. |
| `FINAL-FINDINGS.md` §3 UC-10, L183–194: deterministic policy chọn CTA nhưng “JEV chỉ diễn đạt lý do”. | **Corrected:** deterministic policy chọn CTA **và** application viết lý do dựa trên fact ref. JEV không chọn next action và không viết reason. CTA chỉ là navigation nếu được duyệt, không phải JEV orchestration. |
| `FINAL-FINDINGS.md` §5, L231–241: async/read-time narrative/wording/coach đặt JEV sau snapshot. | **Corrected:** placement sau snapshot vẫn đúng về safety/timing, nhưng model role phải đổi từ “narrative/wording” thành optional typed signal. Async/read-time app renderer/template làm text; nếu chưa có typed contract thì không gọi JEV. |
| `FINAL-FINDINGS.md` §3 UC-01, L66–78: category card là phần gần đúng nhưng output mô tả application `status/categoryId` như suggestion result. | **Clarified:** native JEV output chỉ là Choice answer (`choice`, probabilities, confidence). `status`, `categoryId`, `reasonCode`, candidate membership, active check, user confirmation và fallback là application wrapper/code. Boundary canonical category suggestion vẫn giữ nguyên. |

**Những phần của old report vẫn đúng:** deterministic-first/manual-first; category suggestion là insertion point duy nhất hiện được canonical hóa; user confirmation/override; JEV không tính tiền/authorize/write; fallback khi disabled/unavailable; provenance/stale/user-control là prerequisite cho mọi future advisory surface. Chỉ sửa **model capability claim**: “JEV tạo/viết explanation/coaching/source-linked prose hoặc chọn action” → “code tạo copy/policy; JEV (nếu được duyệt) chỉ trả typed signal”.

## 7. Limits và technical prerequisites — chỉ ghi điều đã được source

### 7.1. Limits được source rõ

- `[Verified fact — TypeSafe API/Choice]` Một Choice có tối đa **255 options** theo API reference: [TypeSafe API — Choice criteria](https://docs.typesafe.ai/api).
- `[Verified fact — TypeSafe API/Score]` Score nên có ít nhất 2 levels; API accepts tối đa **10 levels**: [TypeSafe API — Score criteria](https://docs.typesafe.ai/api).
- `[Verified fact — Campus Coin local contract]` Category suggestion `description` có `minLength: 1`, `maxLength: 500`: `docs/contracts/openapi.yaml` L662–668. Đây là local application boundary, không phải TypeSafe provider limit.
- `[Verified fact — OpenRouter]` OpenRouter System One docs liệt kê HTTP **413 Payload Too Large** khi request payload vượt limit: [System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md), response status table.
- `[Verified fact]` OpenRouter response schema/examples expose `usage.input_tokens` và `usage.output_tokens`; đây là usage metadata, không phải một output-token ceiling được công bố trong reviewed page.

### 7.2. Không được invent limit/runtime claim

- `[Verified fact]` Reviewed TypeSafe pages không nêu một global maximum context-token, maximum output-token, byte limit hoặc guaranteed latency cho Campus Coin request. Không ghi số khác như provider limit.
- `[Unresolved]` Payload/timeout/concurrency/request-size limits cụ thể của transport/model phải được probe/contract kiểm chứng trước enablement. Local app **có thể** đặt bound bảo thủ cho privacy/safety, nhưng phải gắn nhãn application policy, không gán cho TypeSafe.
- `[Verified fact]` TypeSafe docs nói `instructions`/criteria có thể structured object/array và state JSON object/array text; điều này không đồng nghĩa “unbounded context”.
- `[Proposal]` Enforce local bounds trước outbound: description max 500 theo OpenAPI, candidate count bounded theo product, redact field allowlist, timeout/concurrency/rate bound và response size validation. Exact values ngoài max 500 chưa canonical.

### 7.3. Error/fallback prerequisite

- `[Verified fact]` TypeSafe API docs list 401/422/429/529 classes; OpenRouter System One schema lists malformed/unauthorized/payload-too-large/rate/upstream/timeout/overload classes. Adapter phải normalize lỗi thành manual/unavailable; không expose raw provider payload.
- `[Verified fact]` Campus Coin local policy đã yêu cầu timeout/quota/4xx/5xx/schema/privacy/low-confidence → manual fallback và JEV lỗi không chặn money path: `docs/AI-JEV.md` §5–7, L64–89; `docs/ARCHITECTURE.md` §6, L49–56.
- `[Unresolved]` Compatibility probe phải xác nhận transport path/model ID, exact typed response shape, error mapping và current privacy configuration; tài liệu này không giả nhận runtime evidence.

## 8. Final capability decision

1. `[Verified fact]` **System One/Jev = typed decision primitive, không phải LLM prose/chat/agent.** Native output chỉ là Choice/Noul/Score typed answers và probability/confidence tương ứng.
2. `[Verified fact]` **Shared state + independent parallel questions** là capability; answers không tự feed nhau. Code phải compose.
3. `[Verified fact]` **Code owns** control flow, deterministic rules/calculation, validation, thresholds, authorization, persistence, provenance, fallback và side effects.
4. `[Verified fact]` **JEV cannot** generate narrative/reasoning/explanations/source-linked prose, select next action, orchestrate tools, calculate money/date/balance/budget/report, authorize payment hoặc mutate financial/admin state.
5. `[Proposal]` **MVP allowed:** one narrow Choice category suggestion from server-provided active candidates, explicit user confirm/override, manual fallback, default-off/backend-only.
6. `[Proposal]` **Future:** chỉ thêm typed signals nếu có use case và contract riêng; app-authored templates/copy may render a user-facing explanation. Không gọi đó là JEV prose và không reuse category endpoint cho narrative.
7. `[Unresolved]` Exact confidence thresholds, internal candidate-state schema, provenance/ack binding, future insight/coach persistence, and transport limits require owner decision/probe. Không có unresolved nào trao thêm quyền cho JEV.

**Delivery evidence:** Đây là document analysis; không chạy formatter, linter, build hoặc tests theo locked scope. Bằng chứng hoàn thành là các official/local source reads và artifact này; không có code/runtime/provider-cost claim mới ngoài phần được source/có nhãn.
