# TEAM-BOARD — Điều phối phân tích sản phẩm/use case JEV cho Campus Coin

> **Mục tiêu:** Phân tích lại JEV theo user journey thực tế của sinh viên Campus Coin; tìm insertion point có product fit và automation value, không tái thẩm định provider/OpenRouter/cost. Provider và pricing được coi là prerequisite đã được người dùng xác minh.
>
> **Điều phối viên/integrator:** `JevProductUsecaseOrchestrator` (child của Team Leader `Main`).
>
> **Phạm vi file:** Mỗi lane chỉ ghi handoff riêng dưới `docs/working/jev-product-analysis/`. Integrator duy nhất ghi `TEAM-BOARD.md` và `FINAL-FINDINGS.md`. Không sửa SRS, ADR, architecture, domain, auth, OpenAPI hoặc source runtime.

## Board Kanban

| ID | Lane / artifact | Owner | State | Scope / evidence | Acceptance | Merge gate | Handoff |
|---|---|---|---|---|---|---|---|
| `JEV-PROD-001` | SRS và user journey map | `JourneyMapper` | `review` | Onboarding/auth → wallet → add transaction → category → correction/history → budget → dashboard/widget → report → CSV → insight/tips → warning → admin; đánh dấu insertion point JEV, authority và phase. | Map đủ flow theo SRS, đối chiếu canonical MVP/deferred; mỗi insertion point có trigger, placement, control, fallback, dependency và citation. | Đã đọc handoff; citation kiểm tra được; không provider/cost; không sửa ngoài handoff. | [`CC-JEV-PRODUCT-JOURNEY.md`](./CC-JEV-PRODUCT-JOURNEY.md) |
| `JEV-PROD-002` | Transaction automation | `TransactionAutomation` | `review` | Auto-category, correction learning, CSV batch, duplicate/anomaly; synchronous/async/batch; provenance, stale data, abstention, untrusted description. | Mỗi use case có card: trigger/input/processing/output/control/persistence/fallback/metric/cấm đoán; rank value/automation/fit/risk/dependency; ship/defer/reject. | Đã đọc handoff; cross-check SRS + domain/API/JEV boundary; không mutation/authority; citation path+section/line. | [`CC-JEV-TRANSACTION-AUTOMATION.md`](./CC-JEV-TRANSACTION-AUTOMATION.md) |
| `JEV-PROD-003` | Insight và coaching | `InsightCoach` | `review` | Monthly summary, spending change explanation, personalized tips, budget coaching, widgets/alerts, next-best action, forecasting; deterministic-vs-narrative separation. | Mỗi use case có card đầy đủ; insertion point ngoài auto-category; read-time/async/batch placement; persistence/provenance/control/fallback; rank và phase disposition. | Đã đọc handoff; không để JEV tính authoritative money/report/budget hoặc tự hành động; citation SRS/canonical; không provider/cost. | [`CC-JEV-INSIGHT-COACH.md`](./CC-JEV-INSIGHT-COACH.md) |
| `JEV-PROD-004` | Safety/UX/domain guardrails | `SafetyDomainUx` | `review` | Confirmation/override, provenance, stale data, dismiss/save/feedback, a11y, en/vi, HCMC, privacy, prompt injection, admin/domain boundaries, failure matrix. | Policy/state matrix phân biệt core blocker/JEV blocker; user-control contract và prohibited uses; technical prerequisites/unresolved decisions; citation đầy đủ. | Đã đọc handoff; ranh giới domain không bị nới; WCAG/localization/privacy và fallback rõ; không sửa canonical/runtime. | [`CC-JEV-SAFETY-UX-DOMAIN.md`](./CC-JEV-SAFETY-UX-DOMAIN.md) |
| `JEV-PROD-005` | Tích hợp báo cáo cuối | `JevProductUsecaseOrchestrator` | `review` | Đọc mọi handoff, đối chiếu nguồn canonical/SRS, xếp hạng use case và đề xuất sequence cho Developer D/Team Leader. | `FINAL-FINDINGS.md` có đủ 10 section bắt buộc; mỗi use case card đủ 9 trường; trả lời insertion point ngoài auto-category; phân biệt fact/proposal/unresolved và phase. | Đã đọc đủ 4 handoff; citation/phase/boundary review hoàn tất; diff chỉ trong workspace; chờ Team Leader review. | [`FINAL-FINDINGS.md`](./FINAL-FINDINGS.md) |

