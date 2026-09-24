# TEAM-BOARD — Điều phối phân tích Generative LLM bổ trợ cho JEV (Campus Coin)

> **Mục tiêu (Objective):** Thiết lập khung điều phối kỹ thuật và theo dõi tiến độ cho đợt phân tích bổ trợ về Generative LLM (Large Language Model sinh văn bản) song hành cùng TypeSafe System One. Làm rõ ranh giới kiến trúc: TypeSafe System One giữ vai trò mô hình quyết định định kiểu (typed decision primitives: Choice, Noul, Score), code engine nắm toàn quyền điều khiển luồng nghiệp vụ, tính toán tài chính và kích hoạt side effects; Generative LLM (đặc biệt là mô hình dự kiến GPT 5.6 luna) chỉ đóng vai trò bổ trợ thứ cấp (advisory/synthesis/read-time presentation/drafting) tại các điểm chạm cần diễn đạt ngôn ngữ tự nhiên, không bao giờ được cấp quyền tự động thực thi hay tính toán tài chính cốt lõi.
>
> **Điều phối viên / Integrator:** `JevProductUsecaseOrchestrator` (báo cáo trực tiếp cho Team Leader `Main`).
>
> **Phạm vi nghiêm ngặt & Điều cấm (Scope Prohibition):**
> 1. **Cấm sửa workspace cũ:** Tuyệt đối không thay đổi bất kỳ file nào trong các thư mục phân tích trước đây: `docs/working/jev-system-one-analysis/`, `docs/working/jev-product-analysis/`, `docs/working/replan/`.
> 2. **Cấm sửa tài liệu canonical:** Không chỉnh sửa SRS, ADR, Architecture documents, Domain models, Auth/Security specifications, hoặc OpenAPI contracts.
> 3. **Cấm can thiệp runtime code:** Không chỉnh sửa bất kỳ file mã nguồn runtime nào (frontend, backend, database migrations, configuration).
> 4. **Giới hạn workspace:** Mọi file bàn giao và tài liệu làm việc CHỈ được tạo và lưu trữ trong thư mục `docs/working/jev-llm-complement-analysis/`.
> 5. **Cấm phân tích giá cả:** Không phân tích, so sánh hoặc tranh luận về chi phí hay biểu giá nhà cung cấp (provider pricing analysis is strictly out of scope).

---

## Tiền điều kiện kỹ thuật chưa kiểm chứng: GPT 5.6 luna (Unverified Prerequisite)

- **Định danh mô hình:** `GPT 5.6 luna` được đặt làm giả định mô hình sinh ngôn ngữ bổ trợ.
- **Tình trạng kiểm chứng:** **[Unresolved]** — Đây là một **tiền điều kiện kỹ thuật chưa được kiểm chứng (unverified prerequisite)**. Chưa có dữ liệu thực tế về benchmark độ trễ (latency percentiles p50/p95/p99), quota/rate limits, throughput, độ ổn định kết nối hoặc SLA dịch vụ trong môi trường vận hành Campus Coin.
- **Nguyên tắc phòng vệ (Defensive Architecture):**
  1. Tuyệt đối không đặt GPT 5.6 luna vào critical path của các luồng nghiệp vụ nhạy cảm (xác thực, ghi nhận giao dịch, biến động số dư ví, quản lý ngân sách).
  2. Mọi tính năng có kết nối với GPT 5.6 luna bắt buộc phải có cơ chế **fallback toàn diện** (fail-closed hoặc fallback về template định sẵn / System One typed decisions).
  3. Mọi dữ liệu sinh ra từ GPT 5.6 luna phải được coi là untrusted và phải qua bộ lọc kiểm duyệt an toàn trước khi hiển thị cho người dùng.

---

## Hệ thống nhãn chia sẻ (Shared Labels)

Mọi nhận định, kết luận và đề xuất trong toàn bộ các tài liệu bàn giao bắt buộc phải gắn đúng nhãn chuẩn hóa sau:

