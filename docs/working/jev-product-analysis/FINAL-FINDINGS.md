# FINAL-FINDINGS — Phân tích sản phẩm và use case JEV cho Campus Coin

> **Trạng thái:** working product analysis; không phải ADR và không thay thế SRS, PRD, domain, architecture, auth hoặc OpenAPI canonical.
>
> **Integrator:** `JevProductUsecaseOrchestrator` (child của Team Leader `Main`).
>
> **Phạm vi:** phân tích user journey thật của sinh viên Campus Coin và nơi JEV có thể giảm thao tác, tăng khả năng hiểu dữ liệu hoặc hỗ trợ quyết định của user. Không phân tích lại provider/OpenRouter/model/pricing/cost; các prerequisite đó được xem là đã user xác minh. Không có source/runtime/API/ADR nào được sửa trong lượt này.
>
> **Cách phân loại:** `[Đã kiểm chứng]` = yêu cầu hoặc ranh giới có trong SRS/canonical docs; `[Đề xuất]` = product/UX/implementation direction cần phê duyệt; `[Chưa chốt]` = thiếu contract, persistence, baseline hoặc evidence, không được diễn giải thành capability đã có.

## 1. Executive decision và lý do

### 1.1 Quyết định sản phẩm

**Quyết định chính:** Campus Coin nên ship core theo hướng **deterministic-first, manual-first**. JEV không nên được đặt vào đường authority của tiền; ngoài auto-category, insertion point có product fit cao nhất là **sau khi backend đã tính xong dashboard/report/budget**, dưới dạng source-linked explanation, monthly insight, spending-change explanation và budget coaching/nudge. Các output này phải được xem là diễn giải tham khảo, có provenance và stale state, không tự thay đổi tiền.

