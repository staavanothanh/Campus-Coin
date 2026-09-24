# FINAL-FINDINGS — JEV theo TypeSafe System One và product fit Campus Coin

> **Trạng thái:** working analysis mới; không phải ADR, canonical contract hoặc runtime implementation.
>
> **Integrator:** `JevProductUsecaseOrchestrator` (child của Team Leader `Main`).
>
> **Quan trọng:** Báo cáo cũ tại `docs/working/jev-product-analysis/` được giữ nguyên làm historical baseline. Báo cáo này **thay thế cách diễn giải capability JEV** của báo cáo cũ ở những chỗ coi JEV là LLM viết prose/narrative, giải thích reasoning hoặc tự chọn next action. Không sửa báo cáo cũ.
>
> **Phạm vi:** Phân tích product/use case thật của Campus Coin khi JEV là TypeSafe System One typed decision model. Không tái phân tích provider, model, quota, pricing/cost, SLA hoặc runtime availability; provider/pricing là prerequisite đã được user xác minh. Không sửa SRS, ADR, architecture, domain, auth, OpenAPI hoặc source runtime.

## Evidence classification và nguồn

- **[Đã kiểm chứng]**: quan sát được từ official TypeSafe/OpenRouter docs hoặc SRS/canonical local docs; không đồng nghĩa runtime đã pass.
- **[Đề xuất]**: thiết kế product/UX/adapter cần Team Leader/owner phê duyệt; không tự trở thành API/domain decision.
- **[Chưa chốt]**: thiếu contract, policy, probe hoặc evaluation; phải fail closed, không được điền bằng suy đoán.

### Official capability sources

