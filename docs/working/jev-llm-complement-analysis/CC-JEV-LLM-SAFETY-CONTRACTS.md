# CC-JEV-LLM-SAFETY-CONTRACTS

> **Trạng thái:** working analysis/handoff; không phải ADR, canonical API/domain/auth/architecture decision hoặc runtime implementation.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa SRS, `docs/PRD.md`, domain, architecture, auth, OpenAPI, source runtime, hoặc các artifact cũ dưới `docs/working/jev-system-one-analysis/` và `docs/working/jev-product-analysis/`.
>
> **Mục tiêu:** audit safety, privacy, domain và UX khi đặt một generative LLM qua API cạnh JEV/System One để làm explanation/extraction/prose mà không trao financial authority và không làm suy giảm critical path.
>
> **Phân loại bằng chứng:**
>
> - **[Verified fact]**: quan sát được trong official/local source đã đọc; không đồng nghĩa provider/runtime đã được kiểm chứng.
> - **[Proposal]**: thiết kế/gate cần Team Leader và owner phê duyệt; không tự trở thành contract canonical.
> - **[Unresolved]**: thiếu probe, policy, contract hoặc product decision; phải fail closed, không điền bằng suy đoán.
>
> Mọi card bên dưới phân loại `JEV fit`, `LLM fit`, `both`, `code-only` hoặc `reject`. “LLM” ở đây luôn là một generative adapter riêng; không thay thế hoặc giả mạo typed System One bằng chat completion.

## 1. Quyết định an toàn

### 1.1 Verdict

