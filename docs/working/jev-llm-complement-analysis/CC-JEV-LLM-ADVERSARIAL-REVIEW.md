# CC-JEV-LLM-ADVERSARIAL-REVIEW

> **Trạng thái:** working adversarial product/system review; không phải ADR, canonical contract, runtime implementation hoặc quyết định bật provider.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa SRS, ADR, architecture, domain, auth, OpenAPI, source runtime hoặc các artifact baseline trong `docs/working/jev-system-one-analysis/` và `docs/working/jev-product-analysis/`.
>
> **Mục tiêu:** kiểm tra có nên bổ sung một generative LLM qua API bên cạnh JEV TypeSafe System One để làm explanation/extraction/prose hay không, mà không làm giảm phản hồi, hiệu năng hoặc độ tin cậy của critical path.
>
> **Phân loại bằng chứng:** `[Verified fact]` là điều đọc được từ official/local source; `[Proposal]` là khuyến nghị thiết kế cần owner phê duyệt; `[Unresolved]` là thiếu probe, contract, policy hoặc runtime evidence và không được diễn giải thành capability đã có.

---

## 1. Verdict ngắn và điều kiện quyết định

### 1.1. Kết luận adversarial

**[Proposal] Không nên thêm generative LLM vào critical path của Campus Coin ở thời điểm này.** Nên giữ JEV/System One là lane typed decision riêng, tiếp tục default-off/manual-first; core deterministic phải ship và đo được độc lập. Có thể **defer production rollout nhưng chuẩn bị một pilot read-only, post-response/worker** cho monthly explanation hoặc spending-change copy, chỉ sau khi các evidence gate ở §8 đạt. Pilot đó phải nhận deterministic fact snapshot đã đóng băng, trả một contract riêng, có source/claim validation, locale/app-owned UI, stale policy, bounded token/cost budget và kill switch.

**[Verified fact]** Campus Coin là tracker do user tự nhập, không phải ngân hàng/tiền thật; backend/domain là nguồn sự thật cho wallet, savings, budget và report. `income`/`payment` là hai transaction type canonical, ledger immutable/append-only, và JEV không có quyền tính tiền, authorize hoặc ghi money state (`docs/PRD.md` §1, L3–7; `docs/DOMAIN-MODEL.md` §1, §3–5, L3–14, L38–85; `docs/ARCHITECTURE.md` §2, §4–6, L21–56).

**[Verified fact]** SRS mô tả nhu cầu monthly AI summary, tips, CSV, anomaly và forecast, nhưng canonical MVP đã scope-cut complex AI summary/prediction/autonomous action/CSV; JEV hiện chỉ có category suggestion trước submit (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5–§1.6, L65–71, L113–166; `docs/PRD.md` §3.5, §5, L45–51, L65–67; `docs/AI-JEV.md` §8, L91–93; `docs/DELIVERY-PLAN.md` §9, L57–60).

