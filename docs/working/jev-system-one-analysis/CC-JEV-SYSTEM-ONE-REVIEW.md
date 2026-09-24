# CC-JEV-SYSTEM-ONE-REVIEW — adversarial review dưới capability thật của System One

> **Trạng thái:** working handoff; không phải ADR/canonical/runtime decision.
>
> **Phạm vi sở hữu:** chỉ file này. Không sửa `docs/working/jev-product-analysis/`, SRS, ADR, architecture, domain, auth, OpenAPI hoặc source runtime.
>
> **Mục tiêu:** đối chiếu các finding cũ với capability thật của TypeSafe System One/Jev: request có `state` + typed questions; câu hỏi độc lập; output là typed answer/probability/confidence, không phải chat/prose/reasoning; code giữ control flow, deterministic rules, arithmetic, authorization và side effects.
>
> **Phân loại:** `[Verified fact]` là điều đọc được từ official/local source; `[Proposal]` là khuyến nghị cần owner phê duyệt; `[Unresolved]` là thiếu contract/evidence, không được diễn giải thành capability đã có.

## 1. Verdict ngắn

### 1.1 Kết luận adversarial

**[Verified fact]** Những handoff cũ bảo vệ khá tốt các ranh giới money/domain (JEV không tính tiền, không authorize, không ghi ledger; manual fallback; stale/fallback/privacy), nhưng vẫn còn một lỗi mô hình quan trọng: nhiều insertion point ngoài category được mô tả như **“JEV narrative/writing/reason/CTA”**. System One không phải lớp sinh prose. Nó không viết summary, tip, explanation, reason hay câu UI; cũng không tự chọn bước tiếp theo. Nếu triển khai nguyên văn các đề xuất đó, wrapper sẽ biến typed decision model thành chat/prose giả lập bằng cách yêu cầu model trả text hoặc tự parse text — trái capability và trái canonical boundary.

