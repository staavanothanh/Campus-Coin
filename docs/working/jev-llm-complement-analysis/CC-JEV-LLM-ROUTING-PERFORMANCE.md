# CC-JEV-LLM-ROUTING-PERFORMANCE

> **Trạng thái:** working analysis/handoff; không phải ADR, canonical contract hoặc runtime implementation.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa SRS, ADR, architecture, domain, authentication, OpenAPI, source/runtime, `docs/working/jev-system-one-analysis/` hoặc `docs/working/jev-product-analysis/`.
>
> **Phân loại bằng chứng:** `[Verified fact]` = điều đọc được từ official/local source; không đồng nghĩa runtime đã được probe. `[Proposal]` = thiết kế cần owner phê duyệt. `[Unresolved]` = thiếu contract, probe, measurement hoặc quyết định; phải fail closed, không được điền bằng suy đoán.

## 0. Kết luận điều hành

### 0.1 Quyết định đề xuất

**[Proposal]** Campus Coin nên **nghiên cứu và, chỉ sau các gate, bổ sung một generative LLM adapter riêng** cạnh JEV/System One. Adapter này chỉ phục vụ:

- tạo explanation/copy tùy chọn từ các deterministic facts đã được application cung cấp;
- extraction có schema giới hạn từ text/file đã được application kiểm tra, staging và cho user review;
- tạo advisory artifact sau khi facts authoritative đã sẵn sàng.

Generative LLM **không** thay JEV, không mở rộng capability của JEV, không trở thành agent và không được đưa vào đường authority của tiền. JEV tiếp tục là typed `Choice`/`Noul`/`Score` cho judgment hữu hạn; generative LLM là lớp text/structured extraction có output chưa đáng tin cậy cho đến khi server validate. Mỗi adapter có feature flag, quota, timeout, provenance, kill switch và fallback riêng.