| Quyết định | Kết luận | Lý do và bằng chứng |
|---|---|---|
| Core Campus Coin | **Ship** wallet, `income`/`payment`, manual category picker, correction append-only, savings, budget warning, deterministic dashboard/report, accessible `en`/`vi`. | `[Đã kiểm chứng]` Backend/domain là nguồn sự thật; dashboard/report deterministic; JEV off vẫn phải chạy money path (`docs/PRD.md` §3.2–§3.4, L25–43; §4, L53–63; `docs/DOMAIN-MODEL.md` §3–§5, L38–85). |
| JEV auto-category | **Ship manual path ngay; JEV enable sau Gate B**, không auto-select/auto-submit. | `[Đã kiểm chứng]` JEV hiện chỉ được gợi ý một category từ candidate set giới hạn cho `income|payment`, user phải xác nhận/đổi, lỗi phải manual (`docs/AI-JEV.md` §3, §5–§7, L21–31, L64–89; `docs/contracts/openapi.yaml` L338–348, L662–677). |
| JEV ngoài auto-category | **Ưu tiên phase sau:** monthly summary, giải thích tăng/giảm, budget coaching và tips; chạy trên deterministic snapshot. | `[Đề xuất]` Đây là điểm sinh viên thiếu nhất: không chỉ cần thêm số, mà cần biết “điều gì thay đổi?” và “có bước nhỏ nào có thể cân nhắc?”. SRS mô tả dashboard, report, insight và tip (`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L101–145); canonical hiện chưa có insight contract. |
| CSV batch | **Defer**, deterministic parser/preview trước, JEV row-level sau. | `[Đã kiểm chứng]` SRS có CSV và batch classification nhưng CSV bị cắt khỏi MVP (`SRS..._vi.md` §1.5–§1.6, L65–71, L77–84, L113–119; `docs/PRD.md` §5, L65–67; `docs/DELIVERY-PLAN.md` §9, L57–60). |
| Duplicate/anomaly | **Deterministic-first phase sau**; không dùng JEV làm detector và không tự correction. | `[Đề xuất]` Matching, idempotency, baseline, threshold và freshness là bài toán rule/read-model; JEV không tăng authority và có thể tạo false positive. SRS chỉ nêu optional intelligence (`SRS..._vi.md` §1.6, L161–166). |
| Forecasting | **Reject MVP; defer product/safety decision.** | `[Đã kiểm chứng]` SRS chỉ ghi forecasting tùy chọn; PRD/AI-JEV scope-cut prediction/reasoning về amount/date/balance (`SRS..._vi.md` §1.6, L161–165; `docs/PRD.md` §5, L65–67; `docs/AI-JEV.md` §8, L91–93). |
| Admin/JEV authority | **Reject** autonomous triage, dispute decision, payment/budget action, ledger mutation. | `[Đã kiểm chứng]` Admin chỉ triage issue/status/priority/note theo least privilege; không sửa ledger/balance/audit (`docs/ADMIN-OPERATIONS.md` §1–§7, L3–51; `docs/ARCHITECTURE.md` §2, L21–27). |

### 1.2 Trả lời trực tiếp: ngoài auto-category, JEV nên tích hợp ở đâu?

1. **Dashboard sau khi load snapshot:** một card “Điều gì đáng chú ý?” chỉ diễn giải metric đã có, mở được chart/table nguồn. Không để JEV tạo số mới.
2. **Monthly report sau khi report deterministic hoàn tất:** summary ngắn theo category, income/payment và thay đổi; chạy async hoặc read-time từ artifact đã tạo, không nằm trong transaction.
3. **Ngay sau budget warning deterministic:** câu coaching nhẹ, ví dụ mời user mở category transactions; không xác định threshold, không chặn payment, không sửa budget.
4. **Spending increase/decrease card:** backend xác định baseline, direction và số liệu; JEV chỉ diễn đạt “tăng/giảm so với…” và nêu caveat, không suy đoán nguyên nhân tâm lý.
5. **Next-best action (NBA) ở dashboard/report/budget:** policy deterministic chọn CTA trong allowlist (`view_report`, `review_budget`, `review_transactions`); JEV chỉ viết lý do dễ hiểu. CTA chỉ mở màn hình, không submit money action.
6. **CSV preview phase sau:** JEV gợi ý category từng row sau parse/validation; user review/override/skip trước import. Không gửi raw file và không auto-commit.

Đây là **lớp diễn giải sau facts**, không phải “JEV làm kế toán”. SRS xác định mọi AI classification/summary chỉ advisory, user được xem xét/ghi đè (`SRS..._vi.md` §1.5, L65–71); domain cấm JEV bypass calculation/authorization (`docs/DOMAIN-MODEL.md` §4, L54–67).

### 1.3 Tại sao không mở toàn bộ SRS vào MVP?

SRS là product brief rộng; PRD/DOMAIN/ARCHITECTURE/OpenAPI là canonical MVP. SRS có password, `expense`, sửa/xóa trực tiếp, CSV/PDF, recurring, summary phức tạp, prediction và admin rộng; canonical đã khóa Google-only, enum `income|payment`, immutable ledger, deterministic report, CSV/prediction/complex AI ngoài MVP (`docs/PRD.md` §3.1–§5, L17–67; `docs/ARCHITECTURE.md` §8, L67–69). Handoff này giữ conflict như finding, không tự mở API/domain.

## 2. Full user journey map và JEV insertion points

| Bước | Mục tiêu/pain point của sinh viên | Insertion point và placement | Authority deterministic | User control, provenance, fallback | Phase |
|---|---|---|---|---|---|
| **J0. Auth/onboarding** | Vào app nhanh, hiểu đây là sổ tự nhập; không bị nhầm app biết dữ liệu ngân hàng. | **Không JEV.** Copy/checklist và onboarding state read-time deterministic. | Google OAuth, opaque session, owner scope, `walletInitialized` (`docs/AUTHENTICATION.md` §3–§6, L16–51; `openapi.yaml` L31–69). | User chọn locale/tiếp tục; auth/DB lỗi fail closed, không guest fallback. | Ship core; reject JEV tại auth. |
| **J1. Opening wallet** | Nhập số dư hiện có mà không nhầm thành income. | **Không JEV.** Inline explanation + synchronous validation `POST /wallet/baseline`. | Opening balance là baseline, không tạo income giả; VND integer (`docs/DOMAIN-MODEL.md` §2, §5, L21–24, L69–77). | User sửa trước submit; lỗi giữ form, không đoán số. | Ship core; reject arithmetic/advice. |
| **J2. Add income/payment** | Ghi trợ cấp, lương part-time, đồ ăn, đi lại nhanh. | **P0:** explicit JEV suggestion sau khi có type + description; synchronous pre-submit advisory ngoài money transaction. | Type, amount, date, category active, wallet lock, idempotency, ledger/audit và budget warning do domain (`docs/DOMAIN-MODEL.md` §5, L69–81; `openapi.yaml` L102–129, L440–449). | Preview → `Use this category` hoặc manual override → Save riêng. Suggestion lỗi không mất form. | Manual ship; JEV sau Gate B. |
| **J3. Category** | Danh sách category dài, income/payment khác nhau. | Manual picker luôn hiển thị; JEV chỉ candidate active đúng `appliesTo`; stale response bỏ. | `/categories`, category `active|disabled|retired`, name `en|vi` (`openapi.yaml` L180–201, L533–544). | User chọn thủ công; provenance candidate snapshot/status; mismatch → manual, không map gần đúng. | Ship manual; JEV optional. |
| **J4. Review/correction/history** | Sửa lỗi sau commit nhưng không mất lịch sử. | Không dùng JEV làm correction authority; phase sau có thể có read-time lineage explainer từ structured events. | Immutable ledger; correction row mới có reason/actor/reference/audit (`docs/DOMAIN-MODEL.md` §3–§5, L50–52, L69–85; `API-REVIEW.md` §Ledger correction, L23–30). | User chọn target/reason và confirm; JEV không chọn role/amount/category. Fallback là history/static help. | Ship correction deterministic; defer explainer; reject mutation. |
| **J5. Budget** | Biết đã dùng bao nhiêu và còn phải review gì. | Facts/status read-time; phase sau JEV coaching sau `BudgetSummary`. | `usedVnd`, `limitVnd`, `isOverrun`, month HCMC; overrun warning-only (`DOMAIN-MODEL.md` §4, L48–67; `openapi.yaml` L215–245, L559–584). | Mở budget, dismiss/snooze coaching; provenance month/category/snapshot; fallback progress/warning. | Ship status; defer narrative. |
| **J6. Dashboard/widgets** | Nhìn nhanh “mình đang ở đâu” nhưng khó biết điều gì đáng chú ý. | **P1:** JEV source-linked “what changed?” overlay sau dashboard snapshot; read-time hoặc async precompute. | `/reports/dashboard`, wallet/savings/currentMonth/recentTransactions, chart/table (`openapi.yaml` L255–261, L602–610). | Mở source metric, dismiss/save/feedback; không insight thì chart/table vẫn đủ. | Ship deterministic; defer JEV overlay. |
| **J7. Monthly report** | Hiểu category/month và income-vs-payment thay vì chỉ đọc biểu đồ. | **P2:** async monthly narrative sau report snapshot; read-time lấy artifact; không gọi trong report calculation. | `/reports/monthly`, HCMC period, totals/category breakdown (`openapi.yaml` L246–254, L585–601). | Chọn month/filter, mở bảng nguồn, save/dismiss/feedback; stale/missing → report deterministic. | Ship report; defer narrative. |
| **J8. CSV history** | Đưa lịch sử vào app mà không nhập từng row. | **P5:** parse → staging/preview → row-level JEV async/batch → review → normal ledger write. | Import parser/validation/idempotency/domain (chưa có canonical contract). | Map cột, sửa row, accept/override/skip và confirm batch; row lỗi không silent drop. | Defer toàn bộ CSV/batch. |
| **J9. Monthly insight/tips** | Trả lời “chi nào tăng?” và “tuần này có thể thử gì?”. | **P1/P2/P3:** source-linked narrative/tip sau report/budget facts; async post-commit hoặc read-time. | Backend facts; JEV chỉ wording, không arithmetic/causal inference (`docs/AI-JEV.md` §3, §8, L21–31, L91–93). | Xem evidence, accept/ignore/dismiss/save/pin/feedback; không Apply-to-wallet. | Phase sau; deterministic template trước. |
| **J10. Budget warning/notification** | Không bỏ lỡ warning nhưng không bị alert fatigue. | Threshold/dedupe deterministic sau commit; JEV chỉ contextual wording phase sau. | Warning từ budget service; không authorization (`docs/DOMAIN-MODEL.md` §4, L54–67; `API-REVIEW.md` §Response, L32–37). | Read/dismiss/snooze; provenance used/limit/month; fallback inline warning. | Ship deterministic warning; defer JEV wording/channel. |
| **J11. Anomaly/duplicate** | Nhận ra row có vẻ nhập nhầm hoặc lặp. | Duplicate pre-submit/post-commit scanner và anomaly read-time/async đều deterministic-first; JEV không detector. | Idempotency, owner-scoped matching, baseline/rule version; report/ledger vẫn authoritative. | Xem row, mark expected/dismiss/issue/correction append-only; stale → “chưa thể xác minh”. | Phase sau; reject JEV detector. |
| **J12. Issue/admin** | Báo sai số dư/payment; admin triage an toàn. | **Không JEV autonomous.** Có thể static help/masked metadata sau này. | `/issues`, status/priority/note/audit, least privilege (`docs/ADMIN-OPERATIONS.md` §1–§7, L3–51; `openapi.yaml` L262–338). | User gửi issue; admin tự triage/escalate; không raw ledger/JEV. | Ship deterministic; reject autonomous admin JEV. |

**Kết luận journey:** JEV nên nằm **sau J6/J7/J10**, khi facts đã được backend tính xong, chứ không nằm trong J0/J1/J4/J10 trigger/authority. P0 là exception duy nhất: gợi ý category trước submit nhưng vẫn tách khỏi commit.

## 3. Use-case cards

> Điểm `risk` dùng thang 1–5, 5 là rủi ro cao. Tất cả phần `[Đề xuất]` bên dưới cần Team Leader/owner phê duyệt; không phải API/domain contract mới.

### UC-01 — Auto-category trước submit

- **Placement/disposition:** Synchronous pre-submit, ngoài money transaction; **manual/core ship ngay, JEV optional sau Gate B**.
- **Trigger:** User chọn `income` hoặc `payment`, nhập description và bấm “Gợi ý danh mục”; không gọi mỗi keystroke.
- **Input:** `transactionType`, description 1–500 đã validate/redact, active candidates đúng `appliesTo`, locale `en|vi`; không amount/date/balance/ledger/session/secret/PII thừa (`openapi.yaml` L662–677; `AI-JEV.md` §3–4, L21–45).
- **Processing:** Deterministic auth/CSRF/length/candidate trước; JEV trả typed suggestion/abstain; deterministic kiểm tra schema, membership, active/type, stale; user chọn rồi normal domain validate amount/date/wallet/idempotency (`DOMAIN-MODEL.md` §5, L69–81).
- **Output:** `suggested|manual|disabled|unavailable`, category label authoritative hoặc manual fallback; không phải transaction (`openapi.yaml` L338–348, L669–677).
- **User control:** Manual picker luôn có; `Use this category`, override, dismiss, final Save riêng; override/response trễ không ghi đè; `confirmedCategorySuggestion` không phải authorization.
- **Persistence/provenance:** Suggestion có thể ephemeral; nếu đo quality thì chỉ masked event candidate snapshot/status/accept/override/reason/time, append-only. Public feedback/suggestion ID **[Chưa chốt]**.
- **Fallback:** Flag off, timeout, schema, privacy, low confidence, 401/403/429/5xx → giữ form + manual picker; không đoán gần đúng (`AI-JEV.md` §5–§7, L64–89).
- **Success metric:** 100% suggestion thuộc active candidate/đúng type; 100% commit có explicit selection/review; 100% failure về manual; zero auto-commit; JEV-off completion bằng baseline.
- **Cấm đoán:** Không auto-select/submit/commit; không tính money; không authorize; không browser-to-provider; không parse prose; không raw data.

### UC-02 — Học từ correction/override

- **Placement/disposition:** Capture tín hiệu post-submit; aggregate/rule update async/offline; **phase sau**, MVP chỉ có thể capture nếu contract được duyệt.
- **Trigger:** User override suggestion, dismiss, hoặc correction category sau commit.
- **Input:** Suggestion event (nếu có), category suggested/final, `accepted|overridden|dismissed`, locale/type, candidate snapshot; correction target/reason chỉ qua domain contract. SRS yêu cầu learning, nhưng correction vẫn append-only (`SRS..._vi.md` §1.6, L113–119; `DOMAIN-MODEL.md` §5, L83–85).
- **Processing:** Ghi quality event append-only; correction domain tạo row mới; aggregate tín hiệu riêng user/scope/version; không silently recategorize lịch sử và không gọi JEV trong transaction.
- **Output:** Xác nhận feedback đã ghi nhận; có thể cải thiện ranking tương lai, **không hứa “đã học ngay”** và không tạo money state.
- **User control:** Accept/override/dismiss; correction cần reason/review; opt-out learning nếu product/privacy quyết định; user mở issue khi sai.
- **Persistence/provenance:** Event owner-scoped gồm before/after category, source suggestion, reason, snapshot/rule version, actor/time; retention/consent/export/delete/model version **[Chưa chốt]**.
- **Fallback:** Không có store, event stale/malformed hoặc correction policy chưa rõ → không update learning; manual behavior giữ nguyên; job lỗi không mutate ledger.
- **Success metric:** 100% original immutable; 100% feedback traceable; zero raw secret/PII; zero historical auto-recategorization; holdout override rate giảm mà correct abstention không giảm.
- **Cấm đoán:** Không coi một correction là ground truth toàn bộ; không SQL update/delete/reversal chain; không bypass confirmation/owner/idempotency; không cross-user learning khi chưa có policy.

### UC-03 — Batch CSV classification

- **Placement/disposition:** Offline/batch hoặc bounded async sau upload; **defer cùng CSV**, deterministic parser/preview trước.
- **Trigger:** User upload lịch sử CSV từ onboarding/history (SRS §1.5–§1.6, L65–71, L77–84, L113–119).
- **Input:** File bounded, row ID, mapped type/amount/date/description/category, locale và user-owned job; CSV cells là untrusted data, không phải instruction. JEV chỉ cần row description/type/candidates sau validation.
- **Processing:** Parse/size/encoding/header/type/date/VND/owner/idempotency/duplicate trước; JEV gợi ý từng row hoặc abstain; validate candidate/stale; user review rồi normal import commit; không transaction mở trong lúc JEV chạy.
- **Output:** Preview từng row: parsed values, category suggestion/manual/invalid/duplicate/abstain, provenance và error; summary không gọi là imported trước commit.
- **User control:** Map cột, sửa row, accept/override/skip, partial accept nếu contract cho phép, final confirm batch; unresolved row không tự commit.
- **Persistence/provenance:** Job/file hash hoặc opaque ID, parser/schema/candidate version, row decision, import idempotency; raw-file retention/PII và partial-commit semantics **[Chưa chốt]**.
- **Fallback:** JEV off/unavailable → manual row picker; parse/file error → row-level actionable error; worker lỗi → retry/cancel trước commit; không silent drop/duplicate.
- **Success metric:** 100% committed rows explicit reviewed; zero silent row loss/duplicate; zero JEV-authoritative amount/date/type; giảm thời gian nhập so với manual baseline.
- **Cấm đoán:** Không coi CSV là bank sync; không auto-commit file; không dùng JEV tính amount/date/balance; không gửi raw file/PII/secret; không overwrite/delete ledger.

### UC-04 — Duplicate detection

- **Placement/disposition:** Synchronous pre-submit warning + optional async post-commit scanner; **phase sau deterministic**, reject JEV detector.
- **Trigger:** Pre-submit row có khả năng trùng hoặc history scanner phát hiện row gần giống; retry cùng idempotency key là semantics domain riêng.
- **Input:** Owner-scoped type/amount/category/date/normalized description, idempotency/body fingerprint và bounded own-record candidates; không cross-owner.
- **Processing:** Deterministic exact idempotency trước; matching rule/version + freshness; warning high-signal; normal commit vẫn recheck race. JEV không làm semantic matcher.
- **Output:** `no signal|possible duplicate|same idempotent replay` + matched own reference/rule/compared-at; warning không phải quyết định ledger.
- **User control:** Xem row match, dismiss/mark expected/proceed explicit, sửa hoặc mở correction; valid wallet-sufficient payment không bị chặn chỉ vì heuristic.
- **Persistence/provenance:** Fingerprint/rule version, matched own IDs, disposition, freshness/time append-only read-model **[Chưa chốt schema/threshold]**; existing transaction immutable.
- **Fallback:** History stale/unavailable → “chưa thể xác minh trùng lặp”, không claim unique/duplicate; exact idempotency vẫn theo domain.
- **Success metric:** Zero duplicate cùng key/body; zero valid payment bị block bởi warning; 100% high-signal có matched reference; theo dõi precision/false-positive/dismiss.
- **Cấm đoán:** Không JEV detector; không auto-delete/merge/reverse/refund/block; không coi description giống là duplicate chắc chắn; không bỏ qua idempotency.

### UC-05 — Anomaly detection read-only

- **Placement/disposition:** Async post-commit/read-time deterministic baseline; **phase sau**, reject JEV detector/authority.
- **Trigger:** Sau commit amount/category/frequency khác baseline user, hoặc user mở history/dashboard.
- **Input:** Committed own transaction features, HCMC period, per-user aggregates, baseline version, data sufficiency/freshness; không cross-user benchmark mặc định.
- **Processing:** Reconcile/rebuild state, kiểm tra min history/baseline/rule/period; tạo signal sau commit; JEV không tính score/threshold/arithmetic (`docs/AI-JEV.md` §3, L21–31; `DOMAIN-MODEL.md` §4, L54–67).
- **Output:** `no signal|possible anomaly|insufficient/stale data`, reason đơn giản “khác mẫu trước đây”; không gọi fraud/theft.
- **User control:** Xem transaction/basis, dismiss/mark expected, feedback/issue, correction append-only nếu row sai; không Auto-fix.
- **Persistence/provenance:** Owner/target opaque, reason, rule/baseline version, observation period, freshness, generatedAt, disposition; anomaly schema/retention/worker **[Chưa chốt]**.
- **Fallback:** History thiếu, mismatch, worker lỗi hoặc stale → insufficient/stale/ẩn flag; transaction/dashboard/correction vẫn chạy.
- **Success metric:** Zero payment freeze/reject/auto-reversal; 100% flag có basis/period/freshness; đo user-confirmed precision, false positive và stale rate.
- **Cấm đoán:** Không fraud accusation, cross-user inference, freeze wallet, reject payment, auto-correct, thay report/budget, hoặc raw ledger outbound.

### UC-06 — Monthly summary

- **Placement/disposition:** Read-time facts + async/month-close narrative; **report deterministic ship MVP, JEV prose phase sau**.
- **Trigger:** User mở `/reports/monthly?month=YYYY-MM` hoặc chọn “Xem tóm tắt tháng” sau report snapshot.
- **Input:** `openingWalletBalanceVnd`, `totalIncomeVnd`, `totalPaymentVnd`, `closingWalletBalanceVnd`, `categoryBreakdown`, month HCMC và data sufficiency (`openapi.yaml` L246–254, L585–601); JEV future chỉ nhận allowlisted aggregates.
- **Processing:** Backend kiểm tra owner/period/correction/completeness và tính arithmetic; JEV chỉ diễn đạt observation → evidence → caveat, không tự tổng hợp.
- **Output:** Một/vài câu ngắn + metric/category link, `asOf`, nhãn “gợi ý tham khảo”; không gọi financial advice.
- **User control:** Mở bảng/chart nguồn, save/pin, dismiss, feedback, refresh; không có Apply-to-wallet/budget/payment.
- **Persistence/provenance:** Artifact snapshot gồm source report/version, month/timezone, metric refs, generatedAt, locale, status; retention/invalidation/endpoint **[Chưa chốt]**. Saved artifact không silent overwrite.
- **Fallback:** Report/chart/table deterministic + copy “chưa thể tạo tóm tắt”; thiếu baseline/snapshot → không narrative, không zero giả.
- **Success metric:** 100% claim trace được source; zero số lệch report; user comprehension task đạt baseline mục tiêu; theo dõi source-open/dismiss/feedback.
- **Cấm đoán:** Không tính/chỉnh totals/balance/budget; không causal inference; không raw ledger/PII; không dùng stale artifact như current.

### UC-07 — Giải thích spending increase/decrease

- **Placement/disposition:** Deterministic comparison read-time + optional async wording; **phase sau**.
- **Trigger:** User bấm card “thay đổi đáng chú ý” trong dashboard/report; chỉ khi có baseline đủ dữ liệu.
- **Input:** Current vs baseline category totals, period HCMC, completeness, optional budget status; backend phải định nghĩa baseline/threshold vì OpenAPI hiện chưa có comparison read model (`openapi.yaml` L238–260, L585–601).
- **Processing:** Backend tính direction, delta và significant-change; JEV chỉ diễn đạt “tăng/giảm so với…” có evidence/caveat, không đoán nguyên nhân tâm lý.
- **Output:** Card category, direction, current/baseline values, compared period, “Vì sao thấy điều này?” + link report; thiếu dữ liệu → “chưa đủ để kết luận”.
- **User control:** Mở tháng đối chiếu/source, save/dismiss/feedback; user tự correction qua normal flow, card không tự sửa.
- **Persistence/provenance:** Baseline definition, source snapshot/version, compared month/window, generated time, stale state; invalid khi correction/new payment/category policy đổi; schema **[Chưa chốt]**.
- **Fallback:** Current category table/report; không dùng “tháng trước” khi period/timezone chưa rõ; không narrative nếu comparison unavailable.
- **Success metric:** Zero unsupported causal claim; user xác nhận card khớp report; source-open và “đã hiểu vì sao” feedback tăng.
- **Cấm đoán:** Không arithmetic trong JEV/browser; không đổ lỗi user; không coi một row là trend; không tạo budget/payment action.

### UC-08 — Personalized saving tips

- **Placement/disposition:** Read-time dashboard/report hoặc async post-commit; **phase sau**, rule/template deterministic trước JEV wording.
- **Trigger:** User mở tips khi đủ history/budget hoặc pattern đủ điều kiện; user mới thiếu data thì không tạo.
- **Input:** Category aggregates, trend facts, `used/limit/status`, data completeness và user goal chỉ khi canonicalize; SRS có goal nhưng savings goal API chưa chốt (`SRS..._vi.md` L135–140; `API-REVIEW.md` §Domain scope, L39–42).
- **Processing:** Deterministic candidate generator chọn tip có evidence; JEV chỉ paraphrase bounded candidate; không xếp theo số tiền tiết kiệm hứa hẹn.
- **Output:** Một tip ngắn, low-pressure, basis category/month và CTA mở report/budget/transactions; nhãn advisory.
- **User control:** Dismiss, save/pin, feedback; CTA chỉ mở màn hình; “dùng” nếu có chỉ prefill để review, không auto-upsert budget/payment/savings.
- **Persistence/provenance:** Tip snapshot, evidence refs, source period, generatedAt, version, interaction events; owner scope/retention/feedback schema **[Chưa chốt]**.
- **Fallback:** Rule copy hoặc ẩn tip khi thiếu data/unavailable/unsafe; dashboard/report vẫn hoạt động.
- **Success metric:** Source-open và useful feedback; review-action completion; zero accidental mutation; không dùng “giảm chi tiêu” đơn độc làm KPI.
- **Cấm đoán:** Không guaranteed saving, shaming, ép cắt khoản thiết yếu, loan/BNPL/investment, tự chuyển savings, sửa budget, thanh toán hoặc ghi ledger.

### UC-09 — Budget coaching và contextual warning

- **Placement/disposition:** Budget status/alert deterministic ship MVP; JEV wording/coaching **phase sau**, read-time hoặc async post-commit.
- **Trigger:** User mở budget/dashboard hoặc deterministic `isOverrun`/near-limit event sau payment; threshold “sắp chạm” phải được owner chốt.
- **Input:** `categoryId`, HCMC month, `usedVnd`, `limitVnd`, `isOverrun`, source timestamp; không để JEV tự chọn threshold (`openapi.yaml` L215–245, L559–584).
- **Processing:** Backend tính progress/status/threshold/dedupe; JEV chỉ viết câu “Bạn có thể xem lại…” từ fact bundle; warning không phải authorization.
- **Output:** Progress/text/table + warning có used/limit/month/category + CTA review; không nói payment bị khóa.
- **User control:** Dismiss/read/snooze/feedback coaching; mở form budget để user tự sửa và confirm; dismiss không đổi budget/payment.
- **Persistence/provenance:** Alert event/dedupe/read state, coaching snapshot, source budget summary, stale/resolved state; notification/tip schema, channel/throttle **[Chưa chốt]**.
- **Fallback:** Exact budget bar/warning deterministic; worker/JEV lỗi không giả đã gửi, không block money path.
- **Success metric:** User hiểu đúng budget; tăng mở transaction detail; duplicate/alert-noise giảm; zero payment rejection/mutation từ coaching.
- **Cấm đoán:** Không đổi threshold, sửa limit, reject/authorize payment, spam/retry vô hạn, gửi push/email khi chưa consent/contract, hoặc biến wording thành authority.

### UC-10 — Next-best action không authority

- **Placement/disposition:** Read-time sau facts load, allowlist deterministic trước JEV; **phase sau**.
- **Trigger:** Dashboard/report/budget load hoặc sau insight/alert; chỉ hiển thị một CTA ưu tiên để tránh overload.
- **Input:** State facts (`budget exists/status`, report availability, recent activity), route, locale, dismiss state; candidate actions allowlist như `view_report`, `review_budget`, `review_transactions`, `record_income`.
- **Processing:** Policy deterministic chọn action từ missing setup/attention; JEV chỉ diễn đạt lý do. `record_income`/`review_budget` chỉ mở form, không gọi mutation.
- **Output:** Một card CTA + reason trỏ tới fact, nhãn tham khảo; không “best” như quyết định đúng.
- **User control:** Click explicit, dismiss, save/pin, feedback; user bỏ qua không bị lặp cùng snapshot; final money action vẫn normal CSRF/idempotency/review.
- **Persistence/provenance:** Impression/click/completion/dismiss/feedback + source snapshot nếu analytics được duyệt; không money state; stale khi source/route/locale đổi.
- **Fallback:** Không hiển thị hoặc chỉ link “Xem báo cáo” khi state thiếu; navigation/core form vẫn dùng được.
- **Success metric:** Giảm time-to-next-useful-screen và tăng completion review action; zero unintentional submit/payment/savings transfer.
- **Cấm đoán:** Không tự tạo/sửa/xóa ledger/budget/savings; không tự notification/transfer; không suy đoán mục tiêu/khả năng trả nợ; không bypass authz.

### UC-11 — Forecasting tháng tới

- **Placement/disposition:** Future opt-in read-time/async; **reject MVP, defer product/safety decision**, không dùng JEV hiện tại.
- **Trigger:** User chủ động mở planning surface tương lai; không đặt forecast mặc định trên dashboard.
- **Input:** Historical monthly aggregates, selected period, data completeness, explicit opt-in; SRS chỉ ghi optional và canonical scope-cut prediction (`SRS..._vi.md` L161–165; `docs/PRD.md` §5, L65–67).
- **Processing:** Nếu được duyệt, deterministic model/range + uncertainty/calibration trước; JEV chỉ diễn đạt result, không tính amount/date/balance; sparse/correction pending → abstain.
- **Output:** Range/scenario có assumptions, source window, uncertainty và nhãn “ước tính tham khảo”; không phải wallet/budget authority.
- **User control:** Opt-in, dismiss/hide, save/pin/feedback, xem assumptions; không Apply forecast.
- **Persistence/provenance:** Model/version, input snapshot, uncertainty, generatedAt, stale policy và user decision; tất cả **[Chưa chốt]**.
- **Fallback:** Hiển thị history/report deterministic hoặc ẩn forecast; không zero giả.
- **Success metric:** Calibration/coverage và user phân biệt estimate với actual; zero belief forecast là guaranteed balance/payment capacity.
- **Cấm đoán:** Không authorize/reject payment, set budget, transfer savings, hứa thu nhập/chi phí, hoặc dùng JEV hiện tại để reasoning amount/date/balance.

## 4. Bảng xếp hạng use case

> Điểm 1–5. `Giá trị user` và `Automation value` nói về lợi ích sản phẩm; `Fit` là product/system fit của Campus Coin (không phải provider fit); `Risk` 5 là rủi ro cao; `Dependency` 5 là phụ thuộc nhiều contract/chưa chốt. Điểm là `[Đề xuất]`, chưa phải đo lường runtime.

| Hạng | Use case | User value | Automation value | Fit | Risk | Phase | Dependency chính |
|---:|---|---:|---:|---:|---:|---|---|
| 1 | Dashboard widgets + budget status deterministic | 5 | 2 | 5 | 1 | **Ship MVP, không cần JEV** | Dashboard/budget response đã có; a11y/error state |
| 2 | Budget warning deterministic + contextual coaching | 5 | 3 | 5 | 2 | Warning ship MVP; coaching phase sau | Near-threshold/dedupe/notification policy |
| 3 | Auto-category pre-submit | 5 | 4 | 5 | 3 | Manual ship; JEV sau Gate B | Candidate active/appliesTo, confirmation/stale/fallback |
| 4 | Monthly summary narrative | 4 | 4 | 4 | 4 | Report facts MVP; narrative phase sau | Fact snapshot, insight contract, stale/persistence |
| 5 | Spending increase/decrease explanation | 4 | 4 | 4 | 3 | Phase sau; deterministic comparison trước | Baseline/threshold/comparison read model |
| 6 | Personalized saving tips | 4 | 4 | 4 | 4 | Phase sau; rule/template trước | Goal semantics, evidence, interaction persistence |
| 7 | Next-best action | 3 | 3 | 4 | 3 | Phase sau; allowlist deterministic | State policy, impression/feedback, stale |
| 8 | Correction/override learning | 4 | 3 | 3 | 4 | Phase sau; evidence capture nếu được duyệt | Append-only feedback, consent, version/retention |
| 9 | Duplicate detection | 4 | 4 | 4 | 2 | Phase sau deterministic | Fingerprint/index, freshness/race, warning contract |
| 10 | Anomaly detection | 4 | 3 | 3 | 4 | Phase sau deterministic; safety review | Baseline/min-history/threshold/worker/provenance |
| 11 | CSV row-level batch classification | 4 | 5 | 3 | 4 | Phase sau cùng CSV | Parser/staging/preview/import/idempotency |
| 12 | Forecasting | 3 | 3 | 2 | 5 | Reject MVP; defer | Methodology/calibration/uncertainty/product decision |
| 13 | Autonomous admin triage/money action | 1 | 5 | 1 | 5 | **Reject** | Xung đột least privilege/domain boundary |

**Đọc bảng:** use case có automation value cao không mặc nhiên đáng ship trước. Dashboard/budget deterministic đứng trên vì value cao, risk thấp, fallback rõ. JEV narrative đứng sau vì phụ thuộc snapshot/provenance/stale contract. CSV/forecast/anomaly không được đưa vào critical path chỉ vì SRS có nhắc.

## 5. Architecture placement

| Placement | Use case phù hợp | Luồng đề xuất | Điều JEV không được làm |
|---|---|---|---|
| **Synchronous pre-submit** | Category suggestion; duplicate warning deterministic | Form → validate input/candidate → (optional) JEV advisory → user accept/override → normal transaction API. | Không giữ DB money transaction chờ JEV; không auto-submit/authorize. |
| **Async post-commit** | Monthly artifact refresh, budget coaching wording, anomaly read-model, notification wording, learning signal | Commit authoritative row → projection/report/budget deterministic → enqueue bounded advisory/derived work → persist masked artifact → read-time render. | Không thay đổi committed row; không retry làm duplicate; không block payment. |
| **Read-time insight** | Dashboard “what changed?”, monthly summary fetch, budget coaching, NBA, anomaly view | Load owner-scoped deterministic snapshot → validate freshness/period HCMC → render fact + optional interpretation. | Không để browser/JEV tính total/balance/used/threshold. |
| **Offline/batch** | CSV staging/classification; feedback aggregation; future forecast | Upload/parse bounded → staging/preview → per-row suggestion/abstain → user review → normal import; learning aggregation tách khỏi money write. | Không raw file trực tiếp, không auto-commit, không dùng offline artifact làm current authority. |
| **Không đặt JEV** | Auth/onboarding, opening wallet, correction command, budget calculation, report calculation, admin triage, payment authorization | Deterministic API/domain/UI. | Không nhận identity/session/claims; không chọn correction role; không triage dispute. |

**Layer rule:** Browser chỉ hiển thị response; API validate session/CSRF/owner/category/feature; domain tính tiền/period/authorization/report; persistence append-only. JEV adapter ở server/application boundary, không import SDK vào domain và không gọi trong money transaction (`docs/ARCHITECTURE.md` §2, §4–§6, L21–56; `AGENTS.md` L99–141).

## 6. User control, provenance, feedback, persistence và fallback

### 6.1 Control contract chung

**[Đề xuất]** Mọi advisory artifact đi theo `propose → inspect → decide → commit`:

1. **Propose:** user bấm Suggest hoặc mở insight đã opt-in; không gọi từng keystroke/âm thầm ghi.
2. **Inspect:** hiển thị fact/interpretation tách biệt, source metric/category, period `Asia/Ho_Chi_Minh`, `asOf` và stale state.
3. **Decide:** user `Use`, override, dismiss, save/pin, feedback hoặc bỏ qua; action không được suy diễn từ việc render.
4. **Commit:** chỉ normal deterministic domain API mới ghi money state; Save insight không phải Save transaction.

`confirmedCategorySuggestion` là acknowledgement UI cần chốt binding; không được coi là authorization (`openapi.yaml` L440–449; `CC-JEV-UX-EVAL.md` UX-02, L42–56).

### 6.2 Provenance envelope

**[Đề xuất]** Artifact nên có hai lớp:

- **Authoritative evidence:** `sourceKind` (`dashboard|report|budget|category`), owner scope server-side, period/month và timezone HCMC, source snapshot/version, `asOf`, aggregate/metric refs.
- **Advisory interpretation:** artifact type, status, generated time, contract/policy version, explanation, freshness, user decision. Không lưu raw prompt/response/provider detail/PII.

UI phải trả lời được: “Dựa trên dữ liệu nào?”, “Đây là fact hay diễn giải?”, “Tạo lúc nào/còn fresh không?”, “Tôi kiểm soát gì?”. Thiếu source snapshot, explanation, locale hoặc freshness → deterministic/manual fallback. SRS yêu cầu AI output advisory và override (`SRS..._vi.md` §1.5, L65–71); audit phải masked (`docs/ADMIN-OPERATIONS.md` §6, L42–44).

### 6.3 Persistence và stale

- Category suggestion pre-submit mặc định ephemeral; sidecar quality event nếu có chỉ non-financial, append-only, owner-scoped.
- Insight/tip/alert save là immutable snapshot; refresh tạo version mới/supersedes, không silent overwrite.
- Transaction create, correction/reversal, category lifecycle, budget change, month rollover, locale/policy change có thể làm artifact stale; stale phải hiển thị badge và refresh, không dùng làm authority.
- Dismiss ẩn artifact tại vị trí hiện tại, không xóa ledger/audit. Feedback không hứa retrain và không tự sửa category/budget.
- Schema, endpoint, retention, export/delete, idempotency cho artifact actions là `[Chưa chốt]`; không biến bảng `Insight` minh họa của SRS thành schema canonical (`SRS..._vi.md` §1.8, L282–295).

### 6.4 Fallback hierarchy

1. **Category:** active manual picker.
2. **Dashboard/report:** authoritative chart/table/empty/error/loading; không render zero giả.
3. **Budget:** exact `used/limit/isOverrun` và warning deterministic.
4. **Insight/tip/NBA:** ẩn card hoặc copy tĩnh an toàn khi snapshot thiếu/stale/unsafe/unavailable.
5. **CSV:** row-level manual/invalid/skip; giữ preview, không commit mơ hồ.
6. **Anomaly/duplicate:** “chưa thể xác minh”/`insufficient-stale`, không claim unique/fraud.

JEV off/unavailable phải có cùng money behavior baseline (`docs/PRD.md` §4, L53–63; `docs/AI-JEV.md` §7, L80–89).

## 7. Safety và domain boundaries

### 7.1 Ranh giới không thương lượng

- JEV không tính wallet, savings, budget, amount, date hoặc report authoritative; không authorize/reject payment; không ghi/sửa/xóa ledger, savings, budget, audit/correction (`docs/AI-JEV.md` §3, L21–31; `docs/DOMAIN-MODEL.md` §4, L54–67).
- Ledger/audit immutable/append-only; correction là row mới có reason/actor/reference/audit; learning/feedback không được biến thành mutation (`docs/DOMAIN-MODEL.md` §5, L83–85).
- Budget overrun là warning-only; wallet-sufficient payment không bị chặn vì budget (`docs/DOMAIN-MODEL.md` §4, L63–67).
- Owner scope lấy từ session; admin least privilege; JEV không có role/session/authorization (`docs/AUTHENTICATION.md` §5–6, L33–51; `docs/ADMIN-OPERATIONS.md` §1–2, L3–15).
- Input description/CSV cell là untrusted data, không phải instruction. “Ignore rules”, prompt exfiltration, authorize payment, đổi amount/date/balance hoặc sửa ledger → abstain/manual; không echo raw text.
- Chỉ gửi tối thiểu đã redact; không raw ledger/balance/session/Google claims/secret/PII thừa; không lưu raw prompt/response (`docs/AI-JEV.md` §4–6, L33–78).

### 7.2 UX, accessibility, localization, HCMC

- Manual path phải có label/error association, keyboard/focus/loading/error/live state, `en`/`vi`, chart/table equivalent; WCAG 2.2 AA là release gate đề xuất dựa trên PRD/AGENTS (`docs/PRD.md` §3.4, L39–43; `AGENTS.md` L87–97).
- Không truyền ý nghĩa bằng màu duy nhất; screen reader phải đọc `advisory`, `stale`, `manual fallback`, period HCMC và fact-vs-interpretation.
- Locale chỉ đổi copy/format/label; không đổi `income|payment`, VND, ID, formula, audit hoặc authorization. Category label lấy từ current authoritative list (`openapi.yaml` L397–400, L533–544).
- Business period/date dùng `Asia/Ho_Chi_Minh`; artifact phải ghi period + timezone; browser timezone không được làm đổi report/budget (`DOMAIN-MODEL.md` §1, §4, L14, L66; `API-REVIEW.md` §Domain scope, L39–44).
- Late response sau type/description/locale/category change bị discard; category disabled/retired hoặc wrong `appliesTo` → manual.

### 7.3 Phân loại blocker

| Tình trạng | Ảnh hưởng |
|---|---|
| Manual picker, core money path, owner/auth, deterministic report/budget, keyboard/a11y hoặc locale mất thao tác | **Core NO-GO**; không dùng JEV để bù. |
| JEV suggestion thiếu provenance, stale/fallback/privacy/injection gate nhưng manual vẫn chạy | **Block JEV enablement/feature riêng**, không block core. |
| JEV lỗi làm khóa Save, tự commit, làm sai balance/report, leak raw financial/PII/secret hoặc bypass owner | Kill JEV ngay; có thể **core NO-GO/security incident**. |
| Insight/tip/anomaly/forecast thiếu snapshot/persistence/stale policy | Chỉ block feature đó; deterministic report/budget vẫn ship. |

## 8. Metrics và evaluation dataset

### 8.1 Product/system metrics

**Core invariants (hard gate):**

- JEV-off/manual transaction success = baseline; zero core regression.
- 100% suggestion/row commit có category active đúng `appliesTo` và explicit user review.
- Zero auto-submit/auto-commit/auto-correction; zero payment reject/freeze do advisory output.
- 100% narrative claim trace về source metric/snapshot; zero stale artifact hiển thị như fresh.
- Zero raw prompt/response/secret/PII thừa trong outbound/log/persistence.

**Product metrics (đo sau baseline, không dùng một metric đơn lẻ):**

- Transaction: category completion time, manual-vs-suggestion completion, override rate, abstention rate, fallback completion, `en|vi × income|payment` parity.
- Learning: holdout override reduction, correct abstention không giảm, feedback usefulness; không dùng “model đã học” làm metric.
- CSV: time-to-import, row review completion, invalid/duplicate/silent-loss rate, retry idempotency.
- Duplicate/anomaly: precision/high-signal confirmation, false-positive dismiss/mark-expected, stale/insufficient rate, time-to-review; không tối ưu recall bằng cách block payment.
- Insight/report: source-open rate, comprehension task (“category nào nổi bật?”, “tăng so với kỳ nào?”), claim-to-source validity, stale refresh, dismiss/save/feedback.
- Budget/NBA: correct budget understanding, review-action completion, alert duplicate/noise/dismiss, time-to-next-useful-screen; zero mutation side-effect.
- Accessibility/localization: keyboard completion, screen-reader state announcement, focus restore, contrast/reflow, full translation-key parity.

### 8.2 Dataset/evaluation matrix

**[Đề xuất]** Dùng dataset synthetic/anonymized, không production prompt/ledger/session/claims/secret/PII. Category suggestion tối thiểu 50–100 case như AI-JEV yêu cầu (`docs/AI-JEV.md` §6, L74–78), báo cáo tách `en|vi` và `income|payment`; holdout phải khác wording development.

| Slice | Expected behavior |
|---|---|
| Clear in-set | Suggest active candidate đúng type hoặc abstain khi threshold không đạt. |
| Ambiguous/slang/abbreviation | Manual/abstain, không đoán. |
| Out-of-set/other | Manual; không map gần đúng. |
| PII-like/secret-shaped | Redact/fallback; zero sensitive outbound/log. |
| Prompt injection | Treat as data; manual; không lộ prompt/tool/authority. |
| Disabled/retired/wrong `appliesTo` | Reject result/manual active picker. |
| Correction/amount/date/balance/budget/authorization request | Unsupported/manual deterministic flow; không JEV authority. |
| Unicode/diacritics/mixed locale/empty/max length | Stable validation/fallback; no crash or raw echo. |
| Typed/schema/timeout/4xx/5xx/429/flag-off | Manual/disabled/unavailable; preserve form. |
| Race | Response cũ sau override/type/locale/category change bị discard. |

**Narrative/coach evaluation:** tạo deterministic fixture có known report/budget facts, source refs, HCMC month boundaries, correction/new payment/category lifecycle changes; kiểm tra claim-to-source 100%, stale marking, no causal overclaim, user comprehension, harmful/shaming suppression và `en`/`vi`/screen-reader parity. Các threshold số ngoài hard safety là `[Đề xuất]` cần Team Leader phê duyệt sau baseline, không phải pass hiện tại.

## 9. Recommended implementation sequence cho Developer D / Team Leader

| Bước | Owner | Hành động | Exit evidence / gate |
|---:|---|---|---|
| 0 | Team Leader | Khóa scope: core deterministic/manual ship; JEV category-only optional; insight/coach là phase sau; CSV/anomaly/forecast không critical path. Chốt fact/interpretation language và prohibited copy. | Scope decision có ngày; không implicit mở API/domain. |
| 1 | Developer B/C + TL | Hoàn thiện manual category picker, dashboard/report/budget status, correction/history, `en`/`vi`, a11y, error/empty/loading và JEV-off smoke. | Gate A pass: core path chạy khi JEV off; server authority/owner/HCMC/a11y đúng. |
| 2 | Developer D + B/C | Giữ JEV adapter chỉ cho category suggestion; explicit trigger, candidate active/appliesTo, response normalization, stale/race, redaction/injection, manual fallback; không gọi trong money transaction. | Gate B: 100% invalid/ambiguous/injection/privacy/schema → manual; no auto-commit; form không mất input. Provider/pricing không nằm trong phân tích này và đã user verify. |
| 3 | Team Leader + D | Xác định confirmation semantics của `confirmedCategorySuggestion`, suggestion snapshot/decision evidence tối thiểu và kill/off audit; không coi boolean là authorization. | Explicit accept/override/stale smoke `en|vi`; server-side off/manual sau kill; nếu chưa chốt thì giữ JEV off. |
| 4 | Developer B + C | Ship deterministic dashboard widgets, monthly report, budget progress/warning và table/text equivalent; thêm threshold/dedupe warning policy nếu scope đã duyệt. | Facts khớp backend; budget overrun không block wallet-sufficient payment; JEV không cần cho core. |
| 5 | Team Leader + B/D/C | Thiết kế capability contract riêng cho insight/coach: fact snapshot/version, source refs, period HCMC, `current|stale|unavailable`, owner scope, save/dismiss/feedback/idempotency/retention. | Contract/product decision trước implementation; không reuse category endpoint cho prose. |
| 6 | D + B | Implement comparison read model và deterministic candidate/rule templates trước; sau đó mới đánh giá monthly summary, spending-change, tips, budget coaching. | Gate C: every claim trace source; stale/invalidation sau transaction/correction/budget/category; fallback deterministic. |
| 7 | C + TL | Làm interaction UX: source link, advisory label, dismiss/save/pin/feedback, keyboard/screen-reader, localized states và no-action financial CTA. | Comprehension/a11y/localization matrix pass; không Apply-to-wallet/payment/budget. |
| 8 | B/D | Nếu product vẫn cần CSV, làm parser/staging/preview/idempotency/row errors/manual review trước; JEV row-level chỉ sau import contract. | Zero silent loss/duplicate; explicit row/batch confirmation; no raw file outbound. |
| 9 | B/D + Safety owner | Xây duplicate/anomaly deterministic read model với baseline/freshness/mark-expected/issue; JEV chỉ cân nhắc wording sau safety review, không detector. | Zero freeze/reject/auto-correct; provenance và stale rõ; false-positive baseline. |
| 10 | Team Leader | Chỉ xem lại forecasting sau methodology, calibration, uncertainty, opt-in và product decision; không đưa vào MVP. | Go/no-go riêng; forecast không bao giờ authority. |

**Điểm dừng:** Nếu Gate A fail, không bật JEV. Nếu Gate B/C fail, giữ feature tương ứng off và vẫn ship deterministic core. Không dùng provider availability/cost làm lý do product fit; technical prerequisites ở trên chỉ là điều kiện system safety/contract.

## 10. Rejected/deferred use cases và lý do rõ ràng

| Use case | Quyết định | Lý do |
|---|---|---|
| Auto-commit category/transaction | **Reject** | Vi phạm explicit confirmation, immutable/domain authority và JEV advisory boundary (`AI-JEV.md` §3, §7, L21–31, L80–89). |
| JEV tính balance/budget/report/amount/date | **Reject** | Deterministic backend/domain là authority; sai arithmetic gây financial harm (`DOMAIN-MODEL.md` §3–§4, L38–67). |
| JEV authorize/reject payment hoặc auto-transfer/savings | **Reject** | JEV không có money authority; budget overrun không authorization. |
| JEV tự sửa/xóa/merge/reverse/correct ledger | **Reject** | Ledger append-only; correction phải domain command có reason/audit (`DOMAIN-MODEL.md` §5, L83–85). |
| JEV duplicate/anomaly detector | **Reject JEV; defer deterministic** | Matching/idempotency/baseline cần rule/read-model, JEV không tăng certainty; false positive không được block payment. |
| CSV auto-import/batch auto-commit | **Reject MVP; defer** | Thiếu staging/import/idempotency/partial-failure contract; row phải review. |
| Monthly summary/spending explanation | **Defer JEV prose** | SRS có nhu cầu, nhưng canonical AI-JEV/PRD loại complex AI summary; cần fact snapshot/provenance/stale contract (`AI-JEV.md` §8, L91–93; `PRD.md` §5, L65–67). |
| Personalized tips/budget coaching | **Defer JEV wording; ship deterministic warning/template trước** | Có product value nhưng thiếu goal/threshold/feedback/persistence; phải tránh shaming/financial advice. |
| Next-best action | **Defer** | Chỉ an toàn nếu deterministic allowlist; JEV không được phát minh hoặc thực hiện money action. |
| Forecasting | **Reject MVP; defer product decision** | Optional trong SRS, rủi ro certainty/action cao, cần methodology/uncertainty/calibration. |
| Chatbot mở, chat-completion prose parse | **Reject** | Không bounded/typed; không phù hợp advisory category contract và prompt-injection boundary. |
| Autonomous admin triage/dispute/financial ranking | **Reject** | Xung đột least privilege, privacy và admin không được sửa ledger/balance/audit (`ADMIN-OPERATIONS.md` §1–§2, L3–15). |
| External bank/peer benchmark hoặc suy đoán toàn bộ tài chính | **Reject/defer** | Campus Coin chỉ phản ánh dữ liệu user tự nhập, không phải bank; chưa có consent/data contract (`PRD.md` §1, L3–7; `SRS..._vi.md` §1.5, L65–71). |

## Evidence index và trạng thái điều phối

- SRS tiếng Việt đã đọc toàn bộ: `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1–§1.9, đặc biệt L25–43, L57–71, L101–166, L167–199, L230–295.
- Canonical đã đối chiếu: `docs/PRD.md`, `docs/DOMAIN-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/AI-JEV.md`, `docs/contracts/openapi.yaml`, `docs/contracts/API-REVIEW.md`, `docs/contracts/README.md`, `docs/ADMIN-OPERATIONS.md`, `docs/AUTHENTICATION.md`, `docs/DELIVERY-PLAN.md`, `AGENTS.md`.
- Existing working evidence đã đọc: `docs/working/jev-analysis/CC-JEV-UX-EVAL.md`.
- Child handoffs đã đọc đầy đủ: `CC-JEV-PRODUCT-JOURNEY.md`, `CC-JEV-TRANSACTION-AUTOMATION.md`, `CC-JEV-INSIGHT-COACH.md`, `CC-JEV-SAFETY-UX-DOMAIN.md`.
- Bốn lane chạy độc lập và chỉ ghi handoff riêng; integrator là owner duy nhất của file này. Không chạy formatter/linter/build/full tests vì đây là document analysis; không có code/runtime/provider claim nào được tạo.

**Kết luận cuối:** Campus Coin nên dùng JEV như **lớp giảm ma sát và diễn giải có kiểm soát**, không phải lớp quyết định tiền. Ship deterministic core/manual-first; bật category suggestion chỉ sau Gate B; ưu tiên phase sau cho monthly insight, spending-change explanation, budget coaching và tips sau deterministic snapshot; giữ CSV/anomaly/forecast ngoài MVP cho tới khi contract, provenance, stale/fallback và safety evidence đủ. Nếu JEV tắt hoặc lỗi, sinh viên vẫn phải nhập, xem, sửa và hiểu dữ liệu của chính mình bằng đường deterministic.