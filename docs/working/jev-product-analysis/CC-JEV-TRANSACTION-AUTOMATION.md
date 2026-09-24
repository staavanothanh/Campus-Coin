# Handoff lane 2 — Transaction automation

> **Lane:** JEV-PROD-002 — Transaction automation
> **Phạm vi:** auto-category, học từ correction/override, CSV batch classification, duplicate detection và anomaly detection.
> **Trạng thái:** working evidence; đây là phân tích sản phẩm/use case, không phải quyết định canonical.
> **File scope:** chỉ ghi handoff này; không sửa SRS, ADR, architecture, domain, auth, OpenAPI hoặc source runtime.

## 1. Kết luận điều hành

- **[Verified fact]** Campus Coin là sổ theo dõi do sinh viên tự nhập, không phải ngân hàng; core money path chỉ có `income` và `payment`, amount là VND nguyên dương, ledger đã commit là immutable/append-only. Backend/domain mới là nguồn sự thật cho wallet, budget và report. [`docs/PRD.md` §1, L3-L7; `docs/DOMAIN-MODEL.md` §1, L3-L14; `docs/DOMAIN-MODEL.md` §4, L54-L67]
- **[Verified fact]** JEV MVP hiện chỉ được phép gợi ý một category từ candidate set giới hạn cho `income` hoặc `payment` trước submit; user phải xác nhận hoặc đổi. JEV không được tính amount/date/balance/budget, authorize payment, hoặc tạo/sửa/xóa ledger, savings hay budget. [`docs/AI-JEV.md` §3, L21-L31; `docs/PRD.md` §3.5, L45-L51; `docs/ARCHITECTURE.md` §5, L43-L47]
- **[Verified fact]** Manual picker phải luôn hoạt động; JEV off/unavailable/error không được làm hỏng money path. [`docs/AI-JEV.md` §5-7, L64-L89; `docs/adr/0006-optional-openrouter-jev.md` Quyết định/Hệ quả, L11-L26; `docs/contracts/README.md` §Boundary, L22-L31]
- **[Verified fact]** SRS có nhu cầu rộng hơn MVP: học từ chỉnh sửa, phân loại CSV hàng loạt, phát hiện giao dịch bất thường/trùng lặp. Nhưng canonical PRD/Delivery/Architecture hiện xếp CSV, prediction và complex AI ngoài critical MVP; không được tự mở rộng contract/domain để đáp ứng SRS rộng hơn. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L107-L119, L161-L166; `docs/PRD.md` §5, L65-L67; `docs/DELIVERY-PLAN.md` §9, L57-L60; `docs/ARCHITECTURE.md` §8, L67-L69]
- **[Proposal]** Thứ tự sản phẩm nên là: (1) ship manual-first + category suggestion advisory trong MVP; (2) thu nhận correction/override làm tín hiệu append-only, chưa tự cập nhật trong transaction; (3) phase sau bổ sung CSV preview/batch; (4) phase sau làm duplicate/anomaly bằng deterministic detection trước, JEV không làm detector. Lý do: chỉ (1) đã có boundary/endpoint; các use case còn lại cần persistence, read model, job/import contract hoặc quyết định sản phẩm mới.
- **[Unresolved]** Chưa có contract canonical cho feedback/learning, import job/CSV, duplicate signal, anomaly event, stale-version semantics hoặc async worker. Handoff này chỉ nêu prerequisite và disposition, không tự tạo schema/endpoint.

## 2. Ma trận quyết định use case

### 2.1 Thang xếp hạng

- `5` = rất cao; `1` = thấp.
- **Product value:** lợi ích nhìn thấy trong user journey và giảm ma sát nhập liệu.
- **Automation value:** phần việc thủ công được giảm một cách có thể kiểm chứng.
- **JEV fit:** mức phù hợp của JEV advisory, không phải mức phù hợp của deterministic code.
- **Risk:** 5 là rủi ro cao nhất (sai category, mất provenance, false positive hoặc làm hỏng money path).
- **Dependency:** 5 là cần nhiều prerequisite/chưa có contract.

| Use case | Placement | Product value | Automation value | JEV fit | Risk | Dependency | Deterministic/JEV boundary | Disposition |
|---|---|---:|---:|---:|---:|---:|---|---|
| Auto-category cho một transaction | Synchronous pre-submit | 5 | 4 | 5 | 3 | 3 | Deterministic validate candidate/type trước và sau; JEV chỉ xếp/gợi ý category | **Ship MVP** dạng optional, default-off, manual-first |
| Học từ correction/override | Async post-commit + offline update | 4 | 3 | 3 | 4 | 4 | Deterministic ghi nhận feedback/correction append-only; learning chỉ tạo tín hiệu cho gợi ý sau | **Phase sau**; MVP chỉ nên có evidence capture nếu được duyệt |
| Batch CSV classification | Offline/batch (preview trước commit) | 4 | 5 | 3 | 4 | 5 | Deterministic parse/validate/dedupe trước; JEV chỉ phân loại description từng row, không commit | **Phase sau**; không mở MVP CSV |
| Duplicate detection | Synchronous pre-submit warning; có thể re-check async post-commit | 4 | 4 | 1 | 2 | 4 | Deterministic fingerprint/rule/read model; **reject JEV làm detector** | **Phase sau** deterministic; không block valid payment |
| Anomaly detection | Async post-commit/read-time | 4 | 3 | 2 | 4 | 5 | Deterministic baseline/rule trước; JEV detector/authority bị reject | **Phase sau** deterministic; JEV chỉ có thể xem xét giải thích sau quyết định riêng |

### 2.2 Quyết định ngắn gọn

1. **Ship MVP — auto-category:** đây là use case JEV canonical duy nhất. Request phải tách khỏi money transaction; category suggestion không được tự chọn ngầm hoặc tự submit. [`docs/contracts/openapi.yaml` `/ai/category-suggestion`, L338-L348; `docs/contracts/openapi.yaml` `CategorySuggestionRequest/Response`, L662-L677]
2. **Phase sau — learning:** correction/override là dữ liệu chất lượng hữu ích, nhưng không được hiểu là lệnh mutate ledger hoặc quyền tự huấn luyện/đổi category cũ. Cần append-only feedback/provenance và policy về phạm vi học trước khi bật adaptation.
3. **Phase sau — CSV:** SRS có nêu upload CSV và batch suggestion, nhưng CSV đã bị canonical scope cut cho MVP. Khi làm phải có preview, row-level abstention và explicit batch confirmation; không dùng JEV để suy luận tiền/ngày/type.
4. **Phase sau — duplicate:** có product value, nhưng đây là bài toán matching/rule và idempotency; JEV không tạo thêm độ tin cậy cần thiết. Không tự động xóa, merge, reverse hoặc chặn payment chỉ vì similarity.
5. **Phase sau — anomaly:** chỉ nên đánh dấu sau commit bằng feature deterministic từ dữ liệu của chính user. Không gọi là fraud, không freeze wallet, không reject payment, không để JEV tính số hoặc thay report authoritative.