**[Verified fact]** TypeSafe mô tả System One/Jev là model trả typed answers và probabilities, không viết reply, code hay explanation reasoning; code giữ control flow, deterministic rules và side effects. Sources: [System One](https://docs.typesafe.ai/concepts/system-one), [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [State](https://docs.typesafe.ai/concepts/state), [API](https://docs.typesafe.ai/api). Vì vậy việc cần prose/extraction **không** phải lý do để đổi JEV thành chat completion.

**[Verified fact]** Campus Coin giữ wallet, ledger, savings, budget và report ở backend/domain deterministic; JEV optional, backend-only, default-off, chỉ gợi ý category trước submit; JEV lỗi không được làm hỏng money path. Sources: `docs/PRD.md` §1, §3.2–§3.5, §4–§5 (L3–73); `docs/DOMAIN-MODEL.md` §1, §3–§5 (L3–85); `docs/ARCHITECTURE.md` §1–§8 (L3–69); `docs/AI-JEV.md` §1–§8 (L5–93); `AGENTS.md` L133–141.

**[Proposal] Quy tắc routing cứng:**

1. **Critical response** chỉ được phụ thuộc auth/session, validation, domain/database và deterministic read model. Không chờ generative LLM. Không gọi bất kỳ model nào trong money transaction.
2. **JEV category suggestion** có thể là một request advisory riêng sau thao tác rõ ràng của user; nó chỉ được block vùng suggestion đó trong một deadline hữu hạn, không block form, first useful facts hoặc final Save.
3. **Generative LLM** mặc định chạy sau response hoặc trong bounded worker. Nó có thể block riêng một panel mà user chủ động yêu cầu, nhưng không block trang, money write, authoritative report/budget facts hay manual fallback.
4. **Parallel fan-out** chỉ dùng cho nhánh độc lập sau deterministic snapshot và chỉ khi caller có thể trả/hiển thị core mà không `await` model. `Promise.all`/join không được biến các nhánh optional thành dependency ngầm.
5. **JEV-gated LLM cascade** chỉ dùng khi typed JEV là precondition thật sự (ví dụ signal hữu hạn để quyết định có cần một artifact), ưu tiên worker; không dùng để làm critical response tuần tự qua hai provider.
6. **Cache/precompute** là cách ưu tiên để advisory read-time không phải chờ provider, nhưng stale artifact phải được đánh dấu/suppress; cache không thể thay authoritative calculation.

### 0.2 Trả lời trực tiếp: có nên bổ sung LLM?

**[Proposal]** Có, nhưng chỉ như một capability **complementary, optional, non-authoritative** và không nằm trong MVP critical path. LLM có product fit cho prose/explanation và một số extraction; JEV có product fit cho finite typed judgment. Nhiều surface không cần model nào: deterministic facts + application-owned templates tốt hơn, ít latency/cost/risk hơn.

**[Unresolved]** Provider, model ID, availability, quota, pricing, retention, structured-output behavior, streaming/cancellation và latency của generative API chưa được xác minh. `GPT 5.6 luna` là ví dụ người dùng đưa ra, **chưa được xác minh là model/API có tồn tại hoặc dùng được**; không được đưa vào allowlist, SLA, benchmark hay UX promise trước probe (§8).

### 0.3 Critical path definition

**[Proposal]** Dùng hai khái niệm riêng để tránh đo sai:

- `authoritative critical path`: từ request đến response quyết định/đọc dữ liệu mà user có thể dùng để tiếp tục, gồm auth, owner scope, CSRF/origin, schema/domain validation, idempotency, lock/commit, deterministic report/budget calculation và serialization.
- `first useful response`: trạng thái UI đã có form/manual control hoặc deterministic facts có thể đọc/tiếp tục; một advisory card đang `pending` không làm response “chưa xong”.

Một generative LLM timeout chỉ được làm mất advisory artifact, không được làm mất `POST /ledger/transactions`, `POST /savings/transfers`, correction, baseline, wallet, budget/report facts hoặc manual category picker. Đây là recommendation dựa trên local boundary, không phải claim về runtime hiện tại.

## 1. Nguồn và boundary không được nới

### 1.1 Nguồn local đã đối chiếu

**[Verified fact]** SRS mô tả AI classification, monthly narrative, tips, CSV và optional intelligence; đồng thời nêu AI output chỉ advisory, user được xem xét/ghi đè, và canonical MVP đã cắt complex AI, CSV, prediction, chat và autonomous action. Sources: `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.4–§1.7 (L57–201); `docs/PRD.md` §3.5, §5–§6 (L45–73); `docs/DELIVERY-PLAN.md` §8–§12 (L53–79).

**[Verified fact]** Public API hiện chỉ có `/ai/category-suggestion` cho suggestion category advisory, cùng các endpoint deterministic `/ledger/transactions`, `/budgets*`, `/reports/*`; OpenAPI không có contract generative explanation/extraction. Source: `docs/contracts/openapi.yaml` `/ai/category-suggestion` (L338–348), `CategorySuggestion*` (L662–677), ledger/budget/report paths (L102–129, L215–260).

**[Verified fact]** API review yêu cầu owner scope server-side, CSRF/origin, idempotency, envelope ổn định, không expose provider payload/secret, và không giữ database transaction trong lúc gọi external provider. Sources: `docs/contracts/API-REVIEW.md` §Cổng bảo mật, §Response và pagination, §Domain scope (L5–48); `AGENTS.md` §Backend/API (L99–107).

**[Verified fact]** Admin chỉ triage issue đã mask, không sửa ledger/balance/audit; report và provider/JEV failure có incident/fallback path. Sources: `docs/ADMIN-OPERATIONS.md` §1–§8 (L3–55); `docs/AUTHENTICATION.md` §5–§7 (L33–61).

### 1.2 Official System One boundary dùng làm oracle

**[Verified fact]** System One request đánh giá một `state` bằng một hoặc nhiều `questions`; state có thể string/object/array, questions cùng state được đánh giá độc lập. `Choice` trả option + probabilities + confidence; `Noul` trả xác suất yes; `Score` trả probability-weighted level. Sources: [State](https://docs.typesafe.ai/concepts/state), [API](https://docs.typesafe.ai/api), [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score).

**[Verified fact]** Official guidance nói code giữ workflow/deterministic rules/side effects, hỏi các judgment hẹp, có thể hỏi độc lập cùng request rồi compose bằng code. Source: [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

**[Verified fact]** OpenRouter System One reference đã đọc mô tả typed `POST /systemone`, trả `answers`, `model`, `provider`, `usage` và các HTTP error classes; đây chỉ là evidence cho System One adapter, không phải evidence cho một generative route/model của Campus Coin. Source: [Submit a System One request](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).

**[Verified fact]** OpenRouter privacy documentation nói prompt retention/logging và provider data policy phụ thuộc setting/provider; metadata như token/latency có thể được thu thập. Đây là lý do phải có privacy/retention gate, không phải bằng chứng rằng một generative provider cụ thể đáp ứng policy Campus Coin. Source: [OpenRouter Data Collection](https://openrouter.ai/docs/guides/privacy/data-collection.md).

**[Unresolved]** Không có official generative API/model documentation nào được dùng trong file này để khẳng định `GPT 5.6 luna`, structured output, streaming, cancellation, pricing hay provider availability. Cần probe riêng trước khi bật.

### 1.3 Hai adapter, một application boundary

**[Proposal]** Đặt hai adapter độc lập ở server/application boundary:

```text
Browser
  -> Campus Coin API
      -> auth/owner/CSRF/input + deterministic domain/read model  [critical]
      -> JEV adapter: typed Choice/Noul/Score                 [optional signal]
      -> Generative LLM adapter: copy/extraction               [optional output]
      -> schema/provenance/freshness/claim validation
      -> application-owned localized UI / advisory artifact
      -> optional bounded cache or post-commit worker
```

- Domain không import SDK provider.
- Browser không gọi provider và không giữ secret.
- Adapter không nhận session, Google claims, secret, raw ledger hoặc money authority không cần thiết.
- Generative output không được biến thành command, route, authorization, ledger/budget/savings write hoặc admin action.
- JEV output không được dùng để “giải thích” bằng cách yêu cầu JEV trả text.

**[Proposal]** Với LLM explanation, application cung cấp fact bundle đã freeze: metric IDs, exact values đã tính, period/timezone, source snapshot/version, allowed claims và locale. LLM chỉ tạo copy optional; UI render exact facts, labels, warnings, CTA và accessibility text từ application. Output nên mang `factRefs`/claim IDs trong schema; validator từ chối claim/number không có trong bundle. Không parse prose để lấy amount/date/balance hoặc để thực hiện money write.

**[Proposal]** Với LLM extraction, application trước hết parse/size-limit/validate file hoặc text, tạo staging record và schema version. Model chỉ điền fields allowlist; server validate kiểu, range, enum, ownership, category lifecycle, duplicate/idempotency và user review. Extraction result không tự trở thành `CreateTransactionRequest` đã được authorize.

## 2. So sánh topology/routing

> `Block critical?` nói về authoritative response/first useful response, không phải việc một panel advisory có thể ở trạng thái loading. Mọi con số latency, timeout, queue hoặc cost cụ thể đều để sau probe (§6–§8).

| Topology | JEV role | Generative LLM role | Có block critical response? | Khi nào được dùng | Disposition |
|---|---|---|---|---|---|
| **JEV-only** | Typed category/finite signal | Không gọi | **Không.** Có thể chờ riêng endpoint suggestion sau explicit click; không chặn Save/manual/core facts. | Category pre-submit; future bounded typed signal. | **Ship/enable có gate** cho category; default-off. |
| **LLM-only** | Không gọi | Explanation/copy hoặc extraction có schema | **Không.** User-explicit “Generate” chỉ block panel/request advisory với deadline riêng; facts/form vẫn usable. | Monthly explanation, copy, future staged extraction. | **Đề xuất phase sau**, non-blocking mặc định. |
| **Parallel fan-out** | JEV và LLM chạy song song trên cùng deterministic snapshot nếu thật sự độc lập | Nhánh prose/extraction độc lập | **Không nếu core trả trước và không join bắt buộc.** Nếu `await` cả hai trước response thì topology này trở thành blocker và bị cấm trên critical path. | Dashboard/report optional card sau facts; independent signals. | **Khuyến nghị có điều kiện**, không join trong critical handler. |
| **JEV-gated LLM cascade** | Typed gate quyết định LLM có cần chạy | Chỉ chạy khi gate được code chấp nhận | **Không.** Cascade phải post-response/worker; explicit panel chỉ block panel. | Chỉ khi JEV là precondition thật: signal hữu hạn/unsafe gate, không phải “JEV giải thích rồi LLM viết”. | **Future/worker**, thường tránh nếu template/code đủ. |
| **Async post-response/worker** | Optional typed signal hoặc gate | Generate artifact/extract rows sau commit/snapshot | **Không.** Core response không chờ queue/provider. | Monthly artifact, tips, batch rows, feedback classification, cache refresh. | **Mặc định khuyến nghị** cho LLM. |
| **Cache/precompute** | Cache typed result theo candidate/source version | Cache generated artifact theo snapshot/schema/model/policy version | **Không đối với optional artifact.** Cache miss vẫn trả facts; không dùng stale advisory làm authority. | Read-time report/dashboard/budget card; month-close/precompute. | **Khuyến nghị**, có invalidation/stale policy bắt buộc. |

### 2.1 JEV-only

**[Verified fact]** JEV/System One phù hợp với finite `Choice` category và application composition; current OpenAPI chỉ công bố category suggestion. Sources: `docs/AI-JEV.md` §3–§5 (L21–72), `docs/contracts/openapi.yaml` L338–348, L662–677; [Choice](https://docs.typesafe.ai/primitives/choice).

**[Proposal]** Synchronous JEV category request chỉ được bắt đầu sau explicit click. Manual picker, description, type và Save không chờ JEV. Nếu user bấm Save trong lúc request pending, normal transaction path xử lý category đã chọn hoặc trả validation cần chọn category; không khóa vô hạn.

**[Proposal]** Gộp các câu hỏi JEV thật sự cùng state (ví dụ `category: Choice` và `evidence_sufficient: Noul`) để tránh round trip tuần tự, nhưng chỉ nếu code có consumer cho từng answer. Không gộp câu hỏi để xin explanation/prose hoặc action.

**[Unresolved]** Runtime có hỗ trợ cancellation, exact deadline, limits và actual latency distribution nào chưa được chứng minh. Không gọi “fast enough” từ tài liệu thành Campus Coin SLA.

### 2.2 LLM-only

**[Proposal]** LLM-only phù hợp khi deterministic code đã có facts và cần biến chúng thành optional copy, hoặc khi cần extract bounded fields từ unstructured input. “Only” ở đây nghĩa không cần JEV; vẫn luôn cần deterministic validation/composition.

**[Proposal]** Đối với explanation, LLM input nên là fact bundle đã allowlist; output là schema gồm `status`, `copy`, `factRefs`, `locale`/`copyVariant` nếu được duyệt. Exact amounts, period, source labels và action labels do application render. Nếu output thêm con số/claim không nằm trong facts, bỏ artifact hoặc dùng template deterministic.

**[Proposal]** Đối với extraction, output là typed fields + per-field review flag chỉ khi schema/provider probe chứng minh; “confidence” của generative model không được hiểu là authorization. Mọi field ảnh hưởng transaction phải được user inspect/override và normal domain revalidate.

### 2.3 Parallel fan-out

**[Proposal]** Chỉ fan-out sau deterministic facts đã sẵn sàng, ví dụ:

```text
load report snapshot (critical)
  ├─ render facts/table immediately (critical response)
  ├─ optional JEV typed signal (bounded, discardable)
  └─ optional LLM copy artifact (bounded, discardable)
```

Các nhánh có cùng source snapshot nhưng không phụ thuộc lẫn nhau có thể chạy song song để giảm wall-clock của **advisory completion**; đây không phải bằng chứng rằng response p95/p99 sẽ giảm. Nếu một nhánh lỗi, nhánh kia và core vẫn trả được.

**[Proposal]** Không dùng fan-out khi LLM cần JEV answer; hai nhánh có privacy/owner/retention khác nhau mà chưa có contract; caller vẫn `await` join trước core response; queue/provider concurrency không đủ; hoặc một nhánh có side effect (adapter không được có side effect).

### 2.4 JEV-gated LLM cascade

**[Proposal]** Cascade chỉ chính đáng khi JEV trả một typed gate mà application thật sự cần, ví dụ `should_generate_optional_highlight: Noul` hoặc `candidate_kind: Choice` trong allowlist. Gate là signal, không phải security boundary hay proof. Nếu gate manual/uncertain/stale thì **không** gọi LLM.

**[Proposal]** Tách hai deadline và hai retry/cost budgets; JEV timeout không được tự động gọi LLM để “cứu” request. Với monthly/report artifact, chạy cascade trong worker sau source snapshot. Với user-explicit panel, có thể chờ riêng panel nếu còn deadline; facts vẫn visible.

**[Proposal]** Nếu facts + deterministic template đã đủ, không gọi cascade. Thêm JEV gate chỉ để giảm LLM calls hoặc lọc candidate phải chứng minh được lợi ích qua measurement; nếu không, cascade là round trip và failure surface thừa.

### 2.5 Async post-response/worker

**[Proposal]** Đây là topology mặc định cho generative LLM:

1. deterministic API đọc/commit source facts;
2. application tạo idempotent advisory/extraction job từ `sourceSnapshotVersion`/`jobKey`;
3. enqueue bounded sau commit hoặc sau response;
4. worker kiểm tra freshness/privacy/budget trước khi gọi provider;
5. validate schema + fact references + policy;
6. persist immutable/versioned advisory artifact hoặc row-level staging result;
7. UI đọc artifact nếu còn fresh; nếu không, hiển thị facts/manual.

**[Verified fact]** Canonical architecture yêu cầu không gọi OpenRouter/email/worker trong money transaction, và JEV lỗi không chặn money path. Sources: `docs/ARCHITECTURE.md` §4–§6 (L35–56); `docs/DOMAIN-MODEL.md` §5 (L69–85); `AGENTS.md` L104–107.

**[Unresolved]** Queue/worker provider, delivery semantics, durable outbox, dead-letter storage, worker concurrency và public async endpoint chưa phải canonical contract. Không coi đề xuất worker là runtime capability đã có.

### 2.6 Cache/precompute

**[Proposal]** Precompute advisory artifact từ snapshot immutable (ví dụ sau report/month snapshot) để read-time chỉ đọc cache. Cache miss, worker outage hoặc provider outage luôn fallback facts/template; không chờ đồng bộ trên page load.

**[Proposal]** Cache generated prose không được dùng như current fact. Key tối thiểu nên bind owner scope, capability, source snapshot/version, period/timezone, locale, prompt/schema/template policy version, model/provider snapshot (nếu đã verified) và safety policy version. Category suggestion cache, nếu có, phải bind candidate snapshot/interaction và không dùng cross-user.

**[Unresolved]** TTL/freshness window, artifact endpoint, retention/export/delete và cache backend chưa được quyết định. Vì vậy không ghi thời lượng hoặc claim cache hit/latency.

## 3. Blocking matrix cho critical response

| Surface/operation | Thành phần được phép block response | JEV/LLM policy | Fallback |
|---|---|---|---|
| Auth/session/owner/CSRF | Auth provider/session DB và deterministic checks theo contract | Không model; generative output không được tham gia auth | Fail closed theo `docs/AUTHENTICATION.md` |
| Opening wallet, income/payment, correction, savings transfer, budget mutation | Validation, idempotency, wallet/savings lock, DB transaction/domain | **JEV và LLM tuyệt đối không gọi/chờ trong transaction hoặc authorize** | API error/domain response; không fake success |
| Wallet/dashboard/monthly report/budget read | Owner-scoped deterministic read/calculation, source snapshot | Model không block first useful facts; optional artifact lazy/async | Exact facts/table/chart, empty/error/loading; không zero giả |
| Category suggestion | API validation + optional bounded JEV call cho suggestion endpoint | JEV có thể block **suggestion panel** sau explicit click; không block form/manual/final Save. LLM không dùng | Manual active picker; preserve form |
| Monthly explanation/tip/coaching | Deterministic facts trước | LLM non-blocking; optional JEV typed gate non-blocking; no prose in critical path | Template deterministic hoặc hide card |
| CSV/file extraction (future) | File size/encoding/schema/parser/staging | LLM non-blocking/batch; row pending không block other rows; no commit before review | Row manual/invalid/skip; preview retained |
| Correction/help/admin routing | Authz/masked input/issue creation | JEV typed hint or LLM extraction only optional and non-authoritative | Manual menu/triage; issue submission unaffected |
| Any user-visible generated text | App-owned loading/facts/fallback | LLM may block only explicit optional panel with own deadline; never block core | Static localized copy / no card |

**[Proposal]** Một handler bị coi là vi phạm nếu model call nằm trước `first useful response` mà không có explicit user action, hoặc nếu model failure trả 5xx cho money/read endpoint dù deterministic data vẫn sẵn sàng. Đây là review criterion cần kiểm chứng bằng trace, không phải claim source hiện tại đã vi phạm.

## 4. Latency budget methodology — không invent measurement

### 4.1 Nguyên tắc đo

**[Proposal]** Không đặt SLA, target p50/p95/p99 hoặc nói provider “nhanh” trước khi có measurement trên deployment/region/workload của Campus Coin. Official TypeSafe mô tả System One là “fast”, nhưng đó không phải Campus Coin runtime evidence; generative model chưa có evidence tương tự trong scope này.

Đo riêng từng segment, không chỉ một timer end-to-end:

```text
client intent -> edge/API queue wait -> auth/session
  -> deterministic DB/read-model time
  -> model admission wait
  -> provider connect/TTFB/last-byte
  -> schema/fact validation
  -> persistence/cache write
  -> API serialization/network
  -> browser first useful paint/render
  -> advisory-ready/render completion
```

**[Proposal]** Ghi histogram và sample count theo route, topology, capability, `en|vi`, input-size bucket, cache hit/miss, JEV/LLM model snapshot, provider/region, status (success/timeout/fallback), queue wait và concurrency level. Logs chỉ masked metadata; không ghi raw prompt, raw response, financial detail hoặc secret. OpenRouter có thể thu metadata request như token/latency theo privacy docs, nên Campus Coin cần xác định dữ liệu nào mình tự ghi và provider policy nào đã được chấp thuận.

### 4.2 Ba percentile và budget decomposition

**[Proposal]** Với mỗi path, báo cáo tối thiểu:

- `p50`: typical/median experience;
- `p95`: tail thường gặp cần UX deadline/backpressure;
- `p99`: tail hiếm nhưng có thể làm request treo hoặc queue tăng.

Không lấy trung bình để thay percentile. Không trộn cache hit với miss, core với advisory, hoặc JEV với LLM. Đối với streaming, tách `TTFB/first token` và `last token`; đối với progressive UI, tách `first useful response` và `advisory ready`.

Budget nên được biểu diễn bằng phương trình, chưa điền số:

```text
B_core = B_auth + B_validation + B_db/read-model + B_serialize + B_network
B_optional = B_admission + B_provider + B_validate + B_persist/render

critical response <= B_core
advisory-ready <= B_optional (best effort; không phải blocker)
```

**[Proposal]** Đo `critical p50/p95/p99` với model tắt, `JEV suggestion p50/p95/p99` riêng, `LLM artifact p50/p95/p99` riêng, rồi đo topology fan-out/cascade/worker. Một kết quả “parallel nhanh hơn” chỉ hợp lệ nếu core response không join và advisory completion được đo cùng workload; không được suy ra từ một lần thử.

**[Unresolved]** Chưa có load profile, region, deployment, user concurrency, DB pool, queue, provider route hoặc representative synthetic/anonymized corpus; chưa được phép điền số vào budget.

### 4.3 Acceptance evidence cho performance

**[Proposal]** Trước enablement cần evidence cho:

1. JEV-off core path có p50/p95/p99 baseline.
2. Core path giữ percentile và error/fallback semantics khi JEV/LLM provider chậm hoặc unavailable.
3. First useful report/dashboard không chờ generated copy.
4. Queue wait, worker age, in-flight calls và backpressure không tăng không giới hạn dưới load test được owner duyệt.
5. Cancellation/deadline thật sự giải phóng request/worker capacity (hoặc evidence rõ nếu provider không hỗ trợ cancel).
6. Cache hit/miss và stale suppression không làm UI hiện dữ liệu cũ như current.

## 5. Queue, backpressure, concurrency và admission control

### 5.1 Bounded work

**[Proposal]** Mỗi capability có admission gate trước provider call:

- feature flag và user/admin opt-in nếu cần;
- server-side privacy/redaction/size validation;
- per-request token/input/output limit (giá trị cụ thể `[Unresolved]`);
- per-user, per-route và global in-flight limit;
- bounded queue length và queue age;
- deadline còn lại đủ cho work;
- token/cost budget còn lại;
- duplicate job suppression theo idempotency key.

Khi gate không đạt, trả static/manual/facts fallback ngay. Không xếp queue vô hạn chỉ để giữ ảo tưởng “sẽ có AI”.

### 5.2 Priority và backpressure

**[Proposal]** Ưu tiên theo product safety/performance:

1. core money/auth/read request (không đi qua model queue);
2. user-explicit category suggestion (JEV advisory, bounded);
3. user-explicit explanation panel;
4. post-response report/budget artifact;
5. batch extraction/feedback/precompute.

Khi queue đầy: reject/defer thấp ưu tiên với trạng thái rõ (`unavailable|manual|pending_expired`), không làm chậm core; không retry ngay trên cùng queue; expose aggregate queue-age/drop metrics cho ops. User không nên thấy “đang xử lý” vô hạn.

**[Proposal]** Worker concurrency tách theo provider/capability/privacy class để batch CSV không chiếm hết slot của category suggestion hoặc explanation. Giới hạn concurrency phải có measurement; không chọn một số tùy ý trong tài liệu.

### 5.3 Fan-out và batch

**[Verified fact]** TypeSafe questions cùng một state được evaluate độc lập/parallel; code compose output. Source: [State](https://docs.typesafe.ai/concepts/state), [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

**[Proposal]** Với JEV, gộp questions cùng state khi giảm round trip mà không tăng privacy/response-size risk. Với nhiều rows, mỗi row giữ `rowId`/owner/snapshot riêng; worker pool bounded; response out-of-order reassemble theo row ID, không theo completion order. Không gộp khác owner hoặc dùng row này làm context cho row khác.

**[Unresolved]** Official System One docs đã đọc không chứng minh provider-side bulk/offline job contract. Batch orchestration, partial failure, row retention và commit policy cần contract riêng.

## 6. Timeout, cancellation, retry và idempotency

### 6.1 Deadline hierarchy

**[Proposal]** Có deadline ở từng lớp, truyền `deadline remaining` thay vì để adapter tự chờ vô hạn:

```text
request deadline
  -> API/orchestration deadline
     -> queue admission deadline
        -> provider connect/response deadline
           -> schema/claim validation deadline
              -> persist/cache deadline
```

Một model timeout chỉ tạo `manual|unavailable|stale|pending` tùy placement. Không trả fake success, zero facts hoặc partial prose được coi là authoritative.

**[Unresolved]** Exact timeout values, provider cancellation semantics và whether an aborted HTTP request stops provider billing/work chưa được probe. Không tuyên bố cancellation tiết kiệm cost hay giải phóng provider work nếu chưa có evidence.

### 6.2 Cancellation và stale result

**[Proposal]** Hủy ở ba mức:

- user bấm Cancel/đóng panel: abort client request nếu khả dụng và mark interaction cancelled;
- request deadline hết: server bỏ chờ, không render late output;
- source/input thay đổi: tăng snapshot/interaction version, discard response cũ trước render/persist.

Late response phải được coi là result không còn eligible, không phải trigger retry. Nếu provider không hỗ trợ cancel, vẫn phải stop waiting, drop result khi về và áp dụng cost/concurrency accounting thực tế sau probe.

### 6.3 Retry policy

**Proposal]** Retry là một quyết định theo operation, không phải mặc định:

- category click: không retry tự động; user có thể retry explicit một lần theo UI policy hoặc dùng manual;
- explanation worker: chỉ retry lỗi transient đã phân loại, bounded attempts/backoff/jitter, còn deadline và budget; permanent 4xx/schema/privacy/validation không retry;
- extraction row: retry từng row/job item idempotently; một row lỗi không làm mất preview row khác;
- money command: retry semantics thuộc domain idempotency contract, **không** bọc provider call vào money transaction.

Không dùng retry để sửa malformed prose, không fallback từ JEV typed sang chat generative để “repair”, không retry vô hạn khi provider 429/5xx/quota.

**[Verified fact]** Local JEV policy đã yêu cầu không retry mặc định, bounded input/concurrency/retry và manual fallback với timeout/quota/4xx/5xx/schema/privacy/low-confidence. Source: `docs/AI-JEV.md` §5–§7 (L64–89); `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-ARCH-OPS.md` §7 (L239–276).

### 6.4 Idempotency

**[Proposal]** Job key nên bao gồm capability + owner scope + source snapshot/version + input fingerprint + schema/policy version. Persist job state transitions append-only hoặc versioned (`queued|running|succeeded|failed|cancelled|expired`), và ensure one logical artifact version per key. Retry cùng key/body đọc kết quả đã lưu; khác fingerprint trả conflict/reject, không tạo artifact duplicate.

**[Verified fact]** API/domain yêu cầu retry cùng idempotency key/body không tạo duplicate; body khác trả conflict; money rows/audit append-only. Sources: `AGENTS.md` L104–121; `docs/DOMAIN-MODEL.md` §4 (L60–67); `docs/contracts/API-REVIEW.md` L39–44.

**[Proposal]** Idempotency của advisory job không được xem là idempotency của ledger command. Sau khi user review extraction, normal ledger API vẫn tự kiểm tra owner/category/type/amount/date/idempotency; model output không được “đi tắt”.

## 7. Token/cost budget controls — không invent giá trị

**[Proposal]** Dù chưa biết pricing, phải có controls trước khi gọi:

- budget theo request, user, capability, tenant/workspace và rolling operational window;
- input/output token ceilings và max output length theo schema;
- estimated token count/admission before call; actual usage readback after call;
- per-route call quota và daily/monthly spend bucket ở server;
- model allowlist/version pinning sau probe, không model tự chọn model khác;
- cache/prompt-prefix reuse nếu provider contract/privacy cho phép;
- no automatic expensive fallback/cascade khi primary lỗi;
- kill switch và fail-closed/manual mode khi budget/quota unknown/exceeded;
- aggregate cost/usage observability, không log prompt/response/financial payload;
- cost attribution theo capability/topology/status để biết retries/fan-out đang tiêu thụ gì.

**[Proposal]** Fan-out/cascade phải pre-authorize **tổng** worst-case calls/tokens trước khi enqueue. Nếu ngân sách không đủ cho cả nhánh, bỏ optional LLM hoặc chọn deterministic template; không để JEV/LLM tự quyết định gọi thêm model.

**[Verified fact]** JEV/OpenRouter reference trả usage metadata và local docs yêu cầu bounded cost/daily spend, nhưng local docs không đưa ra numeric budget cho Campus Coin. Sources: `docs/AI-JEV.md` §2, §5–§7 (L15–19, L64–89); [OpenRouter System One reference](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).

**[Unresolved]** Giá, tokenization, billing unit, minimum charge, cache pricing, quota và model fallback của generative provider chưa được xác minh. File này cố ý không ghi con số hoặc claim tiết kiệm.

## 8. Model/API probe trước enablement

### 8.1 GPT 5.6 luna và mọi model generative

**[Unresolved]** `GPT 5.6 luna` chỉ là user-provided example chưa được xác minh. Không được ghi nó như model thật, không hard-code model ID, không quảng bá availability, không benchmark, không đưa vào production allowlist và không suy ra giá/SLA/latency từ tên.

**[Proposal]** Probe server-only, credential-safe, không gửi dữ liệu production/PII/ledger:

| Probe | Evidence cần ghi | Gate khi không đạt |
|---|---|---|
| Model/API identity | exact provider, endpoint, model ID, request/response docs đã đọc và timestamp | Không enable; giữ deterministic/manual |
| Auth/secret boundary | server-only secret, no browser exposure, error redaction | Disable adapter |
| Schema | structured output contract, unknown-field behavior, max input/output, malformed response handling | Không parse prose để repair; fallback |
| Extraction | synthetic/anonymized rows, field types, missing/ambiguous fields, rejection behavior | Manual staging; không import |
| Explanation | fixed fact bundle, allowed claims, unsupported-number injection, locale behavior | Template/facts-only |
| Safety/privacy | retention/logging/training/provider policy và approved data class | Không gửi outbound; flag off |
| Timeout/cancel | connect/read deadline, abort semantics, late result behavior | Async-only hoặc disable |
| Errors/limits | 4xx/429/5xx/quota/size/overload behavior, retry classification | Manual/static fallback |
| Usage/cost | token usage, billing metadata, request/cascade accounting | Budget gate closed |
| Latency | repeated synthetic workload distributions for core-independent call, including queue/provider/validation | Không set UX/SLA target |
| Availability | probe health over owner-approved window; no claim of SLA | Do not make critical dependency |

**[Proposal]** Probe output chỉ là evidence cho adapter/version tại thời điểm probe; re-probe khi model/provider/schema/privacy/policy đổi. Không copy raw response/prompt/secret vào handoff/log.

### 8.2 JEV compatibility vẫn là gate riêng

**[Verified fact]** Current JEV gate yêu cầu typed endpoint/model, schema, timeout, quota, usage/cost, privacy và fallback probe; nếu không verify thì JEV disabled. Source: `docs/AI-JEV.md` §1–§2 (L5–19); `docs/DELIVERY-PLAN.md` §4–§5 (L26–45).

**[Proposal]** Không coi generative probe là bằng chứng JEV probe hoặc ngược lại. Mỗi adapter có model/version snapshot, error mapping, budget, kill switch và metrics riêng.

## 9. Cache, precompute, invalidation và stale

### 9.1 Artifact contract

**[Proposal]** Advisory artifact có hai lớp:

- `authoritativeEvidence`: source kind, owner-scoped snapshot/version, metric/category refs, period + `Asia/Ho_Chi_Minh`, exact values, `asOf`;
- `optionalInterpretation`: capability, model snapshot (nếu verified), schema/policy/template version, generatedAt, `factRefs`, output status, locale, stale reason, user decision.

Không persist raw prompt/response mặc định. Saved artifact là immutable/versioned; refresh tạo version mới hoặc supersedes, không silent overwrite.

### 9.2 Invalidation triggers

**[Proposal]** Mark advisory stale hoặc recompute khi có bất kỳ trigger ảnh hưởng evidence/copy semantics:

- income/payment/correction/reversal/replacement/savings commit;
- category rename/disable/retire/applies-to change;
- budget create/update/month rollover/threshold-policy change;
- report/projection/reconciliation rebuild hoặc source snapshot mismatch;
- locale/template/schema/policy/model version change;
- owner/session/privacy/consent/retention policy change;
- artifact vượt freshness window đã được owner chốt;
- provider response đến sau input/source snapshot đã thay đổi.

Stale không có nghĩa là source ledger sai; chỉ có nghĩa interpretation không được trình bày như current. Exact values phải đọc lại từ canonical endpoint.

**[Verified fact]** Local working analysis đã yêu cầu source snapshot/version, `asOf`, HCMC period, stale badge, discard late response và deterministic fallback; source: `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-ARCH-OPS.md` §2, §8 (L64–70, L278–309). Canonical domain vẫn giữ append-only/rebuild semantics: `docs/DOMAIN-MODEL.md` §3–§5 (L38–85).

### 9.3 Cache policy

**[Proposal]** Cache hit chỉ được trả generated copy nếu key/freshness/owner/locale/policy đều khớp. Cache miss hoặc stale:

1. trả facts/table/template ngay;
2. enqueue refresh nếu admission/budget còn;
3. hiển thị `pending` hoặc `stale` rõ ràng;
4. không block core và không show old copy as current.

Không share cache giữa users nếu state có owner data. Không cache session/private response ở edge; `docs/contracts/API-REVIEW.md` L5–9 yêu cầu session response `no-store, private`.

**[Unresolved]** TTL, invalidation implementation, cache backend, artifact endpoint và retention/export/delete chưa canonical; không tự tạo schema/API trong file này.

## 10. Progressive response UX

### 10.1 Trạng thái hiển thị đề xuất

**[Proposal]** UI nên render theo thứ tự, với app-owned `en|vi` copy và accessible state:

1. `loading-core`: giữ focus/form semantics; không đợi model.
2. `core-ready`: facts/form/manual picker/authoritative status hiển thị; đây là first useful response.
3. `advisory-pending`: card có spinner/status, cancel/retry explicit; nói rõ đây là optional advisory.
4. `advisory-ready`: copy/typed signal hiển thị cạnh source facts, có `asOf`/source/fact-vs-advisory.
5. `advisory-stale`: giữ facts, badge stale, refresh/disable copy; không ghi đè source.
6. `manual-fallback`/`unavailable`: static localized template/manual picker; không coi provider failure là business failure.
7. `cancelled`/`expired`: UI truthful, không tự retry vô hạn.

Screen reader phải nhận loading/error/stale/manual fallback, period/timezone và fact-vs-advisory; chart có table/text equivalent; status không chỉ truyền bằng màu. Sources: `AGENTS.md` L87–97; `docs/PRD.md` §3.4 (L39–43); `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-ARCH-OPS.md` §8.2 (L292–309).

### 10.2 Không làm hỏng phản hồi

**[Proposal]** Server/API tách core DTO và advisory status nếu endpoint hiện tại không có contract cho artifact. Không chèn delayed LLM text vào cùng response khiến browser không thể render facts. Nếu streaming được probe và duyệt, chỉ stream optional copy; không stream authoritative numeric facts từ model và không stream raw provider payload. Nếu streaming/cancel chưa probe, dùng polling/read-after-worker hoặc explicit refresh, không hứa progressive tokens.

**[Unresolved]** API cho async artifact, SSE/polling, streaming, cancel endpoint và client state chưa canonical. Đây là design option, không phải runtime claim.

## 11. Use-case cards và routing recommendation

> Mỗi card phân biệt `JEV fit`, `LLM fit`, `both`, `code-only` và `reject`. Các `[Proposal]` không mở API/domain; canonical scope vẫn giữ nguyên.

### UC-RP-01 — Money write và authoritative read

- **Classification:** `[Verified fact]` **Code-only; JEV reject; generative LLM reject** trên critical path.
- **Trigger:** `[Verified fact]` User tạo `income|payment`, baseline, correction, savings transfer, budget mutation hoặc đọc wallet/report/budget. Sources: `docs/DOMAIN-MODEL.md` §3–§5 (L38–85); `docs/contracts/openapi.yaml` L82–179, L215–260.
- **Minimal state:** `[Proposal]` Authenticated session/owner-scoped validated DTO, exact VND/date/category/period và deterministic source rows/read model. Không outbound model state; không gửi balance/ledger cho model chỉ để tạo “reason”.
- **Output contract:** `[Verified fact]` Domain response/envelope là authoritative; payment lock/idempotency/append-only/audit/reconciliation do code. Không nhận `generatedCopy`, `typedSignal` hoặc `extractedFields` làm command.
- **Blocking/non-blocking:** `[Proposal]` Deterministic validation, DB locks/transaction và authoritative query có thể block operation response. JEV/LLM không được gọi trong transaction, không authorize/reject payment, không chặn first useful facts.
- **User control:** `[Verified fact]` User review form, confirmation, normal CSRF/idempotency và correction flow; browser không tính balance/authorization. Sources: `docs/ARCHITECTURE.md` §2, `docs/AUTHENTICATION.md` §4–§6, `AGENTS.md` L99–121.
- **Fallback:** `[Verified fact]` Provider/model outage không tạo fake row hoặc zero fallback; trả deterministic error/manual UI; projection mismatch fail closed/incident theo domain policy.
- **Metrics:** `[Proposal]` Commit correctness, duplicate-on-retry zero, wallet non-negative/concurrency invariants, deterministic response p50/p95/p99, provider-call count on money routes = zero, no sensitive outbound/log.
- **Disposition:** `[Verified fact]` Ship/keep code-only. Generative LLM chỉ có thể trigger sau commit cho advisory artifact riêng.

### UC-RP-02 — Category suggestion trước submit

- **Classification:** `[Verified fact]` **JEV fit** (`Choice`, optional narrow `Noul`); **LLM fit: reject/not needed** cho current contract.
- **Trigger:** `[Verified fact]` User chọn `income|payment`, nhập description bounded và explicitly invoke suggestion. Sources: `docs/AI-JEV.md` §3–§5 (L21–72); `docs/contracts/openapi.yaml` L338–348, L662–677.
- **Minimal state:** `[Proposal]` `transactionType`, validated/redacted description, active candidates đúng `appliesTo`, locale, candidate/contract version. No amount/date/balance/savings/raw ledger/session/claims/secret/PII thừa.
- **Output contract:** `[Verified fact]` JEV native typed answer (`Choice` probabilities/confidence; optional `Noul`) mapped by code to existing `suggested|manual|disabled|unavailable`, `categoryId`, confidence/reason. LLM prose hoặc prose-parsed category là invalid. Source: `docs/contracts/openapi.yaml` L669–677.
- **Blocking/non-blocking:** `[Proposal]` Bounded JEV request may block only `/ai/category-suggestion` advisory result after explicit click. It MUST NOT block manual picker, first form render, `POST /ledger/transactions`, or final Save; LLM is not called.
- **User control:** `[Verified fact/Proposal]` Manual picker remains visible; `Use`, override, dismiss và Save separate; late JEV response không overwrite explicit choice. `confirmedCategorySuggestion` là acknowledgement, không là authorization. Sources: `docs/AI-JEV.md` §3, §7 (L21–31, L80–89); `docs/contracts/openapi.yaml` L440–449.
- **Fallback:** `[Verified fact]` Flag off, timeout, quota, schema/privacy failure, low confidence, stale candidate, 4xx/5xx → preserve form và manual picker. No nearest-category guess, LLM repair hoặc hidden retry loop.
- **Metrics:** `[Proposal]` JEV-off completion parity; 100% accepted IDs active/correct type; zero auto-submit/auto-commit; override/correct-abstention/manual completion; stale discard; timeout/error classes; per `en|vi × income|payment`; sensitive outbound/log leak = zero.
- **Disposition:** `[Proposal]` Keep existing JEV Gate B; do not add generative LLM. Human-readable label is application localization from canonical category.

### UC-RP-03 — Dashboard/monthly report facts plus optional explanation

- **Classification:** `[Verified fact]` Facts are **code-only**. `[Proposal]` Generative **LLM fit** for optional prose after facts; JEV is not required. A future **both** path is allowed only if a typed JEV signal has a separately proven finite use, and it remains non-blocking.
- **Trigger:** `[Verified fact]` User opens `/reports/dashboard` or `/reports/monthly`; backend returns deterministic snapshot. Sources: `docs/contracts/openapi.yaml` L246–260, L585–601; `docs/DOMAIN-MODEL.md` §3–§4 (L38–67).
- **Minimal state:** `[Proposal]` LLM receives allowlisted fact bundle: source snapshot/version, HCMC period, exact aggregates/directions already calculated, evidence refs, data sufficiency, locale và approved copy constraints. Do not send raw ledger or ask model to calculate delta/top category.
- **Output contract:** `[Proposal]` `generatedCopy` with bounded length, `status`, `factRefs`, source snapshot/version, generated timestamp, locale và stale status. Exact numbers/period/table/source link are rendered from `authoritativeFacts`; unsupported claim/number/reference invalidates copy.
- **Blocking/non-blocking:** `[Proposal]` Deterministic facts can block report response. LLM must be async/read-time optional; first useful report/table/chart cannot wait. User-explicit “Tạo giải thích” may wait only for its panel deadline and detach on timeout.
- **User control:** `[Proposal]` Show facts/source table first; label generated text advisory; user opens evidence, dismisses, refreshes, saves/pins only under future artifact contract. No Apply-to-wallet/budget/payment.
- **Fallback:** `[Proposal]` Deterministic source-linked template, facts-only card hoặc hide optional card on provider/schema/claim/freshness/privacy failure. Never stale generated text as current or synthesize missing facts.
- **Metrics:** `[Proposal]` First useful and facts p50/p95/p99; advisory-ready latency/freshness; claim-to-source validity; unsupported-claim rejection; stale suppression; source-open/comprehension/dismiss; JEV/LLM-off parity; token/cost budget denials. No target values without measurement.
- **Disposition:** `[Proposal]` Future phase after artifact/provenance/stale/i18n/a11y contract. SRS need is not current MVP enablement. Sources: SRS §1.6 (L120–133); `docs/AI-JEV.md` §8 (L91–93).

### UC-RP-04 — Spending-change explanation, tips và budget coaching

- **Classification:** `[Proposal]` **LLM fit** for optional wording only after deterministic candidate facts; JEV prose fit = **reject**. Deterministic status/threshold/CTA = **code-only**. Both is optional only when a finite JEV gate reduces evidenced LLM work without action authority.
- **Trigger:** `[Verified fact]` User opens budget/report/dashboard or deterministic warning is produced after commit. Budget overrun is warning-only and does not reject wallet-sufficient payment. Sources: `docs/DOMAIN-MODEL.md` §4 (L48–67); `docs/contracts/openapi.yaml` L215–245, L559–584.
- **Minimal state:** `[Proposal]` `categoryId/label`, HCMC month, `usedVnd`, `limitVnd`, `isOverrun`, deterministic direction/baseline, candidate copy keys/CTA IDs, source version, locale and data sufficiency. Amounts/status are context, not arithmetic tasks.
- **Output contract:** `[Proposal]` LLM may return short advisory copy plus allowed fact refs and neutral template variant. Code owns threshold, dedupe, warning status, CTA allowlist and exact values. LLM cannot output pay/transfer/set-budget commands or guaranteed savings.
- **Blocking/non-blocking:** `[Proposal]` Exact budget bar/warning and CTA policy may block relevant deterministic read. LLM wording is post-response/worker/read-time optional; never blocks payment, budget mutation or first useful budget facts.
- **User control:** `[Proposal]` Dismiss/read/snooze/feedback and open source transactions/budget; any change uses normal form, CSRF, idempotency and review. Rendering is not consent.
- **Fallback:** `[Proposal]` Static localized warning/template or no coaching card; stale/missing baseline suppresses interpretation. Do not use LLM to fill used/limit or infer financial advice.
- **Metrics:** `[Proposal]` Budget facts parity 100%; zero payment blocks/mutations from advisory; alert noise, source-open/review completion, stale suppression, unsupported causal/advice claims, first useful/advisory p50/p95/p99, token/cost denials.
- **Disposition:** `[Proposal]` Deterministic warning/templates first; LLM later in async artifact worker. Current JEV must not be relabeled prose/coaching. Sources: `docs/PRD.md` §3.3–§3.5 (L33–51); old baseline `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1.2, UC-08–UC-10 (L27–36, L157–194), corrected by `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1.1–§1.3 (L36–76).

### UC-RP-05 — Bounded structured extraction từ text/CSV (future)

- **Classification:** `[Verified fact]` CSV is outside canonical MVP. `[Proposal]` **LLM fit** for extraction; **JEV fit** for a subsequent finite category signal on validated rows; **both** may coexist as separate stages. Parser, validation, import and commit are code-only.
- **Trigger:** `[Proposal]` User uploads bounded file or submits unstructured description after deterministic size/encoding/schema parse and staging. No raw file sent directly to a model. Sources: `docs/PRD.md` §5 (L65–67); `docs/ARCHITECTURE.md` §8 (L67–69); SRS §1.6 (L77–84, L113–119).
- **Minimal state:** `[Proposal]` LLM: opaque job/row ID, redacted description/cell, schema version, allowed fields, locale and parser facts. JEV: validated `income|payment`, redacted description and active candidates. Never model-authoritative amount/date/type.
- **Output contract:** `[Proposal]` Per-row `extractedFields` discriminated schema (`valid|manual|invalid|unsafe`), field errors/review flags and provenance. JEV returns typed category only. `invalid`, `duplicate`, amount/date/type validation and import idempotency are code-owned; no prose parsing.
- **Blocking/non-blocking:** `[Proposal]` Parser/staging may block preview response. LLM/JEV row calls are bounded async; one row timeout must not hide other rows or block core navigation. No row committed before explicit review and normal import semantics.
- **User control:** `[Proposal]` Map columns, inspect every extracted field/row, edit/accept/override/skip, then explicit batch confirmation. Pending/unsafe/ambiguous rows remain manual.
- **Fallback:** `[Proposal]` Provider unavailable/schema failure/queue pressure → deterministic parsed preview + manual fields/category. Parse error → actionable row error. Retry/cancel preserves preview and cannot create silent partial commit.
- **Metrics:** `[Proposal]` Zero silent row loss/duplicate; 100% committed rows explicitly reviewed; field rejection/override/manual rates; row-order reassembly; queue age/concurrency; completion time vs manual baseline; zero model-authored amount/date/type; p50/p95/p99 per row/job after measurement.
- **Disposition:** `[Proposal]` Defer with CSV. Prove parser/staging/import/retention/partial-failure/idempotency/privacy first; then test LLM extraction and optional JEV category separately.

### UC-RP-06 — Transaction intent/help/correction routing

- **Classification:** `[Proposal]` JEV fit for finite intent/area routing; LLM may fit extraction of fields from free-form help text; **both** are possible only as independent advisory stages. Correction role, target, amount, category and append-only mutation are code/human-only.
- **Trigger:** `[Proposal]` User explicitly opens help/correction or submits issue text; never invoke model inside correction command or money transaction.
- **Minimal state:** `[Proposal]` Redacted message, opaque screen/target context, finite area/intent candidates, locale and rubric/schema version. No raw ledger, full balance, session/claims, secret or correction command.
- **Output contract:** `[Proposal]` JEV `Choice/Noul` route hint; optional LLM extracted fields only after schema validation. Application maps to help form/static copy; user selects target/reason and normal correction endpoint revalidates ownership/idempotency/append-only rules.
- **Blocking/non-blocking:** `[Proposal]` Issue submission and static help complete without either model. Suggestion panel may wait on one bounded advisory call; LLM extraction is non-blocking and must not delay issue creation or correction form.
- **User control:** `[Verified fact/Proposal]` User chooses target/reason and can change route or use manual menu; admin cannot accept correction on behalf of user. Sources: `docs/contracts/API-REVIEW.md` §Ledger correction (L23–30); `docs/DOMAIN-MODEL.md` §5 (L83–85).
- **Fallback:** Manual help/correction menu and masked issue flow. Ambiguous integrity/security issue escalates to human/support; no guessed reversal/adjustment/replacement and no model repair loop.
- **Metrics:** Correct-form routing, manual completion, unsafe abstention, issue submission parity, zero JEV/LLM-created correction, zero wrong-owner exposure, zero model fields reaching command without revalidation.
- **Disposition:** `[Proposal]` Defer bounded assist; deterministic correction/help ships first. JEV is stronger finite-routing fit; LLM is optional extraction, not authority.

### UC-RP-07 — Masked admin issue assistance

- **Classification:** `[Verified fact]` Admin authority is code/human-only. `[Proposal]` JEV may classify finite masked topic; LLM may draft concise internal summary only if security/privacy owner approves; **both future advisory**, never autonomous.
- **Trigger:** `[Proposal]` Admin explicitly asks for assist on a validated/masked issue; no background scan of all issues by default.
- **Minimal state:** `[Proposal]` Masked issue text, opaque issue ID, finite allowed areas, safe metadata and locale; no raw ledger, audit detail, secret, Google claim or cross-owner financial data.
- **Output contract:** `[Proposal]` Typed area/needs-escalation signal plus optional LLM summary with evidence refs to masked fields. Status/priority/assignment/P0–P2/incident and audit remain admin policy/code-owned.
- **Blocking/non-blocking:** `[Proposal]` Issue queue, issue submission and admin actions work without model. Explicit assist may block only its panel; worker precompute must never block admin queue.
- **User control:** `[Verified fact/Proposal]` Admin reviews, edits, accepts or dismisses; security/owner decides incident. Source: `docs/ADMIN-OPERATIONS.md` §1–§7 (L3–51).
- **Fallback:** Deterministic queue/manual triage; model unavailable means no lost issue and no guessed priority. P0 concern disables assist and preserves evidence.
- **Metrics:** Human-confirmed decisions 100%; zero privilege/data leak; zero auto-close/priority/money action; routing agreement/abstention; queue latency and JEV/LLM-off parity.
- **Disposition:** `[Proposal]` Defer until masked-input, role, audit, retention and privacy contract; reject autonomous admin JEV/LLM.

### UC-RP-08 — Feedback/override instrumentation and learning

- **Classification:** `[Verified fact]` Structured feedback can be recorded separately; **code-only** is preferred. `[Proposal]` LLM extraction/JEV classification are optional for free-text feedback, **both** only after consent/retention contract. No model learns or silently recategorizes history.
- **Trigger:** `[Verified fact/Proposal]` User accepts/overrides/dismisses category or submits correction/feedback, after the primary action; never inside money transaction.
- **Minimal state:** `[Proposal]` Event kind, before/after category IDs, candidate/rubric/schema version, locale and redacted feedback text if needed; no raw ledger/amount/balance/secret.
- **Output contract:** `[Proposal]` Append-only quality event or bounded `feedbackDisposition`; no retraining command, category rewrite, correction role or money mutation.
- **Blocking/non-blocking:** `[Proposal]` Primary save/correction response must not wait. Event write/worker is post-response; failure leaves original immutable row and manual behavior intact.
- **User control:** `[Proposal]` User sees approved feedback/opt-out semantics if product chooses them; correction still follows normal form and confirmation. Do not promise “learned immediately”.
- **Fallback:** Record structured event if safe, otherwise omit/defer classification; no raw text fallback, no silent adaptation, no history mutation.
- **Metrics:** Original rows immutable; feedback event idempotency/traceability; no raw sensitive payload; holdout override/correct-abstention only after evaluation; worker queue/failure; JEV/LLM-off behavior parity.
- **Disposition:** `[Proposal]` Defer adaptation; instrumentation only after consent/retention/version policy. Source: `docs/DOMAIN-MODEL.md` §5 (L83–85); corrected System One baseline `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1.3 (L63–76).

## 12. Deterministic composition and fallback hierarchy

### 12.1 Common composition

**[Proposal]** Mọi capability có model phải đi qua pipeline:

```text
explicit trigger hoặc post-commit event
  -> auth/owner/CSRF + input/privacy gate (code)
  -> deterministic facts/staging + source snapshot (code)
  -> choose topology + admission budget (code)
  -> JEV typed and/or generative LLM (server-only, optional)
  -> deadline/cancel + transport validation
  -> discriminated schema validation (no prose repair)
  -> candidate/field/fact-reference/freshness validation (code)
  -> deterministic composition + localized app-owned UI
  -> user inspect/accept/override/dismiss (nếu cần)
  -> normal domain API for any money state
```

**[Proposal]** Với generative output, validator reject output thiếu schema, quá lớn, field ngoài allowlist, claim không có `factRef`, số không khớp fact bundle, locale không được phép hoặc instruction-like content. Không gọi LLM thứ hai để sửa output hỏng; fallback template/manual.

**[Verified fact]** Local policy cấm chat-completion substitution để giả typed JEV và cấm parse prose/JSON tự phát; JEV timeout/quota/schema/privacy/low-confidence phải fallback manual. Sources: `docs/AI-JEV.md` §2, §5–§7 (L15–19, L64–89); `docs/ARCHITECTURE.md` §5–§6 (L43–56); `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-ARCH-OPS.md` §7.4 (L266–276).

### 12.2 Output classes

**[Proposal]** Phân biệt bốn output:

1. `authoritativeFacts`: số liệu/period/category/status từ backend; chỉ class này dùng cho money/report/budget semantics.
2. `typedSignal`: JEV answer đã validate (`choice`/`noul`/`score`) hoặc application status map; chỉ advisory.
3. `generatedCopy`: LLM text optional, gắn `sourceSnapshot`, `factRefs`, `generatedAt`, `stale` và status; không parse ngược thành facts.
4. `extractedFields`: LLM structured fields đã validate vào staging; user review/normal domain validation trước persistence có ý nghĩa tiền.

**[Proposal]** UI luôn render `authoritativeFacts` trước `typedSignal`/`generatedCopy`. LLM copy không được thay exact value, warning semantics, source link, CTA allowlist, status/ARIA hoặc error message do application localization sở hữu.

### 12.3 Fallback hierarchy

**[Proposal]** Từ mạnh nhất đến yếu nhất:

1. **Money/core:** deterministic domain response; lỗi thật thì error, không fake/zero.
2. **Category:** active manual picker, giữ form, không mất input.
3. **Dashboard/report/budget:** authoritative chart/table/facts; static localized copy nếu safe.
4. **Explanation/coaching:** deterministic template từ facts hoặc hide card; stale/unsafe/unavailable không render.
5. **Extraction:** parsed/staged preview + field-level manual/invalid/skip; không commit unresolved.
6. **Admin/help:** manual menu/triage/support; không guessed priority/role.

**[Verified fact]** JEV off/unavailable phải giữ money path và manual flow; sources: `docs/PRD.md` §4 (L53–63), `docs/AI-JEV.md` §7 (L80–89), `docs/ARCHITECTURE.md` §6 (L49–56).

## 13. Corrections/extensions to old findings

### 13.1 Extension from `jev-product-analysis`

**[Correction]** Old product analysis `FINAL-FINDINGS.md` §1.1–§1.2, §3 UC-06–UC-10 và các cards `CC-JEV-INSIGHT-COACH.md` mô tả JEV như lớp narrative/summary/coaching/NBA wording. `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` đã sửa: System One không sinh prose/reasoning/next action. Trong routing mới:

- report/budget/dashboard facts và template là code-only;
- explanation/copy, nếu product vẫn cần, là **generative LLM capability riêng** hoặc application-authored template;
- typed JEV signal có thể đứng cạnh LLM trong future **both** topology, nhưng không phải author prose và không được bắt LLM cascade trên critical path;
- NBA/CTA vẫn deterministic allowlist, không model-selected.

### 13.2 Extension from System One operations findings

**[Verified fact]** `CC-JEV-SYSTEM-ONE-ARCH-OPS.md` đã xác định synchronous pre-submit, async post-commit, read-time và offline/batch placements; JEV không block money path, code giữ sequencing, provenance, fallback. File này **mở rộng** lớp generative LLM nhưng giữ nguyên boundary:

- JEV-only giữ cho typed category/finite signal;
- LLM-only dùng cho copy/extraction khi không cần typed gate;
- parallel fan-out không được `await` join trước core response;
- JEV-gated LLM là optional worker topology, không phải hidden repair loop;
- cache/precompute phục vụ advisory artifact nhưng không thay source snapshot;
- performance claim phải có p50/p95/p99 probe, không lấy official “fast” hay user model name làm measurement.

### 13.3 Correction to SRS interpretation

**[Verified fact]** SRS là product brief rộng hơn canonical MVP và có summary/tips/CSV/AI support; PRD, architecture, domain, OpenAPI và delivery plan là sources khóa MVP/deferred. Không vì SRS yêu cầu prose mà đưa generative LLM vào critical path, không vì SRS có `Insight` example mà tạo schema/endpoint. Sources: SRS §1.6–§1.8 (L73–295), `docs/PRD.md` §5 (L65–67), `docs/ARCHITECTURE.md` §8 (L67–69), `docs/DELIVERY-PLAN.md` §9 (L57–60).

## 14. Enablement gates và recommendation sequence

**[Proposal]** Thứ tự khuyến nghị:

1. **Ship/measure deterministic core first:** money/auth/read baseline; JEV-off parity and p50/p95/p99 evidence.
2. **Gate existing JEV category:** compatibility/privacy/schema/threshold/manual/a11y/stale/fallback evidence; no generative LLM dependency.
3. **Add deterministic templates before LLM:** establish whether explanation need is already solved by fact-linked localized copy.
4. **Probe generative adapter:** model/API identity (including explicit unresolved `GPT 5.6 luna`), schema, privacy, timeout/cancel, errors, usage/cost, latency and availability; synthetic/anonymized only.
5. **Pilot LLM-only async explanation:** cache/precompute or post-response worker; no money path; claim/fact validator; no stale-as-current; kill switch.
6. **Pilot bounded extraction only after staging contract:** per-field validation/review/idempotency/partial failure; JEV category remains a separate optional stage.
7. **Evaluate parallel/cascade only if needed:** compare against LLM-only/template baseline; require measured queue/backpressure/token/cost effects and no core percentile regression.
8. **Release gate:** JEV/LLM off preserves every core acceptance criterion; provider outage does not break money/auth/report; no secrets/raw payload/PII; a11y/i18n/progressive UX verified; rollback disables advisory capability only.

**[Unresolved]** Owner has not yet approved a generative API/provider/model, public artifact contract, queue implementation, retention/consent policy, exact thresholds, timeout values, cost budget values or production availability. Until resolved, disposition is deterministic/manual, JEV according to existing Gate B, generative LLM disabled.

## 15. Evidence index

### Official

- [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one) — typed decisions/probabilities, not generated text; code composes workflow.
- [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) — code/control flow, deterministic rules, narrow questions and independent parallel questions.
- [State](https://docs.typesafe.ai/concepts/state) — one state, multiple independent questions, text/object/array.
- [API](https://docs.typesafe.ai/api) — request/answer schema and token usage fields.
- [Confidence](https://docs.typesafe.ai/confidence) — confidence from probability distribution; thresholds scale with risk; no guarantee for an individual answer.
- [Choice](https://docs.typesafe.ai/primitives/choice), [Noul](https://docs.typesafe.ai/primitives/noul), [Score](https://docs.typesafe.ai/primitives/score) — typed primitive semantics.
- [OpenRouter System One reference](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md) — typed request/response, usage and documented HTTP errors for System One.
- [OpenRouter Data Collection](https://openrouter.ai/docs/guides/privacy/data-collection.md) — retention/logging/provider policy and metadata collection considerations.

### Local

- `AGENTS.md` L26–39, L42–63, L99–141, L187–208 — layered boundary, secret/privacy, no provider in money transaction, bounded performance and JEV fallback.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.4–§1.7 — broad product AI requirements, advisory/override and performance expectation.
- `docs/PRD.md` §1, §3.2–§3.5, §4–§6 — deterministic core, category-only JEV, JEV-off parity and scope cut.
- `docs/DOMAIN-MODEL.md` §1, §3–§5 — VND/HCMC formulas, immutable ledger, owner/invariants and no JEV authority.
- `docs/ARCHITECTURE.md` §1–§8 — browser/API/domain/persistence boundary and no provider in money transaction.
- `docs/AI-JEV.md` §1–§8 — typed compatibility, category contract, redaction, bounded failure/fallback and deferred prose.
- `docs/contracts/openapi.yaml` L102–129, L215–260, L338–348, L440–449, L662–677 — current deterministic routes and category suggestion contract.
- `docs/contracts/API-REVIEW.md` L5–48 — cache/auth/CSRF/owner/idempotency/response/domain constraints.
- `docs/ADMIN-OPERATIONS.md` §1–§8 — least privilege, masked report workflow and operational metrics.
- `docs/AUTHENTICATION.md` §3–§7 — server-side session, owner scope and fail-closed auth.
- `docs/DELIVERY-PLAN.md` §1–§12 — gates, JEV probe, JEV-off smoke and scope cut.
- `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1–§8 — corrected typed System One capability and old finding corrections.
- `docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-ARCH-OPS.md` §4–§10 — placement, operations, fallback, provenance and UX state machine.
- `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1–§8 — read-only historical baseline; prose assumptions are corrected above, file remains unchanged.

**Kết luận:** Giữ JEV là typed, hẹp, optional và code-composed. Bổ sung generative LLM chỉ như lớp explanation/extraction advisory ở async/read-time/worker hoặc panel explicit; ưu tiên deterministic template/cache trước. Không để JEV, LLM, fan-out join, cascade, queue hay cache block authoritative critical response. Không hứa p50/p95/p99, model/API availability, cancellation, cost hoặc “GPT 5.6 luna” cho đến khi probe/measurement chứng minh; khi thiếu evidence, fallback manual/facts và giữ capability off.