- **[Verified fact]** JEV/System One nhận một `state`, đánh giá các câu hỏi typed và trả typed answers/probabilities; System One không viết replies, code hoặc explanation reasoning và không tự chọn next action. Nguồn: [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one), [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [State](https://docs.typesafe.ai/concepts/state).
- **[Verified fact]** Campus Coin là tracker do user nhập, không phải ngân hàng, không giữ tiền thật và không xử lý payment thật. Backend/domain là authority cho wallet, immutable ledger, savings, budget và report; JEV không tính tiền, authorize hoặc ghi money state. Nguồn: `docs/PRD.md` §1, §3.2–§3.5; `docs/DOMAIN-MODEL.md` §1, §3–§5; `docs/ARCHITECTURE.md` §2, §4–§8.
- **[Verified fact]** Public JEV use case hiện tại chỉ là category suggestion trước submit, backend-only, default-off, user confirm/override và manual fallback. Nguồn: `docs/AI-JEV.md` §2–§8; `docs/contracts/openapi.yaml` `/ai/category-suggestion`, `CategorySuggestionRequest`, `CategorySuggestion`.
- **[Proposal]** Có thể bổ sung một LLM sinh text hoặc extract structured fields **chỉ như lớp advisory/staging tách biệt**. LLM không được làm financial authority, arithmetic engine, authorization engine, ledger/budget/savings writer, admin decision-maker hoặc autonomous action agent.
- **[Proposal]** JEV và LLM là hai capability/adapter khác nhau. JEV giữ vai trò typed finite decision; LLM chỉ dùng nơi cần text generation hoặc extraction mà deterministic code không đủ. Không “fallback” từ JEV sang chat completion và không gọi output prose là JEV answer.
- **[Proposal]** Release order an toàn: deterministic/manual core → JEV category suggestion nếu Gate B đạt → deterministic facts/templates → LLM prose/extraction ở non-blocking surface sau contract và Gate LLM riêng. Nếu LLM không đạt gate, sản phẩm vẫn có report/table/manual path tương đương.
- **[Unresolved]** Chưa có runtime generative provider/model/endpoint, schema-enforcement evidence, retention agreement, latency/availability evidence hoặc giá trị budget. Không claim provider/model/SLA nhanh, rẻ, sẵn sàng hay production-ready.
- **[Unresolved]** `GPT 5.6 luna` là ví dụ chưa được xác minh từ user context, không phải capability/provider/model ID đã được chứng minh. Không dùng tên này làm default, không claim tồn tại, endpoint, pricing, quota, privacy, quality hoặc latency. Chỉ ghi vào prerequisite/probe inventory.

### 1.2 Ranh giới không thương lượng

| Ranh giới | Contract safety |
|---|---|
| Authority | **[Verified fact]** Số tiền, wallet, savings, budget, report, period HCMC, category lifecycle, owner, authorization, idempotency và audit do code/domain quyết định. **[Proposal]** LLM/JEV output chỉ là signal hoặc candidate. |
| Money critical path | **[Proposal]** Không gọi LLM trong transaction tạo `income`/`payment`, correction, savings transfer, budget mutation hoặc projection lock; không giữ DB transaction/lock chờ provider. |
| Prose | **[Proposal]** Generated text chỉ hiển thị như advisory, có source snapshot/freshness, app-owned disclosure và manual/static fallback. Không dùng prose tạo/đổi money state. |
| Extraction | **[Proposal]** Structured fields là candidate trong staging/preview. Schema validation + deterministic semantic validation + user review bắt buộc; không parse generated prose để ghi tiền. |
| Secrets | **[Verified fact]** Browser không giữ secret/gọi provider; key chỉ server environment. Nguồn: `AGENTS.md` §`.env và secrets`, `docs/ARCHITECTURE.md` §2, §6. **[Proposal]** Provider/model chỉ từ server-side allowlist. |
| Prompt injection | **[Proposal]** Description, CSV cell, issue text và mọi user text là data không tin cậy, không phải instruction. Deterministic redaction/allowlist/privacy checks là boundary; model không phải security gate duy nhất. |
| User control | **[Verified fact]** AI output trong SRS là advisory, user phải xem xét/ghi đè; `confirmedCategorySuggestion` không thay domain validation. Nguồn: SRS §1.5, `docs/contracts/openapi.yaml` `CreateTransactionRequest`. **[Proposal]** LLM text không có `Apply to wallet/budget/payment`. |
| Failure | **[Verified fact]** JEV lỗi, timeout, quota, schema, privacy hoặc low-confidence phải về manual và không block money path. **[Proposal]** LLM failure về facts/static template/manual staging; không fake zero/fake success. |

## 2. Sources và capability boundary

### 2.1 Official sources đã đọc

- **[Verified fact]** [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one): typed decisions/probabilities, khác LLM prose; không generated replies/code/explanations; text-only note.
- **[Verified fact]** [TypeSafe How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one): code giữ control flow, deterministic rules và side effects; câu hỏi narrow/typed; code compose outputs.
- **[Verified fact]** [TypeSafe State](https://docs.typesafe.ai/concepts/state): một request có một state; questions cùng nhìn state và được evaluate độc lập; state là string/object/array của text.
- **[Verified fact]** [TypeSafe Confidence](https://docs.typesafe.ai/confidence): Choice/Score confidence suy ra từ distribution, không bảo đảm answer cá thể đúng; threshold phụ thuộc risk; Noul không có confidence field riêng.
- **[Verified fact]** [OpenRouter System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md): request state + typed questions và response answers/provider/usage/error classes. Đây là evidence cho typed JEV transport, không phải evidence cho generative LLM provider của Campus Coin.
- **[Verified fact]** [OpenRouter Data Collection](https://openrouter.ai/docs/guides/privacy/data-collection.md): trang chính thức mô tả prompt/output logging và use-of-inputs/outputs là các tùy chọn privacy riêng, cùng metadata request như token/latency. **[Unresolved]** Cấu hình workspace, route/provider downstream, retention thực tế và policy áp dụng cho Campus Coin chưa được probe; không suy ra thành guarantee.
- **[Verified fact]** [WCAG 2.2 Recommendation](https://www.w3.org/TR/2024/REC-WCAG22-20241212/): accessibility phải bảo đảm nội dung perceivable, operable, understandable và robust; đây là standard tham chiếu, chưa phải evidence runtime đạt.

### 2.2 Local sources đã đối chiếu

- **[Verified fact]** `AGENTS.md` §JEV/OpenRouter, §React/frontend, §Backend/API: server-only secret, redact, no raw provider/financial payload, deterministic domain, stable error envelope, bounded timeout/rate/concurrency, bilingual accessible UI.
- **[Verified fact]** `docs/PRD.md` §1, §3.2–§3.5, §4–§5: deterministic money path, `income|payment`, VND, HCMC, JEV category-only/default-off, JEV-off parity; complex AI summary/chat/prediction ngoài MVP.
- **[Verified fact]** `docs/DOMAIN-MODEL.md` §1, §3–§5: formulas/invariants, append-only ledger, payment wallet check, savings separation, budget warning-only, JEV không bypass validation/calculation/authorization.
- **[Verified fact]** `docs/ARCHITECTURE.md` §2, §4–§8: browser/API/domain/persistence/admin boundaries, no provider call in money transaction, optional default-off JEV.
- **[Verified fact]** `docs/AI-JEV.md` §3–§8: minimal redacted category state, typed response, fallback/privacy/evaluation, no raw balance/ledger/session/secret, prose deferred.
- **[Verified fact]** `docs/contracts/openapi.yaml`: current category-suggestion public shape, transaction confirmation field, report/dashboard routes, error and data envelopes. Không có public generative-LLM endpoint hay insight/extraction schema.
- **[Verified fact]** `docs/contracts/API-REVIEW.md` §Admin, §Response, §Domain scope: least privilege, `{ success, data, error, meta }` direction, error code locale-neutral, HCMC/idempotency semantics.
- **[Verified fact]** `docs/ADMIN-OPERATIONS.md` §1–§9: admin triage/issue only, masked input, no raw ledger/secret/raw JEV, JEV/privacy/cost incident tắt JEV trước.
- **[Verified fact]** `docs/AUTHENTICATION.md` §1–§7: Google-only, opaque server session, owner from session, CSRF/origin, no credential/token leakage.
- **[Verified fact]** `docs/DELIVERY-PLAN.md` §1–§12: JEV evidence only blocks JEV enablement; core launch needs deterministic/auth/domain/UI/release evidence; no feature expansion during release.
- **[Verified fact]** `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md`, `CC-JEV-SYSTEM-ONE-REVIEW.md`, `CC-JEV-SYSTEM-ONE-ARCH-OPS.md`, `CC-JEV-SYSTEM-ONE-USECASES.md`, `CC-JEV-SYSTEM-ONE-CAPABILITY.md`: System One typed-only correction, application-owned copy/action, stale/privacy/injection/fallback gates.
- **[Verified fact]** `docs/working/jev-product-analysis/FINAL-FINDINGS.md`: historical product analysis with explanation/tips/coaching opportunities; giữ nguyên để trace, không phải authority mới.

## 3. Responsibility split

| Actor/layer | Được làm | Không được làm |
|---|---|---|
| **JEV/System One** | **[Verified fact]** Choice/Noul/Score typed judgment trong finite/ordered rubric, ví dụ category suggestion. | **[Verified fact]** Không prose/reasoning/next action. **[Proposal]** Không dùng làm generative fallback, security authority hay financial authority. |
| **Generative LLM adapter** | **[Proposal]** Viết bounded advisory prose từ deterministic fact bundle; extract candidate fields vào staging; paraphrase/organize non-authoritative content. | Không tính arithmetic, không chọn/authorize action, không ghi ledger/budget/savings/audit, không quyết định owner/admin role, không làm financial advisor, không tự gọi tools/routes. |
| **API/application** | **[Verified fact]** Authn/authz, CSRF/origin, owner scope, feature flag, allowlist, redaction, provider call, timeout, schema validation, provenance, stale/race handling, UI DTO. | Không đưa provider payload/raw text vào user error; không để client chọn provider/model/secret; không bỏ qua domain revalidation. |
| **Domain/read model** | **[Verified fact]** VND arithmetic, wallet/savings/budget/report, HCMC period, immutable rows, correction, idempotency, authorization, reconciliation. | Không import SDK/provider; không chờ model; không coi model confidence là invariant. |
| **Browser/UI** | Render authoritative facts và optional advisory; explicit trigger/inspect/dismiss/override/feedback; accessible bilingual states. | Không provider call, secret, client authority, prose-to-money parse, auto-submit, hidden navigation/action. |
| **Admin** | **[Verified fact]** Masked issue triage/status/priority/note theo least privilege. **[Proposal]** Có thể xem aggregate model-health metadata nếu được cấp quyền. | Không raw prompt/completion mặc định, không xem toàn bộ financial detail, không sửa ledger/balance/audit, không bật client flag, không autonomous triage. |
| **User** | Nhập facts, inspect source, review/edit/accept/override/dismiss/save/feedback theo surface. | Render/confirm generated text không phải authorization; `Use` của suggestion không thay final deterministic Save. |

### 3.1 Cấm authority bridge

**[Proposal]** Cấm các đường nối sau, kể cả khi output được gắn confidence cao:

1. `LLM text → regex/parser → amount/date/balance → money write`.
2. `LLM JSON field → bỏ qua user review → ledger/budget/savings mutation`.
3. `JEV Choice/Score/Noul → authorization/permission/role/owner`.
4. `LLM/JEV output → route/tool/function name → autonomous action`.
5. `generated explanation → authoritative report replacement`.
6. `provider error → hidden retry/repair model → fake success`.
7. `admin prompt/completion → cross-owner lookup hoặc bulk action`.

**[Verified fact]** Các cấm này mở rộng trực tiếp boundaries trong `docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/AI-JEV.md` và `AGENTS.md`; thêm LLM không nới domain invariant.

## 4. Server-only provider và secret contract

### 4.1 Provider/model policy

- **[Proposal]** Browser chỉ gọi Campus Coin API. API server là nơi duy nhất đọc secret, chọn provider/model, đặt timeout, gửi request và normalize result. Không đưa key, raw provider response, prompt, model credential hoặc unrestricted provider options vào browser response/client storage.
- **[Proposal]** Provider, base URL, model ID, generation parameters, structured-output mode và feature flag nằm trong server-side allowlist/versioned config. Client chỉ gửi capability trigger và user data đã contract hóa; không tự chọn provider/model/temperature/tools.
- **[Proposal]** Tắt private input/output logging, training/use-of-inputs và provider-side retention nếu workspace/provider cho phép; kiểm tra thực tế bằng probe trước khi gửi user data. Nếu không chứng minh được thì không outbound.
- **[Proposal]** Không cho tool/function calling, URL fetch, file fetch, code execution, browser access hoặc provider-side autonomous agent mode. LLM output là data; không execute.
- **[Unresolved]** Provider có hỗ trợ exact JSON schema/discriminated output, refusal semantics, cancellation, data deletion, zero-retention, regional processing, downstream routing, model snapshot pinning và abuse monitoring hay không chưa được xác minh.
- **[Unresolved]** `GPT 5.6 luna` chỉ là tên ví dụ chưa verified. Probe phải xác nhận model ID, transport, schema, privacy, limits, latency distribution, error mapping và kill path trước khi feature flag bật; không ghi tên này vào canonical config từ file này.

### 4.2 Gate trước outbound

**[Proposal]** Mỗi request generative phải vượt các gate theo thứ tự:

1. **Session/owner/permission:** xác thực server session, account status, owner scope và capability permission; không tin owner/model/locale từ body nếu server chưa kiểm tra.
2. **Use-case allowlist:** capability có trigger, purpose, data class, output schema và fallback đã enable; feature flag server-side default-off.
3. **Input schema/size:** validate encoding, length, nesting, candidate count, row count và request budget; giá trị chưa validate không vào prompt/state.
4. **Privacy classification:** phân loại field là user content, PII, financial-sensitive, secret/credential hoặc admin-sensitive; block nếu vượt allowlist.
5. **Redaction/minimization:** bỏ session, claims, tokens, cookies, secrets, email/phone/address, raw ledger và fields không cần; ưu tiên opaque IDs, labels, bands, fact refs.
6. **Untrusted-data framing:** user text/CSV cell/issue text là data trong field; không ghép vào instruction/tool command; không để text chọn schema, model, route hoặc action.
7. **Provider/privacy policy:** kiểm tra allowlisted provider/model, workspace logging/retention và kill switch; uncertainty → manual/static fallback.
8. **Bounded call:** deadline, concurrency, retry, output/token limit và daily budget/cost bucket; không giữ money transaction.
9. **Traceability:** opaque correlation/request ID và snapshot/version; ID không chứa PII/prompt.

### 4.3 PII và financial minimization

- **[Verified fact]** Local boundary cấm gửi email/phone/address/token/cookie/credential/internal ID thừa, full ledger, balance, savings, Google claims, session, secret và raw JEV payload. Nguồn: `docs/AI-JEV.md` §3–§6; `AGENTS.md` §`.env và secrets`, §JEV/OpenRouter.
- **[Proposal]** Với prose report, gửi aggregate/fact bundle nhỏ nhất đủ cho câu hỏi; ưu tiên `factId`, category label đã được phép, direction, period, completeness và bucket/band. Exact VND chỉ gửi nếu capability contract cần và privacy gate cho phép; nếu chỉ cần câu “tăng so với kỳ trước”, không gửi raw rows/ledger.
- **[Proposal]** Exact authoritative values do backend/UI chèn từ source snapshot. Generated text không tự phát sinh amount, percentage, balance, limit, date hoặc period; nếu cần con số, dùng deterministic template/value token. Tránh để text model thành arithmetic engine.
- **[Proposal]** Không suy ra thu nhập, khả năng trả nợ, tình trạng tài chính nhạy cảm, sức khỏe/tâm lý, học lực, nhân khẩu học hoặc external bank fact từ tracker data. Không gửi cross-user benchmark mặc định.
- **[Proposal]** Log/telemetry chỉ lưu masked status, capability, contract/policy version, model snapshot (server operator only), latency bucket, token/cost bucket, fallback reason, source version và outcome. Không log raw prompt, completion, user description, raw financial values, OAuth claim, secret hoặc provider payload.
- **[Unresolved]** Consent/opt-out, export/delete, raw user-input retention, saved-advisory retention và provider deletion SLA chưa có canonical policy. Không promise “xóa ngay” hoặc “không lưu ở mọi nơi”.

### 4.4 Prompt injection và untrusted descriptions

**[Verified fact]** `docs/AI-JEV.md` và System One review xác định description/CSV cell là untrusted data; deterministic redaction/allowlist là primary boundary. Official System One không hứa Campus Coin-specific prompt-injection detection.

**[Proposal]** Với mọi model:

1. Không coi `description`, `message`, `CSV cell`, merchant text hoặc issue text là system/developer instruction.
2. Tách instruction cố định khỏi data bằng structured fields; data không được chèn schema/criteria/tool.
3. Kiểm tra secret/credential/PII, prompt exfiltration, “ignore rules”, yêu cầu lộ system prompt, authorize payment, đổi amount/date/balance, gọi tool hoặc sửa ledger. Đây là tín hiệu chặn deterministic, không phải danh sách đầy đủ.
4. Không echo suspicious input trong error, UI, log, analytics, feedback hoặc admin screen nếu không cần.
5. Không outbound khi privacy/injection classification không chắc chắn. JEV Noul/LLM classifier không phải lý do duy nhất để cho outbound.
6. Nếu output lặp instruction, secret, provider message, HTML/script, tool call, URL hoặc authority claim, reject toàn response; không repair bằng model khác.
7. Mọi output vẫn là data chưa tin cậy; không execute, không dùng làm SQL/HTML/unsafe Markdown, không biến thành route/action.

**[Unresolved]** Không có evidence cho detector prompt-injection hoàn hảo. Safety KPI là không có secret/side effect/leak khi text adversarial và manual fallback vẫn hoạt động, không phải “model phát hiện mọi injection”.

## 5. Structured response envelopes (proposal, không sửa OpenAPI)

### 5.1 Nguyên tắc

**[Proposal]** Đây là internal/future boundary sketch; không phải thay đổi `docs/contracts/openapi.yaml`. Nếu public hóa, phải cập nhật canonical OpenAPI trước implementation.

Mọi response generative phải có:

- `schemaVersion` và `capability`;
- `status` do **application** đặt, không phải model tự tuyên bố;
- source snapshot/provenance/freshness;
- output typed hoặc bounded text theo schema;
- locale-neutral `reasonCode`;
- `controls` chỉ phản ánh UI affordances allowlist;
- không raw provider payload, secret, prompt, completion hoặc stack trace;
- `advisoryOnly: true`, `financialAuthority: false`, `canMutateMoney: false` trong policy metadata;
- direction tương thích `{ success, data, error, meta }` từ `docs/contracts/API-REVIEW.md` §Response, nhưng proposal này không tự trở thành public contract.

### 5.2 Common envelope minh họa

```json
{
  "schemaVersion": "cc.ai.result.v1",
  "capability": "monthly_explanation_v1",
  "status": "ready",
  "locale": "vi",
  "source": {
    "kind": "monthly_report",
    "snapshotId": "opaque-server-id",
    "snapshotVersion": "opaque-version",
    "period": "2026-08",
    "timezone": "Asia/Ho_Chi_Minh",
    "asOf": "server-time",
    "factRefs": ["report.category.food.direction"]
  },
  "result": {},
  "provenance": {
    "generatedAt": "server-time",
    "policyVersion": "llm-policy-v1",
    "promptVersion": "monthly-explanation-v1",
    "outputSchemaVersion": "cc.ai.advisory.v1",
    "modelSnapshot": "server-only-metadata"
  },
  "controls": {
    "sourceInspectable": true,
    "dismissible": true,
    "feedbackAllowed": false,
    "applyToMoney": false
  },
  "advisoryOnly": true,
  "financialAuthority": false,
  "canMutateMoney": false,
  "reasonCode": null
}
```

- **[Proposal]** `snapshotId`, `factRefs`, `asOf`, `period` và `timezone` bắt buộc cho report/budget explanation; thiếu bất kỳ field nào → không display generated text.
- **[Proposal]** `modelSnapshot`/provider metadata chỉ server/operator scoped; không trả user nếu không có product reason. User-facing copy nói “Gợi ý tham khảo”, không nói provider/model confidence.
- **[Unresolved]** Exact public field names, persistence table, endpoint, envelope compatibility và `reasonCode` catalog chưa canonical; không triển khai từ file này.

### 5.3 Advisory prose envelope

**[Proposal]** Generated text chỉ trả dưới structured output, không phải raw completion:

```json
{
  "kind": "advisory_text",
  "textPolicy": "plain_text_bounded_no_authority",
  "blocks": [
    {
      "id": "observation",
      "kind": "observation",
      "text": "Chi tiêu cho Đồ ăn tăng so với kỳ trước.",
      "factRefs": ["report.category.food.direction"]
    },
    {
      "id": "caveat",
      "kind": "caveat",
      "text": "Đây là diễn giải tham khảo từ báo cáo hiện tại.",
      "factRefs": ["report.snapshot"]
    }
  ],
  "numericClaimsAllowed": false,
  "actionIds": []
}
```

- **[Proposal]** `blocks[].text` là plain text bounded; không HTML/script, raw Markdown, arbitrary URL, prompt/system text, tool call hoặc financial command.
- **[Proposal]** MVP generated prose **không cho model tự viết numeric claims**. Exact amount, percentage, balance, limit, date và period formatting do app/localization/template chèn từ source; output chứa money-like claim ngoài allowlist → suppress. Nếu cần numeric prose, dùng deterministic template.
- **[Proposal]** Mỗi block có `factRefs` là subset của server-approved refs. Fact refs là provenance, không chứng minh model text đúng; validator vẫn kiểm tra policy, freshness và claim shape.
- **[Proposal]** Không cho model trả `actionIds` để chọn next action. App policy có thể thêm CTA allowlist sau khi render; generated text không tạo `Apply`, `Pay`, `Transfer`, `Set budget`, `Correct` hoặc `Send`.
- **[Proposal]** Không có `reasoning`, chain-of-thought, confidence-as-correctness, free-form citation hoặc hidden source. Field ngoài schema → reject/suppress.

### 5.4 Structured extraction envelope

**[Proposal]** Extraction dùng schema typed riêng, không parse prose:

```json
{
  "kind": "structured_extraction",
  "sourceRef": "opaque-user-job-or-row-id",
  "fields": [
    {
      "name": "merchantLabel",
      "value": "Campus Cafe",
      "valueType": "string",
      "evidenceRef": "source-span-opaque",
      "decision": "candidate"
    },
    {
      "name": "categoryId",
      "value": "food",
      "valueType": "opaque-category-id",
      "evidenceRef": "source-span-opaque",
      "decision": "candidate"
    }
  ],
  "unknownFields": [],
  "warnings": [],
  "allFieldsRequireReview": true
}
```

- **[Proposal]** Allowlist field names/type/size trước request. Merchant label, bounded topic, category candidate, column mapping hoặc issue area là lower-risk. `amountVnd`, `occurredAt`, `transactionType` là high-risk candidate: dù future prefill contract cho phép, chúng vẫn untrusted candidate, không authority.
- **[Proposal]** Amount candidate phải là exact decimal/integer string sau schema validation; date qua deterministic parser với HCMC semantics; type/category qua enum/active/appliesTo/owner validation. Không arithmetic, currency conversion hoặc correction từ LLM.
- **[Proposal]** User review/edit/accept/skip từng field/row; final import/ledger dùng normal deterministic endpoint, CSRF, idempotency và domain transaction. `allFieldsRequireReview` không được model tự tắt.
- **[Proposal]** `evidenceRef` là opaque bounded reference; không trả raw secret/PII span. Output không đúng field/value contract hoặc trả prose explanation thay fields → reject, manual staging.
- **[Unresolved]** Provider structured-output guarantee và max schema size chưa được probe; không claim JSON mode/schema adherence từ API name.

### 5.5 JEV envelope không bị thay thế

- **[Verified fact]** JEV native response là Choice/Noul/Score typed answer; Campus Coin map thành `suggested|manual|disabled|unavailable` trong category envelope. Nguồn: `docs/AI-JEV.md` §4–§5; `docs/contracts/openapi.yaml` `CategorySuggestion`.
- **[Proposal]** JEV adapter tiếp tục validate primitive, candidate membership, confidence policy, freshness và user selection. LLM envelope không thêm prose vào `/ai/category-suggestion` và không là fallback cho malformed JEV answer.
- **[Proposal]** Nếu workflow dùng cả hai, trace hai result độc lập: `jevDecision` typed và `llmAdvisory`/`llmExtraction` structured. Conflict → deterministic facts/manual, không “vote” giữa hai model.
## 6. Validation, display và suppression gates

### 6.1 Validation thứ tự

**[Proposal]** Adapter phải fail closed theo thứ tự, không sửa output ngầm:

1. HTTP/transport thành công, request đúng capability và trong deadline.
2. Body có đúng envelope/discriminated `kind`/`schemaVersion`; required fields, type, length, nesting và unknown-field policy đúng.
3. `status`, capability, locale, source snapshot và request correlation khớp server context.
4. Text policy: plain text bounded; không HTML/script, URL tùy ý, tool call, provider error, prompt/system text hoặc secret.
5. Fact refs là server-issued; source còn fresh, owner-scoped và period/timezone hợp lệ.
6. Generated text không có money/date/percentage/authority claim ngoài policy; extraction value type/enum/range/date semantics đúng.
7. Không có secret/PII/raw prompt/provider payload trong output.
8. Application risk policy cho phép display/preview; user control và app-owned locale/a11y copy tồn tại.
9. Revalidate source ngay trước render; worker/read-time result trễ bị discard nếu snapshot đổi.
10. Chỉ sau đó mới trả application response; mọi money write vẫn qua normal deterministic domain path độc lập.

Không parse `text` để cứu JSON, không regex prose lấy amount/date/category, không accept partial object và không retry bằng hidden repair LLM. Unknown field nên reject ở strict contract; provider metadata phải bị allowlist và strip trước public response.

### 6.2 Khi generated text được phép hiển thị

**[Proposal]** Chỉ display khi **tất cả** điều kiện sau đúng:

- user đã trigger surface hoặc opt-in theo capability policy;
- source snapshot đúng owner, đúng period `Asia/Ho_Chi_Minh`, còn fresh và có `asOf`;
- deterministic report/dashboard/budget facts đã load thành công;
- envelope/schema/locale/length/text-safety validation pass;
- mỗi block có `factRefs`; không có unsupported numeric, balance, authorization, causal-certainty hoặc action claim;
- exact values/labels/period do app-owned source render, không tin model tự sinh;
- UI tách `Số liệu authoritative` và `Gợi ý tham khảo`, có source/table inspect;
- app-owned `en`/`vi` label, disclosure, error, stale, status, `aria` text và controls đã có;
- first useful content không phụ thuộc generated response; late response không cướp focus/ghi đè user state.

### 6.3 Khi phải suppress

**[Proposal]** Suppress toàn bộ generated result nếu gặp một trong các điều kiện:

- source missing/wrong-owner/stale/superseded; correction, payment, category hoặc budget change chưa reconcile; period/timezone không rõ;
- provider/model/retention/privacy policy chưa allowlist/probe;
- secret/PII/financial data không thể redact/minimize;
- input injection-shaped hoặc yêu cầu lộ prompt/secret, authorize payment, đổi amount/date/balance, gọi tool/mutation;
- malformed/wrong schema/kind/locale, unknown field, quá dài, partial JSON, raw provider error, HTML/script/URL/tool call;
- money/date/percentage claim không trace được hoặc unsupported causal/financial-advice claim;
- output tự xưng authority, yêu cầu chuyển tiền/sửa ledger hoặc chọn action ngoài allowlist;
- extraction field ngoài allowlist, parse conflict với deterministic parser, category disabled/wrong `appliesTo`, hoặc user chưa review;
- timeout, quota, rate/concurrency exhaustion, 4xx/5xx, cancellation, worker failure hoặc kill switch;
- locale/evaluation/a11y chưa đủ hoặc generated surface làm mất controls.

UI dùng app-owned localized state (`Chưa thể tạo diễn giải`, `Dùng báo cáo/bảng số liệu`, `Chọn thủ công`, `Cần kiểm tra lại dữ liệu`), không lộ raw provider reason/stack/prompt. Suppress không được gắn success và không được hiển thị partial text.

## 7. Use-case cards và disposition

Mỗi card phải phân biệt provider output với deterministic composition. Các status `ready|manual|suppressed|stale|unavailable|invalid` là application status, không phải model output.

### UC-LLM-01 — Monthly report explanation

- **Fit/disposition:** `LLM fit` cho bounded prose; `JEV fit` chỉ optional typed `pattern_kind` signal; `both` chỉ khi hai outputs độc lập; **defer until contract/gates**, deterministic report/table ship trước.
- **Trigger:** User bấm “Xem tóm tắt” sau khi `/reports/monthly` deterministic snapshot load; không gọi trong report calculation/transaction.
- **Minimal state:** source snapshot/version, HCMC month, allowlisted category labels/directions/completeness/fact refs; không raw ledger, session, claims, secret, unnecessary PII.
- **Output contract:** `advisory_text` envelope; bounded plain text blocks + fact refs + caveat; no numeric claims, action IDs, authority or causal inference. Exact values from report response.
- **Blocking/non-blocking:** `[Proposal]` read-time request must be non-blocking to first facts; async precompute allowed after report artifact; never block money/report availability.
- **User control:** explicit trigger, inspect source table, dismiss/refresh/feedback if approved; generated text cannot submit payment/budget/savings.
- **Fallback:** report/chart/table and app-owned static copy; missing/stale/unsafe/LLM unavailable → suppress, no fake zero.
- **Metrics:** source-trace pass rate, stale suppression, schema/safety failure, first-useful-content latency, source-open/comprehension, `en|vi` and a11y parity; no p50/p95/p99 promise before measurement.
- **Classification:** `LLM fit` for prose; `code-only` for facts/arithmetic/source refs; `JEV fit` only if a finite typed signal has independent value.

### UC-LLM-02 — Dashboard “what changed?” / budget coaching copy

- **Fit/disposition:** `LLM fit` only for paraphrase of code-selected facts; `JEV fit` optional finite label; `code-only` for delta, threshold, warning, CTA and budget status; **defer/experiment after UC-01**.
- **Trigger:** User opens dashboard/budget after deterministic snapshot or explicitly requests coaching; no call per keystroke and no trigger inside payment transaction.
- **Minimal state:** code-computed direction, category, HCMC month, `used/limit/isOverrun` only if needed, source refs and allowlisted template intent. Do not ask model to calculate or choose “what next”.
- **Output contract:** bounded advisory text/caveat; no exact money unless deterministic template inserts it; no `Apply`, `Pay`, `Transfer`, `Set budget` or route selection.
- **Blocking/non-blocking:** non-blocking; exact budget bar/warning and allowed navigation appear without LLM.
- **User control:** source inspect, dismiss/snooze/refresh; CTA opens normal review screen only; final mutation requires normal form/CSRF/idempotency.
- **Fallback:** deterministic warning/static template or hide optional card; overrun remains warning-only and wallet-sufficient payment remains allowed.
- **Metrics:** zero payment block/mutation, source comprehension, dismiss/noise, suppression/stale, first useful screen; no unmeasured latency claim.
- **Classification:** `LLM fit` prose paraphrase; `JEV fit` only bounded signal; money status/CTA `code-only`.

### UC-LLM-03 — Transaction description/category explanation

- **Fit/disposition:** **`JEV fit`** for current category `Choice`; generative LLM prose is unnecessary and **reject** for money path. A static app-owned label is safer.
- **Trigger:** User explicitly presses category suggestion after choosing `income|payment` and entering valid description.
- **Minimal state:** current JEV state: redacted bounded description, transaction type, active candidates, locale/version; never amount/date/balance/ledger/session/secret.
- **Output contract:** existing application category suggestion envelope; JEV typed answer only. No generated text in `/ai/category-suggestion`; no prose parser or LLM fallback.
- **Blocking/non-blocking:** suggestion may be synchronous pre-submit but manual picker and Save cannot wait; no DB money transaction held.
- **User control:** `Use`, override, dismiss, final Save separately; late result cannot overwrite manual selection.
- **Fallback:** manual picker on flag-off, privacy/injection, timeout, schema, quota, stale or low/ambiguous signal.
- **Metrics:** 100% active/appliesTo-valid suggestions, zero auto-commit, JEV-off completion parity, override/abstain/fallback, no raw sensitive outbound/log.
- **Classification:** `JEV fit`; LLM `reject` for explanation/authority and `code-only` for validation/commit.

### UC-LLM-04 — CSV/import or bounded field extraction (future; CSV out of MVP)

- **Fit/disposition:** `LLM fit` for candidate extraction/classification after deterministic parsing; JEV `Choice` can classify finite category; `both` only if independently useful; **defer together with CSV** per `docs/PRD.md` §5.
- **Trigger:** Future bounded upload parsed into staging; user opens preview. No raw file sent directly to model.
- **Minimal state:** opaque job/row ID, validated row text, parser/schema version, active candidate snapshot, locale; raw file, unvalidated amount/date/type, session and PII excluded.
- **Output contract:** `structured_extraction` fields only, strict schema, candidate values + evidence refs + warnings; all fields `candidate`, `allFieldsRequireReview=true`.
- **Blocking/non-blocking:** worker/preview may be async and bounded; upload preview and manual edits remain usable; no import or ledger transaction waits on model.
- **User control:** review/edit/accept/skip each field/row, explicit batch confirmation; unresolved rows remain manual.
- **Fallback:** parser/manual row picker/invalid/duplicate/skip; no silent loss, zero fill, auto-import or prose repair.
- **Metrics:** zero duplicate/silent row loss, 100% committed rows explicitly reviewed, field validation failures, manual completion, job latency/expiry, PII leakage; do not promise throughput before measurement.
- **Classification:** `LLM fit` extraction; JEV `fit` category only; parser/domain/import commit `code-only`.

### UC-LLM-05 — Correction/help issue text

- **Fit/disposition:** `code-only` static forms are preferred; JEV may be future bounded routing signal; generative LLM **reject** for correction role/amount/target or admin action; no MVP LLM.
- **Trigger:** User explicitly opens help/correction and asks for routing, not during correction commit.
- **Minimal state:** redacted message, opaque screen/target context, finite help area; no raw ledger/balance/session/claims/secret.
- **Output contract:** if ever approved, strict topic label only; no correction command, reason prose, amount/category, role or target.
- **Blocking/non-blocking:** non-blocking; static help/correction form always available.
- **User control:** user chooses target/reason/role and confirms normal endpoint; admin cannot accept on behalf.
- **Fallback:** manual menu/static help/human support; ambiguous financial dispute escalates to issue flow.
- **Metrics:** correct-form routing, zero model-created correction, zero wrong-owner exposure, no raw issue text logs.
- **Classification:** `code-only` now; JEV future advisory; LLM `reject` for authority.

### UC-LLM-06 — Admin issue summarization/triage

- **Fit/disposition:** `code-only` canonical admin status/priority/note; masked LLM summary may be future advisory, **defer with separate admin/privacy gate**; autonomous triage `reject`.
- **Trigger:** Authorized admin opens a masked issue; not automatic cross-owner scan.
- **Minimal state:** least-privilege masked issue fields, opaque case ID, approved topic/status vocabulary; no raw ledger, credentials, secret, full user profile or cross-owner data.
- **Output contract:** bounded summary/topic candidate with source refs; no priority/status mutation, resolution, escalation command or money action.
- **Blocking/non-blocking:** admin page and manual triage must load without LLM; worker/read-time summary non-blocking.
- **User control:** admin inspects source and explicitly edits/commits note/status under role/audit; model output visibly advisory.
- **Fallback:** manual triage/static issue view; privacy concern disables feature; preserve incident evidence without raw completion.
- **Metrics:** no privilege leak, audit completeness, masked-output rate, correction/edit rate, suppression/stale, no unauthorized mutation.
- **Classification:** `code-only` canonical; LLM future bounded assist; autonomous LLM `reject`.

### UC-LLM-07 — Forecast, anomaly, duplicate, savings/payment advice

- **Fit/disposition:** **`reject` for current LLM complement** as authority or financial advice. Deterministic anomaly/idempotency/domain and product methodology must precede any future experiment; forecasting is out of MVP.
- **Trigger/state/output:** do not send an LLM request to calculate balance, amount, forecast, duplicate proof, fraud, savings amount or payment capacity. Future read-only research would need separate methodology, uncertainty and safety decision.
- **Blocking/non-blocking:** never in money critical path; no model output may freeze, reject, reverse, correct, authorize or transfer.
- **User control/fallback/metrics:** exact deterministic history/report or “cannot verify”; no accusation, guaranteed saving, loan/BNPL/investment advice or auto-fix. Any future contract must measure calibration, false positives, stale rate and harm, not prose engagement only.
- **Classification:** `code-only` for domain facts or `reject` for generative authority.

## 8. Critical-path performance and fallback

**[Verified fact]** Local docs require JEV/provider not to block money path and require bounded timeout/concurrency/retry; they do not provide a Campus Coin generative-LMM SLA. TypeSafe’s official page describes System One as “fast” and “about 100 ms” in its product text, but that is not evidence for a generative provider or this deployment and must not be used as a Campus Coin promise.

**[Proposal]** Evaluate these placements separately; recommend only when genuinely non-blocking:

| Pattern | Safe use | Critical-path rule | Main risk/control |
|---|---|---|---|
| JEV-only | category typed suggestion | optional pre-submit; manual/Save never waits | Gate B; typed validator; no prose |
| LLM-only | prose/extraction | only explicit advisory/preview surface; first facts/manual path already rendered | schema/prompt/privacy gate; no money authority |
| Parallel fan-out | independent JEV signal + LLM prose after same frozen facts | permitted only when both are optional and response commits/render facts without either | cancellation, duplicate spend, race; shared deadline and independent result suppression |
| JEV-gated LLM cascade | only if typed signal deterministically proves a bounded need for text | not on money path; code decides whether second call; cap total deadline/cost | JEV is not a security gate; no hidden repair loop; second call must be separately allowlisted |
| Async post-response/worker | monthly artifact, saved insight, batch extraction | preferred for narrative/CSV; commit/read response first | idempotent job, expiry, stale invalidation, bounded retry/dead letter |
| Cache/precompute | same owner-scoped frozen report snapshot | serve only if snapshot/policy/locale still fresh | no stale-as-current; invalidate on financial/category/budget changes |

**[Proposal]** First useful content budget must be measured for JEV-off, LLM-off, JEV-only, LLM-only, parallel and cascade variants. Do not promise p50/p95/p99, “real-time” or provider availability until probe data exists. A performance gate should record request count, timeout/cancel, token/cost bucket, queue age, stale discard, first facts time and final advisory time by locale/capability.

**[Proposal]** No default retry on user click. Async retries only for idempotent advisory jobs, bounded attempts/backoff and a cost budget; no retry should repeat a money command. Kill switch disables outbound while deterministic/manual behavior remains.

## 9. UX, localization, accessibility and confirmation

### 9.1 Two display layers

**[Proposal]** Every LLM surface has separate regions:

1. **Authoritative evidence:** exact backend values, chart/table equivalent, current category label, HCMC period, `asOf`, source snapshot and loading/empty/error state.
2. **Advisory interpretation:** generated text (if gates pass), `Gợi ý tham khảo` badge, generated time, stale state, source links and dismiss/refresh/feedback.

Never put generated text into authoritative fields such as `availableBalanceVnd`, `usedVnd`, `limitVnd`, `status`, `error.message`, `categoryId`, `role` or `reasonCode`.

### 9.2 User-control state machine

| State | UI behavior | Forbidden |
|---|---|---|
| `manual-ready` | static/app copy; form/picker works | claim model called or ready |
| `loading` | keep input; busy status; cancel/continue manually | lock Save forever, focus theft |
| `ready/advisory` | fact + clearly marked interpretation + source | call text authoritative/correct |
| `stale` | badge + refresh or hide; source remains visible | render current or mutate |
| `suppressed/invalid` | localized reason/fallback; no partial text | expose raw provider/error |
| `accepted/edited` | record advisory decision only; final save separate | treat acceptance as authorization |
| `saved/dismissed` | truthful non-financial interaction state | mutate ledger/budget/report |

**[Proposal]** Every surface follows `propose → inspect → decide → commit`: explicit trigger, fact/source inspection, accept/override/edit/dismiss/skip/feedback, then only normal deterministic domain action. Pending responses cannot overwrite user edits or selected category; user override wins.

### 9.3 Localization

- **[Verified fact]** Campus Coin has `en|vi`; locale changes copy/formatting, not enum/API/formula/audit/authorization. Nguồn: `docs/PRD.md` §2–§3; `AGENTS.md` §React/frontend.
- **[Proposal]** App-owned translation keys are mandatory for button, disclosure, error, fallback, stale, loading, `aria-label`, `aria-live`, source labels and fact/advisory badge. LLM must not author critical UI/legal/error/accessibility copy.
- **[Proposal]** Generated body only renders in an evaluated locale. If bilingual quality/evaluation is not evidenced, use deterministic template/app translation and suppress LLM prose. Do not claim quality for Vietnamese/English without measurement.
- **[Proposal]** VND, `income|payment`, IDs, HCMC period and numeric formatting are app-owned; model cannot translate/change identifiers or currency.

### 9.4 WCAG 2.2 AA release target

**[Proposal]** For each LLM surface: semantic regions/headings, accessible source name, polite status updates for loading/stale/fallback, no focus theft, keyboard operation for trigger/source/review/dismiss, visible focus, text equivalent for charts, no color-only status, reduced-motion support, reflow/zoom, contrast and bounded output layout. Generated text must never be the only way to understand data. Model output missing, long or empty must not remove controls.

**[Verified fact]** PRD/AGENTS require keyboard/focus/loading/error/accessibility states, chart/table equivalents and bilingual content; WCAG 2.2 official link is in §2.1. This is a release target, not a claim runtime currently passes.

### 9.5 Confirmation/override

- **[Verified fact]** Category suggestion requires user confirm/override; `confirmedCategorySuggestion` is acknowledgement, not normal transaction validation. Nguồn: `docs/AI-JEV.md` §3, §7; `docs/contracts/openapi.yaml` `CreateTransactionRequest`.
- **[Proposal]** LLM prose never has a confirmation that authorizes money. `Save insight`, `Pin`, `Dismiss`, `Feedback` only manage advisory artifact.
- **[Proposal]** Extraction has per-field/row review. Accepting candidates only prefills staging; final Save/Import shows amount/date/type/category and server revalidates. Unresolved values require manual input.
- **[Proposal]** No generated-card `Apply advice`, `Transfer`, `Pay`, `Set budget` or `Correct ledger`. A deterministic CTA may only open a normal review form and cannot submit mutation.

## 10. Provenance, stale, retention, feedback and admin

### 10.1 Provenance minimum

**[Proposal]** Display/save requires `capability`, `schemaVersion`, owner-scoped opaque subject, `sourceKind`, snapshot/version, `factRefs`/`sourceRef`, period + `Asia/Ho_Chi_Minh` where applicable, `asOf`, `generatedAt`, policy/prompt/output schema version, locale, status, stale reason and user decision. Model/provider snapshot remains masked operator metadata if needed. Missing provenance → suppress generated text, while valid authoritative report/table can remain.

### 10.2 Stale and invalidation

**[Proposal]** Mark artifact stale/discard when income/payment/correction commits; category status/name/appliesTo changes; budget limit/status/month changes; report/projection rebuild/reconcile; period/timezone/locale/policy/template/schema changes; owner/session scope changes; TTL/retention expiry; or worker result arrives after source changes. History may be viewable only with stale badge/time/source and never becomes current authority.

### 10.3 Retention and feedback

- **[Proposal]** Category suggestion and extraction preview are ephemeral by default. Saved advisory is an immutable version; refresh creates a new superseding version, not silent overwrite.
- **[Proposal]** Never persist raw prompt/completion/provider payload by default. Debug samples require explicit consent/notice, masking, short retention, access logs and owner/security approval; no raw user content in Markdown/logs.
- **[Proposal]** Feedback is append-only masked event (`accepted|edited|dismissed|reported|not_useful`, capability/version/source snapshot). It does not promise retraining, global learning, auto-recategorization or money mutation. One user correction is not universal truth.
- **[Unresolved]** Consent, opt-out, export/delete, retention duration, saved artifact lifecycle, provider deletion and user visibility are not canonical. Hold feature off until policy/contract is approved.

### 10.4 Admin boundary

- **[Verified fact]** Admin roles are least privilege: support sees masked issues; admin does not edit ledger/balance/audit; content/feature changes need version/reason/approval/audit. Nguồn: `docs/ADMIN-OPERATIONS.md` §1–§6; `docs/contracts/API-REVIEW.md` §Admin.
- **[Proposal]** Admin may see aggregate health (status, latency/cost bucket, fallback rate) only if role allows. Raw prompt/completion, raw description, user financial detail and provider secret are hidden by default.
- **[Proposal]** LLM cannot set issue status/priority, write admin note, escalate incident, inspect another owner, disable safeguards or enable model from client. Human admin action remains explicit, authorized, audited and reversible through operational runbook.
- **[Proposal]** On privacy/cost/model incident, disable LLM/JEV feature first, preserve masked incident metadata and keep manual/core flow; never delete ledger/audit to clean evidence. This extends `docs/ADMIN-OPERATIONS.md` §7.

## 11. Old System One finding corrections/extensions

### 11.1 What is corrected from old product analysis

| Historical finding | Correction/extension for LLM complement |
|---|---|
| `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1.2, §5 and UC-06–UC-10 describe “JEV explanation”, monthly narrative, coaching, tip or NBA wording. | **[Correction]** System One cannot generate prose. Deterministic facts + app templates remain the safe baseline. A separate LLM may generate bounded advisory text only under §5–§6 gates; LLM still cannot choose CTA/action. |
| Old provenance envelope allowed `explanation` as an undifferentiated advisory field. | **[Extension]** Split authoritative source facts from `advisory_text` blocks; require snapshot/version/fact refs/freshness and suppress on conflict/stale. Generated text is not evidence or authority. |
| Old cards allowed JEV/AI to assist monthly insight/budget coaching/NBA. | **[Correction]** JEV is typed-only; LLM may paraphrase code-selected candidates, never calculate threshold/amount or select/execute NBA. `code-only` is preferred where templates suffice. |
| Old `status` values (`suggested|manual|abstain|stale|invalid`) sometimes read as model output. | **[Correction]** These are application adapter/UI states. LLM/JEV native outputs are schema-specific; app maps transport, validation, privacy and freshness outcomes. |
| Old confidence/low-confidence language could imply native abstain/correctness. | **[Correction]** JEV confidence is distribution-derived and not per-answer correctness; Noul has no confidence. LLM has no authority merely because output is valid/high quality; app policy determines manual/suppress. |
| Old injection policy relied on JEV abstain/manual. | **[Extension]** Deterministic redaction/allowlist is primary for both JEV and LLM. Model safety classification is defense-in-depth, not permission to outbound. |
| Old stale policy attached source versions to artifacts but did not define generative output suppression. | **[Extension]** LLM text must be suppressed on source conflict/stale/unknown provenance; no stale-as-current and no “refresh” hidden loop. |
| Old correction/learning cards said JEV could learn from correction. | **[Correction]** Feedback is masked append-only telemetry; no automatic retrain/recategorization. LLM provider training/retention is an explicit unresolved privacy decision. |
| Old admin assistance was advisory but could drift toward triage. | **[Extension]** Masked LLM summary, if ever approved, cannot set status/priority/note/role, cross owner or bypass audit; autonomous admin/financial actions remain reject. |

### 11.2 What remains valid

- **[Verified fact]** Deterministic/manual-first core, JEV default-off, explicit user control, source-linked facts, stale/fallback treatment, app-owned localization/accessibility and no money authority remain valid and are strengthened, not weakened.
- **[Verified fact]** `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` and its handoffs correctly corrected the assumption that System One writes prose; this file extends those corrections to a separate generative adapter rather than reversing them.
- **[Proposal]** Adding LLM is therefore a new gated capability, not an expansion of JEV’s contract and not a reason to edit old analysis/canonical files in this task.

## 12. Cross-cutting gates and fail-closed matrix

### Gate A — core independent of any model

**[Verified fact]** Core requires deterministic backend/domain authority, manual path, `income|payment`, positive integer VND, HCMC periods, immutable ledger, warning-only budget, bilingual accessible UI and JEV-off operation. Nguồn: `docs/PRD.md` §3–§4; `docs/DOMAIN-MODEL.md` §1–§5; `AGENTS.md`.

**[Proposal]** Do not enable JEV or LLM unless manual transaction/category/report/budget flow works with feature off; owner/session/CSRF/idempotency are server-enforced; no transaction waits on provider; facts are deterministic; errors preserve input and never render fake zero/fake success; `en|vi`, keyboard/screen-reader/focus/live/table-equivalent states work.

### Gate B — current typed JEV category suggestion

**[Verified fact]** Existing System One gate requires minimal redacted state, typed answer validation, active candidate/appliesTo checks, explicit Use/override/final Save, manual fallback and kill switch. Nguồn: `docs/AI-JEV.md` §3–§7; `CC-JEV-SYSTEM-ONE-REVIEW.md` Gate B.

### Gate C — generative LLM prose/extraction

**[Proposal]** Require all of:

- use-case owner, data classification, threat model and explicit trigger;
- provider/model/endpoint server allowlist; secret isolation; no tools/agent mode;
- current privacy/retention/logging/downstream evidence and user notice/consent decision;
- structured-output schema, strict validator, unknown-field/size/text policy and no prose parsing;
- deterministic fact source, provenance, `asOf`, period/timezone, stale invalidation and source links;
- no money arithmetic/authority/action; extraction always candidate + user review + normal domain revalidation;
- JEV/LLM-off deterministic fallback; no first-useful-content dependency; bounded timeout/retry/concurrency/token/cost policy;
- prompt-injection/PII/secret tests and output suppression tests; no raw prompt/completion logs;
- `en|vi`, a11y, focus/live/error/suppression states and chart/table equivalents;
- metrics by capability/locale including suppression, stale, schema failure, privacy block, manual completion, source validity and measured latency; no invented SLA;
- admin least privilege, masked observability, audit/kill-switch/incident runbook;
- Team Leader GO/NO-GO after evidence. Failure of LLM gate blocks LLM feature only, not core/JEV-off path.

### Gate D — fail-closed matrix

| Condition | Application result | Must not happen |
|---|---|---|
| malformed/wrong schema/unknown field | suppress/manual/static facts | parse partial/prose repair |
| unsupported option/field/category | manual/staging invalid | nearest-category guess or commit |
| low/ambiguous JEV signal | manual/review | auto-commit |
| stale source/late interaction | discard/suppress/refresh | render current |
| PII/secret/injection/privacy uncertainty | no outbound/manual | trust model safety alone |
| timeout/quota/4xx/5xx/flag off | preserve form/facts/manual | block Save or fake success |
| report/budget unavailable | error/retry/static/manual | model fabricate numbers |
| user edits while pending | user edit wins; discard late result | overwrite selection |
| output has numeric/financial/causal authority claim | suppress, show facts/static copy | present as verified |
| admin role/source invalid | 403/404/manual escalation | leak, triage, mutate |

## 13. Open prerequisites and evidence plan

**[Unresolved]** Before any implementation/enablement, owner must decide and record (without assuming this handoff is canonical):

1. Exact provider/model/transport, with `GPT 5.6 luna` treated as unverified probe input only.
2. Structured-output/schema/refusal/cancellation behavior and maximum payload/output.
3. Provider/workspace retention, logging, training/use policy, downstream routing, region and deletion evidence.
4. Data classes allowed per capability; consent/notice/opt-out and export/delete lifecycle.
5. Prompt/template/schema versioning and source snapshot/fact-ref model.
6. Stale TTL/invalidation, saved-artifact persistence, feedback schema and access roles.
7. Token/output/cost budget, concurrency, timeout, retry and kill-switch values; no invented numbers in this file.
8. Synthetic/anonymized evaluation slices for `en|vi`, adversarial injection/PII, stale/race, malformed output, numeric claims, accessibility and manual fallback.
9. Measured JEV-only/LLM-only/parallel/cascade/async/cache response evidence; no p50/p95/p99 promise before measurement.
10. Public API/JSON Schema/OpenAPI change review if any future capability becomes client-visible.

## 14. Handoff conclusion

**[Proposal]** Campus Coin may use a generative LLM beside JEV only as a bounded, server-only, non-authoritative advisory/staging layer. JEV remains typed decision; LLM is not its prose upgrade. The safe display rule is:

> **Facts first, source and freshness visible, generated text optional, user-controlled, app-localized and suppressible; money writes remain deterministic and explicit.**

The safe extraction rule is:

> **Schema-valid candidate → deterministic semantic validation → user review/override → normal domain command; never prose parsing and never model authority.**

If any gate is unproven, keep the LLM off and show deterministic report/chart/table/manual flow. This file changes no canonical/runtime behavior and does not claim provider, model, pricing, availability or performance.

### Evidence index

- Official: [System One](https://docs.typesafe.ai/concepts/system-one), [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [State](https://docs.typesafe.ai/concepts/state), [Confidence](https://docs.typesafe.ai/confidence), [OpenRouter System One](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md), [OpenRouter Data Collection](https://openrouter.ai/docs/guides/privacy/data-collection.md), [WCAG 2.2](https://www.w3.org/TR/2024/REC-WCAG22-20241212/).
- Local canonical: `AGENTS.md`; `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md`; `docs/PRD.md`; `docs/DOMAIN-MODEL.md`; `docs/ARCHITECTURE.md`; `docs/AI-JEV.md`; `docs/contracts/openapi.yaml`; `docs/contracts/API-REVIEW.md`; `docs/ADMIN-OPERATIONS.md`; `docs/AUTHENTICATION.md`; `docs/DELIVERY-PLAN.md`.
- Local baseline/corrections: `docs/working/jev-product-analysis/FINAL-FINDINGS.md` (read-only historical baseline); `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md`, `CC-JEV-SYSTEM-ONE-REVIEW.md`, `CC-JEV-SYSTEM-ONE-ARCH-OPS.md`, `CC-JEV-SYSTEM-ONE-USECASES.md`, `CC-JEV-SYSTEM-ONE-CAPABILITY.md` (read-only working corrections).