## 3. Boundary chung cho mọi transaction automation

### 3.1 Luồng chuẩn và điểm đặt deterministic/JEV

```text
User nhập type + description + amount + occurredAt
  -> deterministic request/session/CSRF/length/type/category validation
  -> (nếu category suggestion) JEV advisory ngoài money transaction
  -> deterministic candidate membership + status + appliesTo + abstention check
  -> user xem provenance, accept/override/manual picker
  -> normal transaction domain validates amount/date/wallet/idempotency
  -> commit immutable income/payment + audit
  -> deterministic budget/report/projection sau commit
  -> (nếu cần) async feedback/duplicate/anomaly read model
```

- **[Verified fact]** API transaction yêu cầu `type`, `amountVnd`, `categoryId`, `occurredAt`; `description` tối đa 500 ký tự; `confirmedCategorySuggestion` chỉ là boolean acknowledgement, không thay thế domain validation. [`docs/contracts/openapi.yaml` `CreateTransactionRequest`, L440-L449]
- **[Verified fact]** Domain phải kiểm tra session/CSRF/origin, amount, category, occurred time và idempotency; payment lock wallet rồi mới insert; budget warning tính sau commit. [`docs/DOMAIN-MODEL.md` §5, L69-L81; `docs/contracts/API-REVIEW.md` §Response và pagination, L32-L44]
- **[Verified fact]** Không giữ money transaction mở trong lúc gọi JEV; outbound adapter không nằm trong domain và JEV lỗi không được chặn money path. [`AGENTS.md` Backend/API, L99-L107; `AGENTS.md` JEV/OpenRouter, L133-L141; `docs/ARCHITECTURE.md` §4-6, L35-L56]
- **[Proposal]** Mọi đề xuất nên hiển thị `source`, thời điểm/snapshot dùng để sinh đề xuất, và trạng thái `suggested|manual|unavailable` theo ngôn ngữ hiện tại. Provenance là để user kiểm tra, không phải bằng chứng rằng JEV đúng.
- **[Proposal]** JEV chỉ được gọi sau một hành động rõ ràng của user (ví dụ nút “Gợi ý danh mục”), không gọi trên mỗi keystroke. User có thể bỏ qua hoàn toàn JEV và chọn manual.
- **[Unresolved]** `confirmedCategorySuggestion` chưa có evidence cho thấy acknowledgement được bind với chính suggestion/category snapshot nào. Cần API/domain review trước khi coi boolean là đủ cho audit; boolean này không bao giờ là authorization.

### 3.2 Dữ liệu tối thiểu và provenance

| Use case | Input tối thiểu cần thiết | Không nên gửi/đọc | Provenance tối thiểu cần giữ hoặc hiển thị |
|---|---|---|---|
| Auto-category | `transactionType`, description đã redact, locale, active candidate IDs/labels | amount, date, balance, savings, raw ledger, session, Google claims, secret, PII thừa | category candidate snapshot, contract/version, request time, status/reason, user accept/override; UI chỉ cần nhãn localized + “review before saving” |
| Learning | suggestion event ID, category trước/sau, event `accepted|overridden|dismissed`, target correction reference nếu có, candidate/rule snapshot, actor scope | raw ledger, secret, session, full description nếu không cần, cross-user data chưa có policy | append-only feedback event, source event, previous/final category, reason, version, createdAt; không sửa event cũ |
| CSV | bounded file/job ID, row ID, mapped type/amount/date/description, candidate snapshot, parse errors | file thô/PII quá hạn retention, instruction trong cell, balance hoặc inferred amount/date | upload/job version, row provenance, parser/schema version, suggestion/manual/abstain, reviewer decision, import idempotency key |
| Duplicate | owner-scoped current candidate fields, normalized description, amount/type/category/date, idempotency key/body fingerprint, bounded existing-record features | cross-owner records, raw provider data, full unrelated ledger | deterministic rule/fingerprint version, compared-at, matched own record IDs, confidence band/label, user action |
| Anomaly | committed transaction features, category/type/date, derived per-user historical aggregates, HCMC period, baseline version | raw claims/session, cross-user benchmark chưa được duyệt, JEV arithmetic | rule/baseline version, observation period, generatedAt, data freshness, reason codes, dismiss/expected feedback |

- **[Verified fact]** AI-JEV boundary đã cấm raw ledger, balance, savings, Google claims, session, secret và PII không cần thiết; request nội bộ chỉ gồm type, redacted description, candidates, locale và contract version. [`docs/AI-JEV.md` §3-4, L21-L45; §6, L74-L78]
- **[Verified fact]** Category response có `appliesTo`, `status=active|disabled|retired`, tên `en`/`vi`; category disabled/retired không nhận row mới nhưng history vẫn đọc được. [`docs/contracts/openapi.yaml` `Category`, L533-L544; `docs/DOMAIN-MODEL.md` §2, L34-L36; §4, L63-L67]
- **[Proposal]** Không lưu raw CSV, raw description hay raw JEV prompt/response làm “training log” mặc định. Nếu product muốn giữ bản gốc để reprocess, phải có retention/consent/owner-scope decision riêng; hiện chưa có.
- **[Unresolved]** Chưa có ID/provenance schema cho suggestion, feedback, import row, duplicate match hoặc anomaly event; không được giả định các field trên đã tồn tại trong API.

### 3.3 Stale data và race policy

