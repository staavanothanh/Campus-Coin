# Handoff lane 4 — Safety/UX/domain guardrails cho JEV

> **Lane:** `JEV-PROD-004` — Safety/UX/domain guardrails
> **Trạng thái:** working evidence; không phải quyết định canonical
> **Phạm vi:** user control, provenance, persistence/audit, stale data, feedback, dismiss/save, accessibility, `en`/`vi`, `Asia/Ho_Chi_Minh`, deterministic authority, admin boundary, privacy minimization, prompt injection và output không an toàn.
> **Không thực hiện:** không đánh giá lại provider/OpenRouter/model/cost; không sửa SRS, ADR, canonical docs, OpenAPI hoặc runtime.

## 0. Kết luận điều hành

- **[Verified fact] Campus Coin là sổ theo dõi do sinh viên tự nhập, không phải ngân hàng, không giữ tiền thật và không xử lý payment thật.** Dữ liệu đầu vào có thể là description tự do, CSV hoặc giao dịch do user nhập; vì vậy description phải được coi là dữ liệu chưa tin cậy, không phải instruction cho JEV. Evidence: `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.4–1.5, L57–71; `docs/PRD.md` §1, §3.2, L3–7, L25–31.
- **[Verified fact] Domain/backend là authority cho wallet, ledger, savings, budget và report deterministic; JEV chỉ advisory, không tính tiền, authorize payment hoặc ghi/sửa/xóa money state.** Evidence: `docs/DOMAIN-MODEL.md` §1, §4–5, L3–15, L54–85; `docs/ARCHITECTURE.md` §2, §4–5, L21–47; `docs/AI-JEV.md` §3, L21–31; `docs/PRD.md` §3.5, §4, L45–51, L53–63.
- **[Verified fact] MVP JEV hiện chỉ có insertion point category suggestion trước submit, default-off, backend-only, có manual fallback và phải có user confirmation/override.** Evidence: `docs/AI-JEV.md` §3, §5, §7, L21–31, L64–89; `docs/contracts/openapi.yaml` `/ai/category-suggestion`, L338–348; `docs/PRD.md` §3.5, L45–51.
- **[Verified fact] SRS mô tả phạm vi rộng hơn MVP (monthly insight, tips, anomaly, forecast, CSV và AI learning), nhưng canonical PRD/architecture đã cắt complex AI summary, prediction, chat, autonomous action và các phần chưa qua safety gate.** Không được dùng SRS rộng hơn để tự mở lại MVP. Evidence: SRS §1.6, L113–165; `docs/PRD.md` §5, L65–67; `docs/ARCHITECTURE.md` §8, L67–69; thứ tự ưu tiên `docs/README.md` §4, L58–64.
- **[Proposal] Quy tắc bất biến cho mọi insertion point:** JEV có thể *nêu khả năng* hoặc *gợi ý lựa chọn*; user phải thấy dữ liệu nền, tự accept/override/dismiss/save/feedback; server revalidate; domain mới quyết định commit. Không có đường tắt từ output JEV tới financial mutation.
- **[Proposal] Disposition:** ship core với deterministic read model + manual-first UX; giữ JEV category suggestion ở `defer enablement` cho đến khi các gate trong tài liệu này đạt; insight/tip/anomaly/forecast chỉ mở theo từng contract riêng; forecast/autonomous/admin automation không thuộc MVP.
- **[Unresolved]** Chưa có canonical contract cho provenance snapshot, dismiss/save/feedback, stale policy, insight persistence, numeric confidence, category-suggestion acknowledgement binding, hay retention của metadata JEV. Các khoảng trống này không được lấp bằng giả định runtime.

## 1. Nguồn ưu tiên, thuật ngữ và phân loại blocker

### 1.1. Nguồn ưu tiên

- **[Verified fact]** Khi SRS mô tả password/local registration, `expense`, AI summary hoặc admin rộng hơn canonical MVP, phải dùng canonical docs/ADR/domain làm ranh giới triển khai. `docs/README.md` xác định thứ tự ưu tiên: chỉ đạo Team Leader → ADR → invariant domain/auth → PRD/architecture/delivery → working handoff, L58–64.
- **[Verified fact]** Enum kỹ thuật là `income` và `payment`; UI có thể dịch thành “Thu nhập” và “Thanh toán”, không đổi enum, công thức, audit hoặc authorization theo locale. Evidence: `docs/README.md` §5, L66–72; `docs/DOMAIN-MODEL.md` §1, §4, L7–14, L54–67; `docs/contracts/openapi.yaml` `TransactionType` và `Locale`, L397–400.
- **[Proposal]** Trong UX, gọi rõ “gợi ý danh mục”/“category suggestion”, không gọi “AI đã chọn”, “đã duyệt” hoặc “đúng”. Trong narrative, tách nhãn **Số liệu authoritative** và **Diễn giải tham khảo**.

### 1.2. Core blocker và JEV-only blocker

| Nhóm | Ví dụ | Disposition |
|---|---|---|
| **Core blocker** | Manual category picker không hoạt động; user không review trước save; owner/session/CSRF sai; ledger/balance/report không deterministic; `income`/`payment` hoặc VND/HCMC sai; disabled category được tạo row; lỗi làm mất input; keyboard/screen-reader không thể hoàn tất form; `en` hoặc `vi` mất thao tác. | **NO-GO core.** Tắt JEV không khắc phục được vì đây là đường nhập và đọc tiền cốt lõi. Evidence: `docs/PRD.md` §3.2–3.4, §4, L25–43, L53–63; `docs/DOMAIN-MODEL.md` §4, L54–67; `AGENTS.md` L87–97. |
| **JEV-only blocker** | Suggestion sai candidate nhưng manual vẫn dùng được; thiếu provenance của một insight; stale narrative; JEV timeout/schema/privacy; feedback/save chưa có contract; confidence copy gây hiểu lầm; prompt injection bị abstain không đúng nhưng money path vẫn chạy. | **Không block core launch; block JEV enablement hoặc block riêng feature đó.** Giữ flag off/manual fallback. Evidence: `docs/AI-JEV.md` §5, §7, L64–89; `docs/DELIVERY-PLAN.md` §4, §8, §10–12, L26–33, L47–79. |
| **Escalate thành core blocker** | JEV lỗi làm khóa Save, tự commit category, làm sai amount/date/balance/report, lộ financial/PII/secret, bypass owner/authorization, hoặc output admin làm thay đổi money state. | **Kill JEV ngay và đánh giá NO-GO core nếu core path bị ảnh hưởng.** Evidence: `docs/ARCHITECTURE.md` §2, §5–6, L21–27, L43–56; `docs/ADMIN-OPERATIONS.md` §3–7, L28–51. |

## 2. Domain safety policy

| Chủ đề | [Verified fact] | [Proposal] policy testable | Blocker |
|---|---|---|---|
| **Authority** | Wallet/report/budget được backend/domain quyết định; JEV không bypass calculation/authorization. `docs/DOMAIN-MODEL.md` §1, §4, L3–15, L54–67. | Mỗi card có nguồn deterministic và timestamp; narrative sai nguồn bị bỏ, không “sửa” số authoritative. | Core nếu authoritative sai; JEV-only nếu narrative bị tắt. |
| **Commit** | Ledger immutable/append-only; payment kiểm tra wallet đủ; correction là row mới; user phải confirm JEV. `docs/DOMAIN-MODEL.md` §4–5, L54–85; `docs/AI-JEV.md` §3, §7, L21–31, L80–89. | `accept suggestion` chỉ chọn category trên form; `Save` là action riêng; server revalidate category/type/owner/CSRF/idempotency; override thắng mọi response trễ. | Core nếu commit không explicit hoặc sai domain. |
| **Budget** | Budget overrun chỉ là warning, không authorize/reject payment nếu wallet đủ. `docs/DOMAIN-MODEL.md` §1, §4, L10–14, L56–67; `docs/PRD.md` §3.3, L33–37. | JEV được diễn giải warning, không đề xuất “hệ thống sẽ chặn” hoặc tự đổi limit/payment; số used/limit lấy từ deterministic response. | Core nếu JEV làm đổi semantics budget. |
| **Time/period** | Business period dùng `Asia/Ho_Chi_Minh`; report là local half-open period. `docs/DOMAIN-MODEL.md` §1, §4, L14, L66; `docs/contracts/API-REVIEW.md` §Domain scope, L39–44. | Provenance luôn ghi `period` và `timezone`; đổi tháng HCMC hoặc correction làm snapshot stale; không dùng browser timezone để đổi report. | Core nếu report/transaction period sai; JEV-only nếu narrative stale. |
| **Category lifecycle** | Category có `active|disabled|retired`; disabled không nhận row mới nhưng history đọc được. `docs/contracts/openapi.yaml` `Category`, L533–544; `docs/DOMAIN-MODEL.md` §2, §4, L34–36, L65. | Candidate phải còn active, đúng `appliesTo`; category đổi status giữa suggestion và Save → bỏ suggestion, yêu cầu picker. | Core nếu manual cho chọn disabled; JEV-only nếu suggestion bị stale. |
| **Owner/admin** | Owner lấy từ session; admin không sửa ledger/balance/audit; support chỉ xem issue đã mask. `docs/AUTHENTICATION.md` §5–6, L33–51; `docs/ADMIN-OPERATIONS.md` §1–2, §6, L3–15, L42–44. | JEV không có role/session; mọi provenance/action scope theo user server-side; admin không xem raw narrative/ledger mặc định, không accept thay user. | Core nếu IDOR/privilege leak; JEV-only nếu admin dashboard thiếu feature. |
| **Privacy** | JEV boundary chỉ cần description đã redact, type, candidate, locale; không gửi balance, ledger, claims, session, secret, PII thừa. `docs/AI-JEV.md` §4, §6, L33–45, L74–78; `docs/ARCHITECTURE.md` §5–6, L43–56. | PII/secret-shaped text hoặc unknown privacy → abstain/manual; UI không echo description trong error/analytics; không lưu raw prompt/response. | Raw leak là security/core incident; privacy uncertainty block JEV. |
| **Untrusted text** | `description` là input user, max 500 theo contract; SRS cho phép free-text description. `docs/contracts/openapi.yaml` L440–449, L662–677; SRS L258–269. | Description chỉ được coi là data; delimit/validate/redact; instruction “ignore rules”, lộ prompt, authorize/payment hoặc đổi budget → không làm theo, fallback manual. | Core nếu injection làm commit/bypass; JEV-only nếu chỉ mất suggestion. |
| **Locale** | API locale là `en|vi`; category name có hai bản dịch; UI phải có cả hai locale. `docs/contracts/openapi.yaml` L397–400, L533–544, L662–677; `AGENTS.md` L93–95. | Không dịch ID/enum/API/error code; mọi state/button/error/live region có key `en` và `vi`; locale đổi làm response cũ stale/discard. | Core nếu locale làm mất thao tác; JEV-only nếu chỉ thiếu narrative. |

## 3. User-control contract

### 3.1. Nguyên tắc “propose → inspect → decide → commit”

1. **User nhập và xem dữ liệu authoritative:** type `income|payment`, description, amount VND, occurred time và category picker. Category picker manual luôn sẵn trước khi gọi JEV. `CreateTransactionRequest` yêu cầu type/amount/category/occurredAt; `confirmedCategorySuggestion` chỉ là field acknowledgement, không phải authorization. Evidence: `docs/contracts/openapi.yaml` L440–449.
2. **User trigger:** chỉ gọi suggestion/insight khi user bấm action rõ ràng hoặc mở vùng đã opt-in; không gọi trên từng phím, không chạy ngầm khiến user tưởng hệ thống đã lưu. **[Proposal]**
3. **JEV preview:** hiển thị category/insight như đề xuất, kèm provenance tối thiểu, trạng thái freshness và câu “kiểm tra trước khi lưu”. Không dùng confidence số như bảo đảm đúng. **[Proposal]**
4. **Accept hoặc override:** `Use this category/Dùng danh mục này` là thao tác explicit; `Choose another category/Chọn danh mục khác` mở picker. Chọn category khác reset acknowledgement về false. **[Proposal]**
5. **Final review:** Save/Submit là action độc lập; summary phải nêu category + amount + thời gian; suggestion pending/error không được khóa manual Save nếu user đã có category hợp lệ. **[Proposal]**
6. **Server commit:** domain xác thực session/owner/CSRF, candidate/category active, `appliesTo`, amount/date/idempotency và invariants; chỉ domain commit ledger. JEV không nằm trong money transaction. Evidence: `docs/DOMAIN-MODEL.md` §5, L75–85; `docs/ARCHITECTURE.md` §4–5, L35–47.
7. **Sau commit:** transaction/balance/budget/report hiển thị từ response authoritative; provenance JEV là metadata không làm thay đổi money state. **[Proposal]**

### 3.2. Override, race và stale result

- **[Proposal]** Mỗi request suggestion gắn `interactionVersion` cục bộ với type, description, locale và category snapshot. Khi type/description/locale/category list đổi, response cũ bị discard; không overwrite lựa chọn mới.
- **[Proposal]** Nếu category vừa bị disable/retire, hoặc candidate snapshot khác authoritative list, status chuyển `manual`; không map “gần đúng”, không giữ category cũ để commit.
- **[Proposal]** Nếu user chọn manual trong lúc JEV loading, manual selection thắng; response về sau chỉ được ghi telemetry masked hoặc bỏ qua, không đổi form.
- **[Verified fact]** Category phải đúng `appliesTo` và disabled không nhận row mới; history vẫn đọc được. Evidence: `docs/DOMAIN-MODEL.md` §2, §4, L34–36, L65; `docs/contracts/openapi.yaml` L533–544.
- **[Unresolved]** API chưa mô tả cách bind `confirmedCategorySuggestion` với categoryId/response cụ thể. Không được coi boolean này là bằng chứng user đã thấy và chấp nhận đúng suggestion; cần API/domain decision trước enablement. Evidence: `docs/contracts/openapi.yaml` L440–449; `docs/AI-JEV.md` §3, L21–31.

### 3.3. Dismiss, save và feedback

- **[Verified fact]** SRS có yêu cầu user có thể bỏ qua hoặc “ghim” mẹo và đánh dấu insight/tip để xem lại; SRS §1.6, L135–150. Tuy nhiên canonical MVP cắt complex AI summary/prediction; PRD §5, L65–67.
- **[Proposal]** Dismiss chỉ ẩn đề xuất khỏi vị trí hiện tại, không xóa transaction, không sửa budget, không xóa immutable audit. `dismissed` là user action có target snapshot, actor, reason tùy chọn và timestamp.
- **[Proposal]** Save/pin lưu *snapshot* của insight/tip/suggestion cùng `asOf`, period, timezone, nguồn dữ liệu và contract version; không tự regenerate hoặc overwrite khi dữ liệu đổi. Saved item có badge `stale`/“dữ liệu đã thay đổi”.
- **[Proposal]** Feedback là optional và tách khỏi correction: lựa chọn ngắn `useful`, `wrong_category`, `out_of_date`, `unsafe_or_harmful`, `wrong_language`, `privacy_concern`, `other`; feedback không tự sửa ledger, không tự đổi budget và không hứa sẽ retrain.
- **[Proposal]** `wrong_category` dẫn user về picker/correction flow; chỉ correction domain append-only mới có thể thay đổi hiệu lực tài chính. Evidence: `docs/DOMAIN-MODEL.md` §5, L83–85; `docs/contracts/API-REVIEW.md` §Ledger correction, L23–30.
- **[Unresolved]** Chưa có API/schema cho save, dismiss, feedback, snapshot retention, user export/delete và feedback ownership. Đây là prerequisite của insight/tip persistence; không tự thêm endpoint trong handoff.

## 4. Provenance model proposal

### 4.1. Hai lớp provenance

**[Proposal]** Mỗi JEV artifact nên có hai lớp, tách rõ để không biến giải thích thành authority:

1. **Lớp deterministic evidence (authoritative):** `sourceKind=report|budget|category|ledger_read`, owner scope, period local HCMC, aggregate/value do backend tính, snapshot ID/version, `asOf` và query semantics. Đây là nơi duy nhất được dùng để hiển thị amount, balance, used budget hoặc report total.
2. **Lớp advisory interpretation (non-authoritative):** `sourceKind=jev`, artifact type, contract version, generated time, status, explanation, confidence/threshold nội bộ (nếu có), user decision và freshness. Không được chứa raw prompt/response, secret, provider detail hoặc financial detail không cần thiết.

**[Verified fact]** Architecture đã dành metadata JEV đã mask nếu cần và yêu cầu log structured/redact; audit append-only. Evidence: `docs/ARCHITECTURE.md` §4–6, L35–56; `docs/ADMIN-OPERATIONS.md` §6, L42–44.

### 4.2. Schema logic đề xuất (chưa phải API/canonical schema)

| Field | Ý nghĩa | Quy tắc an toàn |
|---|---|---|
| `artifactId` | ID opaque của suggestion/insight/tip | Không dùng raw prompt làm ID; owner scope server-side. |
| `artifactType` | `category_suggestion`, `insight`, `tip`, `anomaly`, `forecast` | Type ngoài MVP phải có decision riêng; unknown type không render. |
| `origin` | `deterministic`, `jev`, `user` | Không gắn `jev` cho số liệu authoritative. |
| `ownerId`/`scope` | User hiện tại | Không nhận từ client; lấy session như financial read. Evidence: `docs/AUTHENTICATION.md` §4–5, L27–39. |
| `subject` | Category/transaction/report/budget reference opaque | Reference phải được server kiểm tra owner/status; không expose cross-owner ID. |
| `period` + `timezone` | Ví dụ local month `YYYY-MM` + `Asia/Ho_Chi_Minh` | Không dùng browser timezone; period half-open theo domain. |
| `sourceSnapshotId`/`asOf` | Deterministic input snapshot và thời điểm | Nếu không tái hiện được snapshot, artifact không được gọi “fresh”. |
| `basis` | Metric/category/window dùng để giải thích | Chỉ aggregate tối thiểu; không raw ledger/PII. |
| `contractVersion` | Version của JEV artifact schema/policy | Dùng để biết artifact cũ cần migrate/stale; không show provider. |
| `candidateSetVersion` | Snapshot category active + `appliesTo` | Category lifecycle đổi → invalidate suggestion. |
| `status` | `fresh`, `stale`, `superseded`, `dismissed`, `saved`, `unavailable` | Status server-authoritative; không để client tự nâng từ stale lên fresh. |
| `explanation` | Text đơn giản trả lời “dựa trên gì/vì sao” | Cấm claim certainty, diagnosis, fraud hoặc financial approval. |
| `userDecision` | `pending`, `accepted`, `overridden`, `dismissed`, `saved`, `feedbacked` | Chỉ set từ explicit user action; không suy diễn từ render/click ngoài intent. |
| `createdAt`/`decidedAt` | Technical instant | Hiển thị theo locale nhưng lưu instant chuẩn; business period vẫn HCMC. |
| `staleReason` | `source_changed`, `category_lifecycle`, `period_closed`, `locale_changed`, `policy_changed`, `unknown` | Unknown → fallback/manual, không che bằng copy “updated”. |

### 4.3. Persistence và audit

- **[Proposal]** Suggestion trước submit mặc định ephemeral; nếu user accept, chỉ category user chọn đi vào normal transaction request. Sidecar provenance/decision event (nếu sản phẩm cần) là append-only non-authoritative metadata, liên kết tới transaction sau commit, không sửa row ledger.
- **[Proposal]** Insight/tip đã save là immutable snapshot về mặt hiển thị; refresh tạo artifact mới và quan hệ `supersedes`, không mutate text cũ. Dismiss ẩn khỏi feed nhưng giữ event tối thiểu để idempotency/audit/product signal.
- **[Verified fact]** Audit tối thiểu gồm actor, scope, target, action, reason, request/correlation ID, outcome, timestamp; không ghi raw JEV prompt/response hoặc financial detail không cần thiết. Evidence: `docs/ADMIN-OPERATIONS.md` §6, L42–44.
- **[Proposal]** Audit user action chỉ lưu metadata masked: target opaque, artifact type, decision, reason code, contract/snapshot version, locale, timezone, timestamp, outcome. Không lưu description nguyên văn, amount/balance nếu không cần, prompt, response, token hoặc PII.
- **[Proposal]** Feature/content flag và kill action của admin phải có version, owner, reason, approval, timestamp và audit; admin không được tạo thay user một `accepted` decision. Evidence: `docs/ADMIN-OPERATIONS.md` §5–7, L38–51; `docs/contracts/API-REVIEW.md` §Admin, L14–21.
- **[Unresolved]** Cần chốt artifact retention, user deletion/export, có cho phép feedback text hay không, và liệu provenance có được hiển thị trong PDF/share. Không được suy diễn retention/provider policy từ tài liệu JEV.

### 4.4. Explanation contract tối thiểu

**[Proposal]** Mỗi output được render phải trả lời được bốn câu hỏi bằng ngôn ngữ user:

1. **Dựa trên dữ liệu nào?** Ví dụ: “Báo cáo payment của tháng 2026-09, kỳ `Asia/Ho_Chi_Minh`”.
2. **Đây là fact hay interpretation?** Gắn nhãn “Số liệu từ báo cáo” hoặc “Gợi ý tham khảo”.
3. **Được tạo lúc nào và còn fresh không?** Hiển thị `asOf`/stale badge; không dùng “real-time” nếu không có evidence.
4. **User kiểm soát gì?** `Dùng`, `Chọn khác`, `Lưu`, `Bỏ qua`, `Phản hồi`, `Xem dữ liệu nền`; không có nút “Apply to wallet/payment”.

Nếu không có source snapshot hợp lệ, explanation, locale hoặc freshness state thì output phải fallback/manual. Không hiển thị numeric confidence như tỷ lệ đúng; confidence (nếu tồn tại) chỉ là server signal để abstain. Evidence: `docs/AI-JEV.md` §1, §4, L5–13, L47–62; `docs/contracts/openapi.yaml` L669–677.

## 5. State machine và policy matrix

### 5.1. Category suggestion / short-lived advisory

| State | Entry condition | UI/user action | Persistence/audit | Cấm |
|---|---|---|---|---|
| `manual-ready` | Active categories đã load; JEV off hoặc user chưa trigger | Picker native/manual luôn usable; action Suggest nếu enabled | Không cần lưu JEV | Không gọi theo keystroke; không auto-select. |
| `loading` | User explicit bấm Suggest | Giữ mọi input; nút busy; picker vẫn dùng được; announce polite | Chỉ masked attempt metadata nếu cần | Không lock Save vô hạn; không cướp focus; không lộ raw text. |
| `suggested` | Typed result hợp lệ, category active, đúng type/candidate | Hiển thị label locale + explanation; `Use this category` hoặc override | Pending decision; chưa phải money write | Không gọi “correct/approved”; không tự submit. |
| `accepted` | User explicit dùng suggestion + final review | Category selected; vẫn bấm Save riêng | Ghi decision event masked; transaction commit qua normal API | `confirmed...=true` không bypass server validation. |
| `overridden` | User chọn category khác | Manual category thắng; reset acknowledgement | Ghi override nếu product cho phép | Late response không overwrite; không coi feedback là correction. |
| `manual` | Low confidence, injection, PII, unsupported, invalid candidate | Giữ form; chọn picker; retry tùy chọn | Reason code nội bộ; không raw | Không đoán category gần nhất. |
| `disabled` | Feature flag/policy off | Copy nói JEV off; manual path vẫn hoạt động | Không outbound call | Không giả “provider down”; không hide manual. |
| `unavailable` | Timeout/4xx/5xx/429/dependency | Generic error + manual; retry explicit, bounded | Mask status/fallback | Không auto-retry vô hạn; không chặn Save. |
| `stale` | Type/description/locale/category snapshot thay đổi | Bỏ kết quả, yêu cầu suggestion mới hoặc manual | Mark stale reason | Không render label cũ như hiện tại. |
| `invalid` | Schema/contract/candidate mismatch | Manual; không render partial result | Incident/telemetry masked | Không parse prose/partial JSON. |

### 5.2. Insight/tip/anomaly/forecast artifact

| State | Điều kiện | Hiển thị | User control | Cấm |
|---|---|---|---|---|
| `fresh` | Deterministic snapshot tồn tại, period/timezone rõ, policy hợp lệ | Fact + interpretation tách nhãn; `asOf` | Save/dismiss/feedback; mở source aggregate | Không gọi là advice được chứng nhận. |
| `stale` | Ledger/correction/category/budget/report snapshot đổi; tháng HCMC chuyển; policy/locale đổi | Giữ snapshot đã lưu, badge “Dữ liệu đã thay đổi”, nút Refresh | User chủ động refresh; không silently overwrite | Không dùng stale output để drive payment/budget. |
| `superseded` | Artifact mới thay thế artifact cũ | Hiển thị history nếu user đã save; link artifact mới | Xem/ẩn; không chỉnh sửa lịch sử | Không rewrite saved history. |
| `dismissed` | User bấm bỏ qua | Ẩn khỏi vị trí hiện tại, cho undo nếu có contract | Undo/feedback optional | Không xóa audit/ledger. |
| `saved` | User bấm lưu/ghim | Saved snapshot + provenance/stale badge | Unsave chỉ bỏ bookmark, không mutate source | Không coi saved là authoritative. |
| `unsafe/blocked` | Unsupported advice, prompt injection, harmful language, privacy failure | Không render output; copy fallback an toàn | Report issue/feedback | Không “làm sạch” rồi dùng một phần chưa kiểm chứng. |
| `unavailable` | Không có snapshot/JEV lỗi/locale thiếu | Deterministic view hoặc static manual guidance | Retry/đọc report | Không hiển thị số zero/forecast giả. |

## 6. Failure matrix

| Failure / signal | User-facing behavior [Proposal] | Persistence/audit | Core hay JEV blocker | Acceptance evidence |
|---|---|---|---|---|
| Description rỗng, quá dài, Unicode lỗi | Giữ input, báo lỗi field bằng `en`/`vi`, picker manual | Không outbound; không lưu raw error | Core form blocker nếu không nhập được; otherwise JEV-only | Boundary tests max 500, whitespace, diacritics. `openapi.yaml` L662–668. |
| PII/secret-shaped description | Không gửi; nói “hãy chọn danh mục thủ công”; không echo nội dung | Masked reason `privacy`; không raw log | JEV-only; raw leak escalates security/core | Synthetic email/phone/token/address fixtures; zero outbound/log leak. |
| Prompt injection (“ignore rules”, lộ prompt, authorize payment) | Xem text là data; abstain/manual; không thực hiện instruction | Masked reason `untrusted_input`; optional feedback | JEV-only trừ khi bypass commit | Replay injection en/vi; zero instruction following/authority. |
| Category mismatch/disabled/retired | Bỏ suggestion; chỉ active picker đúng `appliesTo` | Stale/invalid event | Core nếu manual sai; JEV-only nếu suggestion sai | Disable category giữa request và Save; server reject create. |
| Late response sau override/type/locale change | Discard stale; giữ lựa chọn hiện tại | Không ghi accepted; masked attempt | JEV-only | Race/reordering smoke. |
| Low confidence/ambiguous/out-of-set | `manual`, không score số, không đoán `other` nếu chưa policy | Reason masked | JEV-only | Correct abstention theo slice; không unsafe suggestion. |
| Typed/schema/contract invalid | Không render partial; manual | Incident metadata masked | JEV-only | Malformed response replay; no commit. |
| Timeout/429/4xx/5xx/disabled | Generic copy, manual picker, retry explicit/bounded; giữ form | Status bucket, no provider/raw | JEV-only; core nếu Save bị khóa | JEV-off and dependency-error smoke. |
| Session hết hạn/403/CSRF | Hiển thị auth/permission copy theo contract; không mất unsaved text nếu an toàn; manual save sau re-auth | Không accept event; auth audit theo policy | Core auth blocker nếu owner/CSRF sai; otherwise JEV-only | `401/403` suggestion không làm hỏng form; `openapi.yaml` L346–348, `AUTHENTICATION.md` L27–31. |
| Deterministic report/budget unavailable | Không gọi JEV để bù; show retry/error, không render zero | Không tạo insight | Core blocker cho authoritative view | Error/empty state không biến thành zero. `AGENTS.md` L91–92. |
| Snapshot stale sau correction/new payment/category change | Badge stale; giữ saved artifact; refresh tạo snapshot mới | Append-only supersede/refresh event | JEV-only, trừ nếu thay authoritative report | Recompute HCMC period and preserve old artifact. |
| Locale thiếu key/wrong language | Fallback static copy hoàn chỉnh trong cùng locale hoặc manual; không lẫn câu khó hiểu | Locale mismatch masked | Core nếu mất thao tác; JEV-only nếu artifact | State × `en|vi` × type matrix. |
| HCMC boundary/month rollover | Dùng backend local period; đánh dấu artifact cũ stale | Record period/timezone | Core nếu report sai; JEV-only nếu narrative sai | UTC instant quanh 00:00 HCMC; half-open month. |
| Save/dismiss/feedback retry/conflict | Không duplicate; báo outcome rõ; cho retry bounded | Idempotent append-only event | JEV-only nếu core transaction unaffected | Same key/body no duplicate; body conflict explicit. |
| Harmful/shaming tip, unsupported forecast, fraud accusation | Suppress output; show neutral manual guidance; allow report | Safety reason; không lưu raw output | JEV-only; repeated incident kill feature | Adversarial output review; zero direct action. |
| Admin ngoài scope/raw data request | 403/404 theo contract; không leak existence/raw data | Security/audit incident | Core authorization blocker | Least-privilege matrix; `ADMIN-OPERATIONS.md` L3–15, L42–51. |
| Feature flag/kill switch change | JEV off immediately; manual path remains | Actor/reason/version/approval/time audit | JEV-only; core if manual breaks | Kill rehearsal + manual en/vi smoke. |

## 7. Safety cards cho các insertion point

> Các card dưới đây là **[Proposal]** dựa trên verified boundary. Chúng không mở rộng canonical API/domain. Các use case business chi tiết khác do lane transaction/insight tích hợp; lane này đặt điều kiện an toàn tối thiểu.

### SAFE-01 — Category suggestion trước submit (MVP fit cao nhất)

- **Trigger:** User đã chọn `income` hoặc `payment`, nhập description và chủ động bấm Suggest; manual picker đã sẵn.
- **Input:** `transactionType`, description ngắn đã validate/redact, active candidate set đúng `appliesTo`, locale `en|vi`; **không** amount/balance/ledger/session/secret. Evidence: `docs/AI-JEV.md` §4, L33–45; `docs/contracts/openapi.yaml` L662–677.
- **Processing:** Server kiểm tra owner/session/CSRF/flag; JEV chỉ trả typed advisory; kiểm tra schema, candidate membership, category status, type và freshness; mọi lỗi abstain/manual.
- **Output:** `suggested` với category label authoritative + explanation; hoặc `manual|disabled|unavailable`; không numeric confidence trong MVP UI. Contract status/schema: `openapi.yaml` L669–677.
- **User control:** `Use this category`, override bằng picker, final Save riêng; user có thể bỏ qua và nhập manual; late response không overwrite.
- **Persistence:** Suggestion ephemeral; explicit decision có thể ghi masked sidecar event; transaction và category chỉ commit qua normal ledger API; `confirmedCategorySuggestion` không thay authorization.
- **Fallback:** Manual picker giữ nguyên description/type/amount/date; timeout/schema/privacy/low-confidence/flag-off đều không chặn Save khi category hợp lệ.
- **Success metric:** 100% commit có category active + explicit review; 100% invalid/malformed/PII/injection output abstain; manual success không giảm khi JEV off; zero auto-commit.
- **Cấm đoán:** Không tự chọn ngầm, tự submit, sửa amount/date/balance/budget, gọi provider từ browser, parse prose, gửi raw financial/session/claims/secret/PII.
- **Disposition:** **Ship manual now; defer JEV enablement** đến state/provenance/privacy/a11y gates.

### SAFE-02 — Monthly insight / dashboard narrative (ngoài MVP hiện tại)

- **Trigger:** User chủ động mở report hoặc yêu cầu tạo summary cho local month; không tạo khi dashboard chỉ load authoritative snapshot.
- **Input:** Deterministic report snapshot đã commit, period `YYYY-MM`, `Asia/Ho_Chi_Minh`, category aggregates và source refs tối thiểu; không raw ledger nếu không cần. Evidence: `docs/contracts/openapi.yaml` `/reports/monthly`, L246–254; `docs/PRD.md` §3.3, L33–37.
- **Processing:** Backend đóng băng snapshot; narrative chỉ diễn giải facts trong snapshot; kiểm tra source refs, period, locale, stale policy và output safety; conflict với deterministic numbers → bỏ narrative.
- **Output:** Fact block + advisory interpretation, explanation “dựa trên báo cáo tháng…”, `asOf`, stale status; không gọi là financial advice/certainty.
- **User control:** Read, mở evidence aggregate, save/pin, dismiss, feedback, refresh; không có Apply-to-wallet/budget/payment.
- **Persistence:** Saved snapshot immutable với sourceSnapshotId, period/timezone, generatedAt, locale, contractVersion, user actions; refresh tạo artifact mới, không overwrite cũ.
- **Fallback:** Hiển thị report deterministic và static guidance; nếu snapshot thiếu/stale/locale không có thì không render JEV prose.
- **Success metric:** 100% narrative claim trace được tới source aggregate; 0 claim mâu thuẫn report; user có thể dismiss/save/feedback bằng keyboard và cả `en`/`vi`; stale badge không bị che.
- **Cấm đoán:** Không tự tính total/balance/budget, không đọc raw cross-owner data, không giữ narrative stale như current, không biến tip thành instruction tài chính.
- **Disposition:** **Defer**; SRS có mô tả nhưng PRD hiện loại complex AI summary. Evidence: SRS L128–133; `docs/PRD.md` §5, L65–67.

### SAFE-03 — Personalized tip / budget coaching

- **Trigger:** User mở khu vực tips hoặc nhận deterministic budget warning; tip không tự đổi budget.
- **Input:** Budget/report deterministic cho user + category/payment + local month; mục tiêu user nếu đã có và được policy cho phép; không infer sensitive attributes. Evidence: `docs/DOMAIN-MODEL.md` §1, §4, L10–14, L56–67; SRS L135–145.
- **Processing:** Xác định fact (used/limit/overrun) từ backend; JEV chỉ diễn đạt một hành động tùy chọn, bounded và không xấu hổ user; kiểm tra stale/source/prohibited advice.
- **Output:** Tip rõ “có thể thử”, nêu basis và limitation; warning budget vẫn là warning, payment wallet-sufficient vẫn không bị chặn.
- **User control:** Dismiss, save/pin, feedback `useful/not useful/unsafe`, xem source; user tự quyết có thay đổi budget/spending ngoài app.
- **Persistence:** Tip snapshot + actions append-only sidecar; không ghi budget/ledger và không “học” silent từ feedback nếu chưa policy.
- **Fallback:** Hiển thị số liệu/budget warning deterministic + static copy; nếu không có baseline hoặc output unsafe thì không tip.
- **Success metric:** 100% tip có source/basis và stale state; 0 tip tự gọi mutation; 0 câu hứa tiết kiệm/đảm bảo; dismiss/save/feedback parity en/vi.
- **Cấm đoán:** Không khuyên vay/BNPL/đầu tư, không yêu cầu bỏ nhu cầu thiết yếu, không phán xét, không thay limit, không authorize/reject payment.
- **Disposition:** **Deferred enhancement**; deterministic warning/core ship trước.

### SAFE-04 — Anomaly flag read-only

- **Trigger:** User chủ động xem history/report và yêu cầu highlight; không tự gắn nhãn “fraud”.
- **Input:** Deterministic transaction pattern của chính user trong period có baseline đủ; không cross-user comparison hoặc sensitive inference.
- **Processing:** Tính baseline/delta deterministic trước; JEV chỉ giải thích khả năng bất thường nếu có evidence; nếu thiếu baseline/ambiguous thì abstain; không sửa/correct transaction.
- **Output:** “Có thể khác với mẫu trước đây” + period/category/basis; không kết luận gian lận/sai phạm.
- **User control:** Xem transaction gốc, dismiss, feedback false positive, tự mở correction/report nếu cần; không có Auto-fix.
- **Persistence:** Read-only flag/snapshot + dismiss/feedback; không mutate immutable ledger; correction chỉ domain append-only command.
- **Fallback:** History/report bình thường; không hiển thị badge nếu baseline không đủ hoặc evidence stale.
- **Success metric:** 0 auto-correction; 100% flag có source/basis; false-positive feedback có đường report; stale flags được đánh dấu.
- **Cấm đoán:** Không gọi fraud, không khóa payment, không sửa/xóa ledger, không gửi toàn bộ ledger cho JEV, không suy luận người dùng.
- **Disposition:** **Defer/requires separate safety decision**; không nằm trong MVP canonical. SRS optional intelligence L161–165; `docs/PRD.md` §5, L65–67.

### SAFE-05 — Forecast tháng tới

- **Trigger:** User chủ động mở forecast, nếu product sau này phê duyệt; không render mặc định trong dashboard.
- **Input:** Historical deterministic series đủ dài, local month/HCMC, assumptions/coverage rõ; không dùng forecast làm wallet/budget authority.
- **Processing:** Tạo range/uncertainty và explanation; nếu data sparse, period chưa đóng hoặc source stale thì abstain; không biến điểm ước lượng thành amount cần trả.
- **Output:** Projection được gắn `forecast`, period tương lai, assumptions, `fresh/stale`; copy “ước tính tham khảo”, không “sẽ xảy ra”.
- **User control:** Xem assumptions, dismiss/save/feedback, refresh; không có Set budget/Make payment từ forecast.
- **Persistence:** Snapshot immutable + source window + assumptions + generatedAt; refresh tạo version mới; retention cần decision.
- **Fallback:** Monthly report deterministic và manual planning; không hiển thị số zero hoặc range giả.
- **Success metric:** 100% forecast có uncertainty/assumption/source window; 0 forecast được dùng trong domain authorization; user phân biệt forecast với actual qua text và screen reader.
- **Cấm đoán:** Không authorize payment, set budget, promise savings, dùng dữ liệu ngoài owner scope, hoặc hiển thị forecast thiếu baseline như fact.
- **Disposition:** **Reject for MVP / defer**; SRS chỉ ghi tùy chọn, canonical PRD/architecture loại prediction. Evidence: SRS L161–165; `docs/PRD.md` §5, L65–67; `docs/ARCHITECTURE.md` §8, L67–69.

### SAFE-06 — Save/dismiss/feedback/provenance cross-cutting

- **Trigger:** User thấy bất kỳ suggestion/insight/tip nào và explicit chọn Save, Dismiss hoặc Feedback.
- **Input:** Artifact ID opaque, current owner session, action enum, optional short reason; không bắt user nhập lại raw financial data.
- **Processing:** Server kiểm tra owner/artifact status/idempotency; append-only action; feedback không tự gọi model, đổi ledger, budget hoặc category.
- **Output:** Localized outcome (`Saved`, `Dismissed`, `Feedback received`) và trạng thái artifact; lỗi giữ artifact/action để retry.
- **User control:** Action reversible ở mức bookmark/hide nếu có contract; user có thể đổi quyết định hoặc report unsafe; không ép feedback.
- **Persistence:** Event gồm actor/scope/target/action/reason/outcome/timestamp + snapshot version, masked; saved artifact giữ stale/provenance.
- **Fallback:** Nếu persistence unavailable, giữ artifact local trong phiên hoặc báo chưa lưu rõ ràng; không hiển thị “đã lưu” giả; core money path không bị chặn.
- **Success metric:** Idempotent no-duplicate; 100% UI outcome truthful; no cross-owner access; keyboard/screen-reader parity; 0 raw prompt/PII event.
- **Cấm đoán:** Không xóa audit/ledger, không dùng dismiss như delete, không giả feedback đã retrain/đã sửa tiền, không expose artifact cho admin ngoài scope.
- **Disposition:** **Prerequisite cho bất kỳ insight/tip rollout**; category suggestion có thể ephemeral nếu canonical contract chưa chốt.

## 8. Accessibility, localization và timezone rules

### 8.1. Accessibility / WCAG 2.2 AA acceptance

**[Verified fact]** SRS yêu cầu UI rõ ràng/dễ đọc, dark mode/cỡ chữ, breadcrumbs và loading; PRD/AGENTS yêu cầu keyboard, focus, loading/error/accessibility, label/error association và chart/table equivalent. Evidence: SRS §1.6–1.8, L167–171, L187–199; `docs/PRD.md` §3.4, L39–43; `AGENTS.md` L87–97.

**[Proposal]** Áp dụng gate WCAG 2.2 AA cho manual và JEV states:

- Dùng native `<label>`, `<fieldset>/<legend>`, `<select>`/radio group trước custom widget; icon-only button có accessible name và text fallback.
- Tab order ổn định: transaction type → description → Suggest (nếu enabled) → category picker → amount/date → review/save → dismiss/save/feedback.
- Mọi suggestion/loading/error/fallback dùng text và `aria-live="polite"` phù hợp; validation liên kết qua `aria-describedby`; không truyền meaning bằng màu duy nhất.
- Focus không bị cướp khi response trễ; khi modal mở phải trap focus, Escape/close hoạt động và restore focus về trigger; fallback sau explicit request chỉ focus picker khi chưa có category.
- Contrast tối thiểu AA, visible focus, target tối thiểu 24×24 CSS px, reflow/zoom 400%, reduced motion; chart luôn có table/text equivalent. Baseline references: `AGENTS.md` L91–97; `docs/PRD.md` L39–43.
- Error phải nói vấn đề và cách sửa, giữ input để user không nhập lại; spinner không được là trạng thái duy nhất.
- Screen reader phải đọc rõ `advisory`, `stale`, `saved`, `dismissed`, `manual fallback`, period HCMC và fact-vs-interpretation.

**Core blocker:** không thể tạo `income`/`payment`, đọc số authoritative hoặc sửa lỗi bằng keyboard/screen reader. **JEV-only blocker:** chỉ thiếu announcement/provenance của suggestion/insight nhưng manual core vẫn đạt.

### 8.2. `en`/`vi` localization

- **[Verified fact]** API locale chỉ `en|vi`; category có `name.en` và `name.vi`; locale không đổi enum/formula/audit/authorization. Evidence: `docs/contracts/openapi.yaml` L397–400, L533–544; `docs/README.md` §5, L66–72; `AGENTS.md` L93–95.
- **[Proposal]** Có một translation-key inventory cho mọi state, button, helper, validation, `aria-label`, live update, stale badge, feedback option và retry. Không để JEV text tự do quyết định language UI.
- **[Proposal]** Nếu output narrative không đúng locale hoặc dịch không đầy đủ, không render prose; dùng static localized fallback/report deterministic. Không trộn câu `en` vào `vi` để che thiếu key.
- **[Proposal]** Locale switch khi request pending làm result cũ stale; có thể map lại category ID qua authoritative list hiện tại nhưng không giữ label cũ. Không dịch `income`, `payment`, `VND`, `Asia/Ho_Chi_Minh`, ID, endpoint hoặc error code.
- **Acceptance:** matrix `state × en|vi × income|payment`, locale switch pending, category labels active/disabled/history và screen-reader announcements đều pass. Thiếu một locale làm mất thao tác là core blocker.

### 8.3. HCMC timezone và date semantics

- **[Verified fact]** Business period/date dùng `Asia/Ho_Chi_Minh`; monthly report API nhận `YYYY-MM`; transaction API nhận `occurredAt` date-time. Evidence: `docs/DOMAIN-MODEL.md` §1, §4, L14, L66; `docs/contracts/openapi.yaml` L102–116, L246–254, L373–375.
- **[Proposal]** Provenance lưu cả technical instant (`generatedAt`, `decidedAt`) và business period (`month`, `from/to`, timezone). UI format theo locale nhưng không đổi instant/period.
- **[Proposal]** Tại ranh giới 00:00 HCMC, report/budget snapshot cũ không tự gắn vào tháng mới; refresh phải lấy local half-open period. Nếu correction làm đổi tháng/aggregate, artifact cũ thành `stale`.
- **Acceptance:** test synthetic quanh UTC/HCMC month boundary, DST assumptions không được tự thêm, report actual và narrative period phải cùng snapshot; không để browser timezone thay đổi amount/date semantics.

## 9. Privacy minimization và prompt-injection policy

### 9.1. Input/output boundary

- **[Verified fact]** Request category suggestion chỉ gồm `transactionType`, `description`, `locale`; description max 500; response có status/category/confidence/reasonCode. Evidence: `docs/contracts/openapi.yaml` L662–677.
- **[Verified fact]** JEV internal boundary yêu cầu description redacted, candidate opaque, locale/contract version; cấm balance, savings, raw ledger, Google claims, session, secret và PII thừa. Evidence: `docs/AI-JEV.md` §3–6, L21–23, L33–45, L64–78.
- **[Proposal]** UI helper text có thể khuyến cáo không nhập email/phone/address/token nhưng không được coi client redaction là đủ; server vẫn validate/redact và fail closed khi không chắc.
- **[Proposal]** Không echo description trong toast, error, analytics, feedback hay provenance; không lưu raw prompt/response; chỉ reason/status/latency/correlation masked theo policy đã có.
- **[Proposal]** Feedback text (nếu được phép sau này) phải bounded, optional, có redaction/validation và cùng injection policy; không dùng nó làm training consent mặc định.

### 9.2. Prompt injection / untrusted transaction description

**[Proposal]** Xử lý description như một field data:

1. Delimit rõ description khỏi system/policy instruction ở adapter boundary; không để content override policy.
2. Reject/abstain khi description yêu cầu “bỏ qua quy tắc”, tiết lộ prompt/provider, gọi tool, đổi amount/date/balance, authorize payment, sửa ledger hoặc chuyển role.
3. Không lặp nguyên văn text đáng ngờ vào output/UI/log; copy chung là “Không thể dùng gợi ý; hãy chọn danh mục thủ công”.
4. Output phải typed, category ID thuộc candidate active và đúng `appliesTo`; partial/prose/unknown field → manual.
5. Bộ replay phải gồm injection tiếng Việt/Anh, Unicode/diacritics, PII-like, prompt exfiltration và financial-authority request. Đây là safety test, không phải accuracy optimization.

**Hard reject:** injection dẫn tới commit, authorization, data exfiltration hoặc prompt/secret disclosure là security incident; tắt JEV, preserve masked evidence, không “fix” bằng cách tiếp tục dùng output một phần. Evidence boundary: `docs/AI-JEV.md` §3–7, L21–31, L62–89; `docs/ADMIN-OPERATIONS.md` §3, §6–7, L28–44, L46–51.

## 10. Safety checklist trước khi bật từng feature

### Gate A — Core launch (JEV có thể off)

- [ ] Manual picker load active categories đúng `appliesTo`; disabled/retired không selectable cho row mới.
- [ ] User có thể tạo `income`/`payment` với JEV off; amount integer VND; server authoritative; không mất input khi lỗi.
- [ ] Confirmation/review rõ; Save không phụ thuộc JEV response; không auto-submit.
- [ ] Owner/session/CSRF/idempotency/authz đúng; admin không mutate ledger/balance/audit.
- [ ] Ledger/audit append-only; correction qua domain command; report/budget deterministic; budget warning-only.
- [ ] Date/period và report dùng `Asia/Ho_Chi_Minh`; HCMC boundary smoke pass.
- [ ] `en`/`vi`, visible/focus/error/live copy, keyboard/screen-reader, contrast/reflow và chart table equivalent pass.
- [ ] Error/empty/loading không giả zero, không expose raw error/PII; no localStorage financial authority.

**Nếu một mục trên fail: core NO-GO; không được bật JEV để bù.** Evidence baseline: `docs/PRD.md` §3–4, L15–63; `docs/DOMAIN-MODEL.md` §4–6, L54–92; `AGENTS.md` L91–141.

### Gate B — JEV category suggestion

- [ ] Explicit trigger, state machine, confirmation/override and stale response rules implemented/evidenced.
- [ ] Suggestion chỉ trả active candidate đúng `income|payment`; malformed/low-confidence/injection/PII → manual.
- [ ] Suggestion không gửi amount/date/balance/raw ledger/session/claims/secret/PII thừa; logs không raw.
- [ ] Manual Save remains usable on flag-off, timeout, 4xx/5xx/429/schema/privacy; no money transaction open while waiting.
- [ ] `confirmedCategorySuggestion` semantics được API/domain owner chốt; boolean không tự chứng minh user confirmation.
- [ ] Provenance tối thiểu (source/contract/candidate/as-of/status/user decision) và feedback/dismiss behavior không nói dối.
- [ ] `en`/`vi` state + aria/focus/race smoke pass.
- [ ] Server-side flag/kill/audit và manual post-kill smoke có evidence; không invent endpoint trong handoff.

**Thiếu Gate B chỉ block JEV enablement, không block core.** Evidence: `docs/AI-JEV.md` §7, L80–89; `docs/DELIVERY-PLAN.md` §4, §8, L26–33, L47–55.

### Gate C — Insight/tip/anomaly nếu được phê duyệt sau MVP

- [ ] Deterministic snapshot + period/timezone + source refs tồn tại trước narrative.
- [ ] Fact và interpretation tách nhãn; mọi claim trace được; conflict deterministic thắng narrative.
- [ ] Fresh/stale/superseded state; refresh tạo version mới; saved artifact không silently overwrite.
- [ ] User có dismiss/save/feedback/report; action append-only, idempotent, owner-scoped; không mutation money.
- [ ] Unsafe/shaming/fraud/loan/BNPL/investment/unsupported forecast bị suppress/manual.
- [ ] Accessibility/localization/provenance parity từng state; no raw PII/prompt in persistence/admin.

**Thiếu Gate C block feature tương ứng, không block report deterministic/core.**

### Gate D — Hard reject / prohibited uses

Không triển khai hoặc không phê duyệt:

- JEV tự commit category/transaction, tự submit, tự sửa/xóa ledger, savings, budget hoặc audit.
- JEV tính amount/date/balance/wallet/savings/budget/report authoritative hoặc authorize/reject payment.
- JEV chạy trong money transaction, browser gọi trực tiếp provider, hoặc client flag bypass server policy.
- Auto-correction anomaly, fraud accusation, forecast dùng làm authorization, tip ép hành động tài chính.
- Gửi raw ledger, balance, session, Google claims, secret, token, PII không cần thiết; lưu raw prompt/response.
- Parse chat prose/partial JSON, map category “gần đúng”, dùng disabled/retired category cho row mới.
- Admin/support xem raw user financial/JEV data mặc định hoặc accept/override thay user.
- Dùng `en`/`vi` để đổi enum/formula/audit/authorization; dùng browser timezone thay HCMC business period.
- Hiển thị numeric confidence như xác suất chắc chắn, “guaranteed/correct/approved/safe to pay”, hoặc hứa model/provider privacy khi chưa có policy canonical.

## 11. Technical prerequisites và unresolved decisions

### 11.1. Prerequisite kỹ thuật (không phải provider/cost analysis)

1. **State normalization:** một state machine chung cho category/advisory artifact, response cũ bị discard theo interaction/snapshot version.
2. **Server candidate authority:** endpoint lấy active category theo `appliesTo`, revalidate status/owner trước create; không tin category label/ID từ JEV một mình.
3. **Deterministic snapshot port:** report/budget/category read model có `snapshotId`, period HCMC, `asOf`; narrative chỉ nhận snapshot đã khóa.
4. **Non-financial provenance sidecar:** nơi lưu artifact/action metadata masked, append-only, owner-scoped; không mutate ledger và không chứa raw prompt/response.
5. **User-action contract:** schema/semantics cho accept/override/dismiss/save/feedback, idempotency, retry, stale/supersede; explicit relation với `confirmedCategorySuggestion`.
6. **Safety validator:** PII/secret/injection detection + output schema/candidate/status validation; fail closed/manual.
7. **Locale/a11y inventory:** translation keys, aria/live/focus states, chart/table equivalent, screen-reader/keyboard test plan cho `en|vi`.
8. **Admin/audit boundary:** feature/content flag audit (actor/reason/version/approval/time), masked user issue path, security escalation; không invent quyền admin mới.
9. **Kill/fallback proof:** server-side off path, manual picker smoke sau disable; JEV error không block normal money path.
10. **Observability minimization:** aggregate status/fallback/stale/override/unsafe counters; không raw description/prompt/response/financial detail trong logs.

### 11.2. Unresolved decisions cần owner chốt

| ID | Câu hỏi | Nếu chưa chốt |
|---|---|---|
| U-01 | `confirmedCategorySuggestion` là acknowledgement của suggestion cụ thể hay chỉ boolean UI? Có cần suggestion/artifact ID không? | Không bật JEV category; boolean không đủ bằng chứng confirmation. |
| U-02 | Provenance sidecar/event table/API canonical là gì; retention/export/delete ra sao? | Category suggestion chỉ ephemeral; insight/tip persistence defer. |
| U-03 | Stale TTL và invalidation event nào: transaction create/correction, category lifecycle, budget change, month rollover, locale/policy change? | Không render artifact stale như fresh; refresh thủ công. |
| U-04 | Feedback có text không, có consent riêng không, ai xem, có dùng cho learning không? | Chỉ enum feedback masked; không claim retrain/học tự động. |
| U-05 | `other_or_uncertain` có active candidate không; category ordering và snapshot version do ai sở hữu? | Ambiguous/out-of-set luôn manual. |
| U-06 | Insight/tip nào thuộc MVP sau canonical scope cut; anomaly/forecast có product owner và safety rubric chưa? | Giữ report deterministic, defer complex AI/prediction. |
| U-07 | HCMC semantics cho `occurredAt` display/input và snapshot month ở mọi client? | Server period thắng browser; boundary cases phải manual/retry nếu mơ hồ. |
| U-08 | Narrative có được export/share/PDF không; provenance và stale badge đi cùng không? | Không export narrative hoặc chỉ export deterministic report. |
| U-09 | Admin nào được xem aggregate JEV metrics/feedback và mức mask nào? | Support chỉ issue đã mask; security xử lý incident có scope/audit. |
| U-10 | Khi locale đổi trong request pending, discard hay map lại artifact ID? | Discard result cũ; user chọn manual hoặc retry. |
| U-11 | Có undo cho dismiss/save không; action event retention và idempotency window bao lâu? | Dismiss/save copy phải nói rõ outcome, không hiển thị thành công giả. |
| U-12 | Safety copy/error taxonomy canonical ở đâu? | Dùng static localized manual fallback; không expose raw reason/provider detail. |

## 12. Ranked risk/fit recommendations

| Hạng | Insertion/use case | Product fit | Automation value | Safety risk | Recommendation |
|---:|---|---:|---:|---:|---|
| 1 | Manual-first deterministic category picker, JEV optional preview trước submit | Rất cao | Thấp–vừa | Thấp nếu manual độc lập | **Ship core now.** Đây là baseline không phụ thuộc JEV. |
| 2 | Category suggestion một category từ active candidate, explicit accept/override | Cao | Vừa–cao | Vừa; có thể giới hạn bằng abstain/fallback | **Defer JEV enablement, ship sau Gate B.** |
| 3 | Deterministic budget warning + static actionable copy | Cao | Thấp | Thấp | **Ship core.** Không gọi JEV để tính warning/limit. |
| 4 | Tip tham khảo có source/stale/dismiss/save/feedback | Vừa–cao | Vừa | Vừa–cao (shaming/unsafe advice/stale) | **Defer theo Gate C; deterministic tip trước.** |
| 5 | Monthly insight narrative trên deterministic snapshot | Vừa | Vừa | Cao hơn do hallucination/staleness/privacy | **Defer; chỉ mở với provenance/persistence contract.** |
| 6 | Read-only anomaly flag | Vừa | Vừa | Cao (false positive/fraud implication) | **Defer/requires separate safety review; không auto-correct.** |
| 7 | CSV batch category suggestion | Có thể cao nhưng UX phức tạp | Cao | Cao do scale/partial commit/override | **Defer; manual review per row và import atomicity phải chốt.** |
| 8 | Forecast tháng tới | Chưa chứng minh | Vừa | Cao (false certainty/action) | **Reject MVP; chỉ xem lại khi có methodology/uncertainty/product decision.** |
| 9 | Admin/user ranking, autonomous action, payment/budget automation | Không phù hợp boundary | Cao trên danh nghĩa | Rất cao | **Reject.** Xung đột least privilege và JEV advisory boundary. |

## 13. Final disposition cho integrator

- **Ship:** core deterministic dashboard/report/budget warning, accessible bilingual manual transaction flow, manual picker, JEV-off path.
- **Defer:** JEV category suggestion cho đến khi explicit confirmation/override, stale/race, privacy/injection, provenance, fallback, a11y/i18n và kill evidence đạt; insight/tip chỉ sau provenance/persistence/feedback contract.
- **Defer/reject:** anomaly/forecast/CSV batch theo ranked table; không tự mở rộng MVP từ SRS.
- **Reject:** bất kỳ autonomous money action, authoritative arithmetic/report, admin override, raw sensitive input/output, prompt-injection instruction following, auto-correction hoặc confidence-as-certainty.
- **Core invariant:** JEV off/unavailable phải cho cùng money behavior như baseline; JEV failure chỉ làm mất enhancement, không làm mất quyền nhập, xem và sửa dữ liệu của chính user.

## 14. Evidence index

- `SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.1–1.6, L25–185; §1.7–1.8, L187–295; §1.9, L297–321 — problem/user journey, manual data, AI optional, insights/tips/anomaly/forecast, accessibility, admin và delivery.
- `docs/README.md` §1, §4–6, L3–7, L58–85 — product identity, source priority, terminology và working-doc boundary.
- `docs/PRD.md` §1–5, L3–73 — canonical product boundary, deterministic authority, JEV MVP/deferred scope và acceptance.
- `docs/DOMAIN-MODEL.md` §1–6, L3–92 — VND, `income|payment`, HCMC, immutable ledger, budget warning, correction và JEV non-authority.
- `docs/ARCHITECTURE.md` §1–8, L5–69 — layer boundary, browser/API/domain/persistence/admin, JEV boundary và out-of-scope.
- `docs/AI-JEV.md` §2–8, L15–93 — allowed category suggestion, redaction, typed output, fallback, evaluation và deferred work.
- `docs/AUTHENTICATION.md` §2–8, L9–69 — identity, session, owner scope, CSRF, admin/JEV role boundary, log redaction.
- `docs/ADMIN-OPERATIONS.md` §1–10, L3–68 — least privilege, issue masking, audit, flag changes, incident/JEV disable và prohibited admin actions.
- `docs/contracts/openapi.yaml` `/ai/category-suggestion`, `/ledger/transactions`, `/reports/monthly`, L102–152, L246–262, L338–348; schemas L397–449, L533–544, L662–704 — HTTP state/fields/error/localization/category/status boundary.
- `docs/contracts/API-REVIEW.md` §Admin, §Ledger correction, §Domain scope, §Response, L5–48 — CSRF/owner/admin/audit/correction/HCMC/error semantics.
- `docs/DELIVERY-PLAN.md` §1–12, L6–79 — core/JEV gate, JEV-off smoke, owner boundary, rollback và blocker classification.
- `AGENTS.md` L87–141 — UI accessibility/i18n, deterministic money/domain/JEV safety, logging/privacy và error/fallback constraints.
- `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §4–6, §8–10, L170–245, L281–352 — existing UX state/accessibility/fallback evidence cross-check; được dùng như working evidence, không thay canonical quyết định.

## 15. Verification note

Đã đọc SRS đầy đủ, `AGENTS.md` và các canonical/contract docs liên quan nêu ở Evidence index; chỉ tạo handoff này dưới `docs/working/jev-product-analysis/`. Không chạy formatter, linter, build, full test hoặc thay đổi ADR/architecture/domain/auth/OpenAPI/runtime.