- [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one), sections “How it differs from an LLM” và “Fast judgments inside a larger workflow”: System One trả typed decisions/probabilities, không viết reply/code/explanation; Jev text-only.
- [How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), “Summary”, “AI-powered software”, “What makes System One composable”, “Keep control flow…”, “Ask multiple questions…”, “Combine question outputs in code”: code giữ control flow, deterministic rules, side effects; câu hỏi hẹp, typed, độc lập rồi code compose.
- [State](https://docs.typesafe.ai/concepts/state), “State”, “State can be…”, “Separate content from questions”: một request có một state; string/object/array; mọi question cùng thấy state và được đánh giá độc lập.
- [Confidence](https://docs.typesafe.ai/confidence), “Confidence is derived…”, “I don’t know…”, “Three paths…”, “Thresholds scale with risk”: Choice/Score confidence từ probability distribution; không bảo đảm từng answer đúng; threshold do code theo risk; Noul không có confidence field riêng.
- [API](https://docs.typesafe.ai/api), “Evaluation endpoint”, “Request body”, “Question types”, “Answer types”: request gồm `state`, `model`, `questions`; answer trả theo question ID; native types là Noul/Choice/Score.
- [Choice](https://docs.typesafe.ai/primitives/choice): finite option → `choice`, probabilities cho mọi option, confidence.
- [Noul](https://docs.typesafe.ai/primitives/noul): một proposition yes/no → `noul` probability yes; không phải native unknown/abstain.
- [Score](https://docs.typesafe.ai/primitives/score): ordered levels → probability-weighted `score`, probabilities, legend, confidence.
- [OpenRouter System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md): `POST /api/v1/systemone`/operation `/systemone`, state + typed questions, typed answers và documented HTTP error classes.
- User-requested Decisions URL `https://openrouter.ai/docs/api/api-reference/decisions/submit-a-decisions-request` trả 404 khi đọc. [OpenRouter docs index](https://openrouter.ai/docs/llms.txt) liệt kê current alpha reference `https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md` / `POST /api/alpha/decisions`; báo cáo **không suy diễn thêm Decisions semantics** từ URL cũ hoặc từ index.

### Local sources

Đã đối chiếu toàn bộ SRS `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md`, `AGENTS.md`, `docs/PRD.md`, `docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/AI-JEV.md`, `docs/contracts/openapi.yaml`, `docs/contracts/API-REVIEW.md`, `docs/ADMIN-OPERATIONS.md`, `docs/AUTHENTICATION.md`, `docs/DELIVERY-PLAN.md`, và các handoff mới trong thư mục này. Existing old product-analysis artifacts được đọc để chỉ ra finding cần sửa; không dùng chúng làm canonical authority.

## 1. Executive decision và vì sao

### 1.1. Quyết định capability

**JEV/System One không phải “người viết insight”.** Nó là một primitive đánh giá typed question trên một state hiện tại. Model trả `Choice`/`Noul`/`Score` answer và probability/confidence tương ứng; **application** mới quyết định threshold, abstain/manual, thứ tự workflow, localized UI copy, provenance, persistence, authorization và side effects.

| Quyết định | Kết luận | Bằng chứng / lý do |
|---|---|---|
| Core Campus Coin | **Ship** manual-first deterministic path: auth, opening wallet, `income`/`payment`, category picker, immutable correction, savings, budget status, dashboard/report và accessible `en`/`vi`. | `[Đã kiểm chứng]` Backend/domain là authority; JEV off vẫn phải chạy money path (`docs/PRD.md` §3.1–§4, L17–63; `docs/DOMAIN-MODEL.md` §3–§5, L38–85). |
| Category suggestion | **Ship capability hiện có sau gate; default-off/manual-first.** System One dùng `Choice` trên active candidate set; optional Noul chỉ là signal sufficiency/unsupported, không native abstain. | `[Đã kiểm chứng]` Đây là use case JEV canonical duy nhất: `docs/PRD.md` §3.5, L45–51; `docs/AI-JEV.md` §3, L21–31; `openapi.yaml` L338–348, L662–677. |
| Các narrative cũ | **Sửa:** monthly summary, spending explanation, tip, coaching, “rationale” không thể là output JEV/System One. | Official System One nói model không generate text/reasoning. Product value có thể giữ bằng deterministic facts + application-authored templates; typed signal chỉ optional. |
| Transaction intent/type, correction classification | **Defer capability contract riêng.** Nếu làm, JEV chỉ `Choice`/`Noul` route hint; explicit user choice và correction domain thắng. | Domain chỉ `income|payment`; correction append-only và role semantics còn review (`docs/DOMAIN-MODEL.md` §4–§5, L54–85; `API-REVIEW.md` §Ledger correction, L23–30). |
| CSV row classification | **Defer cùng CSV.** JEV chỉ `Choice` từng row đã parse/validate; không parse file, sửa amount/date/type hoặc import. | SRS có CSV nhưng canonical loại khỏi MVP (`SRS..._vi.md` §1.5–§1.6, L65–84, L113–119; `docs/PRD.md` §5, L65–67). |
| Duplicate/anomaly/forecast | **Deterministic-first/defer; reject JEV detector/authority.** | Idempotency, arithmetic, baseline, threshold, HCMC period và freshness thuộc code/domain; Score không phải anomaly/balance arithmetic. |
| Budget/report/dashboard | **Ship deterministic facts/status.** Không gọi JEV nếu code/template đã đủ. Typed signal chỉ future experiment có rubric rõ; JEV không sinh coaching/NBA hoặc tính status. | `docs/DOMAIN-MODEL.md` §3–§4, L38–67; `docs/ARCHITECTURE.md` §2, L21–27; SRS dashboard/report/tips `§1.6, L101–145`. |
| Admin assistance | **Reject autonomous JEV.** Future masked topic classification chỉ là advisory input cho admin. | Admin least privilege, không sửa ledger/balance/audit (`docs/ADMIN-OPERATIONS.md` §1–§7, L3–51). |

### 1.2. Product insertion point thực tế

Ngoài auto-category, JEV chỉ nên được đặt ở **typed judgment hẹp sau deterministic facts**, không phải ở lớp prose:

1. **Dashboard/report pattern label:** code tính delta/baseline/threshold; optional `Choice` chọn `increase|decrease|no_clear_change|insufficient_data`; application render template localized và source link.
2. **Budget signal:** code tính `usedVnd`, `limitVnd`, `isOverrun`, threshold và dedupe; optional typed relevance signal nếu thật sự cần. Application chọn copy/CTA allowlist; JEV không chọn next action.
3. **CSV row category:** sau deterministic parse/stage; `Choice` category + optional Noul sufficiency từng row; user review trước import.
4. **Correction/help routing:** optional `Noul` “đây có phải correction request?” + `Choice` area; application mở help/correction form; JEV không chọn role/amount/category.
5. **Admin masked topic:** future bounded `Choice`/`Score` làm triage hint; admin policy/code quyết status/priority/escalation.

**Nếu product không thể viết typed question với finite options, yes/no proposition hoặc ordered rubric mà không yêu cầu model viết câu chữ/chọn hành động, thì đó không phải System One use case phù hợp.** Deterministic template thường tốt hơn gọi JEV.

### 1.3. Finding cũ nào bị sửa

| Finding cũ | Sửa bắt buộc trong báo cáo mới |
|---|---|
| `docs/working/jev-product-analysis/FINAL-FINDINGS.md` §1.2, §5, L27–36, L233–241 gọi JEV là source-linked explanation/monthly insight/coaching/NBA wording. | Đổi actor: facts, source links, copy, templates, CTA và action do application/code; System One chỉ trả typed signal (nếu có). |
| Cũ UC-06–UC-10, L131–195 và `CC-JEV-INSIGHT-COACH.md` §5, L93–211. | Không có `summaryText`, “một/vài câu”, rationale, tip prose, contextual nudge hoặc JEV-selected NBA. Chỉ deterministic facts/templates + optional typed signal. |
| Cũ `CC-JEV-PRODUCT-JOURNEY.md` P1–P4, L65–70. | Placement sau facts vẫn hợp lý, nhưng “JEV narrative” sai capability; sửa thành typed signal → code composition → localized UI. |
| Cũ dùng `suggested|manual|abstain|disabled|unavailable|stale|invalid` như model output. | Đây là application adapter/UI states. Native output là primitive-specific answer; code map transport/schema/threshold/freshness thành states. |
| Cũ nói confidence/low-confidence là native abstain. | Official docs không có chung `abstain`; `other_or_uncertain`/threshold/manual là policy code. Noul chỉ probability yes, không confidence/unknown field. |
| Cũ để ngỏ JEV “giải thích” anomaly/duplicate. | Reject JEV detector/semantic proof; deterministic matching/baseline/freshness. Nếu future typed signal thì chỉ human review, không authority. |
| Cũ nói JEV “học” từ correction. | System One request không có memory/retraining side effect; feedback chỉ append-only product telemetry và versioned future rule/model decision. |
| Cũ gọi injection detection bằng JEV là đủ. | Deterministic redaction/allowlist/secret checks là primary security boundary; optional Noul chỉ defense-in-depth, privacy uncertainty → no outbound/manual. |

`docs/working/jev-product-analysis/` giữ nguyên để trace lịch sử; báo cáo mới này là correction, không phải edit in place.

## 2. Full user journey map và insertion points

| Bước | Mục tiêu/pain point | System One role | Deterministic code/domain authority | User control/fallback | Phase |
|---|---|---|---|---|---|
| **J0 Auth/onboarding** | Vào app và hiểu đây là tracker user-entered. | **Không JEV.** Không gửi identity/session. | Google OAuth/session/owner scope, onboarding state (`docs/AUTHENTICATION.md` §3–§6, L16–51). | Fail closed; copy app-owned; không guest/AI onboarding. | Ship core; reject JEV. |
| **J1 Opening wallet** | Nhập baseline mà không nhầm income. | **Không JEV.** | Validate positive/non-negative VND, baseline/audit, không income giả (`DOMAIN-MODEL.md` §2, §5, L21–24, L69–77). | User sửa trước submit; lỗi giữ form. | Ship core; reject arithmetic. |
| **J2 Add transaction** | Nhập trợ cấp/payment nhanh. | Optional `Choice` category; future optional `Choice` intent/type chỉ khi user chưa explicit chọn. | Type/category/amount/date/wallet/idempotency/ledger/budget warning. | Suggestion preview → explicit accept/override → Save riêng; manual path luôn sống. | Category after Gate B; intent defer. |
| **J3 Category** | Category dài, `income`/`payment` khác nhau. | `Choice` finite active candidates; optional Noul evidence sufficiency; no prose. | Active/status/`appliesTo`/localized label/candidate version. | Manual picker before/during/after; stale/invalid → manual. | Manual ship; JEV optional. |
| **J4 History/correction** | Sửa lỗi không mất lịch sử. | Future Noul + Choice chỉ route help/area; no correction command. | Append-only correction, reason/actor/reference/audit (`DOMAIN-MODEL.md` §5, L83–85). | User chọn target/reason/role theo contract; human support for ambiguity. | Correction ship; typed routing defer. |
| **J5 Budget** | Hiểu `used/limit/overrun`. | Safe default **none**; optional bounded signal only if evidence. | Budget calculation, HCMC month, warning-only, threshold/dedupe. | Exact progress/warning; coaching template optional; overrun không block payment. | Ship deterministic; JEV signal defer. |
| **J6 Dashboard** | Biết “điều gì đáng chú ý?”. | Future `Choice` pattern label/Noul sufficiency; no summary text/CTA selection. | Snapshot, top category, aggregates, delta, source refs, template/copy. | Chart/table/facts always visible; optional card dismiss/save/feedback. | Ship facts; typed experiment defer. |
| **J7 Monthly report** | Hiểu report nhưng không đổi số. | Future typed `pattern_kind`; no narrative or arithmetic. | `/reports/monthly`, totals/category breakdown, HCMC period. | Open source table; stale/missing → report only. | Report ship; JEV prose reject/defer. |
| **J8 CSV** | Import lịch sử với ít thao tác. | Row-level `Choice` category after staging; optional Noul sufficiency. | Parser/schema/type/date/VND/owner/idempotency/duplicate/import. | Preview/edit/accept/override/skip/confirm; no auto-import. | Defer CSV. |
| **J9 Insight/tips** | Muốn biết category nào thay đổi và có bước nhỏ nào. | No prose. Optional finite signal only after facts; app templates. | Baseline/delta/evidence, tip allowlist, source links, stale. | Dismiss/save/feedback; no Apply-to-money. | Deterministic/template phase; JEV signal defer. |
| **J10 Budget warning/notification** | Warning đúng lúc, không alert fatigue. | No JEV trigger/CTA. Optional typed relevance only after policy. | Trigger/threshold/dedupe/channel/read state. | Read/dismiss/snooze; warning remains truthful; no payment block. | Ship deterministic; JEV defer. |
| **J11 Duplicate/anomaly/forecast** | Nhận biết nhập nhầm/bất thường. | **Không JEV detector.** | Idempotency/matching/baseline/arithmetic/freshness; forecast methodology. | Inspect/mark expected/issue/correction; no freeze/auto-fix. | Deterministic defer; forecast reject MVP. |
| **J12 Admin/issue** | Triage report an toàn. | No JEV MVP; future masked topic hint only. | Authz/status/priority/note/audit/incident. | Admin explicit action; no cross-owner/raw financial. | Ship deterministic; reject autonomous. |

## 3. System One contract: state, questions, primitives, output

### 3.1 Request shape tối thiểu

**[Đã kiểm chứng]** Native request shape:

```json
{
  "state": "string | object | array",
  "model": "jev-latest",
  "questions": {
    "question_id": {
      "type": "choice | noul | score",
      "instructions": "string | object | array",
      "criteria": "primitive-specific"
    }
  }
}
```

Question ID do application đặt và answer trả cùng key. `state` là content của request hiện tại, không phải memory/provenance/freshness. Official: TypeSafe [API](https://docs.typesafe.ai/api), [State](https://docs.typesafe.ai/concepts/state).

**[Đề xuất]** Adapter Campus Coin tạo minimal redacted state ở server:

```json
{
  "capability": "category_v1",
  "state": {
    "transactionType": "payment",
    "descriptionRedacted": "Campus Cafe",
    "activeCandidates": [
      {"id": "food", "label": "Food"},
      {"id": "transport", "label": "Transport"},
      {"id": "other_or_uncertain", "label": "Other/uncertain"}
    ],
    "locale": "en"
  },
  "questions": {
    "category": {
      "type": "choice",
      "instructions": "Which active candidate best matches this description for this transaction type?",
      "criteria": {
        "food": "Food/cafeteria/meals",
        "transport": "Bus/ride/parking/travel",
        "other_or_uncertain": "No candidate is a clear fit"
      }
    },
    "evidence_sufficient": {
      "type": "noul",
      "instructions": "Does the description provide enough evidence to choose one candidate?"
    }
  }
}
```

Shape trên là local proposal, **không phải OpenAPI change**. Không gửi amount/date/balance/savings/raw ledger/session/claims/secret/PII thừa. `candidateVersion`, `interactionVersion`, `sourceSnapshotId`, owner scope và freshness do application giữ; chỉ gửi outbound nếu thật sự cần.

### 3.2 Primitive decision table

| Primitive | Semantics thật | Campus Coin fit | Không được làm |
|---|---|---|---|
| `Choice` | Fixed option set → `choice`, full `probabilities`, `confidence`. | Category, bounded intent/type, correction area, CSV row category, finite pattern label. | Không chọn option ngoài criteria; không commit/authorize; không prose. |
| `Noul` | One yes/no proposition → `noul` probability yes; không confidence riêng. | `evidence_sufficient`, `is_correction_request`, bounded unsupported-input signal. | Không gọi là native unknown/abstain; không ghép nhiều điều kiện mơ hồ; không security authority. |
| `Score` | Ordered levels → probability-weighted score + probabilities/legend/confidence. | Chỉ future ordered review-attention rubric có product semantics rõ. | Không VND, balance, budget percentage, anomaly score, forecast, correctness hoặc authorization. |

**Unknown/abstain:** Official primitives không có chung `abstain`/`unknown` answer. Application dùng `other_or_uncertain`, threshold bands, schema/freshness validation và manual fallback. Không bịa một numeric threshold trong report này.

### 3.3 Output envelope và code composition

Native answer không phải public Campus Coin response. Adapter phải map:

```text
native answer (choice/noul/score + probabilities/confidence where applicable)
  -> discriminated-schema validation
  -> option/level/range/probability checks
  -> candidate/status/appliesTo/freshness checks
  -> application policy: eligible_advisory | manual_review | abstain | unavailable
  -> application-owned localized label/template + provenance
  -> explicit user decision (nếu cần)
  -> normal deterministic domain/read path
```

`status`, `categoryId`, `reasonCode`, `stale`, `manual`, `unavailable` là application states, không phải primitive output. Không parse text/partial JSON/prose để “repair” typed failure.

## 4. Use-case cards (typed decision contract)

Mỗi card bắt buộc phân biệt **JEV signal** với **code composition/side effect**. Nếu card ghi `None/code-only`, đó là quyết định reject JEV, không phải thiếu field.

### UC-01 — Auto-category trước submit

- **Trigger:** User chọn `income|payment`, nhập description hợp lệ, bấm Suggest.
- **Minimal state:** `transactionType`, redacted description, active candidates đúng `appliesTo`, locale, candidate/contract version; không money authority.
- **Questions/primitive:** `category`=`Choice` gồm candidates + `other_or_uncertain`; optional `evidence_sufficient`=`Noul`; không Score.
- **Typed output:** `choice`, probabilities, confidence; optional `noul`; app map thành preview/status, không nhận prose.
- **Code composition:** Auth/CSRF/flag/input/candidate trước; schema/membership/status/freshness/threshold sau; final domain revalidate type/category/amount/date/owner/idempotency/wallet và commit immutable row. JEV ngoài money transaction.
- **User control:** Manual picker luôn visible; `Use this category`, override, dismiss; Save riêng; late result không overwrite; `confirmedCategorySuggestion` không authorization.
- **Persistence/provenance:** Suggestion ephemeral; optional masked candidate/rubric/contract version, status, user decision/time; raw prompt/response không lưu mặc định. Suggestion ID/ack binding/retention `[Chưa chốt]`.
- **Fallback/abstain/escalation:** Flag off, invalid, timeout, privacy/injection-shaped, stale, low/ambiguous signal → manual giữ nguyên form; escalation là user/manual, không agent loop.
- **Metrics:** 100% accepted ID active/đúng type; zero auto-commit; JEV-off parity; correct-abstention/override/fallback; zero sensitive outbound/log.
- **Disposition:** Manual ship; typed JEV enable sau Gate B; **không narrative**.

### UC-02 — Transaction intent/type

- **Trigger:** User chủ động xin gợi ý khi type chưa explicit.
- **Minimal state:** redacted description, finite `{income,payment,not_a_transaction,manual_required}`, locale; không amount/date.
- **Questions/primitive:** `transaction_intent`=`Choice`; `is_recordable_transaction`=`Noul`; không Score.
- **Typed output:** Type signal + distribution; app `suggestedType|manual|not_transaction`.
- **Code composition:** Explicit user type wins; only prefill pending UI after conservative policy; user confirms; server validates enum/category/amount/date/idempotency; no route to ledger.
- **User control:** Native type picker, change/dismiss, final full review.
- **Persistence/provenance:** Optional masked selected/final type and rubric/version; no money write or raw text by default.
- **Fallback:** Manual type picker for ambiguity/unsupported/cross-intent/privacy/schema; no overwrite explicit choice.
- **Metrics:** Agreement with final type, override/abstain, zero enum/category mismatch, no failed save caused by suggestion.
- **Disposition:** Defer separate capability contract; manual core ship.

### UC-03 — Correction/help classification

- **Trigger:** User opens help/correction and explicitly asks for routing.
- **Minimal state:** redacted message, opaque screen/target context, finite area labels (`category|amount|occurred_at|possible_duplicate|other|manual_required`); no raw ledger/command.
- **Questions/primitive:** `is_correction_request`=`Noul`; `correction_area`=`Choice`; no Score for correction role.
- **Typed output:** Noul + Choice route hint only; no `correctionRole`, amount, category or target command.
- **Code composition:** Server validates ownership/target and maps area to app-owned localized help/form; user enters reason and confirms; correction endpoint/domain enforces append-only policy.
- **User control:** Change area, choose target/reason, submit normal correction or issue; admin cannot accept on behalf.
- **Persistence/provenance:** Optional masked route event; financial correction/audit only domain row; retention unresolved.
- **Fallback:** Manual correction menu/static help; ambiguous integrity issue → human/support; no guessed reversal/adjustment/replacement.
- **Metrics:** Correct-form routing, manual completion, zero JEV-created correction, zero wrong-owner exposure/row mutation.
- **Disposition:** Defer bounded routing; reject correction authority.

### UC-04 — CSV row classification

- **Trigger:** Future only, after bounded upload parse/staging/validation.
- **Minimal state:** opaque row/job ID, validated type, redacted description, active candidate snapshot, locale, parser/schema version; no raw file.
- **Questions/primitive:** row category=`Choice` + `other_or_uncertain`; optional description sufficiency=`Noul`; no Score/amount/date.
- **Typed output:** Per-row Choice/Noul; app owns `suggested|manual|invalid|duplicate|abstain`.
- **Code composition:** Parser owns file/schema/encoding/type/date/VND/owner/idempotency/duplicate; validate answer membership/stale; user preview/override/skip; normal import commits reviewed rows.
- **User control:** Row preview/edit/accept/override/skip and explicit batch confirmation; unresolved row cannot commit.
- **Persistence/provenance:** Job/file hash/row decision/parser/candidate version/import idempotency; raw retention/partial failure `[Chưa chốt]`.
- **Fallback:** JEV off/error → manual row picker; parse error actionable; no silent drop/zero fill/auto-import.
- **Metrics:** zero silent loss/duplicate; 100% committed rows reviewed; zero JEV-authored amount/date/type; manual completion/time.
- **Disposition:** Defer with CSV; deterministic staging first.

### UC-05 — Duplicate detection

- **Trigger:** Pre-submit or post-commit scanner.
- **State:** **None for JEV in safe design.** Code uses owner-scoped validated fields, idempotency/body fingerprint and bounded own records.
- **Questions/primitive:** None; no Noul/Score semantic matcher on commit path.
- **Typed output:** Deterministic `same_idempotent_replay|possible_duplicate|no_signal|cannot_verify`, matched own ref/rule/freshness.
- **Code composition:** Exact idempotency first, matching/race recheck, warning only; no delete/merge/reverse/block valid payment.
- **User control:** Inspect match, dismiss/mark expected/proceed, correction/issue normal flow.
- **Persistence/provenance:** Rule/fingerprint version, own refs, compared-at/freshness; schema unresolved.
- **Fallback:** Stale/unavailable → cannot verify; keep normal path; no JEV bù dữ liệu.
- **Metrics:** zero duplicate same key/body, zero valid payment block, high-signal precision/false-positive/stale.
- **Disposition:** Deterministic phase later; **reject JEV detector**.

### UC-06 — Anomaly detection

- **Trigger:** Post-commit/read-time after enough user-owned history.
- **State:** **None for JEV detector.** Code owns committed features, baseline/min-history/HCMC/freshness.
- **Questions/primitive:** None in safe design; no Score anomaly, Noul fraud, Choice accusation.
- **Typed output:** Deterministic `no_signal|possible_anomaly|insufficient_or_stale`, neutral reason code.
- **Code composition:** Reconcile/rebuild, arithmetic/baseline/threshold/freshness, read-only flag; no freeze/reject/auto-correct.
- **User control:** View basis, dismiss/mark expected, issue/correction.
- **Persistence/provenance:** Rule/baseline/source version, period, generatedAt, disposition; schema/worker/retention unresolved.
- **Fallback:** Sparse/stale/mismatch/worker failure → insufficient/stale or hide; money path unchanged.
- **Metrics:** zero payment freeze/reject/auto-reversal; 100% flag basis/period/freshness; precision/false-positive/stale.
- **Disposition:** Deterministic phase later; **reject JEV detector/authority**.

### UC-07 — Monthly report / spending change / dashboard pattern

- **Trigger:** User opens deterministic dashboard/report snapshot after facts load.
- **Minimal state:** source snapshot/version, HCMC period, selected aggregates/current-vs-baseline, completeness/freshness, finite pattern labels; no raw ledger.
- **Questions/primitive:** Optional `pattern_kind`=`Choice` (`increase|decrease|no_clear_change|insufficient_data`); `needs_review`=`Noul`; no `summary_text`/cause question.
- **Typed output:** Choice/Noul signal only; no narrative, evidence paragraph, citation or CTA.
- **Code composition:** Backend computes totals/delta/baseline/threshold/source refs; validates stale; maps signal + exact facts to app-owned localized template; conflict → facts win and interpretation suppressed.
- **User control:** Read chart/table/source, dismiss/save/feedback only with interaction contract; no Apply-to-money.
- **Persistence/provenance:** Source snapshot, period/timezone, template/policy version, generatedAt, stale/user state; insight schema unresolved.
- **Fallback:** Report/dashboard deterministic; missing/stale/invalid → static copy or no interpretation; no zero/old narrative.
- **Metrics:** claim-to-source exactness, stale suppression, comprehension/source-open, locale/a11y parity, zero causal overclaim.
- **Disposition:** Deterministic facts/templates can ship; typed signal defer/optional; **JEV prose rejected**.

### UC-08 — Budget status/coaching

- **Trigger:** User opens budget/dashboard or deterministic warning after commit.
- **State:** `category`, `usedVnd`, `limitVnd`, `isOverrun`, HCMC month/source version and allowlisted signal candidates; facts already computed.
- **Questions/primitive:** Safe default none. Optional `is_review_prompt_relevant`=`Noul` or bounded `attention_kind`=`Choice`; never “what should user do?”; no Score for budget arithmetic.
- **Typed output:** Optional typed signal; core output exact backend budget fields; no coaching prose.
- **Code composition:** Code calculates threshold/dedupe/status, chooses allowlisted template/CTA; overrun warning-only and wallet-sufficient payment remains allowed.
- **User control:** Read source, dismiss/snooze/feedback if contract exists, open review screen; no auto-upsert budget/payment/savings.
- **Persistence/provenance:** Budget source/month/as-of plus interaction state; alert/tip schema/stale/retention unresolved.
- **Fallback:** Exact progress/warning/static copy; JEV unavailable → omit optional card; never block payment.
- **Metrics:** correct budget comprehension, review completion, alert noise, zero payment rejection/mutation.
- **Disposition:** Ship deterministic status/templates; defer typed signal; **reject JEV coaching/NBA prose**.

### UC-09 — Next-best action (NBA)

- **Trigger:** Dashboard/report/budget facts loaded.
- **State:** **No JEV question in safe default.** Code has current route, state facts and allowlisted actions.
- **Questions/primitive:** None; never ask JEV “what should app do next?”. Optional future `attention_kind` Choice is inert signal only.
- **Typed output:** Code-selected allowlisted CTA (`view_report|review_budget|review_transactions|record_income`) and app copy; no model-selected action.
- **Code composition:** Deterministic policy selects one CTA, authz and route; click opens screen; mutation still normal form/CSRF/idempotency/review.
- **User control:** Explicit click/dismiss/save/feedback; no automatic navigation or submit.
- **Persistence/provenance:** Source snapshot, CTA policy/template version and interaction if approved; no money state.
- **Fallback:** No CTA or static “Xem báo cáo” if state incomplete; core navigation works.
- **Metrics:** time-to-useful-screen, review completion, dismiss irrelevance, zero unintended submit/payment/transfer.
- **Disposition:** Ship deterministic navigation; **reject JEV action selection/execution**.

### UC-10 — Admin assistance

- **Trigger:** Admin opens masked issue.
- **State:** Only approved masked issue fields; no raw ledger/balance/PII/admin secret.
- **Questions/primitive:** None in MVP. Future topic `Choice`/urgency `Score` only advisory input; not priority/status command.
- **Typed output:** Typed hint only; admin policy owns status/priority/note/escalation.
- **Code composition:** Server authz, issue state machine, audit and incident controls; no cross-owner data.
- **User control:** Admin explicit action; user issue flow separate; JEV cannot accept/override for user.
- **Persistence/provenance:** Canonical issue/audit metadata; no raw model payload.
- **Fallback:** Deterministic triage/manual escalation; unavailable model does not lose issue or guess priority.
- **Metrics:** zero privilege leak/unauthorized mutation, masked data, audit completeness.
- **Disposition:** Reject autonomous; defer bounded masked classification only with role/audit contract.

### UC-11 — Correction/learning feedback

- **Trigger:** User accepts/overrides/dismisses suggestion or submits explicit correction.
- **State:** Masked event metadata/category before-after/suggestion version; no raw ledger/prompt.
- **Questions/primitive:** None required. Future ranking experiment may use Choice on a new request; System One does not persist memory/retrain as side effect.
- **Typed output:** Future suggestion signal only; no “learned” guarantee, no historical recategorization.
- **Code composition:** Correction append-only domain row; feedback separate event; versioned rule/model update outside money transaction after policy approval.
- **User control:** Accept/override/dismiss; correction review/confirm; optional consent/opt-out if decided.
- **Persistence/provenance:** Owner-scoped masked event, version/time/disposition; retention/consent/export/delete unresolved.
- **Fallback:** No feedback store/malformed event → no learning update; manual behavior unchanged.
- **Metrics:** original immutable, zero raw PII/secret, zero auto-recategorization; holdout override/correct-abstention.
- **Disposition:** Defer; instrumentation only after persistence/privacy contract.

## 5. Ranked recommendation

> Điểm là `[Đề xuất]`, 1–5; `Risk` 5 là rủi ro cao; `Dependency` 5 là phụ thuộc nhiều contract/chưa chốt. “System One fit” chỉ là fit của typed decision, không phải provider fit.

| Hạng | Capability/insertion | User value | Automation value | System One fit | Risk | Phase | Dependency |
|---:|---|---:|---:|---:|---:|---|---|
| 1 | Manual picker + deterministic transaction path | 5 | 2 | 0 (code-only) | 1 | Ship now | Core API/domain/a11y |
| 2 | Pre-submit category suggestion | 5 | 4 | 5 (`Choice`) | 3 | Enable after Gate B; default-off | Candidate snapshot, redaction, thresholds, confirmation |
| 3 | Dashboard/report/budget facts + app templates | 5 | 2 | 0 (code-first) | 1 | Ship deterministic | Existing read models, i18n/a11y |
| 4 | Typed pattern signal “what changed?” | 4 | 3 | 3 (`Choice`/`Noul`) | 3 | Defer experiment | Baseline/source snapshot/template/interaction |
| 5 | Correction/help routing | 3 | 3 | 3 (`Noul`+`Choice`) | 3 | Defer | Correction/help contract, owner target validation |
| 6 | Budget typed relevance signal | 4 | 2 | 2 (optional) | 3 | Defer; template first | Threshold/dedupe/alert contract |
| 7 | Feedback/learning telemetry | 4 | 2 | 1 (no JEV required) | 4 | Defer | Append-only event, consent/retention/version |
| 8 | CSV row category assist | 4 | 5 | 3 (`Choice`) | 4 | Defer with CSV | Parser/staging/preview/import/idempotency |
| 9 | Duplicate/anomaly read-only signals | 4 | 3 | 1–2 optional | 4 | Deterministic phase later | Baseline/rule/freshness/feedback |
| 10 | Admin masked topic hint | 2 | 2 | 2 optional | 4 | Defer controlled experiment | Least privilege/audit/privacy |
| 11 | Forecasting | 3 | 3 | 0 current | 5 | Reject MVP/defer | Methodology/calibration/uncertainty/product decision |
| 12 | JEV-generated prose/chat/broad agent/NBA action | 1 | 5 nominally | 0 | 5 | Reject | Contradicts System One/code ownership/domain safety |

**Ranking correction:** Old report ranked narrative/tips/coaching as if JEV could produce language. Product value remains a valid product question, but the mechanism is wrong. Use deterministic facts + application templates first; only add typed signals where a finite question changes a measurable decision.

## 6. Architecture placement và System One composition

| Placement | Suitable typed role | Code-owned work | JEV prohibition/fallback |
|---|---|---|---|
| **Synchronous pre-submit** | Category `Choice`; optional sufficiency `Noul`; future type `Choice` | Validate/auth/redact/candidates, call only explicit click, schema/membership/freshness/threshold, user confirmation, normal commit | No money transaction held; no auto-submit; timeout → manual picker. |
| **Async post-commit** | Feedback quality signal; future pattern/coaching relevance label; anomaly semantic review only after code signal | Commit first; queue idempotent bounded work; persistence/read model/stale/invalidation; no rollback/mutation | JEV never changes committed row; worker exhaustion → unavailable/static facts. |
| **Read-time** | Optional pattern `Choice`/evidence `Noul` after authoritative snapshot | Load facts, arithmetic/baseline/period HCMC, source refs, template/copy, CTA allowlist | JEV does not block first useful content; no snapshot → no call/interpretation. |
| **Offline/batch** | CSV per-row category `Choice` + optional Noul | Parse/stage/validate/preview, row concurrency/idempotency, review/partial-failure contract, import commit | No raw file/offline authority; row timeout → manual; no auto-import. |
| **No JEV** | Auth, opening wallet, money arithmetic, budget/report calculation, duplicate/idempotency, anomaly baseline, forecast arithmetic, correction mutation, admin side effects/NBA choice | Domain/application deterministic path | Never call JEV to fill missing authoritative facts; preserve baseline. |

### 6.1 Code-owned pipeline

```text
explicit user/system trigger
  -> server session/owner/CSRF + deterministic input validation
  -> redact/allowlist minimal state + finite question criteria
  -> one System One request (questions share state; independent/parallel)
  -> validate discriminated typed answers and invariants
  -> candidate/status/freshness/HCMC/source checks in code
  -> application policy: advisory | review | manual | unavailable
  -> application-owned localized label/template/provenance
  -> user inspect/accept/override/dismiss (where applicable)
  -> normal deterministic read/domain command
```

No hidden agent loop, tool call, retry decision or side effect comes from JEV. Dependent questions require a new call chosen by code, not by model output.

### 6.2 Minimal state/question rules

- State is current request content, not memory; add `requestFingerprint`, `candidateVersion`, `sourceSnapshotId`, `interactionVersion`, `asOf` in application metadata only as needed.
- Category state: type, redacted description, active candidate IDs/labels, locale/version. Never amount/date/balance/raw ledger/session/claims/secret/PII excess.
- Report/budget future state: backend-frozen aggregate facts + source refs/period/HCMC/freshness + finite candidate labels only; no arithmetic question.
- CSV state: one parsed validated row or bounded batch; opaque row/job ID, type, redacted description, candidates, parser version; no raw file/unvalidated cells.
- Questions are atomic: finite classification → Choice; one proposition → Noul; ordered rubric → Score. Do not ask for prose, reasoning, explanation, “what should app do next?” or authority.

### 6.3 Independent questions and batching

System One allows multiple questions over one state and independently evaluates them. Group questions only when they share the same minimal state and are genuinely useful to the same policy; e.g. category Choice + sufficiency Noul. Code must ignore unused answers, validate every answer and compose deterministically. Do not assume question B sees answer A. For CSV, each row is bounded state; bounded parallelism is application/worker policy, not JEV orchestration.

## 7. Confidence, probability, abstain, escalation và UX

### 7.1 Correct semantics

- Choice/Score `confidence` summarizes probability distribution; not correctness, consent, provenance, or authorization.
- Noul `noul` is probability yes; no confidence field and no native unknown/abstain.
- Score is ordered level position; not amount, anomaly probability, budget percentage, forecast or financial risk.
- Thresholds are capability/risk-specific code policy; exact values are `[Chưa chốt]` until synthetic/holdout evaluation.

### 7.2 Three application outcomes

1. **Eligible advisory:** typed answer valid, candidate/rubric/freshness gates pass; may show suggestion, still no auto-commit in Campus Coin.
2. **Manual review/confirm:** medium/ambiguous signal, conflicting explicit user data, stale source or action has material consequence; user chooses/inspects.
3. **Abstain/unavailable:** low/flat distribution, Noul middle band per policy, invalid/malformed, privacy/injection concern, transport/timeout/quota, missing data; manual/static deterministic fallback.

`abstain`, `manual`, `stale`, `invalid`, `unavailable` are application statuses. Do not claim System One returned a native abstain answer.

### 7.3 UX contract

- App writes all `en`/`vi` labels, aria/live/error/help/status copy from translation keys; JEV returns no localized prose.
- Show `Số liệu authoritative` vs `Gợi ý tham khảo`; show source/period/as-of/stale state; never numeric confidence as `% đúng`.
- Manual picker/form remains usable before/during/after request; preserve input; late result cannot overwrite manual selection.
- `loading` does not lock Save indefinitely or steal focus; `invalid/unavailable/abstain` gives actionable manual fallback; no raw provider/model/prompt/error.
- Chart/table equivalent, keyboard/focus/contrast/reflow and screen-reader announcements apply to facts and typed advisory states (`AGENTS.md` L87–97; `docs/PRD.md` §3.4, L39–43).
- User controls: explicit trigger, inspect source, accept/override/dismiss/save/feedback where contract exists. No `Apply to wallet`, `Pay`, `Transfer`, `Set budget`, `Auto-fix` from JEV output.

## 8. User control, provenance, persistence, fallback và safety

### 8.1 Provenance envelope (application proposal)

Authoritative layer: `sourceKind`, owner-scoped source snapshot/version, metric/category refs, period + `Asia/Ho_Chi_Minh`, `asOf`, exact backend values.

Typed advisory layer: capability/question/rubric version, selected ID/level or bounded signal, confidence/probabilities internal as allowed, generatedAt, application status, stale reason, template/copy key, user decision. No raw prompt/response/prose/provider payload/PII.

State version is not model memory: app revalidates category/status/owner/source before render/commit and discards late responses after type/description/locale/candidate/source changes.

### 8.2 Persistence

- Category suggestion: ephemeral by default; optional masked quality event only after retention/consent/owner/idempotency decision.
- Feedback/learning: append-only non-financial event; no silent retraining or historical recategorization.
- Insight/tip/pattern: immutable application snapshot if separately contracted; refresh creates new version; stale after transaction/correction/category/budget/report/policy/locale change.
- CSV: job/row provenance and review state only after import contract; raw file retention unresolved.
- Duplicate/anomaly: rebuildable deterministic read model; no financial mutation.

### 8.3 Fallback hierarchy

1. Category → active manual picker.
2. Dashboard/report → backend chart/table/loading/error/empty; never zero fake.
3. Budget → exact `used/limit/isOverrun` and warning-only status.
4. Typed pattern/coach → app static template or hide card; no JEV prose fallback.
5. CSV → row manual/invalid/skip, preview preserved.
6. Duplicate/anomaly → `cannot_verify`/`insufficient_or_stale`, no fraud/unique claim.

JEV timeout, schema, privacy, low-confidence, transport error or flag-off cannot block money path (`docs/AI-JEV.md` §5–§7, L64–89; `docs/ARCHITECTURE.md` §6, L49–56).

### 8.4 Safety boundaries

- JEV never computes/changes wallet, savings, amount, date, budget, report, trend delta or forecast.
- JEV never authorizes/rejects payment, writes/corrects/deletes/merges ledger, changes budget/savings, sends notification/payment or chooses next action.
- Deterministic redaction/allowlist/length/secret checks precede optional Noul; user description/CSV cell is data, never instruction. Suspicious/injection/PII/secret or privacy uncertainty → no outbound/manual.
- JEV is not a security boundary, stale detector, bank feed, fraud authority or admin authority.
- Owner/session/CSRF/least privilege and HCMC period remain code/domain-owned (`docs/AUTHENTICATION.md` §4–§6, L27–51; `docs/ADMIN-OPERATIONS.md` §1–§7, L3–51).

## 9. Metrics và evaluation dataset

### 9.1 Hard safety gates

- JEV-off/manual transaction completion equals baseline; zero core regression.
- 100% accepted category IDs active/valid `appliesTo`; zero auto-select/submit/commit/correction.
- 100% accepted typed responses schema-valid and candidate/rubric-valid; zero partial/prose repair.
- Zero JEV-authoritative amount/date/balance/budget/report/payment action.
- Zero raw prompt/response/secret/PII excess in outbound/log/persistence.
- Zero stale result rendered as current; late responses cannot overwrite user choice.
- 100% failure paths preserve manual/deterministic fallback.

### 9.2 Product metrics

- Category: completion parity, override, correct-abstention, fallback, schema-invalid, stale rate by `en|vi × income|payment × category`.
- Intent/correction: agreement with final user choice, route-to-correct-form, manual escalation, zero wrong-owner exposure.
- CSV: row review time, silent loss/duplicate, explicit review rate, row abstention/override, retry idempotency.
- Pattern/budget template: claim-to-source exactness, stale suppression, comprehension/source-open, template usefulness, zero unsupported causal/financial-advice claims.
- Duplicate/anomaly: deterministic precision, false-positive mark-expected/dismiss, stale/insufficient rate, zero valid-payment block.
- Admin: masked-data and authorization/audit completeness.
- Accessibility/i18n: keyboard completion, screen-reader state announcements, focus restore, chart/table equivalent and translation-key parity.

### 9.3 Evaluation dataset

Use synthetic/anonymized data only. Category evaluation should include at least the 50–100-case range already requested by `docs/AI-JEV.md` §6, L74–78, separated by `en|vi` and `income|payment`, with development/holdout wording split:

- clear in-set, ambiguous/slang, out-of-set/`other_or_uncertain`;
- PII/secret-shaped and prompt-injection-shaped descriptions;
- disabled/retired/wrong `appliesTo` candidates;
- correction/amount/date/balance/budget/authorization requests;
- empty/Unicode/diacritics/max length/mixed locale;
- malformed typed response, missing/extra option, invalid probability, timeout/4xx/5xx/429/flag-off;
- stale/race: type/description/locale/category/source changes before response;
- accept/override/dismiss/manual and keyboard/screen-reader paths.

For future typed pattern/budget signals, fixtures must have known deterministic facts, source refs, HCMC boundaries, stale events and application template expectations. Measure typed signal usefulness and comprehension; **do not measure generated prose quality because System One does not generate prose**.

## 10. Recommended implementation sequence cho Developer D / Team Leader

| Bước | Owner | Hành động | Exit evidence / disposition |
|---:|---|---|---|
| 0 | Team Leader | Freeze interpretation: System One typed-only; old narrative claims are historical corrections; provider/pricing prerequisite accepted; no chat/prose fallback. | Dated product decision; no implicit API/domain expansion. |
| 1 | B/C/TL | Ship and smoke deterministic core: manual category, auth/owner/CSRF, `income|payment`, wallet/ledger/savings/budget/report, correction, a11y/i18n/HCMC, JEV-off. | Gate A pass; no JEV needed for core. |
| 2 | D + B/C | Build/verify category adapter as typed `Choice` (optional Noul only if needed): minimal redacted state, finite candidates, exact schema validation, application states, stale/race, manual fallback. | Gate B: no prose parse; active candidate 100%; manual Save remains usable; no money transaction waiting. |
| 3 | D + TL | Establish thresholds/abstention policy with synthetic/holdout evaluation; explicit `other_or_uncertain` decision; `confirmedCategorySuggestion` binding/ack semantics; server-side flag/kill/audit. | Typed output → advisory only; high/medium/low paths measured; unresolved → keep off. |
| 4 | B/C | Ship deterministic dashboard/report/budget facts + app-owned templates/static copy, table/chart/a11y/en-vi; do not call JEV for facts or prose. | Facts exact; no zero fallback; budget warning-only. |
| 5 | TL + B/D/C | If product wants pattern/budget typed signal, define separate capability contract: state allowlist, questions/primitive, answer schema, template keys, source snapshot/stale/invalidation, feedback/persistence/retention. | Contract decision before implementation; current category endpoint not reused as prose endpoint. |
| 6 | D/B | Implement only typed signal experiments where deterministic code cannot settle a bounded judgment; ask independent questions together; compose in code; keep output inert. | Gate C: signal adds measured value, no unsupported claim, no CTA/action authority, facts/template fallback intact. |
| 7 | B/C/TL | If CSV is approved, first implement parser/staging/preview/row errors/idempotency/manual review; then add row `Choice` only. | Zero silent loss/duplicate; explicit row/batch review; no raw file/prose. |
| 8 | B/D/Security | Duplicate/anomaly deterministic read model: exact idempotency, baseline, freshness, mark expected/issue; no JEV detector. | Zero freeze/reject/auto-correct; provenance/stale evidence. |
| 9 | TL | Review masked admin topic hint only after least-privilege/audit/privacy contract; no autonomous triage. | Separate go/no-go; model unavailable preserves deterministic admin flow. |
| 10 | TL | Forecasting remains product/safety decision; require methodology/calibration/uncertainty/opt-in; never current JEV authority. | Reject MVP unless new decision/evidence. |

**Stop conditions:** Gate A failure → no JEV enablement. Gate B/C failure → keep capability off; ship deterministic core. Never solve a typed-model limitation by substituting chat/prose/repair loop.

## 11. Rejected/deferred use cases

### Reject under current System One boundary

1. JEV-generated monthly summary, tip, coaching, causal explanation, source-linked prose, localized free text or reasoning.
2. JEV choosing next action, route, CTA, tool, retry sequence, notification or autonomous agent loop.
3. JEV arithmetic/authoritative wallet, balance, savings, budget, report, amount/date, trend delta or forecast.
4. JEV payment authorization/rejection, auto-transfer, ledger/correction/budget mutation, auto-correction, freeze or fraud accusation.
5. JEV duplicate/anomaly detector or semantic similarity as proof; JEV confidence as correctness/consent.
6. Chat-completion/prose/JSON parsing as fallback or hidden repair model.
7. Raw ledger/balance/session/claims/secrets/PII/raw CSV as general state; raw prompt/response persistence.
8. Autonomous admin triage/dispute/priority/status/cross-owner inference.
9. Score for VND/budget/anomaly/arithmetic; Noul treated as native unknown/security guarantee.

### Defer pending a separate capability contract/evidence

1. Category JEV enablement until Gate B typed schema/candidate/threshold/fallback/confirmation/a11y/privacy evidence.
2. Transaction intent/type `Choice` and correction/help `Noul`+`Choice` routing.
3. Dashboard/report pattern `Choice`/`Noul` signals with application-owned templates.
4. Budget relevance signal; core status/warning remains deterministic.
5. Correction/learning telemetry and versioned adaptation; no silent retraining/history recategorization.
6. CSV row category `Choice` after parser/staging/import contract.
7. Deterministic duplicate/anomaly capabilities; optional future read-only typed review signal only after safety review.
8. Masked admin topic/urgency hint under explicit least-privilege/audit contract.
9. Forecasting only after methodology/calibration/uncertainty/product approval; not current JEV.

## 12. Technical prerequisites và unresolved decisions

- `[Chưa chốt]` Runtime typed compatibility/transport/model/limits/timeout/concurrency and exact probe evidence; user has verified prerequisite but this report does not re-litigate it.
- `[Chưa chốt]` Thresholds per primitive/use case, `other_or_uncertain`, calibration/holdout gates and risk bands.
- `[Chưa chốt]` Adapter mapping native answers to public category envelope, suggestion ID/ack binding and stale/race semantics.
- `[Chưa chốt]` Future typed-signal contracts: state allowlist, questions, rubric versions, output/status schema and application template keys.
- `[Chưa chốt]` Provenance/interaction schema: source snapshot, stale/invalidation, save/dismiss/feedback, idempotency, retention/export/delete/consent.
- `[Chưa chốt]` CSV parser/staging/partial failure/raw-file retention; duplicate/anomaly baseline/read model; admin masked assist role; forecast methodology.
- `[Chưa chốt]` Current workspace path `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` was not available to the revised child review; do not treat old line citations to that path as new verified evidence. Use AGENTS/canonical docs and official TypeSafe docs for this report.

## 13. Evidence index và điều phối

### Child handoffs đã đọc

- [`CC-JEV-SYSTEM-ONE-CAPABILITY.md`](./CC-JEV-SYSTEM-ONE-CAPABILITY.md): official capability map, primitive semantics, code boundary, six cards and old-finding corrections.
- [`CC-JEV-SYSTEM-ONE-USECASES.md`](./CC-JEV-SYSTEM-ONE-USECASES.md): 11 use-case cards with typed questions, code composition, controls, fallback and dispositions.
- [`CC-JEV-SYSTEM-ONE-ARCH-OPS.md`](./CC-JEV-SYSTEM-ONE-ARCH-OPS.md): placement/composition/parallelism/ops/UX/provenance and Developer D/TL gates.
- [`CC-JEV-SYSTEM-ONE-REVIEW.md`](./CC-JEV-SYSTEM-ONE-REVIEW.md): adversarial review, 16 overclaim corrections, corrected cards, gates and reject/defer list.

### Local canonical anchors

- `docs/PRD.md` §1, §3.2–§3.5, §4–§5, L3–7, L25–67 — tracker identity, deterministic authority, JEV category-only/manual fallback, scope cut.
- `docs/DOMAIN-MODEL.md` §1, §3–§5, L3–15, L38–85 — VND, immutable ledger, formulas, HCMC, budget warning-only, correction, JEV non-authority.
- `docs/ARCHITECTURE.md` §2, §4–§8, L21–69 — browser/API/domain/JEV adapter boundaries, no JEV in money transaction, out-of-scope.
- `docs/AI-JEV.md` §3–§8, L21–93 — current category boundary, redaction, fallback, evaluation and deferred prose/prediction.
- `docs/contracts/openapi.yaml` L102–152, L180–201, L246–260, L338–348, L397–449, L533–544, L662–677 — current money/category/report/JEV contract.
- `docs/contracts/API-REVIEW.md` §Ledger correction, §Domain scope, §Admin, L14–48 — correction, HCMC, admin and response boundary.
- `AGENTS.md` L87–141 — a11y/i18n, deterministic money/domain, server-only JEV and privacy/fallback.
- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1–§1.6, L25–166 — student pain points, category/CSV/summary/tips/budget/anomaly/forecast requirements; §1.7–§1.8, L187–295 — accessibility and illustrative entities.

### Verification note

Đã spawn và điều phối đúng 4 lane độc lập; mỗi child chỉ ghi handoff riêng trong thư mục mới. Đã đọc đủ 4 handoff và cập nhật board. Đã đọc official TypeSafe System One/how-to/state/API/confidence/Choice/Noul/Score và OpenRouter System One; requested Decisions URL 404 được ghi nhận, current alpha URL chỉ ghi như tài liệu index không suy diễn semantics. Không chạy formatter/linter/build/tests; không sửa canonical/runtime hoặc artifacts cũ.

**Kết luận cuối:** Campus Coin nên coi JEV là **typed decision primitive có thể bỏ qua**, không phải LLM writer hoặc agent. Ship deterministic/manual core. Enable category `Choice` suggestion chỉ sau Gate B. Ngoài category, chỉ cân nhắc typed labels/signals trên state đã deterministic và luôn để application viết copy, chọn CTA, giữ authority và side effects. Nếu một use case cần prose, reasoning, arithmetic, stale memory, action selection hoặc autonomous workflow, JEV/System One không phù hợp; dùng code/templates/manual review hoặc defer/reject.