## Quy tắc trạng thái và trách nhiệm

- `backlog → ready → running → review → merged`; chỉ chuyển trạng thái khi handoff, changed-file scope và evidence quan sát được.
- Child owner chỉ ghi đúng handoff đã nhận; không sửa board/final report hoặc handoff của lane khác.
- Handoff là working evidence, không tự trở thành canonical decision. `[Verified fact]` chỉ dùng cho yêu cầu/constraint đã có trong SRS/canonical; `[Proposal]` là khuyến nghị cần phê duyệt; `[Unresolved]` là thiếu quyết định/evidence.
- Merge gate của integrator: đọc toàn bộ handoff; kiểm tra citation và disposition; không chạy formatter/linter/build/full tests vì đây là phân tích tài liệu.
- Provider/model/quota/cost/latency/privacy runtime không phải phạm vi phân tích; chỉ ghi “technical prerequisite đã user verify” hoặc dependency cần chốt, không suy diễn.

## Dependency và rủi ro

- Các lane 001–004 chạy song song, không có shared-write dependency; `JEV-PROD-005` chỉ tích hợp sau khi cả bốn handoff ở `review`.
- SRS mô tả phạm vi rộng hơn MVP canonical. Integrator phải giữ conflict như finding: không tự mở rộng MVP/API/domain.
- Rủi ro chính: JEV bị biến thành authority; narrative trùng lặp/sai do stale deterministic snapshot; insight gây hành động tài chính ngoài ý muốn; lộ PII/prompt injection; accessibility/localization không đồng đều; thiếu persistence/feedback khiến hệ thống không học được product signal.

## Handoff / merge evidence

| Artifact | Owner | State | Evidence | Gate |
|---|---|---|---|---|
| `CC-JEV-PRODUCT-JOURNEY.md` | JourneyMapper | `review` | Handoff tồn tại và đã đọc; journey map J0–J12, insertion matrix P0–P8, citations và phase disposition | Citation/scope check đạt; chờ Team Leader review |
| `CC-JEV-TRANSACTION-AUTOMATION.md` | TransactionAutomation | `review` | Handoff tồn tại và đã đọc; 5 cards, placement/ranking, deterministic boundary và blockers | Citation/scope check đạt; unresolved schema/worker items ghi rõ |
| `CC-JEV-INSIGHT-COACH.md` | InsightCoach | `review` | Handoff tồn tại và đã đọc; 8 cards, dashboard/report/budget insertion points, phase/ranking | Citation/scope check đạt; narrative contract unresolved ghi rõ |
| `CC-JEV-SAFETY-UX-DOMAIN.md` | SafetyDomainUx | `review` | Handoff tồn tại và đã đọc; safety/user-control/provenance/failure/accessibility gates | Citation/scope check đạt; no canonical/runtime changes |
| `FINAL-FINDINGS.md` | Integrator | `review` | Báo cáo integrated đã ghi đủ 10 section, use-case cards và implementation sequence | Team Leader đọc/review; không có canonical/runtime changes |

## Điểm kiểm soát

| Điểm kiểm soát | Kết quả |
|---|---|
| Child lanes | 4/4 handoff đã hoàn tất và được integrator đọc; mỗi child chỉ ghi đúng file được giao. |
| Integration | `FINAL-FINDINGS.md` đã tổng hợp journey, transaction automation, insight/coach và safety/UX/domain. |
| Scope | Chỉ các file dưới `docs/working/jev-product-analysis/` được tạo/sửa; không sửa ADR, architecture, domain, auth, OpenAPI, SRS hoặc runtime. |
| Validation | Không chạy formatter/linter/build/full tests theo scope document analysis; evidence là targeted reads và handoff artifacts. |

## Kết luận điều phối

Các lane 001–004 đã chuyển `review` sau khi artifact tồn tại và integrator đọc; lane 005 cũng ở `review` để Team Leader kiểm tra nội dung cuối. Chưa ghi `merged` vì working report không tự trở thành canonical decision. Không còn lane nào `running` hoặc `blocked`; các unresolved product/contract items được ghi trong báo cáo và là điều kiện trước phase sau.