- **[Proposal]** Suggestion gắn với `transactionType`, normalized description, locale và candidate snapshot. Nếu user đổi type/description/locale, response cũ bị discard; không cho response đến muộn overwrite lựa chọn mới.
- **[Proposal]** Khi user submit, server revalidate active category, `appliesTo`, owner, amount/date, idempotency và wallet theo normal domain. Category bị disable sau lúc suggestion trả về phải rơi về manual/validation error, không tự map sang category gần nhất.
- **[Proposal]** CSV phải revalidate toàn bộ rows và candidate snapshot tại thời điểm confirm; preview cũ không đủ để commit.
- **[Proposal]** Duplicate warning ghi thời điểm và freshness. Nếu read model stale/unavailable, chỉ nói “chưa thể xác minh trùng lặp”, không tuyên bố unique/duplicate; vẫn không bypass invariant/idempotency.
- **[Proposal]** Anomaly result hiển thị “as of”/kỳ dữ liệu và version baseline. Worker chạy trễ hoặc history chưa đủ thì abstain hoặc đánh dấu stale; không phát cảnh báo như hiện tại nếu dùng snapshot cũ.
- **[Verified fact]** Retry cùng idempotency key/body không được tạo duplicate; body khác trả conflict. Đây là deterministic domain guarantee, không phải nhiệm vụ của JEV. [`docs/DOMAIN-MODEL.md` §4, L54-L67; `docs/contracts/README.md` §Boundary, L22-L31; `docs/contracts/API-REVIEW.md` §Domain scope, L39-L44]
- **[Unresolved]** Khoảng thời gian freshness, snapshot/version format, queue retry semantics và cách hiển thị stale chưa được canonical hóa.

### 3.4 Untrusted description, prompt injection và ambiguity

- **[Verified fact]** Description là text do user nhập và bị giới hạn 500 ký tự ở public request; mọi output JEV phải validate schema, candidate membership, range và fallback manual nếu malformed/low-confidence. [`docs/contracts/openapi.yaml` `CategorySuggestionRequest/Response`, L662-L677; `docs/AI-JEV.md` §4-5, L33-L72]
- **[Proposal]** Treat description/CSV cell as **data, not instructions**. Text như “ignore rules”, “approve payment”, yêu cầu lộ prompt/provider hoặc yêu cầu tính amount/date/balance phải bị coi là injection/unsupported intent; không thực thi, không echo raw, và abstain về manual.
- **[Proposal]** Redaction/validation chạy trước outbound: giới hạn kích thước, loại input không hợp lệ, mask PII/secret-shaped strings, không đưa raw error/provider payload vào UI/log. Nếu không chứng minh được privacy, bỏ JEV và giữ manual.
- **[Verified fact]** Bộ evaluation canonical phải bao gồm ambiguous, PII-like, prompt injection, disabled/retired, correction/unsupported và failure simulation; các nhóm này cần manual/abstain chứ không ép gợi ý. [`docs/AI-JEV.md` §6, L74-L78; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §7.2, L246-L269]
- **[Proposal]** Abstain là output đúng, không phải lỗi: ambiguous/out-of-set/disabled/retired/injection/PII-like/correction/amount/date/balance request đều đi manual hoặc deterministic flow tương ứng.

## 4. Use-case cards

## 4.1 UC-TA-01 — Auto-category trước khi submit

**Phân loại:** `synchronous pre-submit`; JEV request tách khỏi money transaction; final commit qua normal `POST /ledger/transactions` sau explicit review.

**Trigger**

- **[Verified fact]** User đang tạo `income` hoặc `payment`, có description và cần gợi ý category trước submit; SRS nêu ví dụ description `Campus Cafe` → category Food và cho phép override. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L107-L119]
- **[Proposal]** Chỉ gọi khi user bấm action rõ ràng “Gợi ý danh mục”; không gọi mỗi lần gõ hoặc tự bật trong form.

**Input**

- **[Verified fact]** `transactionType: income|payment`, `description` 1–500 ký tự và `locale: en|vi`; candidate list lấy từ active category đúng `appliesTo`. [`docs/contracts/openapi.yaml` `CategorySuggestionRequest`, L662-L668; `docs/contracts/openapi.yaml` `Category`, L533-L544]
- **[Proposal]** Server redact description trước outbound và gắn candidate snapshot. Không đưa `amountVnd`, `occurredAt`, wallet, savings, budget, raw ledger, session, claim hoặc secret vào JEV; amount/date chỉ phục vụ normal transaction validation sau đó.

**Processing**

1. **Deterministic trước:** auth/session, CSRF/origin, input length, enum, locale, rate/timeout bound, redaction; load active candidates và kiểm tra `appliesTo`.
2. **Advisory JEV:** trả typed suggestion hoặc abstain; JEV không tính toán, không chọn amount/date, không authorize.
3. **Deterministic sau:** validate response schema, category membership, active status, type match, confidence/abstention policy và stale request identity. Category không hợp lệ hoặc low-confidence → manual.
4. **User quyết định:** accept suggestion hoặc chọn category khác. Sau đó normal domain validate amount dương VND, occurred time HCMC semantics, idempotency, wallet/payment và commit immutable row. JEV không chạy trong transaction.

**Output**

- **[Verified fact]** Endpoint trả status `suggested|manual|disabled|unavailable`, `categoryId` nullable, confidence nullable/0..1 và reason code; response là suggestion hoặc fallback, không phải transaction. [`docs/contracts/openapi.yaml` `/ai/category-suggestion`, L338-L348; `CategorySuggestion`, L669-L677]
- **[Proposal]** UI hiển thị category label từ authoritative category list, source “Gợi ý — hãy kiểm tra trước khi lưu”, trạng thái/reason localized và candidate snapshot/time nếu cần audit. Không hiển thị provider/model/cost hoặc diễn giải numeric confidence như certainty.

**User control**

- User luôn có manual picker trước, trong và sau request; có thể `Use this category`, override, dismiss hoặc không gọi JEV.
- Save chỉ xảy ra sau review rõ ràng của user; override thắng suggestion, response đến muộn không overwrite selection.
- `confirmedCategorySuggestion=true` chỉ có thể là acknowledgement sau explicit accept theo semantics được duyệt; server vẫn revalidate mọi invariant. [`docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §2-4, L16-L28, L42-L57]

**Persistence**

- **[Verified fact]** Suggestion không ghi ledger; chỉ normal create transaction mới tạo immutable `income|payment` sau user confirmation. [`docs/DOMAIN-MODEL.md` §2, L22-L32; §5, L75-L85]
- **[Proposal]** Nếu cần đo chất lượng, lưu masked metadata/feedback append-only (suggestion status, candidate snapshot, accept/override/dismiss, reason, timestamp), không lưu raw prompt/response và không mutate transaction.
- **[Unresolved]** Public contract chưa định nghĩa suggestion ID, feedback event hoặc persistence metadata; không coi việc lưu này đã được phép triển khai.

**Fallback**

- **[Verified fact]** Flag off, timeout, quota/rate, 4xx/5xx, schema/privacy failure, low-confidence hoặc category mismatch đều về manual/disabled/unavailable; giữ nguyên form, không mất description/amount/date. [`docs/AI-JEV.md` §5-7, L64-L89; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §4, L170-L187]
- Category API/manual picker lỗi là core form error cần retry rõ ràng; không giả category rỗng, zero hoặc “gần đúng”.

**Success metric**

- **[Proposal] Hard safety:** 100% `suggested` phải là active candidate đúng `appliesTo`; 100% commit có explicit user selection/review; 0 auto-submit/auto-commit; JEV-off money path thành công như baseline.
- **[Proposal] Product:** đo eligible accuracy, correct abstention, override rate, fallback completeness và locale/type slices riêng (`en|vi` × `income|payment`), không tối ưu coverage bằng cách ép đoán. Các metric/gate cần baseline và Team Leader phê duyệt. [`docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §8, L281-L302]