**[Verified fact]** TypeSafe mô tả System One là model trả **typed decisions and probabilities**, không phải generated text; model không viết replies, code hoặc explanations of reasoning. Official: [System One — “How it differs from an LLM” và “Fast judgments inside a larger workflow”](https://docs.typesafe.ai/concepts/system-one); [How to build with TypeSafe — “Summary” và “Three software architectures”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

**[Verified fact]** TypeSafe yêu cầu code giữ control flow, deterministic rules và side effects; câu hỏi hẹp, typed, độc lập được hỏi cùng một state rồi code compose kết quả. Official: [How to build with TypeSafe — “What makes System One composable”, “Ask a lot of questions”, “Combine question outputs in code”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one).

**[Verified fact]** Campus Coin canonical chỉ cho JEV gợi ý category trước submit, backend-only, default-off, user phải confirm/override, và lỗi phải quay về manual. `docs/AI-JEV.md` §3, §5–§8, L21–31, L64–93; `docs/PRD.md` §3.5, §4–§5, L45–73; `docs/ARCHITECTURE.md` §5, §8, L43–47, L67–69.

**[Proposal]** Giữ core deterministic/manual-first. Nếu dùng System One ngoài category, chỉ dùng nó cho **một hoặc vài typed signals có option/rubric rõ** (ví dụ Choice chọn loại pattern trong allowlist, Noul xác định có đủ evidence/unsupported intent, Score xếp hạng một chiều khi product thật sự cần). Ứng dụng tự dựng localized explanation từ facts và templates; System One không sinh text. Mọi action tiếp theo do policy/code chọn, không do JEV chọn.

### 1.2 Finding cũ cần sửa rõ ràng

**Correction bắt buộc đối với `docs/working/jev-product-analysis/FINAL-FINDINGS.md`:**

- `[Correction]` §1.1 L15–16, L21; §1.2 L27–36 mô tả JEV có thể làm “source-linked explanation”, “monthly insight”, “budget coaching/nudge”, “viết lý do” hoặc narrative. Điều đó chỉ có thể đúng nếu **application** render text deterministic; không thể gán cho System One/Jev. Các đề xuất này được salvage thành `typed signal → deterministic code composition → localized UI copy`, không phải `JEV prose`.
- `[Correction]` §3 UC-06–UC-10 (L131–195) và các lane `CC-JEV-INSIGHT-COACH.md` §2.2 L38–44, §5 L93–106, `CC-JEV-PRODUCT-JOURNEY.md` §3 P1–P4 L65–70 đã đúng về placement/facts/stale/fallback nhưng **sai hoặc mơ hồ về actor tạo narrative**. System One không trả “một/vài câu ngắn”, “rationale”, “nudge”, “tip” hay “explanation”; code/template/UI làm việc đó.
- `[Correction]` `CC-JEV-PRODUCT-JOURNEY.md` §3 P8 L73 và UC-08 L180–191 đã reject autonomous admin, nhưng wording “assist” vẫn dễ trượt thành agent. Typed triage signal, nếu có, chỉ là input cho admin policy; không auto-triage, không chọn status/priority, không thực hiện side effect.
- `[Correction]` Các handoff cũ thường gọi `manual|abstain|unavailable|stale|invalid` là output JEV. Đây là **application adapter/UI states**, không phải primitive output được official docs bảo đảm. TypeSafe trả answer typed; code phải validate và tự map invalid/low-confidence/stale/transport failure thành manual fallback.

**[Unresolved]** Các handoff cũ cite `docs/working/jev-analysis/CC-JEV-UX-EVAL.md`, nhưng file này không tồn tại trong workspace hiện tại (read path trả `Path not found`). Không dùng những line refs đó làm bằng chứng đã kiểm chứng; các acceptance về UX ở đây dựa trên `AGENTS.md`, `docs/PRD.md`, canonical contracts và official TypeSafe docs.

## 2. Official capability boundary và implications

### 2.1 Bảng capability phải dùng làm oracle

| Capability | `[Verified fact]` official evidence | Hệ quả cho Campus Coin |
|---|---|---|
| Model role | System One làm structured decisions; không phải agent/chat; không tự chọn next action, không sinh reply/reasoning. [System One — “How it differs from an LLM”](https://docs.typesafe.ai/concepts/system-one); [How to build — “Three software architectures”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) | Không yêu cầu JEV viết summary/tip/explanation, gọi tool, điều phối flow hoặc tự chạy action. |
| Request state | Mỗi request đánh giá một `state`; state có thể string/object/array; nhiều questions cùng nhìn một state và được đánh giá độc lập. [State](https://docs.typesafe.ai/concepts/state); [API — Evaluation endpoint/Request body](https://docs.typesafe.ai/api) | Snapshot/input phải được code đóng gói tối thiểu; không trông chờ question này “giải thích” hoặc sửa context cho question kia. |
| Choice | Chọn một option trong tập cố định; trả `choice`, full `probabilities`, `confidence`. [Choice](https://docs.typesafe.ai/primitives/choice); [API — Choice answer](https://docs.typesafe.ai/api) | Category suggestion phù hợp nhất với Choice. Candidate membership/status/type vẫn do code kiểm tra. |
| Noul | Trả xác suất yes/no (`noul`); không có `confidence` riêng. [Noul](https://docs.typesafe.ai/primitives/noul); [API — Noul answer](https://docs.typesafe.ai/api) | Dùng cho một proposition nhị phân (ví dụ “text có yêu cầu unsupported không?”) nếu product semantics rõ; không gọi 0.5 là native abstain. Code định nghĩa vùng manual/escalate. |
| Score | Đánh giá một spectrum có các level mô tả; `score` là probability-weighted position, kèm `probabilities`, `confidence`. [Score](https://docs.typesafe.ai/primitives/score); [API — Score answer](https://docs.typesafe.ai/api) | Chỉ dùng cho một chiều ordinal/ranking đã có meaning (ví dụ mức độ cần review). Không dùng làm amount, balance, budget, delta tiền hoặc công thức. |
| Confidence | Choice/Score `confidence` được suy ra từ phân bố probabilities; không bảo đảm từng answer đúng. Ngưỡng phải phụ thuộc stakes và do code chọn. Noul không có confidence field. [Confidence](https://docs.typesafe.ai/confidence) | Không hiển thị như “% đúng”; không auto-commit category vì confidence cao; threshold/abstain/manual là policy code + evaluation. |
| Composition | Câu hỏi độc lập, chạy song song; code đọc answer và compose bằng rules/thresholds. [How to build — “Ask a lot of questions”, “Combine question outputs in code”](https://docs.typesafe.ai/concepts/how-to-build-with-system-one) | Không dùng output của JEV làm control-flow loop hoặc để JEV chọn câu hỏi/action tiếp theo. |
| Text boundary | Jev currently accepts text input; không images/audio/video. [System One — note under model behavior](https://docs.typesafe.ai/concepts/system-one); [State](https://docs.typesafe.ai/concepts/state) | CSV phải parse/schema hóa trước; không gửi file thô/row ngoài allowlist. |
| Transport shape | OpenRouter `/systemone` gửi `state` + typed `questions`, trả `answers` keyed theo question id; official example không phải chat completion. [OpenRouter System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md), “Submit a System One request”/`POST /systemone` | Adapter phải dùng typed contract, validate response, không parse prose/partial JSON và không dựng “repair LLM”. |
| Decisions URL evidence | URL được yêu cầu `https://openrouter.ai/docs/api/api-reference/decisions/submit-a-decisions-request` không fetch được (404 trong read). Official docs index hiện liệt kê `https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md`. [OpenRouter documentation index](https://openrouter.ai/docs/llms.txt) | Ghi nhận URL chính xác đã tìm thấy; không suy ra thêm Decisions capability hoặc provider behavior. Không phải blocker product ngoài compatibility prerequisite đã được user verify. |

### 2.2 State không phải memory, provenance hoặc freshness

**[Verified fact]** TypeSafe `state` là content của **request hiện tại**; các questions cùng đánh giá state đó độc lập. [State](https://docs.typesafe.ai/concepts/state); [API](https://docs.typesafe.ai/api).

**[Proposal]** `stateVersion`/`candidateSnapshotVersion`/`interactionId`/`sourceSnapshotId` (nếu cần) do ứng dụng tạo để discard response trễ và revalidate. Đây không phải field official của JEV và không được gửi thêm nếu không cần.

**[Verified fact]** Category lifecycle, owner scope, HCMC period, ledger immutability và deterministic money authority thuộc Campus Coin code/domain: `docs/DOMAIN-MODEL.md` §1–§5, L3–85; `docs/ARCHITECTURE.md` §2, §4–§6, L21–56; `docs/contracts/API-REVIEW.md` §Domain scope, L39–44.

**[Proposal]** Mọi result gắn với snapshot mà code đã dùng. Khi type/description/locale/candidate list/source report thay đổi, code bỏ result cũ; JEV không tự biết request đã stale. Khi source changed sau insight, app đánh dấu stale và fallback facts, không yêu cầu JEV “sửa lại”.

## 3. Adversarial findings — overclaim và capability mismatch

| ID / severity | Finding trong old product analysis | Vì sao không đúng dưới System One | Corrected salvage / disposition |
|---|---|---|---|
| **F1 / Critical** | `FINAL-FINDINGS.md` §1.1 L15–21, §1.2 L27–36; `CC-JEV-INSIGHT-COACH.md` L16–18 đề xuất monthly narrative, summary, coaching, tip do JEV tạo. | System One không sinh prose/reply/explanation. Yêu cầu output text hoặc parse chat là capability substitution, không phải System One. | Facts/report/budget deterministic vẫn ship. Nếu cần model signal, hỏi typed `Choice`/`Noul`/`Score`; code chọn template và render `en|vi`. **Không gọi đây là JEV narrative.** |
| **F2 / Critical** | `FINAL-FINDINGS.md` UC-10 L183–195; `CC-JEV-INSIGHT-COACH.md` L183–196 đề xuất NBA “JEV diễn đạt lý do” sau policy. | “Lý do” prose và “next-best action” tự nó là output/flow; System One không chọn action, route hay tool. | Allowlist/policy deterministic chọn CTA; code tạo localized explanation từ known fact; JEV (nếu có) chỉ trả typed intent/attention signal. Không broad orchestration. |
| **F3 / High** | `FINAL-FINDINGS.md` UC-06/07/08/09 L131–181; `CC-JEV-PRODUCT-JOURNEY.md` P1–P4 L65–70 coi `JEV wording` là insertion point. | JEV không biết report semantics, không tính delta/budget, không sinh lời khuyên; typed signal không tự trở thành explanation. | Report/budget/comparison code tính facts, thresholds, evidence và action. UI copy/template viết câu. System One chỉ được thêm bounded label/flag nếu có contract riêng. |
| **F4 / High** | Nhiều card dùng `suggested|manual|abstain|disabled|unavailable|stale|invalid` như JEV output (`FINAL-FINDINGS.md` UC-01 L66–77; `CC-JEV-SAFETY-UX-DOMAIN.md` §5.1 L130–143). | Official answers là primitive-specific (`choice`, `noul`, `score`, probabilities/confidence). `stale`, transport error, privacy failure, feature flag và manual fallback không phải answer primitive. | Adapter normalize typed answer + validator result + request/source state thành app status. Unknown/malformed output → manual; không render partial/prose. |
| **F5 / High** | “Confidence/low confidence → abstain” được dùng như thể model có abstain capability (`FINAL-FINDINGS.md` L75, L123–129; `CC-JEV-TRANSACTION-AUTOMATION.md` L94–99). | Choice/Score có confidence nhưng không phải correctness guarantee; Noul chỉ có yes probability, không có confidence/abstain. Confidence không tự nói candidate “đúng”. | Code định nghĩa thresholds theo stakes, evaluation và explicit `other_or_uncertain` Choice option nếu product cần. Với uncertain band, manual/escalate là application policy. Không hiển thị confidence như chắc chắn. |
| **F6 / High** | Insight cards nói JEV nhận “fact bundle” rồi trả `observation → evidence → caveat → optional nudge` (`CC-JEV-INSIGHT-COACH.md` L97–106; `CC-JEV-PRODUCT-JOURNEY.md` L119–126). | Đây là prose plan và hidden reasoning shape, không phải output TypeSafe. System One không trả evidence refs/caveat trừ khi chúng là typed options do code định nghĩa. | Backend tạo evidence refs/facts/caveat; code kiểm tra source; model chỉ trả e.g. `pattern_kind: Choice` và `needs_review: Noul`; template map typed result + deterministic values. |
| **F7 / High** | “JEV detector” bị reject trong old docs nhưng các card vẫn để JEV giải thích anomaly/duplicate (`CC-JEV-TRANSACTION-AUTOMATION.md` L347–406). | Typed semantic signal vẫn có false positives và không thay idempotency/rule/baseline. Nếu dùng Noul/Choice, đó là advisory signal, không detector/authority; model không biết stale/race nếu code không đưa snapshot. | Exact duplicate/idempotency, anomaly arithmetic/baseline/freshness do code. Giữ JEV off cho detector; nếu nghiên cứu semantic review, output typed review signal → human/manual only. |
| **F8 / High** | Prompt-injection policy nói JEV sẽ “abstain/manual” khi description yêu cầu lộ prompt/authorize payment (`CC-JEV-SAFETY-UX-DOMAIN.md` L304–314). | Official TypeSafe docs không hứa injection defense hay instruction following boundary. State có thể chứa untrusted text; model có thể phân loại nhưng không nên là security gate duy nhất. | Deterministic length/redaction/allowlist/secret checks trước outbound; không echo raw. Optional Noul signal là defense-in-depth; privacy uncertainty/injection-shaped text → fail closed/manual. Không gửi action/secret/ledger. |
| **F9 / High** | “JEV biết/đảm bảo stale” qua artifact state (`FINAL-FINDINGS.md` L265–271; `CC-JEV-INSIGHT-COACH.md` L48–60). | State là snapshot request; không có live read, memory hay invalidation. Model không tự biết correction/payment/category change sau request. | App gắn source version/as-of, discard late responses, revalidate before render/commit, stale badge/fallback deterministic. |
| **F10 / High** | `confirmedCategorySuggestion` + high confidence được diễn giải như đủ cho confirm (`FINAL-FINDINGS.md` L71–75; `CC-JEV-SAFETY-UX-DOMAIN.md` L50–66). | Typed answer chỉ là recommendation. JEV không thấy user click/inspect; confidence không phải consent/authorization. Boolean canonical còn unresolved. | User chọn explicit, review, override/dismiss; Save action riêng; server revalidates owner/active/appliesTo/type/CSRF/idempotency. `confirmedCategorySuggestion` không thay authorization. `docs/contracts/openapi.yaml` L440–449. |
| **F11 / High** | Old cards kỳ vọng JEV tạo copy `en|vi`, aria/live text, reason hoặc localized error (`CC-JEV-SAFETY-UX-DOMAIN.md` §8, L261–292; `FINAL-FINDINGS.md` §7.2 L295–301). | User-facing text/accessibility semantics phải ổn định, dịch đủ và không phụ thuộc prose model. Official State ghi Jev primary training language là English và ngôn ngữ khác có thể lower accuracy; không có guarantee bilingual prose. | App-owned translation keys cho mọi state/aria/error/status. JEV trả IDs/enums; app render `en|vi`. Locale đổi làm pending result stale/discard. |
| **F12 / High** | “JEV explanation” cho amount/balance/budget/report được xem như lớp sau facts (`FINAL-FINDINGS.md` L15, L29–36; `CC-JEV-INSIGHT-COACH.md` L30–44). | Dù số đã tính, model-generated prose vẫn có thể mâu thuẫn/đổi meaning; no prose capability. JEV cũng không được làm arithmetic. | Application render exact backend facts + static labels; optional typed signal cannot alter value/order/period. Domain formula và report remain code-owned. `docs/DOMAIN-MODEL.md` §3–§4, L38–67. |
| **F13 / Medium** | Correction/learning cards nói “JEV học từ correction” và có thể cải thiện ranking (`FINAL-FINDINGS.md` UC-02 L79–90; `CC-JEV-TRANSACTION-AUTOMATION.md` L161–221). | System One request không tự persist memory/retrain; independent state request không có learning semantics. Một override không phải global truth. | Append-only masked feedback (nếu được duyệt) là product telemetry; future candidate/rules update deterministic/versioned. Không hứa “đã học ngay”, không recategorize history. |
| **F14 / Medium** | “CSV JEV row-level” được mô tả như batch narrative/reason (`CC-JEV-TRANSACTION-AUTOMATION.md` L223–283). | CSV cells là untrusted data; raw file không phải State hợp lệ cho business authority. System One chỉ typed classification, không parse/validate amount/date/file. | Deterministic parser/staging/preview first; Choice category per valid row; code handles row statuses, review, import idempotency. Defer cùng CSV canonical scope cut. |
| **F15 / Medium** | Score/“confidence band” dùng lẫn với anomaly/duplicate/financial severity (`CC-JEV-TRANSACTION-AUTOMATION.md` L69–75, L321–345). | Score là ordinal position over descriptive levels, not amount/delta/probability of duplicate; same score can arise from different distributions. | Chỉ dùng Score nếu owner chốt một spectrum một chiều và code chỉ rank/escalate. Duplicate/idempotency/financial decisions remain deterministic. |
| **F16 / Medium** | Error fallback mô tả retry/repair và các status như thể có thể sửa output bằng prose (`FINAL-FINDINGS.md` §6.4 L273–282; `CC-JEV-SAFETY-UX-DOMAIN.md` §6 L157–177). | Không được thay typed contract bằng chat completion, parse partial JSON, hidden repair loop hoặc retry vô hạn. | Validate exact schema; bounded explicit retry chỉ theo runtime policy; otherwise manual/static facts. Không giữ money transaction và không biến fallback thành fake success. |

## 4. Privacy, injection và state adversarial policy

### 4.1 Untrusted description/CSV cell

**[Verified fact]** Transaction description là user-entered text bounded 500; internal JEV request hiện chỉ allowlist type, redacted description, candidates, locale, contract version; cấm balance, savings, raw ledger, claims, session, secret và PII thừa. `docs/contracts/openapi.yaml` L440–449, L662–677; `docs/AI-JEV.md` §3–§6, L21–23, L33–45, L64–78.

**[Proposal]** Treat `description`/CSV cell as **data, never instruction**. Text như “ignore rules”, “reveal prompt”, “call tool”, “authorize payment”, “change amount/date/balance” không làm thay đổi policy. Deterministic adapter phải:

1. validate length/encoding and strip or reject unsupported input;
2. redact obvious PII/secret-shaped content before outbound;
3. send only allowlisted state and current candidate snapshot;
4. avoid echoing suspicious text into UI/log/feedback;
5. if privacy/injection safety cannot be established, do not call System One and return manual/static fallback.

**[Unresolved]** Official TypeSafe pages document state and typed primitives, not a Campus Coin-specific prompt-injection detector or PII guarantee. Do not claim that a Noul answer alone proves text is safe.

### 4.2 Minimal state rule

**[Proposal]** Category state tối thiểu:

```json
{
  "transactionType": "income|payment",
  "descriptionRedacted": "short user text",
  "candidates": [
    {"id": "opaque-category-key", "semanticLabel": "short label"}
  ],
  "locale": "en|vi",
  "contractVersion": "jev-category-v1"
}
```

This follows local internal boundary (`docs/AI-JEV.md` §4, L33–45), but the exact JSON is a local proposal, **not** an official TypeSafe schema. Do not add amount/date/balance/savings/ledger/session/Google claims/admin data merely to make a question “more explanatory”.

**[Proposal]** For report/budget future capability, state should contain only a backend-frozen allowlist such as `sourceSnapshot`, `period`, selected aggregate facts and candidate labels. Facts remain authoritative in the app response; typed model signals do not replace them.

### 4.3 Prompt injection is not an agent loop

**[Verified fact]** System One is not an agent and does not choose next action (official [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), “Three software architectures”). This reduces tool/loop authority but does **not** make untrusted text trusted or eliminate output validation.

**[Proposal]** No tool list, function call, route, payment command, admin role or “next step” should ever be present in the JEV contract. Any typed signal is inert until code policy accepts it; code must still enforce authorization and side effects.

## 5. Corrected System One contract for Campus Coin

### 5.1 Allowed category request

**Trigger:** `[Proposal]` User explicitly presses “Gợi ý danh mục” after choosing `income|payment` and entering a valid description. Never require JEV to make Save possible; never call every keystroke.

**State:** `[Proposal]` Minimal redacted state from §4.2; active candidate list obtained from authoritative category service and bound to request version.

**Typed questions:**

- `category`: **Choice**, fixed map of active candidate IDs (option descriptions distinguish scope); add `other_or_uncertain` only if the product explicitly wants this outcome. Choice is correct because category is finite. Official [Choice](https://docs.typesafe.ai/primitives/choice), “Use a Choice when the answer is one of a fixed set of options”.
- `contains_unsupported_request`: optional **Noul**, one yes/no proposition; use only as a defense-in-depth signal. Noul is not native abstain. Official [Noul](https://docs.typesafe.ai/primitives/noul).
- `ambiguity_level`: optional **Score** only if owner defines distinct ordinal levels and evaluates them; not needed for a first category slice. Official [Score](https://docs.typesafe.ai/primitives/score).

**Forbidden questions:** “write a reason”, “summarize the month”, “what should the user do next?”, “is it safe to pay?”, “calculate balance/budget/amount/date”, or any prompt requesting prose/explanation/action.

**Typed output:** TypeSafe answer object (`choice` + probabilities + confidence; optional `noul`/`score`) after adapter validation. App status (`suggested|manual|disabled|unavailable|stale|invalid`) is code-owned normalization, not model output.

**Deterministic composition:** Validate exact answer type, option membership, candidate snapshot, active status, `appliesTo`, thresholds and request freshness. Code maps accepted typed answer to a preview category; code renders localized label and static “Gợi ý — hãy kiểm tra trước khi lưu”; code never uses output as authorization.

**User control:** Manual picker visible before/during/after request; explicit `Use this category`, override, dismiss, final Save separate. Late response cannot overwrite manual choice. `confirmedCategorySuggestion` is not proof of authorization; server revalidates at commit.

**Persistence/provenance:** Default ephemeral. If quality events are approved, retain masked status/candidate version/accept-overridden-dismissed/time/locale; no raw prompt/response/description by default. Transaction remains normal immutable ledger row with user final category.

**Fallback/abstain/escalation:** Flag off, privacy concern, injection-shaped text, timeout, 4xx/5xx/429, malformed/unknown answer, stale candidate, low/ambiguous policy band → manual picker. Preserve form. Escalation means manual/user review, not a second prose model or agent loop.

**Metrics:** Hard gates: 100% accepted category is active and correct `appliesTo`; 0 auto-select/auto-commit; 100% failure preserves manual path; JEV-off completion equals baseline; zero sensitive outbound/log. Product metrics are separate by `en|vi × income|payment`, with accuracy/override/correct-abstention/fallback and no confidence-as-correctness claim.

**Disposition:** `[Proposal]` Ship manual path now; enable typed category suggestion only after Gate B. Current canonical route remains category-only; no extension to prose.

### 5.2 Dashboard/report “what changed” — corrected card

**Correction:** Old card `FINAL-FINDINGS.md` UC-06/07 and `CC-JEV-INSIGHT-COACH.md` UC-IC-01/02 asked for JEV narrative. That is rejected as stated.

- **Trigger:** `[Proposal]` User opens a deterministic dashboard/report snapshot.
- **State:** Backend-computed facts only: source snapshot ID/version, HCMC period, selected category aggregate/current-vs-baseline values, completeness flags. No raw ledger unless a separately approved privacy contract requires it.
- **Typed questions:** Optional `pattern_kind: Choice` (`increase`, `decrease`, `no_clear_change`, `insufficient_data`) and `needs_review: Noul`; questions are independent and code ignores unused answers. No `summary_text` question.
- **Typed output:** Choice/Noul answer only. No evidence prose, no cause, no CTA.
- **Deterministic code composition:** Code verifies arithmetic, baseline, threshold, period and source freshness; code selects a prewritten localized template such as “Danh mục {label} tăng so với {period}” and inserts backend numbers; source links/evidence refs are generated by code. If typed signal conflicts with facts, facts win and interpretation is suppressed.
- **User control:** Read facts, open chart/table source, dismiss/save/feedback only if a separate interaction contract exists. No Apply-to-wallet/payment/budget.
- **Persistence/provenance:** If later approved, save immutable app artifact with source snapshot/version, period/timezone, generatedAt, template/policy version, user interaction; do not save model prose because no prose exists.
- **Fallback/abstain/escalation:** Missing/stale/incomplete snapshot or invalid signal → deterministic chart/table/static copy; no zero, no old narrative presented as current; manual refresh.
- **Metrics:** Claim-to-source exactness, stale suppression, comprehension and locale/a11y parity; zero unsupported causal claims.
- **Disposition:** `[Proposal]` Deterministic explanation/template may be phase-after or core UX; System One typed signal is optional and not required for report usefulness. Monthly prose JEV remains rejected/deferred.

### 5.3 Budget coaching/NBA — corrected card

- **Trigger:** `[Proposal]` User opens budget/dashboard after deterministic budget status is loaded.
- **State:** `categoryId`, HCMC month, `usedVnd`, `limitVnd`, `isOverrun`, source freshness and allowlisted navigation candidates. No raw ledger/goal inference.
- **Typed questions:** Prefer none. If experimentation requires `attention_kind`, use Choice over a finite policy-owned set; if `is_evidence_sufficient`, use Noul. Do not ask “what action should app execute?” or “write advice”.
- **Typed output:** Enum/probability/optional Noul only.
- **Deterministic code composition:** Code owns threshold, warning/dedupe, CTA allowlist and navigation. Code chooses localized template and exact values. Budget overrun remains warning-only; wallet-sufficient payment cannot be rejected because of a suggestion. `docs/DOMAIN-MODEL.md` §4, L54–67.
- **User control:** Dismiss/snooze/feedback (only if contract exists), open transactions/budget; CTA opens screen and never submits mutation.
- **Persistence/provenance:** Source budget snapshot/month/category/as-of; interaction event owner-scoped/idempotent if approved. No money mutation.
- **Fallback/abstain/escalation:** Deterministic progress/warning/static copy; no model signal or stale source means no coaching card. No notification retry loop.
- **Metrics:** Correct budget understanding, source-open/review completion, zero unintended mutation, zero payment block.
- **Disposition:** `[Proposal]` Ship deterministic warning/template; defer typed signal until a separate capability contract. Reject JEV-authored prose and JEV-selected NBA.

### 5.4 CSV row category assist — corrected card

- **Trigger:** `[Proposal]` Only after a future CSV parser validates and stages bounded rows. CSV is outside MVP: `docs/PRD.md` §5, L65–67; `docs/ARCHITECTURE.md` §8, L67–69.
- **State:** One validated row at a time or bounded batch state with row ID, `income|payment`, redacted description, active candidate IDs, parser/schema version; never raw file as authority.
- **Typed questions:** `category: Choice`; optional `contains_unsupported_request: Noul`. No Score for amount/date and no prose reason.
- **Typed output:** Choice/Noul answers per row; application status `manual|invalid|duplicate|abstain` is code-owned.
- **Deterministic code composition:** Parser owns encoding/header/type/date/positive integer VND, owner, idempotency, duplicates and candidate lifecycle. Code validates model option membership; user reviews/edit/accepts/overrides/skips rows; normal ledger API commits.
- **User control:** Preview diff, row-level review, explicit batch confirm; unresolved rows do not commit. No automatic import.
- **Persistence/provenance:** Job/row/parser version, candidate snapshot, reviewer decision and import idempotency only if future schema/retention/privacy policy is approved; no raw model payload.
- **Fallback/abstain/escalation:** Parse/privacy/model failure → row-level manual/invalid/skip with actionable localized error; no silent drop/zero fill; no prose repair.
- **Metrics:** Zero silent loss/duplicate; 100% committed rows explicitly reviewed; JEV never authoritative for amount/date/type; manual fallback completion.
- **Disposition:** `[Proposal]` Defer CSV and batch JEV together. No MVP expansion.

### 5.5 Untrusted description safety signal — corrected card

- **Trigger:** `[Proposal]` Before any outbound category call, deterministic validator sees user text.
- **State:** Redacted bounded text only.
- **Typed questions:** Optional Noul per proposition (`contains_secret_like_text`, `requests_unsupported_authority`, `is_category_evidence_sufficient`). Separate questions are independent; no combined “safe and valid and correct” proposition. Official [Noul](https://docs.typesafe.ai/primitives/noul) says one yes/no probability; it does not guarantee security.
- **Typed output:** Noul values; no confidence property and no explanation.
- **Deterministic code composition:** Deterministic checks are primary; conservative policy maps any privacy uncertainty or suspicious text to no outbound/manual. If optional Noul conflicts with deterministic result, deterministic fail-closed result wins.
- **User control:** User edits text or chooses manual category; no raw suspicious text echo.
- **Persistence/provenance:** Masked reason code only if approved; no raw prompt/response/text in logs or telemetry.
- **Fallback/abstain/escalation:** Manual category; security review for repeated leakage/bypass. Never route to chat/agent for “repair”.
- **Metrics:** Zero secret/PII outbound/log, zero instruction-following side effect, deterministic manual completion parity; do not optimize only model detection recall.
- **Disposition:** `[Proposal]` Defense-in-depth only; JEV is not the security boundary.

### 5.6 Duplicate/anomaly — corrected card

- **Trigger:** `[Verified fact]` Existing old analysis correctly places duplicate/anomaly outside JEV authority (`CC-JEV-TRANSACTION-AUTOMATION.md` §4.4–§4.5, L285–406).
- **State:** Code-owned owner-scoped records, idempotency/body fingerprint, HCMC period, baseline/rule version and freshness.
- **Typed questions:** None for MVP. If later used for a read-only semantic review, one Choice/Noul question may classify a bounded review signal; never use Score as amount/delta or model answer as duplicate proof.
- **Typed output:** Optional typed signal only; exact idempotency/match/baseline result remains deterministic.
- **Deterministic code composition:** Code computes arithmetic, identity, rules, race recheck and stale state. User can inspect/mark expected/dismiss/open correction. No freeze/reject/reverse/delete.
- **User control:** Explicit review; no action from render.
- **Persistence/provenance:** Rule/baseline/fingerprint version, matched own references, compared-at/freshness; no raw cross-owner data.
- **Fallback/abstain/escalation:** stale/insufficient → “chưa thể xác minh”; keep normal transaction path. Human/support review if needed.
- **Metrics:** Zero duplicate by idempotency; zero valid wallet-sufficient payment blocked by heuristic; precision/false-positive/stale tracked.
- **Disposition:** Reject JEV as detector/authority; defer deterministic capability until contract exists.

### 5.7 Correction/learning — corrected card

- **Trigger:** User override/dismiss or explicit post-commit correction.
- **State:** Masked event metadata and category before/after; no raw ledger/model prompt.
- **Typed questions:** None required. Future ranking experiment may use Choice over candidate categories on a new request, not “learn” as side effect.
- **Typed output:** Future suggestion only; no persistence/retraining claim.
- **Deterministic code composition:** Correction remains append-only domain row; feedback is separate event; versioned rule/model update occurs outside money transaction and only after policy approval.
- **User control:** Accept/override/dismiss; correction requires normal domain review/confirmation. One override is not global truth.
- **Persistence/provenance:** Owner-scoped masked event, version, timestamp and disposition if approved; retention/consent/export/delete unresolved.
- **Fallback/abstain/escalation:** No feedback store or malformed event → no learning update, manual behavior unchanged. Never silently recategorize history.
- **Metrics:** Original immutable, no raw PII/secret, no automatic historical recategorization; holdout override/correct-abstention metrics.
- **Disposition:** Defer; instrumentation only after separate persistence/privacy contract.

### 5.8 Admin issue triage — corrected card

- **Trigger:** Admin opens a masked issue through canonical admin route.
- **State:** Only least-privilege/masked issue fields approved by security owner.
- **Typed questions:** No JEV in MVP. If a later experiment classifies issue topic with Choice/urgency with Score, it is advisory input to an admin; no status/priority/action execution.
- **Typed output:** Choice/Score answer only; never admin decision.
- **Deterministic code composition:** Server authz, issue state machine, priority/status/note/audit and incident controls remain code/admin-owned. No cross-owner ledger exposure.
- **User control:** Admin explicit action; user issue flow remains separate; JEV cannot accept/override on user’s behalf.
- **Persistence/provenance:** Canonical issue/audit metadata; no raw JEV payload.
- **Fallback/abstain/escalation:** Deterministic triage/manual escalation; model unavailable means no lost issue and no guessed priority.
- **Metrics:** No privilege leak, no unauthorized mutation, masked data, audit completeness.
- **Disposition:** Reject autonomous admin JEV. `docs/ARCHITECTURE.md` §2, L21–27; `docs/contracts/API-REVIEW.md` §Admin, L14–21; old `CC-JEV-PRODUCT-JOURNEY.md` L180–191.

### 5.9 Forecasting — corrected card

- **Trigger/state/questions/output:** Not applicable to MVP. Any future forecast would require a product/model methodology decision, deterministic range/uncertainty and explicit opt-in. Do not ask JEV to calculate future amount/balance or write forecast prose.
- **User control/fallback:** Show deterministic history/report or hide; never use forecast for authorization/budget/payment/savings.
- **Disposition:** Reject MVP; defer product/safety decision. `docs/PRD.md` §5, L65–67; `docs/AI-JEV.md` §8, L91–93; `docs/ARCHITECTURE.md` §8, L67–69; `CC-JEV-INSIGHT-COACH.md` UC-IC-08 L198–211.

## 6. Corrected ranked recommendation

> Điểm dưới đây là `[Proposal]`, không phải runtime measurement. “System One role” là typed signal only; “Code role” là bắt buộc.

| Hạng | Capability / insertion point | System One role | Code/domain role | Disposition |
|---:|---|---|---|---|
| 1 | Manual category picker + income/payment core | None | Candidate list, validation, wallet/ledger/idempotency, a11y/i18n | **Ship now; JEV-off baseline bắt buộc** |
| 2 | Pre-submit category suggestion | Choice; optional Noul safety signal | Redaction, active candidate/appliesTo, thresholds, explicit user selection, server revalidation | **Enable only after Gate B; default-off** |
| 3 | Deterministic dashboard/report/budget facts + static templates | None; optional typed `pattern_kind` later | Arithmetic, period HCMC, snapshot/freshness, localized copy, source links | **Ship deterministic; no JEV prose** |
| 4 | Read-only “what changed?” explanation | Optional Choice/Noul labels | Baseline/delta/threshold/evidence/template/CTA | **Defer typed experiment; safe deterministic template can ship** |
| 5 | Budget warning/coaching | Prefer none; optional bounded Choice | Warning threshold/dedupe, exact values, allowlist navigation, no block | **Ship warning; defer model signal; reject JEV action/prose** |
| 6 | Correction/override telemetry | None | Append-only feedback, retention/consent/version, no history mutation | **Defer until contract; no autonomous learning** |
| 7 | CSV row category assist | Choice per validated row; optional Noul | Parser/staging/row review/import idempotency/commit | **Defer with CSV; no raw file/prose** |
| 8 | Duplicate/anomaly | None for MVP; optional read-only typed signal only after safety review | Exact idempotency, matching, baseline, freshness, user review | **Defer deterministic; reject JEV detector/authority** |
| 9 | Admin issue assist | At most advisory Choice/Score in a future controlled experiment | Authz/status/priority/audit/escalation | **Reject autonomous JEV** |
| 10 | Forecasting/prediction | None under current contract | Methodology/calibration/uncertainty/product decision | **Reject MVP; defer** |
| 11 | Chatbot, prose parser, broad autonomous orchestration | Not a System One use | Code cannot safely delegate authority | **Reject** |

### 6.1 Why this ranking differs from old product ranking

**[Correction]** Old rankings put monthly narrative/tips/coaching near the top because they assumed JEV could turn facts into language (`FINAL-FINDINGS.md` L213–229; `CC-JEV-INSIGHT-COACH.md` L78–89). Under System One, product value may still be real, but the proposed JEV mechanism is invalid. The safe product is **deterministic facts + application-owned localized templates**, with optional typed signals only where a finite rubric exists. Therefore category suggestion is the only current JEV fit; explanation/coaching is a product opportunity, not a prose-model capability.

## 7. Explicit reject/defer list

### 7.1 Reject — no implementation path under current boundary

1. **JEV-generated prose/chat/reasoning:** monthly summary, tip, budget coaching sentence, explanation, causal narrative, evidence paragraph, localized free text. System One does not generate replies/explanations. Official [System One](https://docs.typesafe.ai/concepts/system-one); local `docs/AI-JEV.md` §8, L91–93 already defers monthly prose.
2. **Chat-completion substitution or prose/JSON parsing:** no fallback from typed System One to chat and no hidden “repair LLM”. `docs/AI-JEV.md` §2, L15–19; `docs/ARCHITECTURE.md` §5, L43–47.
3. **JEV choosing next action, route, tool, CTA execution or broad agent loop:** code owns control flow/side effects. Official [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), “Summary”/“Three software architectures”; `AGENTS.md` L133–141.
4. **JEV arithmetic or authoritative amount/date/balance/wallet/savings/budget/report:** deterministic domain owns formulas/invariants. `docs/DOMAIN-MODEL.md` §3–§4, L38–67; `docs/AI-JEV.md` §3, L25–31.
5. **Auto-select/auto-submit/auto-commit category or money action:** typed answer is not confirmation/authorization. `docs/AI-JEV.md` §3, §7, L21–31, L80–89; `docs/contracts/openapi.yaml` L440–449.
6. **JEV duplicate/anomaly detector, fraud accusation, freeze/reject/reverse/correct:** false positives and authority risk; code/domain only. `CC-JEV-TRANSACTION-AUTOMATION.md` §4.4–§4.5, L285–406; `docs/DOMAIN-MODEL.md` §5, L83–85.
7. **Autonomous admin triage/dispute/money ranking or cross-owner inference:** violates least privilege. `docs/ARCHITECTURE.md` §2, L21–27; `docs/contracts/API-REVIEW.md` §Admin, L14–21; `CC-JEV-PRODUCT-JOURNEY.md` L180–191.
8. **Raw ledger/balance/session/Google claims/secret/PII or raw CSV sent as general context; raw prompt/response persisted:** violates minimization boundary. `docs/AI-JEV.md` §3–§6, L21–31, L64–78; `AGENTS.md` L133–141.
9. **Confidence displayed as probability of correctness or consent:** official confidence is derived distribution and not guarantee; Noul has no separate confidence. [Confidence](https://docs.typesafe.ai/confidence); [Noul](https://docs.typesafe.ai/primitives/noul).
10. **Using Score for money arithmetic/delta/balance or using Noul as a native unknown/abstain enum:** wrong primitive semantics. [Score](https://docs.typesafe.ai/primitives/score); [Noul](https://docs.typesafe.ai/primitives/noul).

### 7.2 Defer — possible only with new contract/evidence

1. **Typed category suggestion enablement:** Gate B must prove candidate membership/status, state minimization, stale/race discard, explicit user control, fallback, a11y/i18n and kill path. JEV remains default-off otherwise.
2. **Typed signals for dashboard/report explanation:** Need comparison facts, source snapshot/version, stale invalidation, localized template inventory and comprehension evaluation. No prose output.
3. **Typed signals for budget coaching/NBA:** Need deterministic allowlist, threshold/dedupe and action semantics; model cannot choose/execute action.
4. **Feedback/learning:** Need append-only event, owner/retention/consent/export/delete and version policy. No silent retrain/recategorization.
5. **CSV:** Need parser/staging/preview/row errors/partial-failure/idempotency/privacy retention. Then Choice per validated row only.
6. **Duplicate/anomaly read-only semantic signal:** Need deterministic baseline/rules/freshness and user review; JEV cannot become detector or authority.
7. **Any future forecast:** Need separate methodology/calibration/uncertainty/product safety decision; no current JEV role.
8. **Admin advisory classification:** Need role/audit/redaction/opt-out and explicit human decision; no autonomous triage.

## 8. Cross-cutting acceptance gates

### Gate A — Core, independent of JEV

**[Verified fact]** Core requirements already require deterministic backend/domain authority, manual path, `income|payment`, positive integer VND, HCMC periods, immutable ledger, warning-only budget, bilingual accessible UI and JEV-off operation. `docs/PRD.md` §3–§4, L15–63; `docs/DOMAIN-MODEL.md` §1–§5, L3–85; `AGENTS.md` L87–141.

**[Proposal]** Do not enable any JEV feature unless:

- manual transaction/category flow works with feature off;
- user can review/override/save independently;
- owner/session/CSRF/idempotency/category lifecycle are server-enforced;
- arithmetic/report/budget/projection are deterministic and no transaction waits for JEV;
- `en|vi` translation keys cover loading/error/manual/stale/unsupported states;
- keyboard/screen-reader/focus/error/live states and chart/table equivalents work;
- errors preserve form and never render fake zero/fake success.

### Gate B — Typed category suggestion

**[Proposal]** Must prove:

- request state contains only allowlisted redacted fields;
- questions are typed and narrow; no prose/reason/action question;
- exact answer type/options/probabilities/confidence validation;
- candidate active/appliesTo/type membership and request version revalidation;
- confidence thresholds are code policy backed by evaluation, not correctness claim;
- Noul ambiguity is mapped by code, not called native abstain;
- manual fallback for privacy/injection/malformed/low-confidence/transport/flag-off;
- explicit `Use`/override/final Save; late response discard;
- no raw prompt/response/PII in logs/persistence; no JEV in money transaction;
- server kill/off leaves manual behavior intact.

### Gate C — Any typed insight/coach signal

**[Proposal]** Must prove:

- deterministic snapshot, source refs, period/timezone and freshness exist before request;
- model output is enum/boolean/ordinal only; application owns all text;
- code verifies claims and source; conflict means suppress model signal;
- stale/superseded/unavailable state and refresh behavior are explicit;
- user controls and persistence are owner-scoped/idempotent and non-financial;
- no CTA/action comes directly from model; code allowlist and authz remain final;
- accessibility/localization is template-owned and complete.

### Gate D — Fail-closed matrix

| Condition | Application result | Must not happen |
|---|---|---|
| malformed answer/unknown option/wrong primitive | manual/static deterministic path | parse partial/prose |
| low/ambiguous Choice or Score confidence | manual/review per code threshold | auto-commit |
| Noul middle/uncertain band | manual/review policy | call it native abstain |
| stale interaction/candidate/source snapshot | discard/fallback/refresh | render as current |
| injection/PII/secret-shaped text or privacy uncertainty | no outbound/manual | trust model safety result alone |
| timeout/4xx/5xx/429/flag off | preserve form/manual/static facts | block Save or fake success |
| deterministic report/budget unavailable | error/retry/manual; no JEV compensation | render zero or invented narrative |
| user override while request pending | override wins; discard late result | overwrite selected category |
| admin lacks role or source crosses owner | 403/404/manual escalation | leak or mutate |

## 9. Evidence index and citation notes

### 9.1 Official TypeSafe sources

- [System One](https://docs.typesafe.ai/concepts/system-one): typed decisions/probabilities; differs from LLM; no generated replies/code/explanations; text-only note.
- [How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one): code keeps control flow/rules/side effects; narrow typed questions; independent/parallel questions; compose answers in code; route on uncertainty.
- [State](https://docs.typesafe.ai/concepts/state): one request state; string/object/array; all questions share state and are independently evaluated.
- [Confidence](https://docs.typesafe.ai/confidence): Choice/Score probability distributions and derived confidence; confidence is not individual correctness; thresholds depend on risk; Noul does not carry confidence.
- [API](https://docs.typesafe.ai/api): `state`, `model`, typed `questions`; Noul/Choice/Score request and answer fields.
- [Choice](https://docs.typesafe.ai/primitives/choice): finite option selection, probabilities and confidence; option descriptions are part of criteria.
- [Noul](https://docs.typesafe.ai/primitives/noul): yes/no probability; no separate confidence field; code thresholds values.
- [Score](https://docs.typesafe.ai/primitives/score): ordered descriptive levels, weighted position, probabilities/confidence; not a generic numeric calculator.
- [OpenRouter System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md): `POST /systemone`, state + typed questions → typed answers; official request/response reference.
- [OpenRouter official docs index](https://openrouter.ai/docs/llms.txt): lists the Decisions reference at `https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md`.
- `[Unresolved]` The user-requested Decisions URL `https://openrouter.ai/docs/api/api-reference/decisions/submit-a-decisions-request` returned 404 when read; this review records the exact indexed URL instead of inventing content.

### 9.2 Local sources

- `AGENTS.md` L87–97, L99–141: accessibility/i18n, deterministic API/domain, no JEV authority, redaction/fallback.
- `docs/PRD.md` §1, §3.2–§3.5, §4–§5, L3–73: user-entered tracker, deterministic authority, category-only JEV, JEV-off invariant, out-of-scope prose/prediction/autonomy.
- `docs/DOMAIN-MODEL.md` §1–§5, L3–85: VND/income-payment/HCMC, formulas, immutable ledger, payment/savings/budget invariants, JEV boundary.
- `docs/ARCHITECTURE.md` §2, §4–§8, L21–69: browser/API/domain/persistence/admin boundaries, no provider in money transaction, JEV limitations and out-of-scope.
- `docs/AI-JEV.md` §1–§8, L5–93: current category contract, server-only/minimal input, typed output validation, fallback/privacy/evaluation, deferred prose/prediction.
- `docs/contracts/openapi.yaml` `/ai/category-suggestion`, `/ledger/transactions`, `/reports/monthly`, `/reports/dashboard`, L102–152, L246–262, L338–348, L440–449, L533–544, L585–610, L662–677: public request/response and category/report fields.
- `docs/contracts/API-REVIEW.md` §Admin, §Ledger correction, §Response, §Domain scope, L14–48: admin least privilege, append-only correction, error/date/idempotency semantics.
- `docs/working/jev-product-analysis/FINAL-FINDINGS.md` L15–36, L44–60, L66–77, L131–207, L213–241, L243–300: old integrated findings reviewed and corrected here.
- `docs/working/jev-product-analysis/CC-JEV-PRODUCT-JOURNEY.md` L19–36, L40–81, L89–139, L167–211, L234–243: old journey/insertion recommendations reviewed here.
- `docs/working/jev-product-analysis/CC-JEV-TRANSACTION-AUTOMATION.md` L8–15, L28–80, L92–159, L161–221, L223–283, L285–406: old transaction automation cards reviewed here.
- `docs/working/jev-product-analysis/CC-JEV-INSIGHT-COACH.md` L9–18, L28–60, L62–89, L91–211, L213–270: old narrative/coach cards reviewed here.
- `docs/working/jev-product-analysis/CC-JEV-SAFETY-UX-DOMAIN.md` L8–16, L34–75, L77–126, L128–177, L179–259, L261–367: old safety/user-control cards reviewed and tightened here.
- `[Unresolved]` `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` was cited by old handoffs but is absent in the current workspace; no claims here depend on it.

## 10. Final handoff disposition

**[Verified fact]** Campus Coin must retain deterministic/manual-first money behavior and JEV cannot have financial authority (`docs/PRD.md` §3–§5, L15–73; `docs/DOMAIN-MODEL.md` §1–§5, L3–85; `docs/AI-JEV.md` §3–§8, L21–93).

**[Proposal]** Replace the old phrase “JEV narrative/explanation/coaching” with:

> **Application-owned explanation over deterministic facts, optionally informed by narrow System One typed signals.**

The corrected order is:

1. ship deterministic core/manual picker and bilingual accessible fallback;
2. optionally enable one typed Choice category suggestion after Gate B;
3. build deterministic report/dashboard/budget templates and evidence links without JEV prose;
4. consider typed signal experiments only with a separate contract, state minimization, stale policy, explicit user control and non-financial persistence;
5. keep CSV, anomaly/duplicate semantic signals, learning, forecast and admin assist deferred until their contracts/evidence exist;
6. reject prose parsing, broad orchestration, authority, arithmetic, autonomous action and admin mutation.

**[Verified fact]** This correction directly addresses the old report's prose assumption: TypeSafe System One returns typed answers/probabilities/confidence, not prose reasoning or next actions. The code—not JEV—must own sequencing, deterministic formulas, candidate membership, authorization, persistence and every side effect.