- `[Verified]`: Dữ kiện, ràng buộc hoặc năng lực kỹ thuật đã được chứng minh qua tài liệu chính thức (SRS, Canonical Architecture, tài liệu kỹ thuật TypeSafe System One đã được rà soát). Không dùng cho các giả định runtime chưa đo lường.
- `[Proposal]`: Đề xuất kiến trúc, giải pháp tích hợp hoặc ca sử dụng mới cần có sự phê duyệt chính thức từ Team Leader và hội đồng kiến trúc; chưa phải là quyết định chính thức.
- `[Unresolved]`: Điểm nghẽn kỹ thuật, thiếu dữ liệu kiểm chứng, phụ thuộc chưa rõ ràng hoặc bất đồng kiến trúc chưa giải quyết. Bắt buộc xử lý theo nguyên tắc **fail-closed**; nghiêm cấm tự ý suy diễn hoặc đặt giả định lạc quan.

---

## Bảng Kanban chính (Board Kanban)

| ID | Thẻ công việc (Lane / Artifact) | Chủ sở hữu (Owner) | Trạng thái (State) | Phạm vi & Bằng chứng (Scope & Evidence) | Tiêu chí chấp nhận (Acceptance Criteria) | Cổng sáp nhập (Merge Gate) | Bàn giao (Handoff Artifact) |
|---|---|---|---|---|---|---|---|
| `JEV-LLM-001` | **Boundary & Use Cases** | `BoundaryUsecases` | `review` | Đã có handoff đầy đủ, đã đọc và cross-check với baseline System One. | Ranh giới System One typed-only / Generative LLM bounded-advisory rõ; use cases có disposition Ship/Defer/Reject; không authority tài chính. | Handoff tồn tại, citations/labels đã kiểm tra; không sửa canonical/runtime/provider pricing. | [`CC-JEV-LLM-BOUNDARY-USECASES.md`](./CC-JEV-LLM-BOUNDARY-USECASES.md) |
| `JEV-LLM-002` | **Routing & Performance** | `RoutingPerformance` | `review` | Đã có handoff đầy đủ về sync/async/read-time/batch, fallback, stale, retry và idempotency. | Placement và graceful degradation không block first useful facts/money path; không invent percentile/model/cost claims. | Handoff tồn tại, đã đọc; routing gate và no-critical-path rule kiểm tra đạt; không sửa canonical/runtime. | [`CC-JEV-LLM-ROUTING-PERFORMANCE.md`](./CC-JEV-LLM-ROUTING-PERFORMANCE.md) |
| `JEV-LLM-003` | **Safety, Privacy & Contracts** | `SafetyPrivacyContracts` | `review` | Đã có handoff đầy đủ về server-only boundary, PII minimization, injection, schema, provenance, stale, UX và a11y. | Strict envelope, user control, suppression/fallback, owner scope, retention unknowns và no money authority được ghi rõ. | Handoff tồn tại, đã đọc; safety/privacy gates kiểm tra đạt; không sửa canonical/runtime. | [`CC-JEV-LLM-SAFETY-CONTRACTS.md`](./CC-JEV-LLM-SAFETY-CONTRACTS.md) |
| `JEV-LLM-004` | **Adversarial Product Review** | `AdversarialProductReview` | `review` | Đã có handoff đầy đủ về severity-ranked findings, no-go invariants, L0–L8 gates và ship/defer/reject. | Critical authority, stale, PII, injection, critical-path, hidden repair và autonomous-action risks có mitigation/fail-closed disposition. | Handoff tồn tại, đã đọc; adversarial gate kiểm tra đạt; không sửa canonical/runtime. | [`CC-JEV-LLM-ADVERSARIAL-REVIEW.md`](./CC-JEV-LLM-ADVERSARIAL-REVIEW.md) |
| `JEV-LLM-005` | **Integrated Complementary Findings** | `JevProductUsecaseOrchestrator` | `review` | Đã tạo `FINAL-FINDINGS.md` và đọc toàn bộ bốn handoff; báo cáo phân biệt JEV typed-only với Generative LLM riêng. | Báo cáo có capability boundary, use-case matrix/cards, routing, safety/provenance/UX, adversarial gates, metrics, sequence, rejected/deferred decisions và evidence index. | Handoff tồn tại; line-count/path kiểm tra được; chỉ workspace complement thay đổi; Team Leader `Main` review trước khi merged. | [`FINAL-FINDINGS.md`](./FINAL-FINDINGS.md) |