**Cấm đoán**

- Không tự chọn category hoặc submit/commit transaction; không coi confidence là sự thật.
- Không gửi/đọc amount, date, balance, savings, raw ledger, session, claims, secret hoặc PII thừa.
- Không để JEV tính wallet/budget/report, authorize payment, tạo correction hoặc sửa/xóa ledger.
- Không gọi provider từ browser, không parse prose/chat thay typed contract, không để lỗi JEV chặn manual/money path. [`docs/AI-JEV.md` §3-5, L21-L72; `AGENTS.md` JEV/OpenRouter, L133-L141]

**Insertion point:** form Add income/payment ngay trước category review; endpoint hiện có `/api/v1/ai/category-suggestion`; commit vẫn là `/api/v1/ledger/transactions`. [`docs/contracts/openapi.yaml` L102-L128, L338-L348]

**Rank/disposition:** Product value **5/5**, automation **4/5**, JEV fit **5/5**, risk **3/5**, dependency **3/5** → **Ship MVP optional/default-off**, với manual-first và all gates đã được assignment coi là prerequisite; không biến thành authority.

## 4.2 UC-TA-02 — Học từ correction/override mà không mutate ledger

**Phân loại:** override signal có thể capture ở pre-submit; aggregation/model/rule update là `async post-commit + offline`; tuyệt đối không học hoặc mutate bên trong money transaction.

**Trigger**

- User chọn category khác với suggestion trước submit (`override`), dismisses suggestion, hoặc sau commit chủ động báo/correct category.
- **[Verified fact]** SRS yêu cầu học từ chỉnh sửa theo thời gian; canonical domain yêu cầu correction tạo row mới có reason/actor/reference và không update/delete row cũ. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L113-L119; `docs/DOMAIN-MODEL.md` §5, L83-L85; `docs/adr/0005-immutable-money-domain.md` Quyết định, L11-L15]

**Input**

- Suggestion event (nếu có), category suggested, category cuối cùng user chọn, event type `accepted|overridden|dismissed`, locale/type, candidate snapshot và timestamp.
- Nếu là correction sau commit: target transaction ID, correction reason và chỉ command/role đã được contract/product duyệt; không coi correction request là training prompt.
- **[Unresolved]** API review ghi public correction nên ưu tiên reversal; `adjustment|replacement` là internal cho đến khi có product/UI approval, trong khi OpenAPI hiện liệt kê cả ba role. Learning không được phụ thuộc vào role chưa được chốt. [`docs/contracts/API-REVIEW.md` §Ledger correction, L23-L30; `docs/contracts/openapi.yaml` `CreateCorrectionRequest`, L138-L152, L450-L458]

**Processing**

1. **Deterministic trước:** xác định user/owner, target event, category trước/sau, valid event type, active/category lifecycle và provenance; ghi feedback event append-only nếu có storage được duyệt.
2. **Correction domain riêng:** nếu user correction hợp lệ, normal correction command tạo row mới/audit theo policy; không update/delete original. Correction chỉ là financial correction, không phải quyền JEV.
3. **Offline learning:** aggregate tín hiệu theo user/scope/candidate snapshot sau commit; xem xét quality/consent/threshold; chỉ thay đổi ranking/gợi ý tương lai, không rewrite history.
4. **JEV (nếu phase sau được duyệt):** chỉ nhận description đã redact + candidate set để tạo suggestion mới; không nhận “correction instruction” như lệnh và không được tự áp dụng category.

**Output**

- **[Proposal]** User thấy xác nhận feedback/correction đã được ghi nhận và future suggestions có thể abstain hoặc thay đổi; không hứa “hệ thống đã học ngay”.
- Hệ thống có quality signal cho suggestion: acceptance/override/abstention theo locale/type/category snapshot; output được gắn provenance và có thể audit.
- Correction financial output (nếu có) là transaction row append-only theo normal domain; learning output chỉ là recommendation metadata, không phải money state.

**User control**

- User chủ động accept/override/dismiss; correction cần reason/review theo UI/contract hiện hành.
- **[Proposal]** Cho user biết khi feedback được dùng để cải thiện gợi ý; cho phép không tham gia learning nếu product/privacy policy yêu cầu. Không silently infer preference từ một lần nhập.
- User có quyền xem lại source/provenance và gửi issue nếu suggestion hoặc correction sai; admin không sửa ledger thay user. [`docs/ADMIN-OPERATIONS.md` §4-6, L34-L51]

**Persistence**

- **[Verified fact]** Original ledger giữ nguyên; correction là row mới với reason/actor/reference/audit. [`docs/DOMAIN-MODEL.md` §2, L26-L29; §3, L52; §5, L83-L85]
- **[Proposal]** Feedback event riêng là append-only, owner-scoped, gồm suggestion/category before-after, disposition, snapshot/version, timestamp và source reference; không nhúng raw prompt/response, raw ledger hoặc secret.
- **[Unresolved]** Chưa có bảng/event/API cho feedback, consent, retention, export/delete semantics hoặc model/rule version; cần technical/product decision trước implementation.

**Fallback**

- Không có feedback store, event malformed, stale candidate hoặc correction policy chưa rõ → không update learning; giữ suggestion/manual behavior hiện tại.
- Learning job lỗi → không replay/rollback bằng cách mutate ledger; queue/retry chỉ cho feedback artifact đã idempotent nếu sau này được thiết kế.
- User vẫn dùng manual picker/correction flow; JEV unavailable không làm mất correction capability.

**Success metric**

- **[Proposal] Safety:** 100% correction giữ original immutable; 100% accepted/overridden signal truy được provenance; 0 feedback event có raw secret/PII/JEV payload; 0 automatic historical recategorization.
- **[Proposal] Product:** override rate giảm trên holdout tương đồng mà không tăng unsafe suggestion/false acceptance; correct abstention không giảm; báo cáo tách locale/type và category snapshot. Chưa đặt threshold canonical.