**[Verified fact]** TypeSafe System One/Jev trả typed answers và probabilities, không viết replies, code hoặc explanation reasoning; code giữ control flow, deterministic rules và side effects. Official sources: [System One](https://docs.typesafe.ai/concepts/system-one), [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [Confidence](https://docs.typesafe.ai/confidence). Vì vậy generative LLM là **một capability/adapter khác**, không phải phần mở rộng ngầm của JEV và không được dùng làm fallback để giả lập typed System One.

**[Unresolved]** Provider, generative endpoint, model ID, availability, latency, retention/privacy, quota và pricing của LLM mới chưa được chứng minh trong các nguồn đã đọc. Cụm `GPT 5.6 luna` là **ví dụ chưa được kiểm chứng**, không được ghi vào allowlist/config, không được coi là model tồn tại, và không được dùng làm bằng chứng chất lượng hay tốc độ. Review này không tranh luận lại bảng giá provider; chỉ yêu cầu token/cost budget như một control bắt buộc.

### 1.2. Quyết định đề xuất

| Quyết định | Disposition | Điều kiện tối thiểu |
|---|---|---|
| Deterministic core: auth, wallet, ledger, savings, budget, dashboard/report, manual category, `en`/`vi`, accessibility | **Ship** | Không phụ thuộc JEV hoặc generative LLM; fallback/error vẫn hoàn tất được tác vụ core. `docs/PRD.md` §3–4, L17–63; `docs/DELIVERY-PLAN.md` §1, L6–8. |
| JEV category suggestion | **Ship riêng sau Gate B hiện có; không cần LLM** | Typed compatibility, candidate membership, explicit user review, manual fallback, privacy và JEV-off parity. `docs/AI-JEV.md` §2–7, L15–89. |
| Generative LLM cho monthly explanation/spending-change copy | **Defer; có thể pilot sau các gate** | Fact snapshot/version, claim-to-source validator, async/non-blocking placement, locale/a11y, stale/fallback, quality/performance/budget evidence. |
| Generative LLM cho budget coaching wording | **Defer; template deterministic trước** | Backend đã quyết định `usedVnd`/`limitVnd`/`isOverrun`/threshold/dedupe; LLM chỉ viết copy tùy chọn, không chọn CTA hay chính sách. `docs/DOMAIN-MODEL.md` §4, L54–67. |
| Generative LLM cho extraction | **Defer cùng capability contract** | Parse/validate/stage deterministic trước; output chỉ là đề xuất có schema, không phải money authority; user review trước mọi import. CSV hiện ngoài MVP. |
| LLM thay JEV category, hoặc chat/prose fallback cho JEV typed endpoint | **Reject** | JEV contract và role khác nhau; không parse prose/JSON tự do để cứu typed failure. `docs/AI-JEV.md` §2, L15–19; `docs/ARCHITECTURE.md` §5, L43–47. |
| LLM arithmetic, balance/budget/report, payment authorization, ledger/savings/budget/correction write | **Reject tuyệt đối** | Vi phạm domain boundary, dù prompt có yêu cầu “chỉ giải thích”. |
| Autonomous agent, action selection, admin dispute/triage authority, forecast/financial advice | **Reject trong phạm vi này** | Không trao control flow/side effect/authority cho model; forecast còn thiếu methodology và safety decision. |

### 1.3. Vì sao không “thêm LLM là đủ”

**[Proposal]** LLM có thể giải quyết khoảng trống mà JEV cố ý không giải quyết: diễn đạt câu chữ, rút gọn copy, hoặc trích xuất trường không-authoritative từ unstructured text. Nhưng nó đồng thời mở thêm các failure mode mà JEV typed decision giảm bớt: fluent hallucination, unsupported causal claims, prompt injection, PII retention, model drift, token amplification, availability variance, locale mismatch và cache staleness. Vì vậy “LLM có thể viết prose” không đồng nghĩa “LLM nên nằm trên request cần phản hồi ngay”, cũng không đồng nghĩa “schema hợp lệ là nội dung đúng”.

**[Proposal]** Quy tắc mặc định là:

```text
facts deterministic
  -> snapshot + provenance + freshness
  -> (optional) JEV typed signal OR generative LLM advisory, never authority
  -> schema/claim/safety/locale validation
  -> app-owned UI + source link + user control
  -> no financial side effect
```

Không có đường đi từ output LLM tới wallet, ledger, savings, budget, authorization, correction, admin state hoặc notification trigger.

---

## 2. Nguồn và boundary được dùng làm oracle

### 2.1. Local canonical evidence

- **[Verified fact]** `docs/PRD.md` §1, §3.2–§3.5, §4–§6 (L3–73): backend deterministic là nguồn sự thật; JEV optional/category-only, default-off, user confirm/override, JEV-off money path phải chạy; complex AI/prediction/autonomous action ngoài MVP.
- **[Verified fact]** `docs/DOMAIN-MODEL.md` §1, §3–§5 (L3–14, L38–85): VND integer/exact semantics, `income|payment`, wallet/savings/budget/report formulas, immutable ledger, append-only correction, budget warning-only, JEV không bypass invariant.
- **[Verified fact]** `docs/ARCHITECTURE.md` §2, §4–§8 (L21–69): browser không giữ secret/gọi provider; API validate; domain giữ money/period/authorization/report; không gọi provider trong money transaction; JEV failure không block money path.
- **[Verified fact]** `docs/AI-JEV.md` §1–§8 (L5–93): System One typed contract, Day-1 compatibility probe, minimal redacted state, server-only, bounded timeout/concurrency/cost, manual fallback, không raw financial data, monthly prose/extraction/prediction để sau.
- **[Verified fact]** `docs/contracts/openapi.yaml` `/ai/category-suggestion`, `/ledger/transactions`, `/budgets/summary`, `/reports/monthly`, `/reports/dashboard` và schemas (L102–129, L238–260, L338–348, L440–449, L559–610, L662–677): public contract hiện không có insight/prose/extraction resource; `confirmedCategorySuggestion` không phải authorization.
- **[Verified fact]** `docs/contracts/API-REVIEW.md` §Domain scope, §Response, §Admin, §Ledger correction (L14–44): warning/error/date semantics, owner/idempotency/admin/correction boundaries; insight/LLM artifact contract chưa tồn tại.
- **[Verified fact]** `docs/AUTHENTICATION.md` §3–§6 (L16–51): Google OAuth, opaque server session, owner scope từ session, CSRF/origin, fail closed, JEV không có role/session/authorization.
- **[Verified fact]** `docs/ADMIN-OPERATIONS.md` §1–§8 (L3–55): admin least privilege, masked issue flow, no ledger mutation, JEV/privacy/cost incident phải tắt JEV trước, chỉ aggregate ops metrics.
- **[Verified fact]** `docs/DELIVERY-PLAN.md` §1–§12 (L6–79): production gate là core/auth/domain/restore/UI/security; thiếu JEV evidence chỉ chặn JEV enablement; JEV có thể giữ off.
- **[Verified fact]** `AGENTS.md` §Tooling/architecture, §JEV/OpenRouter, §Backend/API, §React/frontend, §Performance (L26–39, L87–107, L133–141, L187–194): no provider claim without evidence, server-only secret, bounded work, no open transaction, accessible bilingual UI, owner/cache/fallback rules.

### 2.2. Historical baseline và correction cần giữ

**[Verified fact]** `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1–§7 và handoffs `CC-JEV-SYSTEM-ONE-REVIEW.md`, `CC-JEV-SYSTEM-ONE-CAPABILITY.md`, `CC-JEV-SYSTEM-ONE-ARCH-OPS.md`, `CC-JEV-SYSTEM-ONE-USECASES.md` đã correction một overclaim trong `docs/working/jev-product-analysis/FINAL-FINDINGS.md` và các lane cũ: JEV/System One không tạo monthly prose, explanation, coaching, tip hoặc next-best action. Các phần đó chỉ có thể là deterministic application composition hoặc một capability generative khác.

**[Proposal]** Bổ sung generative LLM không “sửa” historical baseline bằng cách gán prose trở lại cho JEV. Nó tạo một lane mới với ranh giới mới:

1. **JEV lane:** typed Choice/Noul/Score, category suggestion hiện tại; không prose.
2. **Generative lane:** explanation/copy/extraction bounded; có thể trả text hoặc structured fields nhưng phải qua validator; không authority.
3. **Code/domain lane:** facts, arithmetic, thresholds, source refs, stale, owner, authorization, persistence và side effects.

**[Correction]** Các đề xuất cũ “JEV diễn đạt fact bundle” chỉ được giữ ở placement (sau facts, async/read-time), không được giữ ở actor. Generative LLM có thể là actor tạo copy nếu được duyệt; JEV vẫn không phải actor đó. Evidence: `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1.1–§1.2, §3, L11–82; `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1–§3, L11–42, L131–207.

---

## 3. Adversarial findings severity-ranked

> `Critical` = có thể làm sai authority, lộ dữ liệu hoặc làm critical path unsafe; `High` = có thể gây suy giảm correctness/availability/trust/cost đáng kể; `Medium` = fragility/maintainability cần gate trước rollout. Confidence ở đây là confidence của finding dựa trên source đã đọc, không phải model confidence.

### F-LLM-01 — Critical: Fluent prose bị nhầm là số liệu/financial advice

- **[Verified fact]** SRS yêu cầu AI output chỉ advisory và user phải xem xét/ghi đè; PRD nói app không phải ngân hàng và không cung cấp certified financial advice (`SRS..._vi.md` §1.5, L65–71; `docs/PRD.md` §1, L3–7). Backend/domain mới là authority (`docs/DOMAIN-MODEL.md` §1, §4, L3–14, L54–67).
- **Adversarial mechanism:** Câu “chi tiêu tăng vì…”, “bạn nên cắt…”, hoặc con số lặp lại từ prompt có thể rất tự nhiên nhưng không chứng minh được nguyên nhân, completeness của dữ liệu, hay tính đúng của số. User có thể coi tone tự tin là approval hoặc advice, nhất là khi card đứng cạnh budget/report.
- **Failure impact:** User hiểu sai tình hình, thay budget/payment/savings dựa trên câu văn; trust mất dù ledger vẫn đúng. Nếu câu văn chứa số mới hoặc đổi đơn vị/tháng, UI tạo một nguồn sự thật thứ hai.
- **[Proposal] Fix:** LLM chỉ nhận fact IDs/allowlisted aggregates đã tính; output phải kèm claim references hoặc template slots. Validator kiểm tra mọi claim/number/period against snapshot; unsupported/causal/financial-advice claim bị suppress. UI tách “Số liệu từ báo cáo” và “Diễn giải tham khảo”, có source/as-of/stale và action xem bảng nguồn. Deterministic template là fallback và baseline.
- **Gate:** Claim-to-source exactness 100% trên evaluation set; 0 output mâu thuẫn report/budget; user comprehension phân biệt fact vs interpretation đạt ngưỡng do owner chốt; không có generated artifact nếu thiếu source snapshot.

### F-LLM-02 — Critical: Structured extraction bị biến thành money write qua cửa sau

- **[Verified fact]** Domain yêu cầu positive integer VND, `income|payment`, category đúng lifecycle, owner/idempotency/wallet và append-only ledger; amount/date/type/category không do JEV quyết định (`docs/DOMAIN-MODEL.md` §4–§5, L54–85; `docs/contracts/openapi.yaml` L440–449; `docs/AI-JEV.md` §3–§6, L21–78).
- **Adversarial mechanism:** “Extraction” dễ trượt từ merchant/category/intent sang amount/date/type/balance. Schema JSON hợp lệ chỉ chứng minh payload parse được, không chứng minh field đúng. Parse prose hoặc auto-fill hidden form có thể khiến user tưởng đã review.
- **Failure impact:** Sai số tiền/ngày/type/category, duplicate import, hoặc commit row không explicit review; correction phải append-only và có thể làm report/history phức tạp.
- **[Proposal] Fix:** Parser/code xử lý file bounds, encoding, amount/date/type/owner/idempotency trước. LLM chỉ đề xuất bounded fields; output staged, có source span, schema/version, no direct command. Mọi financial field do LLM trả phải hiển thị diff và user review; normal domain revalidate ngay trước commit. Không parse free prose để ghi money.
- **Gate:** 100% committed row có explicit review; 0 LLM-originated amount/date/type được dùng làm authority; 0 silent row loss/duplicate; malformed/ambiguous extraction → manual/invalid, không “repair” bằng model thứ hai.

### F-LLM-03 — Critical: Prompt injection và data exfiltration tăng khi gửi context giàu hơn

- **[Verified fact]** Description/CSV cell là user input; canonical yêu cầu server-only, redact, minimal state, không gửi balance, savings, raw ledger, claims, session, secret hoặc PII thừa; không log raw prompt/response (`docs/AI-JEV.md` §3–§6, L21–78; `docs/ARCHITECTURE.md` §5–§6, L43–56; `AGENTS.md` L42–49, L130–141).
- **Adversarial mechanism:** Generative prose thường bị yêu cầu thêm context để “giải thích tốt hơn”. Text như “ignore policy”, prompt extraction, authorize payment, hoặc nội dung PII có thể được model echo vào output, logs, cache, provider telemetry hoặc user-visible copy. Safety classifier riêng không đủ làm security boundary.
- **Failure impact:** Lộ PII/financial detail/secret, instruction-following sai, hoặc output bị lưu lâu hơn policy. Nếu model được đưa tool/action context, lỗi có thể escalates thành authority bypass.
- **[Proposal] Fix:** Allowlist/redact deterministic trước outbound; text là data, không phải instruction. Không gửi tool schema, command, session, role, raw ledger hoặc raw file. Suppress suspicious input/output, không echo raw; generative output không có quyền gọi tool/route. Privacy uncertainty → no outbound/manual/static fallback. Server giữ secret và rate limit.
- **Gate:** Synthetic injection/PII/secret fixtures trong `en`/`vi`; zero sensitive outbound/log/cache; zero action execution; security review xác nhận provider retention/usage policy và deletion/retention contract trước enablement.

### F-LLM-04 — Critical: Stale artifact/cache làm user thấy sự thật cũ như hiện tại

- **[Verified fact]** Ledger correction/new transaction/category lifecycle/budget/report semantics có thể thay đổi facts; domain yêu cầu immutable/rebuild và HCMC period (`docs/DOMAIN-MODEL.md` §3–§5, L38–85; `docs/contracts/API-REVIEW.md` §Domain scope, L39–44). Canonical hiện chưa có insight/LLM artifact schema, snapshot version, stale/invalidation hoặc save/dismiss contract (`docs/contracts/API-REVIEW.md` §Domain scope; SRS §1.8, L282–295).
- **Adversarial mechanism:** Async job hoặc cache hoàn tất sau khi source đổi; cache key thiếu owner/locale/policy/model/source version; saved prose tiếp tục xuất hiện cạnh report mới. “Generated recently” không đồng nghĩa “facts current”.
- **Failure impact:** User tin lời giải thích cũ, thấy mismatch với chart/report, hoặc dữ liệu user A rò sang user B. Cache invalidation sai có thể tạo cả integrity và privacy incident.
- **[Proposal] Fix:** Mỗi artifact mang owner scope server-side, source snapshot/version, period + `Asia/Ho_Chi_Minh`, `asOf`, locale, contract/policy/model snapshot và status. Cache chỉ owner-scoped, versioned và deterministic-keyed; mutation/correction/category/budget/locale/policy change làm artifact stale hoặc discard. Stale artifact chỉ được hiển thị với badge rõ, không drive action; thiếu freshness → facts/static fallback. Không lưu raw prompt/response mặc định.
- **Gate:** Replay mutation-after-generation và cache cross-owner tests; 100% stale source bị suppress hoặc gắn stale đúng; 0 cross-owner hit; saved snapshot không silent overwrite; cache hit/miss/freshness metrics có audit.

### F-LLM-05 — High: Giả định generative LLM đủ nhanh làm hỏng critical response

- **[Verified fact]** TypeSafe mô tả System One là “fast” và tài liệu chính thức có nêu “most queries complete in about 100 ms” ([System One](https://docs.typesafe.ai/concepts/system-one), [How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)). Đây là mô tả của System One, **không phải SLA của generative API**, không phải bằng chứng Campus Coin runtime/p95.
- **[Unresolved]** Chưa có measurement nào cho generative model/API về p50/p95/p99, time-to-first-byte, output length, queueing, cold start, cancellation, error tail hoặc concurrent behavior. Không hứa “nhanh”, “real-time” hay “negligible overhead”.
- **Adversarial mechanism:** Chờ LLM trong add transaction/report load làm tăng TTFB; retry/cascade làm tail dài hơn; một provider stall giữ connection/worker và tạo waterfall. “Async” trên sơ đồ nhưng UI await Promise thực tế vẫn là blocking.
- **[Proposal] Fix:** Facts/core render trước. Monthly explanation/tips chạy post-response/worker; read-time chỉ lấy artifact sẵn có. Pre-submit category dùng JEV riêng và không chờ generative LLM. Nếu pilot cần synchronous optional enrichment, timeout độc lập, cancel/discard late result, không khóa Save/navigation. Đo end-to-end dưới tải tương tự trước khi chọn placement.
- **Gate:** So sánh deterministic-only, JEV-only, LLM-only, parallel fan-out, JEV-gated cascade, async worker và cache/precompute trên cùng fixture/load. Báo p50/p95/p99 critical TTFB, first useful content, task completion, optional artifact readiness, timeout/fallback; target là `[Unresolved]` do owner chốt, không bịa số.

### F-LLM-06 — High: Availability/model identity bị coi là đã có

- **[Verified fact]** OpenRouter System One reference mô tả route typed `/systemone`, model/provider/usage response và các nhóm HTTP error; local `docs/AI-JEV.md` yêu cầu probe endpoint/model/quota/privacy trước enablement (`docs/AI-JEV.md` §1–§2, L5–19; [OpenRouter System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md)). Điều này không xác minh một generative model cụ thể.
- **[Unresolved]** `GPT 5.6 luna` chỉ là ví dụ user nêu; chưa đọc được official API/model page nào xác minh existence, exact ID, access, capability, quota, privacy, region, availability hay contract. Không được claim model/API tồn tại, fast, stable hoặc production-ready.
- **Adversarial mechanism:** Hardcode model name, silent alias drift, provider outage, quota/4xx/5xx/429, model retirement hoặc fallback sang model chưa allowlist. “Available in console” cũng không phải server production evidence.
- **[Proposal] Fix:** Server-side model registry allowlist exact provider/model/endpoint/version; startup/deploy compatibility probe ghi schema/error/usage/privacy config nhưng không log secret. Unknown model/transport/privacy → feature disabled. Runtime health/kill switch trả static deterministic fallback, không tự chọn model khác từ user input, không tự fallback generative → JEV prose.
- **Gate:** Probe signed/dated artifact per environment, exact response schema, auth, timeout/cancellation, error mapping, quota and provider policy; model drift/alias change triggers disable/review. `GPT 5.6 luna` remains unresolved until official evidence is actually read.

### F-LLM-07 — High: Quality/hallucination bị đánh đồng với schema validity

- **[Verified fact]** JEV confidence/probabilities là uncertainty signal, không guarantee từng answer; threshold do code theo risk ([Confidence](https://docs.typesafe.ai/confidence); `docs/AI-JEV.md` §1, L5–13). Generative output càng không có authority chỉ vì trả HTTP 200/JSON hợp lệ.
- **Adversarial mechanism:** Model invents causal reason, combines two periods, omits caveat, changes VND formatting, uses unavailable category label, or turns sparse history into trend. Human thumbs-up/engagement không bắt được unsupported claims.
- **Failure impact:** Mất trust, advice harmful/shaming, user action sai; quality regressions có thể đến từ prompt/template/model version mà không có compile error.
- **[Proposal] Fix:** Fact bundle có stable claim IDs; output chỉ được reference allowlisted claims. Post-processor kiểm tra numeric/string/date/currency/period/category against source, banned causal/advice patterns, output length/schema and locale. Nếu không chứng minh claim, suppress whole artifact; không “chỉnh cho nghe hay” bằng hidden repair LLM. Deterministic template trước, LLM chỉ khi measured lift.
- **Gate:** Synthetic/anonymized adversarial set gồm sparse/contradictory/correction-pending/zero/large VND/HCMC-boundary/PII/injection. Human/product review rubric: factuality, unsupported claim, harmful language, source traceability, usefulness; report per locale/model/version, không chỉ aggregate pass rate.

### F-LLM-08 — High: Parallel fan-out bị hiểu lầm là luôn nhanh hơn

- **[Verified fact]** TypeSafe docs nói các question trong **một System One request** được đánh giá độc lập/parallel và code compose answers; điều này không chứng minh hai API/provider calls độc lập chạy nhanh hay ổn định khi fan-out ([How to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [System One](https://docs.typesafe.ai/concepts/system-one)).
- **Adversarial mechanism:** JEV + LLM fan-out cùng lúc có thể giảm serial wait khi cả hai thật sự optional, nhưng synchronous await vẫn chịu max(latency) + orchestration/queue overhead; một branch error/cancellation/prompt duplication có thể làm cả response fail. Gọi LLM trước khi deterministic facts được validate còn tạo data leakage và wasted tokens.
- **[Proposal] Fix:** Không fan-out trên money transaction. Với report, load/validate deterministic snapshot trước; render facts immediately; chỉ fan-out optional branches sau response hoặc worker. Nếu cần parallel precompute, branches phải independent, bounded, cancelable, idempotent và không block baseline. Đo branch-level latency/error/concurrency, không suy ra từ TypeSafe “parallel”.
- **Gate:** A/B measured critical path with no LLM, LLM-only optional, parallel branches và async; prove first useful content không chờ branch, branch failure không block, concurrency bounded, no duplicate cost. Target thresholds `[Unresolved]`.

### F-LLM-09 — High: JEV-gated LLM cascade tạo serial latency và false gate

- **[Verified fact]** JEV/System One là typed judgment, không phải writer; code giữ control flow; local canonical cấm chat/prose substitution (`docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-REVIEW.md` §1–§3, L11–82; `docs/AI-JEV.md` §2, L15–19).
- **Adversarial mechanism:** “JEV thấy pattern rồi mới gọi LLM viết” nghe tiết kiệm nhưng JEV có thể abstain/false negative; JEV không được thiết kế như prose eligibility gate. Hai calls serial làm latency/tokens tăng; retry cascade che failure và biến optional feature thành hidden agent loop.
- **[Proposal] Fix:** Không cascade mặc định. Với monthly explanation, deterministic code quyết định facts đủ/không đủ và có nên tạo artifact; gọi LLM một lần bounded. Chỉ dùng JEV signal trước LLM nếu có typed question độc lập, measured precision/lift, policy rõ và budget cho cả hai; gate là advisory, không authority. Không retry vô hạn, không cascade generative → JEV để “sửa” prose.
- **Gate:** So sánh recall/quality/cost/latency của LLM-only-after-facts với JEV-gated; nếu gate làm mất useful coverage hoặc tăng tail/cost mà không nâng factuality thì reject cascade. Mọi attempt/skip/fallback phải traceable.

### F-LLM-10 — High: Cache có thể đánh đổi freshness, privacy và model drift

- **[Verified fact]** `AGENTS.md` yêu cầu cache chỉ dữ liệu an toàn, owner-scoped và có invalidation khi mutation/sign-out/session change (L187–194). Canonical chưa định nghĩa insight/LLM artifact retention hoặc lifecycle.
- **Adversarial mechanism:** Cache prompt hash thiếu source version/locale/policy/model; shared cache key chứa user text; stale response được serve nhanh và làm “performance” nhìn tốt nhưng correctness xấu; cache hits che model regression và giữ PII quá lâu.
- **[Proposal] Fix:** Chỉ cache non-authoritative artifact đã validate, keyed theo owner/scope + source snapshot + period HCMC + locale + contract/policy/model version + capability. Không cache raw prompt/response nếu chưa retention approval. Invalidate trên source mutation; stale serve chỉ với explicit stale label cho saved/read-only view, không dùng làm current/action. Đo cache hit nhưng không coi hit là quality.
- **Gate:** Cross-user isolation, invalidation replay, sign-out/retention/delete, model/policy version bump, stale UI/a11y và cache poisoning tests; cache must not change money behavior; stale rate và source mismatch 0 trên shipped surface.

### F-LLM-11 — High: Localization và accessibility bị phó mặc cho generated text

- **[Verified fact]** API locale là `en|vi`; category labels có localized names; locale không được đổi enum/formula/audit/authorization. UI phải có label/error/focus/loading/accessibility states và chart/table equivalent (`docs/PRD.md` §2, §3.4, L9–14, L39–43; `docs/contracts/openapi.yaml` L397–400, L533–544; `AGENTS.md` L87–97).
- **Adversarial mechanism:** LLM trả English trong `vi`, dịch sai `income`/`payment`, đổi VND/period, dùng câu dài khó đọc, thiếu accessible name/live-region semantics hoặc shaming tone. Không thể sửa bằng việc yêu cầu model “hãy dịch chuẩn” mà không test.
- **[Proposal] Fix:** App-owned translation keys cho label, error, state, aria/live text, stale/fact-vs-advisory; generated copy chỉ là nội dung bounded trong locale đã yêu cầu. Locale switch làm pending artifact stale/discard. Nếu locale mismatch, terminology mismatch, output quá dài hoặc a11y review fail → static localized template/facts. Không để model quyết định technical identifiers.
- **Gate:** `en|vi × income|payment × loading/error/stale/manual` matrix; native-speaker/product review; screen-reader/keyboard/zoom/reflow check; locale mismatch rate 0 trên shipped output; user comprehension parity, không chỉ language detector.

### F-LLM-12 — High: Token/cost budget bị xem là “implementation detail”

- **[Verified fact]** OpenRouter System One response schema có usage metadata; local JEV policy yêu cầu bounded input, candidate/questions/concurrency/retries/daily spend và masked cost bucket (`https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md`; `docs/AI-JEV.md` §5, L64–72; `docs/ADMIN-OPERATIONS.md` §7–8, L46–55).
- **[Unresolved]** Chưa có giá/model/token limit cụ thể cho generative API; review không đặt giá trị hay tranh luận provider pricing.
- **Adversarial mechanism:** Prompt fact bundle phình theo report/CSV; parallel fan-out nhân request; cascade/retry nhân tokens; long prose tăng output; cache miss và model drift tạo spend spike. “Không nằm trong money transaction” không đồng nghĩa “không ảnh hưởng vận hành”.
- **[Proposal] Fix:** Đặt budget theo capability trước khi rollout: max input/output tokens, max context rows/claims, max attempts/cascade depth, concurrency, per-user/day feature quota, global daily/monthly spend ceiling và retry budget. Track estimated vs actual usage/cost bucket, cache hit, fallback, queue, token amplification; fail closed về template/manual khi budget cạn. Exact values là `[Unresolved]`, phải đo rồi owner chốt.
- **Gate:** Load/fan-out/cascade abuse test; budget exhaustion manual fallback; no unbounded retry; per-feature dashboard; alert/kill switch; 0 core regression khi LLM budget = 0.

### F-LLM-13 — High: Fallback/repair loop che lỗi và làm output không kiểm toán được

- **[Verified fact]** Canonical yêu cầu timeout/quota/4xx/5xx/schema/privacy/low-confidence fallback manual/deterministic và không block money path; không parse prose/partial JSON để cứu typed output (`docs/AI-JEV.md` §2, §5–§7, L15–19, L64–89; `docs/ARCHITECTURE.md` §5–§6, L43–56).
- **Adversarial mechanism:** Wrapper âm thầm retry, đổi model, gọi JEV rồi LLM, hoặc “repair” output bằng pass thứ hai; user thấy success nhưng operator không biết provider nào, prompt nào, artifact nào. Hidden calls làm latency/cost và privacy khó truy vết.
- **[Proposal] Fix:** Mỗi attempt là event metadata đã mask: capability, contract/model snapshot, attempt number, outcome, timeout/error bucket, token/cost bucket, fallback reason. Retry chỉ cho lỗi transient đã policy; không retry validation/privacy/authorization. Không repair bằng free-form model. Failure trả static localized facts/manual; kill switch dừng mọi generative call.
- **Gate:** Fault injection cho timeout/429/5xx/schema/privacy/budget; trace không raw prompt/response; output deterministic khi disabled; retry count bounded và audit được; operator có thể phân biệt unavailable với generated success.

### F-LLM-14 — Medium: Cạnh tranh vai trò giữa JEV và LLM gây wrapper regression

- **[Verified fact]** Baseline System One đã correction rằng JEV chỉ typed signal; `docs/working/jev-product-analysis/FINAL-FINDINGS.md` cũ mô tả nhiều prose use case và phải đọc như historical baseline, không phải capability contract (`docs/working/jev-system-one-analysis/CC-JEV-SYSTEM-ONE-REVIEW.md` §1.1–§1.2, L11–34).
- **Adversarial mechanism:** Một adapter mới tái dùng `/ai/category-suggestion` cho prose, hoặc UI coi JEV/LLM status là cùng enum; error/fallback/copy/provenance bị trộn. Người sau có thể thêm “LLM fallback” vào JEV để làm pass demo.
- **[Proposal] Fix:** Tách capability key, request/response schema, feature flag, metrics, budget, kill switch và fallback cho JEV vs generative. JEV answer không được đi qua prose parser; LLM artifact không được đi qua category commit path. Mỗi adapter contract có owner và version.
- **Gate:** Contract review chứng minh no shared authority; static call graph/source review chứng minh provider chỉ ở server adapter; JEV-off/LLM-off matrix; no status mapping ngoài application-owned layer.

### F-LLM-15 — Medium: “Engagement” thay thế product truth

- **[Verified fact]** SRS nêu goal là giúp sinh viên hiểu dòng tiền và nhận guidance đơn giản; canonical product nhấn mạnh deterministic facts, manual override và advisory (`SRS..._vi.md` §1.1, L25–35; §1.5, L65–71; `docs/PRD.md` §1, L3–7).
- **Adversarial mechanism:** Tối ưu card opens, dwell time hoặc click “Save” có thể khuyến khích prose dài, alarming hoặc overconfident; user có thể tương tác nhiều hơn nhưng hiểu sai hơn.
- **[Proposal] Fix:** North-star của pilot là comprehension/source traceability và không làm hại task completion; engagement chỉ secondary. Đo source-open, correct answer about facts, correction/unsafe feedback, dismiss vì irrelevance và JEV/LLM-off parity.
- **Gate:** Human/product evaluation cho helpfulness vs trust; rollout chỉ nếu comprehension không giảm và core completion không giảm, dù engagement tăng.

### F-LLM-16 — Medium: Model/version drift làm quality và cache không reproducible

- **[Verified fact]** Canonical JEV yêu cầu model snapshot/compatibility probe và masked metadata; `docs/AI-JEV.md` §2, §4–§6 (L15–19, L33–78). Generative complement chưa có model/version/artifact contract.
- **[Unresolved]** Chưa biết provider có stable model pin, alias behavior, retention/version guarantees hay không.
- **[Proposal] Fix:** Ghi model/provider snapshot, prompt/schema/policy/template version trong metadata; không hiển thị provider claim cho user nếu chưa cần. Canary/shadow/holdout khi model/prompt thay đổi; invalidate cache theo version; rollback về template/static.
- **Gate:** Re-run fixed evaluation set mỗi version; diff quality/latency/token/cost/locale; no automatic promotion on one aggregate metric.

---

## 4. Corrected recommendation: kiến trúc hai lane, không có authority mới

### 4.1. Responsibility map

| Lớp | JEV/System One | Generative LLM | Code/domain/UI |
|---|---|---|---|
| Input | Minimal text/structured state + typed questions; category candidates | Deterministic fact snapshot hoặc validated staged text; no raw ledger/session/secret | Auth, owner, redaction, size/encoding, candidate/fact allowlist |
| Output | `Choice`/`Noul`/`Score` + probabilities/confidence theo primitive | Bounded prose/copy hoặc structured extraction theo capability schema | Schema/claim/safety/locale/freshness validation; fallback |
| Control flow | Không chọn next action/tool/retry/side effect | Không chọn next action/tool/retry/side effect | Trigger, sequencing, timeout/cancel, policy, queue, retry, kill switch |
| Authority | Không tính/ghi/authorize | Không tính/ghi/authorize | Wallet, ledger, savings, budget, report, correction, admin, notification policy |
| UX | Typed advisory category/label nếu contract cho phép | Advisory copy only; source/fact labels app-owned | Localization, a11y, source links, explicit user control, stale/fallback |
| Persistence | Masked telemetry nếu được duyệt | Artifact/usage metadata nếu được duyệt; raw prompt/response không mặc định | Immutable facts/audit, owner scope, retention/delete/export policy |

**[Proposal]** Không đưa generative output vào public JEV category response. Nếu future insight/extraction được duyệt, đó phải là capability/contract/feature flag riêng; không mở rộng `/ai/category-suggestion` bằng field prose ngầm.

### 4.2. Generative contract logic (chưa phải OpenAPI)

**[Proposal]** Một capability prose read-only có thể có internal envelope như sau; đây là logic để thảo luận, không phải schema canonical:

```json
{
  "capability": "monthly-explanation-v1",
  "locale": "vi",
  "sourceSnapshot": {
    "sourceKind": "monthly-report",
    "sourceVersion": "opaque-server-version",
    "period": "YYYY-MM",
    "timezone": "Asia/Ho_Chi_Minh",
    "claimIds": ["payment_total", "top_category"]
  },
  "output": {
    "status": "ready|abstain",
    "copy": "bounded generated text",
    "referencedClaimIds": ["top_category"]
  },
  "modelSnapshot": "server-metadata-only"
}
```

**[Proposal]** Validator phải reject nếu:

- `capability`, locale, schema version hoặc status sai;
- `referencedClaimIds` không nằm trong allowlist/snapshot;
- text nêu số, đơn vị, ngày, category, nguyên nhân hoặc recommendation không map được về fact/policy;
- output chứa secret/PII/raw prompt, unsupported action, fraud/diagnosis, guaranteed saving/financial advice hoặc locale sai;
- source snapshot stale/missing, owner scope không hợp lệ, output vượt bounded size/token budget;
- model trả malformed/partial output; **không parse prose hoặc gọi hidden repair model**.

**[Proposal]** Extraction envelope phải phân biệt `extracted`, `suggested`, `manual_required`, `invalid`; mọi field financial/ledger-bound chỉ là staged suggestion và phải diff/review/domain revalidation. `schema-valid` không đồng nghĩa `safe` hoặc `correct`.

### 4.3. Placement và performance decision matrix

| Strategy | Khi nào có thể dùng | Critical-path verdict | Adversarial risk | Khuyến nghị |
|---|---|---|---|---|
| **JEV-only** | Category suggestion hoặc một typed label thật sự hữu ích | Không để generative LLM tham gia; JEV vẫn optional/default-off | Không tạo prose; confidence không phải correctness | **Ship riêng sau Gate B** |
| **LLM-only** | Read-only explanation/copy sau facts; future staged extraction | Không await trên wallet/payment/report first response | Hallucination, availability, locale, tokens | **Chỉ pilot async/read-only sau gates** |
| **Parallel fan-out** | Hai tín hiệu độc lập cùng deterministic snapshot | Chỉ hợp lệ nếu facts render không chờ branch; synchronous await phải đo | Max-tail latency, duplicate spend, branch failure | **Không mặc định; đo trước** |
| **JEV-gated LLM cascade** | Chỉ khi typed gate có precision/lift đo được và budget rõ | Không dùng trên money path; serial latency | False negative gate, hidden retries, doubled cost | **Defer; thường reject nếu template đủ** |
| **Async post-response/worker** | Monthly explanation, tips, read-only artifacts | Recommended; commit/read facts trước, worker không rollback money | Queue/backlog/stale/retry/idempotency | **Placement mặc định cho pilot** |
| **Cache/precompute** | Snapshot artifact đã validate, owner/locale/version scoped | Không cache authority; serve stale chỉ có nhãn rõ | Cross-owner leak, stale, drift, retention | **Chỉ sau invalidation/privacy gate** |

**[Verified fact]** `docs/ARCHITECTURE.md` §4 và `AGENTS.md` backend rules cấm giữ MySQL money transaction trong lúc gọi provider; `docs/AI-JEV.md` §5 yêu cầu timeout/concurrency/retry bounded. **[Proposal]** Quy tắc này áp dụng mạnh hơn cho generative LLM: không gọi LLM từ domain transaction và không để optional artifact quyết định response success.

---

## 5. Use-case cards và disposition

> Mỗi card ghi rõ trigger, minimal state, output contract, blocking/non-blocking, user control, fallback, metrics và phân loại `JEV fit` / `LLM fit` / `both` / `code-only` / `reject`.

### UC-LLM-01 — Category suggestion trước submit

- **Classification:** `JEV fit = Có`; `LLM fit = Không cần`; `both = Không`; `code-only = validation/commit`; `reject = generative LLM trên category path`.
- **Trigger:** User đã chọn `income|payment`, nhập description hợp lệ và bấm “Gợi ý danh mục”; không gọi mỗi keystroke.
- **Minimal state:** `transactionType`, description đã validate/redact, active candidates đúng `appliesTo`, locale `en|vi`, candidate/contract version. Không amount/date/balance/savings/raw ledger/session/claims/secret.
- **Output contract:** JEV typed `Choice`/optional narrow `Noul`; application map thành category suggestion/status. Không có prose, không có `CreateTransactionRequest`, không có authorization.
- **Blocking/non-blocking:** Advisory pre-submit; không giữ DB transaction, không khóa manual picker/Save hợp lệ; generative LLM không được fan-out.
- **User control:** Manual picker luôn visible; `Use this category`, override, dismiss, final Save riêng; late/stale response không overwrite.
- **Fallback:** Flag off, timeout, quota, schema/privacy/injection/low-confidence/mismatch → giữ form + manual. Không đổi sang chat/prose model.
- **Metrics:** 100% suggestion active/đúng type; 0 auto-commit; JEV-off completion parity; override/correct-abstention/fallback theo `en|vi × income|payment`; zero sensitive outbound/log.
- **Disposition:** **Ship JEV riêng sau Gate B; không thêm generative LLM.** Evidence: `docs/AI-JEV.md` §3–§7, L21–89; `docs/contracts/openapi.yaml` L338–348, L662–677.

### UC-LLM-02 — Monthly report explanation

- **Classification:** `JEV fit = Không cho prose`; `LLM fit = Có, read-only`; `both = Chỉ nếu một typed signal có lift được chứng minh`; `code-only = report/arithmetic/provenance/template fallback`; `reject = LLM tạo số/cause/action authority`.
- **Trigger:** User mở `/reports/monthly?month=YYYY-MM` hoặc explicit “Tạo giải thích”; chỉ sau deterministic report snapshot/reconciliation. Không tự gọi trên payment commit.
- **Minimal state:** Allowlisted aggregate facts, source claim IDs/version, month + `Asia/Ho_Chi_Minh`, completeness/freshness, locale, bounded template policy. Không raw ledger, session, claims, unrestricted descriptions.
- **Output contract:** `ready|abstain` + bounded copy + referenced claim IDs; exact numbers/labels supplied or validated by application. No new amount/date/balance/financial advice/causal claim.
- **Blocking/non-blocking:** **Non-blocking**; report/chart/table/first useful content render without LLM. Worker/read-time artifact may arrive later; no request waits on provider by default.
- **User control:** View source table/chart, expand provenance, dismiss/save/feedback/refresh; no Apply-to-wallet/budget/payment; saved artifact remains advisory/stale-aware.
- **Fallback:** Deterministic report + app-owned static template or “Chưa thể tạo giải thích”; missing/stale/invalid/unsafe/locale mismatch → suppress prose. Never zero giả.
- **Metrics:** Claim-source exactness; unsupported numeric/causal claim rate; stale suppression; comprehension fact-vs-advisory; source-open/dismiss/unsafe feedback; artifact readiness p50/p95/p99; core TTFB delta = no regression target to be approved.
- **Disposition:** **Defer; pilot only after Gates L1–L8.** SRS asks for summary but canonical defers complex AI (`SRS..._vi.md` §1.6, L120–133; `docs/PRD.md` §5, L65–67). Deterministic report ships without it.

### UC-LLM-03 — Dashboard/spending increase-decrease explanation

- **Classification:** `JEV fit = Không cho prose`; `LLM fit = Có nếu code đã tính comparison`; `both = Optional typed pattern signal + LLM only with evidence`; `code-only = baseline/delta/threshold/source`; `reject = model tự tìm trend/cause`.
- **Trigger:** User opens a dashboard/report card after comparison read model has current and baseline facts; no card if baseline insufficient.
- **Minimal state:** Category aggregate IDs/values, deterministic direction/delta/significance, compared period/timezone, source snapshot/version, completeness, locale. Không raw transaction list unless separately approved.
- **Output contract:** Copy can state only allowlisted observation and linked facts; no psychological cause, fraud, blame, forecast or recommendation unsupported by policy.
- **Blocking/non-blocking:** Non-blocking read-time/worker; comparison facts render first. Do not await LLM before dashboard useful content.
- **User control:** Open current/baseline table, dismiss/save/feedback, refresh; corrections go through normal append-only flow; card cannot mutate data.
- **Fallback:** Deterministic comparison/table/static localized copy; insufficient/stale/provider failure → “chưa đủ dữ liệu” or hide explanation.
- **Metrics:** Exact direction/value match; source-open; user can answer which category/period changed; unsupported-cause rate 0; stale-as-current 0; locale/a11y parity; optional artifact latency/error.
- **Disposition:** **Defer.** Comparison read model and threshold are unresolved in current API (`docs/contracts/openapi.yaml` L238–260; `docs/contracts/API-REVIEW.md` §Domain scope, L39–44). LLM is not a detector.

### UC-LLM-04 — Budget coaching/contextual warning copy

- **Classification:** `JEV fit = Không cần`; `LLM fit = Có nhưng bounded wording`; `both = Không mặc định`; `code-only = used/limit/overrun/threshold/dedupe/CTA`; `reject = model-selected CTA or payment/budget action`.
- **Trigger:** User opens budget/dashboard after deterministic `BudgetSummary`, or deterministic warning is produced after commit. Near-limit semantics must be owner-defined.
- **Minimal state:** `category`, `usedVnd`, `limitVnd`, `isOverrun`, HCMC month, source version, allowlisted copy candidates, locale. No raw ledger/goal inference/financial capacity.
- **Output contract:** Short advisory copy referencing exact status; no changed threshold, amount, limit, payment rejection, guaranteed saving or autonomous CTA. App policy chooses route.
- **Blocking/non-blocking:** Non-blocking; exact progress/warning renders even when LLM unavailable. Never execute in money transaction.
- **User control:** Read source, dismiss/snooze/feedback if contract exists, open budget/transactions; final budget change is explicit normal API action.
- **Fallback:** Deterministic warning/progress/static template; no provider retry loop, no claim “đã gửi” nếu worker failed.
- **Metrics:** Budget comprehension; source-open/review completion; duplicate/noise/dismiss; zero payment rejection/mutation; no LLM core latency regression; output locale/a11y parity.
- **Disposition:** **Defer; template-first.** Budget is warning-only (`docs/DOMAIN-MODEL.md` §4, L54–67; `docs/contracts/openapi.yaml` L559–584).

### UC-LLM-05 — Structured extraction sau parse/stage (future CSV hoặc text)

- **Classification:** `JEV fit = Category Choice only`; `LLM fit = Có cho bounded extraction`; `both = Có thể ở staged row category, nhưng không trên commit`; `code-only = parse/validate/idempotency/import`; `reject = prose-to-money-write`.
- **Trigger:** Future only, after bounded file/text parse, schema mapping and staging; CSV is outside current MVP (`docs/PRD.md` §5, L65–67; `docs/DELIVERY-PLAN.md` §9, L57–60).
- **Minimal state:** Opaque job/row ID, validated row fields, redacted description, candidate set, parser/schema version, locale. Raw file/cell instruction/session/secret not sent. Financial fields may remain application-owned and do not become LLM authority.
- **Output contract:** Discriminated `extracted|suggested|manual_required|invalid`, fields plus optional source spans/claim references; no import command. Category suggestion can use JEV `Choice`; amount/date/type require deterministic validation and explicit user review if ever proposed.
- **Blocking/non-blocking:** Offline/bounded async preview; no open money transaction while LLM runs; unresolved rows do not block reviewing other rows, and no row commits automatically.
- **User control:** Preview diff, edit, accept/override/skip, explicit batch confirm; see row provenance and stale/version. No “imported” label before normal ledger commit.
- **Fallback:** Manual mapping/row error/skip; timeout/schema/privacy/provider budget exhaustion preserves staging. No silent drop, zero-fill or second prose repair.
- **Metrics:** 100% committed rows explicit reviewed; zero silent loss/duplicate; 0 LLM-authoritative amount/date/type; extraction exactness and abstention by locale/field; review time vs deterministic/manual baseline; token per reviewed row.
- **Disposition:** **Defer with CSV/import contract.** Do not infer import semantics from illustrative SRS `Insight` or current ledger endpoint.

### UC-LLM-06 — Duplicate/anomaly detection

- **Classification:** `JEV fit = Không`; `LLM fit = Reject as detector`; `both = Không`; `code-only = exact idempotency/matching/baseline/freshness`; `reject = model proof/fraud label/freeze`.
- **Trigger:** Pre-submit warning or post-commit/read-only scanner only after deterministic candidate/baseline contract exists.
- **Minimal state:** Code-owned owner-scoped validated fields, fingerprints, HCMC period, own-record references, baseline/rule version and freshness. No model context required in safe design.
- **Output contract:** Deterministic `same_idempotent_replay|possible_duplicate|no_signal|cannot_verify` or neutral anomaly status; no LLM confidence/prose as proof.
- **Blocking/non-blocking:** Warning/read-only; must never block wallet-sufficient payment, correction, report or core response because a model guessed.
- **User control:** Inspect matched own record/basis, dismiss/mark expected, open issue/correction; no auto-delete/merge/reverse/freeze.
- **Fallback:** Stale/insufficient/unavailable → `cannot_verify`/hide; normal transaction path remains.
- **Metrics:** Zero duplicate same key/body; zero valid payment blocked; false-positive/proceed/dismiss; 100% flag basis/period/freshness; zero cross-owner inference.
- **Disposition:** **Reject JEV/LLM detector; defer deterministic capability.** Evidence: `docs/DOMAIN-MODEL.md` §4, L54–67; SRS optional intelligence §1.6, L161–166.

### UC-LLM-07 — Auth, wallet, money arithmetic, report authority and correction

- **Classification:** `JEV fit = Không`; `LLM fit = Không`; `both = Không`; `code-only = Tất cả`; `reject = mọi model authority`.
- **Trigger:** OAuth/session, wallet baseline, income/payment, savings transfer, budget write, report calculation, correction/reversal, reconciliation or authorization command.
- **Minimal state:** No LLM state. Server session/owner/CSRF, validated DTO and domain data stay inside trusted application/domain boundaries.
- **Output contract:** Canonical API/domain result only; no generated text required to decide or calculate. UI can use app-owned static copy to explain outcome.
- **Blocking/non-blocking:** Synchronous deterministic critical path; no provider call, queue, cache or model dependency.
- **User control:** Explicit form review/submit; correction append-only; payment/idempotency/wallet rules server-enforced.
- **Fallback:** Stable API error/envelope, preserve form where safe, fail closed; never ask LLM to fill missing number or explain an error by inventing data.
- **Metrics:** Domain acceptance/invariant/concurrency/idempotency/owner isolation; JEV-off and LLM-off parity; zero model call in transaction trace.
- **Disposition:** **Ship code-only; reject LLM/JEV involvement.** Evidence: `docs/DOMAIN-MODEL.md` §4–§5, L54–85; `docs/ARCHITECTURE.md` §4, L35–41.

### UC-LLM-08 — Admin issue triage, dispute and operational action

- **Classification:** `JEV fit = Reject autonomous`; `LLM fit = Defer masked summarization only`; `both = No current need`; `code-only = role/status/priority/audit`; `reject = autonomous authority`.
- **Trigger:** Admin opens a masked issue. Any future summarization must be explicit and separate from status/priority/action.
- **Minimal state:** Security-approved masked issue fields only; no raw ledger/balance/audit/secret/cross-owner data.
- **Output contract:** Optional human-readable draft/summary with source issue IDs; cannot set status/priority, accept correction, expose data, or call action.
- **Blocking/non-blocking:** Non-blocking assist; admin triage and incident/kill path work without it.
- **User control:** Admin reviews/edits/accepts note explicitly; audit records actor/reason/outcome; user issue remains intact.
- **Fallback:** Deterministic P0/P1/P2 triage, human escalation, read-only/kill switch; no guessed priority.
- **Metrics:** Zero privilege/data leak, audit completeness, human edit/accept rate, unsafe/wrong summary, core issue resolution without model.
- **Disposition:** **Reject autonomous use; defer masked human-reviewed draft only after security/role/retention contract.** Evidence: `docs/ADMIN-OPERATIONS.md` §1–§7, L3–51; `docs/contracts/API-REVIEW.md` §Admin, L14–21.

### UC-LLM-09 — Forecast, financial advice, chatbot or autonomous agent

- **Classification:** `JEV fit = Không`; `LLM fit = Reject trong current scope`; `both = Không`; `code-only = history/report only`; `reject = forecast/advice/action agent`.
- **Trigger:** Any request to predict future balance/payment capacity, give certified financial advice, execute multi-step action or run chat loop.
- **Minimal state:** None under current contract; do not send unrestricted financial history or goals to a prose model.
- **Output contract:** No production capability. Future planning would need separate methodology/calibration/uncertainty/product safety decision.
- **Blocking/non-blocking:** Must not enter critical path or silently start a multi-turn loop.
- **User control:** Only deterministic history/report and human decision; no Apply/Transfer/Pay/Set budget from forecast.
- **Fallback:** Hide feature or show current deterministic facts; no zero/guaranteed estimate.
- **Metrics:** N/A for rejected capability; if future reconsidered, calibration/coverage, uncertainty comprehension and zero authority use are gates.
- **Disposition:** **Reject MVP; defer separate product/safety decision.** Evidence: `docs/PRD.md` §5, L65–67; `docs/AI-JEV.md` §8, L91–93; `docs/ARCHITECTURE.md` §8, L67–69.

---

## 6. Explicit ship / defer / reject list

### 6.1. Ship now (without a new generative dependency)

**[Verified fact/Proposal]**

1. Deterministic wallet/ledger/savings/budget/report/dashboard and manual category path.
2. Existing JEV typed category suggestion only after its existing compatibility/safety gate; no generative fallback.
3. Deterministic report/dashboard facts and app-authored localized templates; these prove product value without model latency or hallucination.
4. Operational kill switch, masked metrics and JEV-off/LLM-off smoke path as release properties.

### 6.2. Ship only as gated read-only pilot

**[Proposal]**

1. Async monthly explanation from allowlisted report facts.
2. Async/read-time spending-change wording after deterministic comparison exists.
3. Budget wording only after deterministic warning/threshold/dedupe contract; template remains valid fallback.
4. Masked admin issue draft only if security owner approves and human review is mandatory.

Pilot must be opt-in or bounded canary/holdout, model/version pinned, no money action, no raw prompt/response persistence, and reversible by flag. “Pilot ship” is not a claim that provider/model exists or meets SLA.

### 6.3. Defer until new contract and evidence

- Any generative extraction, including CSV row assistance, until parser/staging/import/idempotency/retention/partial-failure semantics are canonical.
- Saved insight/tip/feedback/pin/dismiss artifacts until resource ownership, source snapshot, stale/invalidation, retention/export/delete and a11y state matrix exist.
- JEV-gated generative cascade until measured quality lift offsets serial latency/token amplification; template-first is the default.
- Cache/precompute until owner/locale/source/model/policy key and invalidation are proven.
- Any synchronous LLM enrichment where first useful content or Save waits on provider.

### 6.4. Reject explicitly

1. LLM/JEV computes wallet, savings, budget, amount, date, report totals, trend delta or authorization.
2. Parse generated prose/JSON into direct ledger, budget, savings, correction or admin writes.
3. Auto-select/auto-submit/auto-commit based on generated text, confidence, or “user saw card”.
4. LLM/JEV chooses next action, route, tool, retry, notification, payment, transfer or autonomous workflow.
5. Use LLM as detector/proof for duplicate, anomaly, fraud, or financial capacity; freeze/reject/reverse based on it.
6. Send raw ledger, balance, session, Google claims, secret, admin note, raw CSV or unnecessary PII; browser-to-provider calls.
7. Hidden repair/retry/cascade loops or silent fallback from typed JEV to chat/prose.
8. Treat `GPT 5.6 luna` or any unprobed model ID as available/fast/production-ready.
9. Render generated text as current when source is stale, locale is wrong, provenance missing, or validator cannot trace claims.
10. Optimize only engagement/cost while ignoring comprehension, safety, fallback and critical-path parity.

---

## 7. Corrected product/system flow

### 7.1. Recommended flow for read-only explanation

```text
User opens dashboard/report
  -> server auth + owner scope
  -> deterministic report/dashboard/budget computation
  -> source snapshot + HCMC period + completeness/freshness
  -> render authoritative facts/table immediately
  -> optional idempotent worker job (LLM, bounded budget)
  -> validate schema + claim IDs + numbers + locale + safety + stale
  -> persist masked advisory artifact only if approved
  -> read artifact only when source/version still current
  -> user inspect source / dismiss / save / feedback
  -> no money/admin side effect
```

**[Proposal]** If the worker fails, the user experience is still complete: facts/table/static template remain. A worker result is enrichment, not response success.

### 7.2. Recommended flow for extraction

```text
Upload/input
  -> deterministic size/encoding/schema/parser/redaction
  -> bounded staging row + owner scope + idempotency identity
  -> optional LLM structured suggestion per row/field
  -> discriminated schema + source-span + field/range/policy validation
  -> preview diff + explicit user review/override/skip
  -> normal deterministic domain command
  -> immutable ledger/audit
```

**[Proposal]** If a field can affect money, period, owner, category lifecycle, idempotency or authorization, LLM output is never authoritative. The application may display it as a proposed value only when the future contract explicitly permits that field and user review is explicit.

### 7.3. No hidden shared state

**[Proposal]** JEV and LLM attempts must not share mutable prompt/history/memory state. Each request gets an immutable bounded snapshot; model output cannot become the next model's authority without a code gate. No long-term memory admission from model prose; no cross-user cache; no previous artifact silently injected as fact.

---

## 8. Evidence gates before any generative enablement

> Không có gate nào dưới đây được coi là pass chỉ vì model trả một demo thành công. Exact thresholds là `[Unresolved]` và phải do Team Leader/owners chốt sau baseline.

### Gate L0 — Product role and contract separation

**Must prove:** capability key riêng với JEV; use case có user value không đạt được bằng deterministic template; output contract, owner, fallback, user controls, no-authority boundaries; public API change (nếu có) được duyệt riêng.

**Evidence:** approved capability brief, data-flow diagram, failure matrix, mapping tới use-case card; review cho thấy JEV category và LLM prose/extraction không dùng chung authority/status.

**Fail action:** giữ LLM off; ship deterministic/JEV-only path.

### Gate L1 — Provider/model/transport compatibility

**Must prove:** server-only credential; exact endpoint/model ID; schema; auth; timeout/cancel; error mapping; usage metadata; quota/rate; privacy/retention configuration; model/version pin/alias behavior.

**Important unresolved:** `GPT 5.6 luna` chưa được xác minh. Không được đưa vào registry hay claim availability cho tới khi official source/probe thực tế được đọc và ghi lại.

**Fail action:** feature disabled; không tự fallback sang model/provider chưa allowlist; static/manual fallback.

### Gate L2 — Data minimization, privacy and injection

**Must prove:** deterministic allowlist/redaction; no browser provider call; no raw ledger/balance/session/claims/secret/PII thừa; description/CSV/issue text treated as data; retention/export/delete/incident policy; logs/cache/provider payload review.

**Evidence:** outbound payload fixtures, negative tests, synthetic injection/PII/secret corpus in `en|vi`, redacted trace sample, security sign-off.

**Fail action:** no outbound call/manual/static fallback; raw leak is security incident and possible NO-GO core if core data exposed.

### Gate L3 — Quality, hallucination and extraction safety

**Must prove:** fixed synthetic/anonymized evaluation set covers normal/ambiguous/sparse/contradictory/correction-pending/HCMC-boundary/large VND/PII/injection/locale cases; every claim traces to fact ID; numeric/date/category/period validation; harmful/shaming/unsupported advice suppression; extraction exactness and abstention.

**Evidence:** per-capability, per-model, per-locale report with human/product review and error examples; no confidence-as-correctness claim.

**Fail action:** template/manual fallback; do not raise temperature/model/cascade to hide errors.

### Gate L4 — Performance and critical-path isolation

**Must prove:** measured baseline and variants: deterministic-only, JEV-only, LLM-only optional, parallel fan-out, JEV-gated cascade, async worker, cache/precompute. Measure critical TTFB, first useful content, Save/task completion, optional artifact readiness, p50/p95/p99, timeout/fallback, queue age, concurrency/backlog.

**Rule:** No p50/p95/p99 or “real-time” promise before measurement. TypeSafe System One documentation is not generative API evidence.

**Fail action:** move to async/worker, remove fan-out/cascade, or keep feature off; no core degradation accepted without owner decision.

### Gate L5 — Token/cost budget and abuse control

**Must prove:** per-request input/output ceilings; bounded fact/row count; per-user feature cap; global daily/month budget; concurrency; retry/attempt/cascade cap; actual usage/cost bucket; budget exhaustion behavior; alert/kill switch.

**No pricing debate:** exact provider prices are not asserted. Budget controls are required regardless of price and remain `[Unresolved]` until measured/configured.

**Fail action:** no model call when budget unavailable; deterministic/static/manual fallback; no unbounded retry or fan-out.

### Gate L6 — User trust, localization and accessibility

**Must prove:** UI clearly distinguishes authoritative fact vs advisory interpretation; source/as-of/stale visible; user can inspect/dismiss/save/feedback; `en|vi` terminology and locale-switch behavior; keyboard/focus/live-region/screen-reader/chart-table parity; no numeric confidence portrayed as correctness.

**Evidence:** comprehension study/task test and a11y review across loading/error/stale/manual/unavailable; native-language review for both locales.

**Fail action:** suppress generated text and render app-owned localized facts/template; no rollout for one locale only if it creates inconsistent product semantics.

### Gate L7 — Fallback, kill switch and rollback

**Must prove:** timeout/429/5xx/schema/privacy/unsafe/model-not-allowlisted/token budget/cache miss/stale all produce truthful fallback; disable flag works immediately; no hidden repair loop; worker retry idempotent; manual/core path smoke passes with JEV and LLM both off.

**Fail action:** keep generative feature off; if it can block core or leak data, escalate as release incident per `docs/DELIVERY-PLAN.md` §7, L47–51 and `docs/ADMIN-OPERATIONS.md` §7, L46–51.

### Gate L8 — Canary, observability and change control

**Must prove:** versioned prompt/schema/policy/template/model metadata; shadow/holdout/canary; rollback; aggregate metrics only; no raw prompt/response in normal logs; dashboard for quality, latency, fallback, tokens/cost, cache and locale.

**Fail action:** rollback to static/template; do not silently switch model or prompt.

---

## 9. Product and operational metrics

> Tất cả ngưỡng số cụ thể là `[Unresolved]`; bảng này định nghĩa **đo gì**, không giả nhận runtime đã đạt.

### 9.1. Safety and authority metrics — hard gates

| Metric | Required invariant | Slice |
|---|---|---|
| LLM-to-money mutation | `0`: không output LLM/JEV được dùng trực tiếp để ghi/sửa/xóa ledger, savings, budget, correction hoặc authorize | Capability, route, release |
| Claim-source traceability | 100% generated claims có source claim ID hoặc app template; unsupported numeric/date/period/causal claims = 0 | `en|vi`, model/version |
| Stale suppression | 100% source-changed artifacts bị discard/stale; 0 stale-as-current | Mutation type, cache hit/miss |
| Sensitive data boundary | 0 raw secret/session/claims/unnecessary PII/raw ledger in outbound/log/cache | Input class, provider/model |
| Explicit review | 100% future extraction/financial-field suggestion commits có user review + normal domain validation | Field, locale, batch |
| Fallback truthfulness | 100% dependency/validation/unsafe/budget failures show truthful manual/static outcome; 0 fake success | Error class |
| Owner isolation | 0 cross-user artifact/cache/issue/source exposure | User/session/cache key |
| JEV/LLM-off parity | Core completion, correctness and authorization remain baseline when either/both flags off | Auth, money, report |

### 9.2. Quality and trust metrics

- **[Proposal]** Explanation factuality: claim-to-source exactness, unsupported claim rate, contradictory-source rate, stale mismatch, harmful/shaming/financial-advice rate.
- **[Proposal]** Extraction quality: exact match/field validity, source-span correctness, abstention/`manual_required`, override, duplicate/silent-loss rate; report financial fields separately from harmless metadata.
- **[Proposal]** User comprehension: user identifies source period, fact vs interpretation, stale state and available control; task success beats thumbs-up.
- **[Proposal]** Trust signals: “wrong/out-of-date/unsafe/wrong-language” feedback, source-open, dismiss-for-irrelevance, correction after artifact, repeat use with no increase in unsafe action.
- **[Proposal]** Product value: time-to-understand report, time-to-next-useful screen, category-entry friction, manual completion; do not use engagement or raw token volume as success alone.

### 9.3. Performance and availability metrics

- **[Proposal]** Critical path: first byte/first useful content, Save/task completion, error rate, timeout/fallback, p50/p95/p99 under representative load.
- **[Proposal]** Optional path: worker queue age, artifact-ready p50/p95/p99, stale-at-read, retry attempts, dead-letter/unavailable rate, cache hit/miss and invalidation lag.
- **[Proposal]** Compare all six placements in §4.3 with same facts/fixtures and separate provider time from app/queue/cache time.
- **[Unresolved]** No threshold may be claimed until baseline and acceptable regression budget are approved.

### 9.4. Token/cost/abuse metrics (not pricing claims)

- **[Proposal]** Input/output tokens per attempt and per successful artifact; amplification from fan-out/cascade/retry; tokens per reviewed CSV row if future.
- **[Proposal]** Cost bucket per capability/model snapshot, estimated vs actual, budget exhaustion, rejected calls, cache hit savings, queue/concurrency saturation.
- **[Proposal]** No model call if request exceeds token/context policy; no unbounded retry; daily/global budget kill behavior observable.
- **[Unresolved]** Amounts, token ceilings and spend ceilings require provider probe and owner approval; this review intentionally invents none.

### 9.5. Localization and accessibility metrics

- **[Proposal]** Locale mismatch/English leakage rate; terminology validation for `income`, `payment`, VND, `Asia/Ho_Chi_Minh`; fact/interpretation comprehension per locale.
- **[Proposal]** Keyboard completion, focus stability, live-region correctness, screen-reader announcement of advisory/stale/manual/unavailable, chart-table parity.
- **[Proposal]** A generated text failure in one locale suppresses that text and preserves static localized facts; it must not block core.

---

## 10. Findings that extend/correct the System One baseline

| Existing baseline finding | Extension/correction when adding generative LLM |
|---|---|
| `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1.1–§1.2: JEV is not a prose writer; monthly insight/coaching/NBA wording belongs to application, not System One. | **Preserve.** A generative LLM can be a separate prose capability, but facts, source links, template policy, CTA and authority remain application-owned. Do not relabel it as JEV. |
| Baseline recommendation: deterministic facts/templates first; typed signals optional and no JEV prose. | **Strengthen.** Template-first is not merely capability correction; it is latency, availability, quality and cost baseline against which LLM must prove incremental value. |
| Category suggestion is JEV `Choice`, default-off/manual-first, user confirmation. | **Preserve and isolate.** Generative LLM is not needed for this path; adding it as fallback increases surface without solving a demonstrated gap. |
| Async/read-time placement is safer than money transaction. | **Refine.** Async does not automatically mean safe: queue retries, stale source, cache, retention and artifact provenance need gates. “Read-time” must render facts first and never await an unproven model by default. |
| JEV confidence is uncertainty, not correctness; thresholds belong to code. | **Extend.** Generative LLM has no license to turn fluent prose/HTTP 200/schema-valid JSON into correctness. Claim validation and human/product evaluation are mandatory. |
| Minimal redacted state and untrusted-text policy. | **Strengthen.** LLM prose pressure often requests richer context; refuse that expansion. Raw ledger/balance/claims/secret/PII remain prohibited. |
| JEV failure falls back manual and never blocks money path. | **Extend.** LLM failure must fall back to deterministic facts/template; no hidden repair, JEV prose substitution, or core response wait. |
| Future CSV row classification is deferred until parser/staging/import contract. | **Preserve.** LLM extraction may assist only after staging and explicit review; structured output does not bypass amount/date/type/idempotency/domain validation. |
| Duplicate/anomaly/forecast are deterministic/deferred and not JEV authority. | **Strengthen.** Generative prose cannot turn a deterministic warning into fraud proof, causal diagnosis or forecast/financial advice. |
| Admin autonomous action is rejected. | **Preserve.** At most a masked human-reviewed draft after separate security/retention contract; no status/priority/dispute/money action. |

---

## 11. Unresolved decision register

1. **[Unresolved]** Có capability prose/extraction nào thực sự vượt deterministic template/parser đủ để trả thêm latency, privacy và token cost không?
2. **[Unresolved]** Exact provider/endpoint/model/version/allowlist/retention/privacy/availability của generative API là gì? `GPT 5.6 luna` chưa có evidence trong sources đã đọc.
3. **[Unresolved]** Insight/extraction resource có owner, source snapshot, version, stale, persistence, retention, export/delete, dismiss/save/feedback contract nào?
4. **[Unresolved]** Fact claim ID, allowed claim vocabulary, causal/advice policy và validator implementation semantics là gì?
5. **[Unresolved]** Threshold quality/performance/fallback nào là release gate; baseline deterministic/template nào dùng để so sánh?
6. **[Unresolved]** Token input/output, per-user/day cap, global spend ceiling, concurrency và retry budget cụ thể nào được owner phê duyệt? Không suy ra từ giá provider.
7. **[Unresolved]** Cache key/invalidation/TTL/stale rendering và cross-user isolation được chứng minh ra sao?
8. **[Unresolved]** `en|vi` copy inventory, native-language reviewer, screen-reader behavior và generated-text max length nào được duyệt?
9. **[Unresolved]** Nếu JEV typed signal và LLM prose đều được thử, signal nào có lift đo được để biện minh cho cascade/parallel cost?
10. **[Unresolved]** Async worker/queue/idempotency/dead-letter/kill switch có thuộc delivery scope hay không? Không được giả định tồn tại từ SRS illustrative `Insight`.

**[Proposal]** Mọi unresolved item chọn default **manual/deterministic/off**. Không giải quyết bằng cách “thử model rồi xem” trên production money path.

---

## 12. Corrected final recommendation

1. **Giữ JEV và generative LLM tách biệt về capability, contract, feature flag, budget, metrics và fallback.** JEV là typed decision; LLM là optional prose/extraction adapter. Không dùng LLM để thay JEV hoặc sửa JEV typed failure.
2. **Không đặt generative LLM trên critical path.** Render deterministic facts/report/table/budget first; category suggestion chỉ JEV optional; explanation/extraction chạy async/worker hoặc staged preview.
3. **Nếu muốn thử LLM, bắt đầu bằng một read-only pilot duy nhất** (monthly explanation hoặc spending-change wording), không phải chatbot/broad API. Fact snapshot, claim references, localized UI, stale/fallback và kill switch phải có trước.
4. **Template-first là baseline, không phải fallback yếu.** Chỉ rollout LLM nếu evaluation chứng minh tăng comprehension/usefulness mà không tăng unsupported claims, unsafe language, latency tail, token/cost amplification hoặc fallback burden.
5. **Không claim `GPT 5.6 luna`, availability, speed, quality, pricing hay SLA** khi chưa có official/probe evidence. Model ID user nêu được ghi là prerequisite/probe only.
6. **No-go nếu bất kỳ output LLM nào có đường tới money/authorization/admin side effect, raw sensitive data, stale-as-current rendering, hidden repair loop, hoặc làm JEV-off/core path kém hơn.**

**Kết luận:** Campus Coin có thể bổ sung generative LLM như **lớp diễn đạt/trích xuất không-authoritative, bất đồng bộ, có kiểm chứng**, nhưng chưa có cơ sở để bật production ngay. Quyết định đúng hiện tại là **ship deterministic core + JEV typed category theo gate; defer generative LLM; pilot chỉ sau evidence gates; reject mọi authority, critical-path blocking và prose-to-money path**.

---

## Evidence index

### Local sources

- `AGENTS.md` §Tooling và kiến trúc; §JEV/OpenRouter; §Backend/API; §React/frontend; §Performance (L26–39, L87–107, L133–141, L187–194).
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1–§1.8 (L25–35, L57–71, L101–171, L187–201, L282–295).
- `docs/PRD.md` §1–§6 (L3–73).
- `docs/DOMAIN-MODEL.md` §1–§6 (L3–96).
- `docs/ARCHITECTURE.md` §1–§8 (L3–69).
- `docs/AI-JEV.md` §1–§9 (L3–98).
- `docs/contracts/openapi.yaml` paths/schemas for ledger, budget, report, dashboard and JEV (L82–348, L397–449, L533–677).
- `docs/contracts/API-REVIEW.md` security/admin/correction/response/domain scope (L5–48).
- `docs/ADMIN-OPERATIONS.md` §1–§10 (L3–68).
- `docs/AUTHENTICATION.md` §1–§9 (L3–69).
- `docs/DELIVERY-PLAN.md` §1–§13 (L6–83).
- `docs/working/jev-system-one-analysis/FINAL-FINDINGS.md` §1–§7 and handoffs `CC-JEV-SYSTEM-ONE-REVIEW.md`, `CC-JEV-SYSTEM-ONE-CAPABILITY.md`, `CC-JEV-SYSTEM-ONE-ARCH-OPS.md`, `CC-JEV-SYSTEM-ONE-USECASES.md`.
- Historical baseline `docs/working/jev-product-analysis/FINAL-FINDINGS.md` and handoffs `CC-JEV-INSIGHT-COACH.md`, `CC-JEV-TRANSACTION-AUTOMATION.md`, `CC-JEV-PRODUCT-JOURNEY.md`, `CC-JEV-SAFETY-UX-DOMAIN.md`; these remain unchanged and are not canonical authority.

### Official sources actually read

- TypeSafe, **System One**: https://docs.typesafe.ai/concepts/system-one — typed decisions/probabilities, text-only, no generated replies/code/reasoning, larger workflow role.
- TypeSafe, **How to build with TypeSafe**: https://docs.typesafe.ai/concepts/how-to-build-with-system-one — code-owned control flow, deterministic rules/side effects, narrow typed questions, independent questions and composition.
- TypeSafe, **Confidence**: https://docs.typesafe.ai/confidence — confidence derived from distribution, uncertainty, risk-dependent thresholds; no correctness guarantee.
- OpenRouter, **Submit a System One request**: https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md — typed `state`/`questions` transport, response metadata/usage and documented error classes. This is evidence for System One transport only, not generative model availability or SLA.