---

## Chi tiết các thẻ công việc (Lane Cards Detail)

### Card 1: Boundary & Use Cases (`JEV-LLM-001`)
- **Chủ sở hữu:** `BoundaryUsecases`
- **Trạng thái:** `running`
- **File bàn giao:** `docs/working/jev-llm-complement-analysis/CC-JEV-LLM-BOUNDARY-USECASES.md`
- **Mục tiêu:** Xác định chính xác phạm vi nào thuộc về System One (typed decision primitives), phạm vi nào thực sự cần Generative LLM sinh văn bản, và phạm vi nào bắt buộc phải là deterministic code/template.
- **Tiêu chí chấp nhận:**
  1. Bảng ma trận so sánh 3 tầng: `Deterministic Engine` vs `TypeSafe System One` vs `Generative LLM (GPT 5.6 luna)`.
  2. Đánh giá chi tiết các use case: Báo cáo tháng (Monthly Digest), Tư vấn ngân sách cá nhân (Budget Coaching), Giải thích biến động chi tiêu (Spending Anomaly Narrative), Gợi ý hành động kế tiếp (NBA prose).
  3. Mỗi use case có phân loại rõ ràng: `Ship` (triển khai), `Defer` (hoãn), hoặc `Reject` (từ chối).
  4. Trích dẫn đầy đủ các mục tiêu trong SRS Campus Coin và kết quả đã đạt được tại System One baseline.

### Card 2: Routing & Performance (`JEV-LLM-002`)
- **Chủ sở hữu:** `RoutingPerformance`
- **Trạng thái:** `running`
- **File bàn giao:** `docs/working/jev-llm-complement-analysis/CC-JEV-LLM-ROUTING-PERFORMANCE.md`
- **Mục tiêu:** Xây dựng cơ chế định tuyến hybrid thông minh và phân bổ tài nguyên hiệu năng an toàn, ngăn chặn việc gọi LLM làm chậm trải nghiệm sinh viên.
- **Tiêu chí chấp nhận:**
  1. Kiến trúc phân tầng routing: Ưu tiên deterministic checks -> System One typed classification -> Generative LLM chỉ khi cần diễn đạt tự nhiên.
  2. Phân loại luồng xử lý: Đồng bộ (Sync - chỉ sau khi đo baseline và được phê duyệt, không hứa percentile cố định), Bất đồng bộ (Async worker qua hàng đợi), và Nạp tại thời điểm đọc (Read-time fetch với stale-while-revalidate nếu contract cho phép).
  3. Ma trận Graceful Degradation: Kịch bản xử lý khi GPT 5.6 luna gặp sự cố, timeout, hoặc vượt quota mà không làm gián đoạn ứng dụng ví.

### Card 3: Safety, Privacy & Contracts (`JEV-LLM-003`)
- **Chủ sở hữu:** `SafetyPrivacyContracts`
- **Trạng thái:** `running`
- **File bàn giao:** `docs/working/jev-llm-complement-analysis/CC-JEV-LLM-SAFETY-CONTRACTS.md`
- **Mục tiêu:** Thiết lập rào chắn an ninh dữ liệu tài chính, bảo vệ quyền riêng tư của sinh viên và định nghĩa các hợp đồng giao tiếp chuẩn xác.
- **Tiêu chí chấp nhận:**
  1. Danh mục và quy tắc bóc tách/mã hóa PII (Personally Identifiable Information) trước khi gửi prompt tới external LLM.
  2. Thiết kế schema JSON I/O có cấu trúc chặt chẽ (schema enforcement) cho đầu vào và đầu ra của LLM.
  3. Cơ chế phòng chống tấn công Prompt Injection thông qua dữ liệu giao dịch hoặc tệp CSV do người dùng tải lên.
  4. Quy chuẩn hiển thị giao diện: Thủy ấn nguồn gốc (AI provenance), thông báo từ chối trách nhiệm (disclaimers), nút phản hồi (thumbs up/down) và cấm JEV tự động thực hiện giao dịch chuyển tiền.