**Cấm đoán**

- Không biến correction/override thành SQL update/delete, silent recategorization, reversal chain hoặc auto-correction.
- Không coi một correction là ground truth tuyệt đối để tự thay đổi toàn bộ lịch sử hoặc cross-user model.
- Không gọi JEV trong money transaction; không gửi raw ledger/balance/amount/date/claims/secret.
- Không dùng learning để bypass user confirmation, active category validation, owner scope, idempotency hoặc payment authorization.

**Insertion point:** post-submit feedback/correction history và offline quality pipeline; không chèn learning call vào `POST /ledger/transactions` hoặc correction transaction.

**Rank/disposition:** Product value **4/5**, automation **3/5**, JEV fit **3/5**, risk **4/5**, dependency **4/5** → **Phase sau**. Có thể ship instrumentation/evidence-only trong MVP **chỉ khi** có persistence/consent contract được duyệt; learned adaptation và auto-ranking không nằm trong core launch.

## 4.3 UC-TA-03 — Batch CSV classification

**Phân loại:** `offline/batch`; có thể chạy async job sau upload nhưng phải dừng ở preview/review trước bất kỳ financial commit nào.

**Trigger**

- User onboarding hoặc history muốn upload CSV để nhập nhiều giao dịch; SRS mô tả bulk historical CSV và batch AI category suggestion. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71; §1.6, L77-L84, L113-L119]
- **Verified scope conflict:** canonical PRD/Delivery/Architecture hiện liệt kê CSV ngoài MVP/scope cut; card này là phase design, không phải yêu cầu mở MVP. [`docs/PRD.md` §5, L65-L67; `docs/DELIVERY-PLAN.md` §9, L57-L60; `docs/ARCHITECTURE.md` §8, L67-L69]

**Input**

- File upload bounded (size, row count, encoding), header/column mapping, row ID, `income|payment`, amount, occurred date/time, description, optional category, locale và user-owned import job.
- **Deterministic required fields:** parseable type/date, positive integer VND, category applicability, date semantics `Asia/Ho_Chi_Minh`, required description rules, idempotency/import identity.
- **Untrusted input:** CSV cells có thể chứa prompt injection, formulas, PII, secret-shaped text hoặc malformed Unicode; không coi cell là instruction.

**Processing**

1. **Deterministic trước:** virus/file policy, size/row bounds, encoding/header parser, schema mapping, amount/type/date validation, active candidate snapshot, owner scope và exact duplicate/idempotency checks. Gắn row-level error; không silent drop.
2. **Batch advisory:** với row đủ điều kiện, JEV chỉ nhận description đã redact, type, locale và candidate set; chạy bounded offline/async; mỗi row có `suggested|manual|abstain|invalid|duplicate`.
3. **Deterministic sau:** validate candidate membership/appliesTo/status, stale candidate/version, schema và ambiguity; row malformed/ambiguous/injection/out-of-set phải abstain/manual.
4. **Commit:** user review/edit/override từng row hoặc nhóm rows; explicit confirm; import service gọi normal domain validation/idempotency cho từng row/atomic group theo contract tương lai. Không giữ money transaction trong lúc JEV chạy.

**Output**

- Preview row-level: parsed values, proposed category, source/provenance, validation state, duplicate/anomaly warning nếu có, error/fallback reason và rows cần manual.
- Import summary: accepted-for-review, manual, invalid, duplicate, abstained; không hiển thị “imported” khi chưa commit.
- **[Unresolved]** Chưa có canonical import response/job schema, partial-commit policy, retry contract hoặc API endpoint; không dùng `/ledger/transactions` hiện tại để suy diễn batch semantics.

**User control**

- User map columns, sửa type/description/category/date/amount trong giới hạn form, override từng row, bỏ rows, retry parse và explicit confirm batch.
- **[Proposal]** Cho phép partial accept chỉ những rows đã review; rows unresolved không tự commit. Cancel/delete preview job không xóa ledger đã tồn tại.
- User được xem provenance cho từng suggestion; JEV không được silently fill required money fields.

**Persistence**

- **[Proposal]** Persist import job metadata, schema/parser version, row result, candidate snapshot, reviewer decision, idempotency key và provenance; raw file retention/PII policy phải được quyết định trước.
- Accepted rows đi qua normal immutable ledger/audit; rejected/manual rows không tạo financial row.
- Không lưu raw JEV prompt/response hoặc file thô vô thời hạn.

**Fallback**

- JEV off/unavailable/timeout/schema/privacy/low-confidence → preview vẫn hoạt động, rows đi manual picker.
- Parse/file/schema error → row-level actionable error; file quá lớn/không an toàn → reject trước processing; không giả amount/date/category.
- Import job/worker lỗi → giữ preview/retry idempotent hoặc hủy trước commit; không partial commit mơ hồ, không tạo duplicate khi retry.

**Success metric**

- **[Proposal] Hard safety:** 100% committed rows đã explicit reviewed/confirmed; 100% row có provenance/status; 0 amount/date/type do JEV tự suy luận làm authority; 0 silent row loss; retry không duplicate.
- **[Proposal] Product:** thời gian onboarding/history giảm; eligible category precision và abstention theo row; manual correction rate giảm nhưng không làm tăng invalid import, duplicate commit hoặc false confidence. Threshold chưa canonical.

**Cấm đoán**

- Không coi CSV upload là ngân hàng sync hoặc xác minh giao dịch thật.
- Không auto-commit toàn bộ file, không bypass amount/type/date/category/owner/idempotency/wallet rules, không dùng JEV để tính amount/date/balance.
- Không để prompt injection trong cell điều khiển hệ thống; không gửi raw file/PII/secret không cần thiết.
- Không overwrite/delete existing ledger để “làm sạch” import; correction/reversal vẫn append-only.

**Insertion point:** future Import/History screen → parse/preview → row review → normal ledger write. Không sửa MVP contract hiện tại; cần capability/contract review trước.

**Rank/disposition:** Product value **4/5**, automation **5/5**, JEV fit **3/5**, risk **4/5**, dependency **5/5** → **Phase sau**. Reject việc mở CSV/JEV batch vào MVP chỉ vì SRS có mô tả; first ship deterministic parser + preview + manual classification, sau đó mới cân nhắc JEV row suggestion.

## 4.4 UC-TA-04 — Duplicate detection