### Card 4: Adversarial Product Review (`JEV-LLM-004`)
- **Chủ sở hữu:** `AdversarialProductReview`
- **Trạng thái:** `running`
- **File bàn giao:** `docs/working/jev-llm-complement-analysis/CC-JEV-LLM-ADVERSARIAL-REVIEW.md`
- **Mục tiêu:** Đóng vai trò kiểm thử phản biện (Red Team) nhằm vạch trần các điểm yếu, rủi ro tiềm ẩn và sự lạm dụng mô hình sinh ngôn ngữ trong ứng dụng tài chính sinh viên.
- **Tiêu chí chấp nhận:**
  1. Rà soát độc lập toàn bộ các đề xuất của Lane 001, 002, 003.
  2. Bảng xếp hạng các phát hiện rủi ro theo mức độ nghiêm trọng (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  3. Đánh giá rủi ro "Ảo giác tài chính" (Financial Hallucination) và trách nhiệm pháp lý đối với sinh viên khi nhận lời khuyên tài chính sai lệch.
  4. So sánh thực chất giá trị sản phẩm giữa: Giải pháp Gen LLM phức tạp vs Giải pháp Template định sẵn kết hợp System One typed signals.

### Thẻ điều phối tích hợp: Integrator Card (`JEV-LLM-005`)
- **Chủ sở hữu:** `JevProductUsecaseOrchestrator`
- **Trạng thái:** `ready` (chờ hoàn tất 4 handoff)
- **File bàn giao:** `docs/working/jev-llm-complement-analysis/FINAL-FINDINGS.md`
- **Mục tiêu:** Đọc, thẩm định và tổng hợp toàn bộ các kết quả phân tích thành một báo cáo quyết định toàn diện gửi Team Leader `Main`.
- **Tiêu chí chấp nhận:**
  1. Xác nhận đầy đủ 4 file handoff đã tồn tại và vượt qua Merge Gate của từng lane.
  2. Tổng hợp thành cấu trúc báo cáo chuẩn mực với đầy đủ luận chứng kỹ thuật.
  3. Đảm bảo tính nhất quán tuyệt đối giữa kết quả phản biện của Lane 004 và các đề xuất kiến trúc của Lane 001, 002, 003.
  4. Lập kế hoạch lộ trình kỹ thuật khả thi cho các bước tiếp theo (Next Steps for Developer D & Team Leader).

---

## Quy tắc bằng chứng và kiểm chứng (Evidence & Verification Rules)

1. **Chu trình chuyển trạng thái Kanban:**
   - `backlog` -> `ready`: Khi mục tiêu, chủ sở hữu, phạm vi và tiêu chí chấp nhận được định nghĩa rõ ràng.
   - `ready` -> `running`: Khi subagent tương ứng bắt đầu tiến trình nghiên cứu và soạn thảo file handoff.
   - `running` -> `review`: CHỈ chuyển sang `review` khi:
     * File artifact handoff đã tồn tại thực tế trên đĩa tại đúng đường dẫn được chỉ định.
     * Chủ sở hữu chỉ chỉnh sửa duy nhất file được phân công.
     * Mọi nội dung đều có trích dẫn nguồn kiểm chứng được (`[Verified]`, `[Proposal]`, `[Unresolved]`).
     * Integrator đã đọc trực tiếp và xác nhận nội dung file handoff.
   - `review` -> `merged`: Không diễn ra tự động trong quá trình chạy task. Quyền sáp nhập/chốt kết quả thuộc về Team Leader `Main`.

2. **Chính sách kiểm chứng không dùng test runner (Docs-Only Verification Policy):**
   - Đợt phân tích này là tác vụ **phân tích tài liệu và kiến trúc kỹ thuật (document & architectural analysis)**.
   - **Tuyệt đối không chạy:** npm test, vitest, pytest, eslint, prettier, hoặc build pipeline toàn dự án. Việc chạy các công cụ này sẽ gây nghẽn tiến trình và báo lỗi giả (phantom errors) do các nhánh khác đang hoạt động song song.
   - **Bằng chứng kiểm chứng hợp lệ:**
     * Xác thực sự tồn tại của file artifact (`glob` / `read`).
     * Kiểm tra số dòng, cấu trúc đề mục và chất lượng trích dẫn nội dung (`read`).
     * Kiểm tra phạm vi thay đổi (scoped git diff / file change tracking): đảm bảo chỉ có file handoff được phân công bị tác động.

3. **Nguyên tắc phân tích giá cả nhà cung cấp:**
   - Nghiêm cấm mọi hình thức ước tính, so sánh chi phí token, biểu giá API hay tính toán ngân sách nhà cung cấp trong toàn bộ các artifacts. Provider pricing là nội dung đã được loại trừ khỏi phạm vi phân tích.

---

## Ma trận phụ thuộc và rủi ro (Dependency & Risk Matrix)

| Rủi ro / Phụ thuộc | Mức độ ảnh hưởng | Biện pháp giảm thiểu & Kiểm soát |
|---|---|---|
| **Ảo giác tài chính (Financial Hallucination)** | `CRITICAL` | Cấm Generative LLM tự tính toán số dư, hạn mức hoặc thống kê số tiền. 100% số liệu phải được tính bởi code và đưa vào prompt dưới dạng read-only context. |
| **Tiền điều kiện GPT 5.6 luna chưa kiểm chứng** | `HIGH` | Thiết kế kiến trúc hybrid với circuit breaker và fallback ngay lập tức về template deterministic hoặc System One typed decisions. |
| **Lộ lọt thông tin cá nhân (PII Leakage)** | `HIGH` | Áp dụng lớp tiền xử lý PII Redaction/Masking bắt buộc tại backend trước khi payload rời khỏi ranh giới hệ thống Campus Coin. |
| **Tấn công Prompt Injection qua mô tả giao dịch** | `HIGH` | Coi mọi chuỗi mô tả từ sinh viên hoặc file CSV là dữ liệu không an toàn (untrusted input); bọc trong thẻ phân tách dữ liệu an toàn và cấm thực thi lệnh hệ thống từ nội dung này. |
| **Độ trễ cao làm suy giảm trải nghiệm ví** | `MEDIUM` | Tách biệt hoàn toàn luồng giao dịch trực tiếp khỏi luồng gọi LLM; chỉ chạy LLM trong background worker hoặc nạp bất đồng bộ tại màn hình phân tích/báo cáo. |
| **Xung đột ghi đè file giữa các subagents** | `CRITICAL` | Phân bổ file handoff hoàn toàn độc lập và rời rạc; mỗi agent chỉ có quyền ghi duy nhất vào file handoff của mình. |

---

## Bảng theo dõi tiến độ bàn giao (Handoff Tracking Table)

| STT | File Artifact | Chủ sở hữu | Trạng thái hiện tại | Ngày cập nhật | Ghi chú tích hợp |
|---|---|---|---|---|---|
| 1 | `CC-JEV-LLM-BOUNDARY-USECASES.md` | `BoundaryUsecases` | `running` | 2026-09-24 | Đang tiến hành phân tích ranh giới và use cases bổ trợ |
| 2 | `CC-JEV-LLM-ROUTING-PERFORMANCE.md` | `RoutingPerformance` | `running` | 2026-09-24 | Đang xây dựng sơ đồ hybrid routing và fallback latency budget |
| 3 | `CC-JEV-LLM-SAFETY-CONTRACTS.md` | `SafetyPrivacyContracts` | `running` | 2026-09-24 | Đang thiết kế PII redaction and JSON I/O schema contracts |
| 4 | `CC-JEV-LLM-ADVERSARIAL-REVIEW.md` | `AdversarialProductReview` | `running` | 2026-09-24 | Đang thực hiện rà soát phản biện độc lập đối với Gen LLM |
| 5 | `FINAL-FINDINGS.md` | `JevProductUsecaseOrchestrator` | `ready` | 2026-09-24 | Chờ cả 4 handoff hoàn tất để tiến hành tổng hợp báo cáo |