**Phân loại:** `synchronous pre-submit warning` bằng deterministic matching; có thể có `async post-commit` re-check/read model để bắt duplicate lịch sử. Không phải JEV use case.

**Trigger**

- User nhập hoặc chuẩn bị submit transaction có khả năng trùng một row gần đây; SRS nêu “phát hiện và đánh dấu các giao dịch bất thường lớn hoặc trùng lặp”. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L161-L166]
- Network retry cùng idempotency key/body là trường hợp khác: deterministic idempotency phải trả kết quả cũ, không tạo duplicate. [`docs/DOMAIN-MODEL.md` §4, L60-L64; `docs/contracts/README.md` §Boundary, L27-L31]

**Input**

- Owner-scoped candidate sau validation: `income|payment`, positive `amountVnd`, `categoryId`, `occurredAt`, normalized description và idempotency key/body fingerprint.
- Existing own transactions trong bounded time/category/amount window, chỉ các fields cần để compare; không cross-owner search hoặc raw unrelated ledger.
- **[Proposal]** Matching rules deterministic có version: exact idempotency; exact/near-exact amount + local date/time + type/category + normalized description; fuzzy similarity chỉ là warning band, không là proof.

**Processing**

1. **Deterministic trước:** kiểm tra idempotency trước domain existence; load owner-scoped bounded candidates; compute fingerprint/rule score và freshness.
2. **User-visible warning:** nếu match high-signal, hiển thị matched transaction reference/date/category/amount và lý do; nếu ambiguous thì cảnh báo nhẹ hoặc abstain.
3. **Deterministic commit:** normal domain rechecks idempotency/owner/category/wallet at commit to handle race; wallet-sufficient payment không bị reject chỉ vì duplicate warning.
4. **Async after:** post-commit scanner có thể phát hiện duplicate do concurrent/stale precheck và tạo review signal; không tự reverse/delete.
5. **JEV:** không gọi; description semantic similarity của JEV không thay matching/idempotency và dễ tạo false positive.

**Output**

- `no signal`, `possible duplicate`, hoặc `same retry/idempotent replay`; kèm matched own record reference, deterministic rule/version, compared-at/freshness.
- Warning là advisory; không biến thành authoritative ledger decision. Exact same idempotency retry có semantics API riêng, không tạo row mới.

**User control**

- User xem matched record, dismiss/mark expected, quay lại sửa, hoặc proceed explicit nếu domain validation vẫn pass.
- **[Proposal]** Nếu user proceed sau warning, lưu review outcome append-only để đo precision; không yêu cầu user sửa dữ liệu chỉ vì heuristic.
- User có thể mở correction flow nếu row đã commit sai; correction không phải delete/merge.

**Persistence**

- Existing transactions giữ immutable; idempotency records giữ semantics retry/conflict.
- **[Proposal]** Duplicate signal/outcome là read-model/event append-only gồm own references, rule version, freshness, disposition và timestamp; không ghi “duplicate=true” vào transaction để biến nó thành authority.
- **[Unresolved]** Chưa có duplicate index/read model, retention, similarity thresholds hay API response/feedback contract.

**Fallback**

- Candidate history stale/unavailable hoặc compare timeout → nói “chưa thể xác minh trùng lặp”, không claim unique/duplicate; cho normal manual review và domain path tiếp tục nếu mọi invariant pass.
- Matching ambiguity → abstain, không block payment; exact idempotency conflict vẫn theo domain/API semantics.
- Không dùng JEV để bù dữ liệu thiếu; không retry vô hạn.

**Success metric**

- **[Proposal] Safety:** 0 duplicate do cùng idempotency key/body; 0 valid wallet-sufficient payment bị block chỉ vì warning; 0 auto-delete/merge/reversal; 100% high-signal warning có matched own reference/provenance.
- **[Proposal] Product:** precision của high-signal duplicate warning, user-confirmed duplicate rate, false-positive dismiss rate, post-commit catch rate và stale-data rate. Recall không được tối ưu bằng cách làm phiền hoặc chặn mọi payment.

**Cấm đoán**

- Không dùng JEV để quyết định duplicate; không cross-owner hoặc cross-user matching.
- Không tự động xóa, merge, reverse, refund, block payment, đổi category hoặc sửa ledger.
- Không coi description giống nhau là duplicate chắc chắn; không bỏ qua idempotency/race-safe domain checks.
- Không đọc balance/savings để suy diễn “duplicate”; không làm thay deterministic report.

**Insertion point:** transaction form submit preflight/read model và history review; optional post-commit scanner sau commit. Không chèn vào JEV category endpoint hoặc wallet authorization.

**Rank/disposition:** Product value **4/5**, automation **4/5**, JEV fit **1/5**, risk **2/5**, dependency **4/5** → **Phase sau deterministic**. **Reject JEV detector**; nếu cần MVP safety, chỉ giữ idempotency/domain guarantee canonical, không thêm heuristic UI khi chưa có evidence.

## 4.5 UC-TA-05 — Anomaly detection

**Phân loại:** `async post-commit/read-time`; deterministic first từ dữ liệu owner-scoped và baseline HCMC; JEV không là detector hoặc authority.

**Trigger**

- Sau commit có transaction amount/category/frequency khác đáng kể baseline riêng của user; hoặc user mở history/dashboard cần xem cờ bất thường.
- **[Verified fact]** SRS cho phép optional system intelligence phát hiện/gắn cờ giao dịch bất thường lớn; canonical dashboard/report vẫn deterministic. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L101-L105, L161-L166; `docs/PRD.md` §3.3, L33-L37]

**Input**

- Committed transaction features: type, amount VND, category, occurred time/date theo HCMC, frequency/period; derived aggregates từ lịch sử của chính user.
- Baseline version, minimum history/data sufficiency, current report period và freshness timestamp.
- **[Proposal]** Không gửi raw ledger/balance/savings/claims/session cho JEV; deterministic service có thể tính feature nội bộ nhưng không trao output cho money authorization.

**Processing**

1. **Deterministic trước:** kiểm tra data sufficiency, rebuild/reconcile state, HCMC period, baseline/rule version, bounds và owner scope; tính feature/flag bằng rule/statistical method được duyệt.
2. **Post-commit only:** tạo read-only anomaly signal sau transaction commit; không nằm trong payment lock/transaction và không chặn write path.
3. **User explanation:** hiển thị reason code đơn giản (“cao hơn mức thường của bạn”, “nhiều giao dịch gần nhau”) với period/baseline/freshness; không gọi là fraud hay financial advice.
4. **JEV:** canonical JEV use case không bao gồm anomaly; không dùng JEV để tính arithmetic, baseline, threshold, anomaly score hoặc trigger action. Narrative explanation chỉ có thể xem xét sau một product/contract decision riêng.

**Output**

- `no signal`, `possible anomaly`, hoặc `insufficient/stale data`; output read-only có provenance rule/baseline/period/generatedAt.
- User có thể xem transaction, mark expected/dismiss, hoặc mở correction/issue nếu dữ liệu nhập sai; output không đổi wallet/report authoritative.

**User control**

- User dismisses/marks expected, xem lý do và source period, gửi feedback/issue, hoặc dùng correction flow append-only nếu row sai.
- **[Proposal]** Không dùng notification cưỡng bức cho mọi cờ; cho phép preference/dismiss với audit tối thiểu nếu product phê duyệt.
- Admin chỉ triage issue/incident theo scope; không dùng anomaly flag để sửa ledger hoặc truy cập toàn bộ tài chính user. [`docs/ADMIN-OPERATIONS.md` §1-2, L3-L15; §4, L34-L40]

**Persistence**

- **[Proposal]** Persist anomaly event/read-model append-only: owner scope, target transaction reference, reason code, derived feature/baseline version, freshness, user disposition và generatedAt.
- Transaction/audit/report authoritative không bị mutate; anomaly event có thể rebuild/reconcile từ immutable rows.
- **[Unresolved]** Chưa có anomaly schema, baseline minimum history, threshold, job/queue, stale retention hoặc UI surface canonical.

**Fallback**

- History chưa đủ, projection mismatch, worker failure hoặc stale snapshot → `insufficient/stale data`/không gắn cờ; không đoán.
- JEV off/unavailable không ảnh hưởng transaction, dashboard authoritative hoặc manual correction.
- Nếu cờ sai, user dismiss/issue/correction; không auto-reverse, không block wallet/payment.

**Success metric**

- **[Proposal] Safety:** 0 payment bị reject/freeze do anomaly; 0 auto-reversal/financial action; 100% flag có rule/baseline/period/freshness provenance; report/dashboard số tiền vẫn deterministic.
- **[Proposal] Product:** precision cờ được user xác nhận là đáng xem, dismiss/false-positive rate, time-to-review, coverage khi đủ history và stale/insufficient rate. Chưa đặt threshold hay claim phát hiện gian lận.

**Cấm đoán**

- Không gọi anomaly là fraud, theft, financial advice hoặc certainty; không dùng cross-user benchmark khi chưa có policy.
- Không để JEV tính amount/date/balance/budget/anomaly score, authorize, freeze wallet, reject payment, auto-correct hoặc notify hành động tài chính.
- Không mutate/delete ledger, không thay deterministic report/budget, không coi stale baseline là hiện tại.
- Không gửi raw ledger, claims, session, secrets hoặc PII thừa ra ngoài boundary.

**Insertion point:** worker/read model sau successful ledger commit; dashboard/history anomaly card có provenance. Không gọi trong `POST /ledger/transactions` money transaction và không thay `/reports/monthly` authoritative.

**Rank/disposition:** Product value **4/5**, automation **3/5**, JEV fit **2/5**, risk **4/5**, dependency **5/5** → **Phase sau deterministic**. **Reject JEV detector/authority** trong scope hiện tại; narrative explanation chỉ là unresolved future product decision.

## 5. Feedback, correction và provenance policy

### 5.1 Không biến correction thành mutation

- **[Verified fact]** Ledger/audit sau commit không update/delete; correction phải là row mới có role/reason/actor/reference/audit. [`docs/DOMAIN-MODEL.md` §3, L52-L52; §4, L54-L67; `docs/adr/0005-immutable-money-domain.md` §Quyết định, L11-L15]
- **[Proposal]** Phân biệt rõ ba tín hiệu:
  1. **Override trước submit:** user chọn category khác; không tạo correction row, chỉ là final selection/optional feedback.
  2. **Correction sau commit:** user dùng correction flow được duyệt; tạo append-only row theo domain, không sửa original.
  3. **Learning feedback:** append-only quality event tham chiếu suggestion/selection/correction; không có money effect.
- **[Unresolved]** Public correction semantics còn cần product/API review, nhất là reversal vs adjustment/replacement; lane này không quyết định lại API.

### 5.2 Provenance bắt buộc theo output

| Output | Provenance user cần thấy | Provenance nội bộ cần giữ | Khi provenance thiếu |
|---|---|---|---|
| Category suggestion | Gợi ý category, trạng thái manual/unavailable và lời nhắc review | type, candidate snapshot, contract/version, status/reason, createdAt, accept/override | manual picker; không render partial result |
| Learning signal | Feedback/correction đã ghi nhận (không hứa model đã học) | source suggestion, before/after category, reason, actor scope, version | không update future ranking |
| CSV row | parsed/validated/manual/suggested/abstained và ai đã review | upload/job/row ID, parser/schema/candidate version, reviewer decision | row manual/invalid; không commit |
| Duplicate warning | match nào, field/rule nào, compared-at/freshness | own references, fingerprint/rule version, disposition | “chưa thể xác minh”, không claim unique |
| Anomaly flag | lý do đơn giản, period, as-of/freshness, dismiss action | baseline/rule/version, derived feature refs, generatedAt | stale/insufficient, không flag chắc chắn |

- **[Verified fact]** Error/message phải locale-neutral ở API và localization do client kiểm soát; UI có `en|vi`, loading/error/focus/accessibility states. [`docs/contracts/README.md` §Boundary, L30-L31; `docs/PRD.md` §2-3, L9-L14, L39-L43; `AGENTS.md` React/frontend, L87-L97]
- **[Proposal]** Không hiển thị numeric confidence như “độ đúng”; confidence chỉ là threshold signal server-side. [`docs/AI-JEV.md` §1, L5-L13; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §3, L148-L157]

### 5.3 Dismiss/save/feedback

- **[Verified fact]** SRS có save/skip/pin cho tips/insights, nhưng chưa định nghĩa tương đương cho transaction automation; không tự suy ra endpoint. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L135-L150]
- **[Proposal]** Auto-category: accept/override/dismiss; duplicate/anomaly: proceed/dismiss/mark expected/report; CSV: approve/override/skip row; learning: feedback event không tự commit.
- **[Unresolved]** Chưa có retention, export/delete, consent, feedback UI hoặc endpoint; cần product decision trước khi persistence trở thành promise.

## 6. Technical prerequisites — không sửa contract/domain/runtime trong lane này

1. **Auto-category:** active candidate snapshot + localized labels; request/response validation; stale response discard; explicit selection binding; manual-first UI; provenance/feedback metadata nếu muốn đo.
2. **Learning:** append-only feedback event và versioned candidate/rule snapshot; owner scope; privacy/retention/consent; offline aggregation; policy correction role; không chạy trong money transaction.
3. **CSV:** import capability contract, bounded parser, row-level validation/error, upload/job lifecycle, preview and partial-accept semantics, idempotency/retry, raw-file retention policy, worker isolation.
4. **Duplicate:** owner-scoped deterministic fingerprint/read model, exact idempotency distinction, freshness and race recheck, warning response and outcome event; no blocker semantics.
5. **Anomaly:** rebuildable derived read model, baseline/min-history/threshold decision, HCMC period semantics, worker retry/staleness, user disposition and provenance; no financial authority.
6. **Cross-cutting:** redaction before outbound, input-length/rate/concurrency bounds, prompt-injection fixtures, ambiguous/abstention evaluation, `en|vi` parity, audit/log masking, kill/disable path that leaves manual flow alive. [`docs/AI-JEV.md` §5-7, L64-L89; `docs/ADMIN-OPERATIONS.md` §5-7, L38-L55; `docs/DELIVERY-PLAN.md` §6-11, L41-L75]

**Không được suy diễn:** provider/model/cost/latency/privacy runtime; exact queue technology; exact threshold; exact API/schema cho use case phase sau. Những thứ đó là dependency/evidence cần owner phê duyệt, không phải output của lane này.

## 7. Explicit reject/defer/ship list

### Ship MVP

- Manual category picker và ordinary `income|payment` path khi JEV off.
- Optional category suggestion trước submit, default-off, backend-only, active candidate set, explicit accept/override, deterministic final validation, manual fallback.
- Existing idempotency/payment/wallet/domain rules; không thêm JEV call vào money transaction.

### Phase sau

- Feedback/correction signal capture và offline learning sau khi có append-only event/provenance/consent decision.
- CSV deterministic parser + preview + row-level manual review trước; JEV row suggestion chỉ sau import contract/evidence.
- Deterministic duplicate warning sau khi có read model/freshness/race policy.
- Deterministic anomaly signal sau commit sau khi có baseline/staleness/provenance/feedback design.

### Explicit reject trong scope hiện tại

- JEV auto-submit, auto-select/commit category, auto-correct historical transactions hoặc mutate/delete/merge/reverse ledger.
- JEV tính amount/date/balance/budget/wallet/anomaly score, authorize/freeze/reject payment hoặc tạo financial action.
- JEV làm duplicate/anomaly detector, dùng similarity để override idempotency/domain, hoặc lấy cross-user data chưa có policy.
- Auto-commit CSV, silently drop/repair rows, coi text/CSV instruction là trusted command, hoặc dùng provider output thay deterministic validation.
- Raw prompt/response, raw ledger/balance, session/claims/secret/PII thừa trong request/log/persistence.

## 8. Câu hỏi chưa giải quyết để integrator/Team Leader chốt

1. **[Unresolved]** Có muốn ship feedback event tối thiểu trong MVP không, hay chỉ ship category suggestion rồi đo override ở aggregate không lưu raw?
2. **[Unresolved]** Public correction contract cuối cùng là reversal-only hay có approval rõ cho `adjustment|replacement` và `newCategoryId`?
3. **[Unresolved]** CSV phase sau có cho partial commit không; import retry/idempotency và raw file retention bao lâu?
4. **[Unresolved]** Duplicate warning chỉ pre-submit hay thêm post-commit scanner; ngưỡng nào là high-signal và có được proceed sau warning luôn không?
5. **[Unresolved]** Anomaly cần minimum history, baseline window, threshold/freshness và user disposition nào; cấm dùng cross-user benchmark ở giai đoạn nào?
6. **[Unresolved]** Provenance schema/version nào là canonical cho suggestion, feedback, import row, duplicate signal và anomaly event?
7. **[Unresolved]** Worker/queue/read-model capability nào đã tồn tại; nếu chưa có, phase sau phải có delivery owner và failure/retry evidence trước khi bật.

## 9. Evidence index

- SRS về mục tiêu sinh viên, nhập thủ công/CSV, category suggestion, học từ sửa, batch classification, report và anomaly: [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1-1.6, L25-L43, L57-L71, L101-L119, L120-L166].
- PRD về user-entered money, immutable ledger, deterministic backend/report, JEV advisory/default-off và MVP out-of-scope: [`docs/PRD.md` §1-5, L3-L7, L25-L37, L45-L67].
- Domain invariant, formula, correction, payment/savings/report boundary: [`docs/DOMAIN-MODEL.md` §1-5, L3-L14, L22-L36, L38-L85].
- JEV allowed input/output, prohibition, fallback, privacy/evaluation/deferred use cases: [`docs/AI-JEV.md` §3-8, L21-L93].
- HTTP category suggestion, transaction/correction/category schemas và error semantics: [`docs/contracts/openapi.yaml` L102-L152, L180-L188, L338-L395, L440-L489, L533-L544, L662-L677].
- Correction/API safety, idempotency, category lifecycle và response boundary: [`docs/contracts/API-REVIEW.md` §Ledger correction, L23-L30; §Response và pagination, L32-L44; `docs/contracts/README.md` §Boundary, L22-L35].
- Layer/adapter boundary, no JEV in domain transaction, data/log restrictions: [`docs/ARCHITECTURE.md` §1-6, L5-L27, L35-L56; `AGENTS.md` Backend/API + Domain/JEV, L99-L141].
- Admin correction/incident/feature-flag boundaries and aggregate metrics: [`docs/ADMIN-OPERATIONS.md` §1-9, L3-L64].
- Existing UX evidence for manual-first, confirmation/override, stale response, injection/abstention and metrics: [`docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §1-4, L8-L57, L170-L205; §7-8, L246-L313].

## 10. Handoff disposition

**[Proposal]** Integrator nên đưa UC-TA-01 vào MVP sequence cùng manual-first acceptance; ghi UC-TA-02 là instrumentation/phase gate chứ không phải autonomous learning; ghi UC-TA-03/04/05 là phase-sau capabilities với deterministic-first design. Team Leader/contract owners phải chốt unresolved items trước implementation. Tài liệu này cung cấp evidence, use-case boundaries và insertion points; không tự cấp quyền cho JEV, không thay đổi canonical contract/domain/runtime.
