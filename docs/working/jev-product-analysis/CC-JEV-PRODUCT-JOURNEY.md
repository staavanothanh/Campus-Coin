# Handoff Lane 1 — SRS/User Journey và insertion point sản phẩm của JEV

> **Lane:** `JEV-PROD-001` — SRS và user journey map
> **Trạng thái:** working evidence, không phải quyết định canonical
> **Phạm vi:** map hành trình sinh viên từ auth/onboarding đến report, insight, cảnh báo và report issue; xác định nơi JEV có thể làm giảm ma sát hoặc tăng khả năng hiểu dữ liệu.
> **Giới hạn:** chỉ ghi handoff này; không sửa SRS, ADR, canonical/runtime, OpenAPI hay file lane khác. Không phân tích provider/model/cost.

## 0. Cách đọc và kết luận ngắn

- **[Verified fact]** là yêu cầu hoặc ranh giới đã có trong SRS/canonical docs. Trích dẫn luôn ghi path, section và line range.
- **[Proposal]** là khuyến nghị product/UX trong handoff; chưa tự trở thành API, domain rule hay quyết định release.
- **[Unresolved]** là thiếu contract, persistence, runtime evidence hoặc product decision; không được diễn giải thành “đã hỗ trợ”.
- Campus Coin là sổ do sinh viên tự nhập, không phải ngân hàng. Số dư, budget, report, owner scope và lịch sử là deterministic/authoritative ở backend/domain; JEV chỉ là lớp advisory. [`docs/DOMAIN-MODEL.md` §1, L3-L14; `docs/PRD.md` §1, L3-L7]
- **Kết luận product:** ngoài auto-category, insertion point có fit tốt nhất là **lớp giải thích/nudge sau khi backend đã tính xong**: monthly insight, giải thích biến động trên dashboard/report và coaching budget. Các điểm này giúp sinh viên trả lời “điều gì đang thay đổi?” và “bước nhỏ nào nên cân nhắc?” mà không giao cho JEV quyền tính tiền.
- **Khuyến nghị phase:** ship core/manual-first trước; giữ JEV default-off nếu chưa có evidence UX/domain cần thiết. Monthly insight, tips, coaching và CSV đều là phase sau theo conflict SRS rộng–MVP canonical. Không để JEV tham gia auth, opening wallet, money commit, correction authority, budget calculation, report calculation, notification trigger hay admin mutation.

---

## 1. SRS rộng và canonical MVP: các conflict phải giữ nguyên

SRS là nguồn mô tả ý tưởng sản phẩm rộng; PRD/DOMAIN/ARCHITECTURE/OpenAPI/DELIVERY-PLAN là canonical MVP hiện tại. Lane này **không tự mở rộng MVP** để khớp SRS.

| Chủ đề | SRS rộng đã mô tả | Canonical MVP đã khóa | Hệ quả cho JEV/product | Disposition |
|---|---|---|---|---|
| Auth/onboarding | Đăng ký/đăng nhập sinh viên, admin login riêng, khôi phục/đặt lại mật khẩu qua email/token, hồ sơ năm học/trợ cấp/mục tiêu tiết kiệm. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6 “Xác thực và quản lý người dùng”, L77-L84] | Chỉ Google OAuth + opaque server-side session; không local password, linking, OTP/reset, Gmail inbox; owner lấy từ session. [`docs/PRD.md` §3.1, L17-L23; `docs/AUTHENTICATION.md` §1-4, L3-L31] | JEV không nên “onboard bằng AI”, hỏi thêm hồ sơ hay suy đoán tình trạng tài chính. Auth phải fail closed trước khi có dữ liệu. | **Ship core auth; reject JEV tại auth.** |
| Wallet baseline | SRS nói app ghi nhận thu nhập/chi phí thủ công hoặc CSV, nhưng không định nghĩa rõ baseline wallet. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71] | User nhập `opening_wallet_balance` một lần; baseline không phải income và không tạo lịch sử giả. [`docs/PRD.md` §3.2, L25-L31; `docs/DOMAIN-MODEL.md` §2, L21-L28; `docs/contracts/openapi.yaml` `/wallet/baseline`, L82-L101] | JEV không có product fit để tính/đoán opening balance hay giải thích phép tính tiền. Chỉ cần copy/help deterministic để giảm nhầm baseline với income. | **Ship deterministic UX; reject JEV money role.** |
| Transaction/correction | Có sửa/xóa transaction và mục lặp lại. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6 “Ghi nhận thu nhập và chi phí”, L107-L112] | Ledger immutable; correction là row append-only có reason/reference/audit; recurring chưa nằm MVP. [`docs/PRD.md` §3.2, L25-L31, §5, L65-L68; `docs/DOMAIN-MODEL.md` §4-5, L54-L85] | JEV không được đề xuất hoặc thực hiện sửa/xóa, reversal, recurring hay auto-transfer. Có thể chỉ là lớp giải thích read-time trong phase sau nếu structured input và provenance được duyệt. | **Ship correction UI deterministic; defer explanation; reject mutation.** |
| Category/AI | SRS cho auto-category, học từ chỉnh sửa, batch category khi CSV. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6 “Trợ lý phân loại…”, L113-L118] | MVP chỉ cho JEV gợi ý một category từ candidate set giới hạn trước submit; user phải confirm/override; manual picker luôn phải sống khi JEV off. [`docs/PRD.md` §3.5, L45-L51; `docs/AI-JEV.md` §3, L21-L31, §7, L80-L89] | Đây là insertion point JEV được phép, nhưng vẫn là advisory và không auto-submit. “Học từ chỉnh sửa” chưa có persistence/learning contract. | **Ship manual/core; JEV suggestion optional sau gate; defer learning.** |
| Dashboard/widgets | SRS có lời chào, số dư tháng, quick add, tips/highlights, top category và budget-vs-actual widget. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6 “Bảng điều khiển cá nhân hóa”, L101-L105] | Dashboard snapshot do backend tính deterministic; browser chỉ hiển thị response authoritative. [`docs/PRD.md` §3.3, L33-L37; `docs/ARCHITECTURE.md` §2, L21-L27; `docs/contracts/openapi.yaml` `/reports/dashboard`, L255-L261, schema L602-L610] | JEV có fit nếu chỉ giải thích snapshot hoặc nêu nudge có nguồn; không được tạo lại số liệu/widget. | **Ship deterministic widgets; defer JEV explanation/coaching.** |
| Monthly report/export | SRS có category report, income-vs-cost sáu tháng, daily/weekly summary, filters, PDF/image export. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6 “Báo cáo hằng tháng”, L120-L126] | MVP có monthly report deterministic theo HCMC; CSV/PDF nằm ngoài phạm vi. [`docs/contracts/openapi.yaml` `/reports/monthly`, L246-L254; `docs/ARCHITECTURE.md` §8, L67-L69; `docs/PRD.md` §5, L65-L68] | JEV có thể tóm tắt/giải thích report **sau** khi report đã tính xong trong phase sau; không được thay report engine hay tự tính sáu tháng. | **Ship deterministic report; defer narrative/export.** |
| CSV batch | SRS cho upload CSV lịch sử và batch category suggestion. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71; §1.6, L77-L84 và L113-L118] | CSV/PDF bị cắt khỏi MVP và DELIVERY-PLAN critical path. [`docs/PRD.md` §5, L65-L68; `docs/DELIVERY-PLAN.md` §9, L57-L60; `docs/ARCHITECTURE.md` §8, L67-L69] | Không hứa có import hay JEV batch. Nếu mở phase sau, phải có staging/preview/per-row confirmation; không gửi cả file thẳng vào JEV hoặc commit tự động. | **Defer toàn bộ CSV; defer batch JEV.** |
| Monthly summary/tips | SRS có AI narrative summary, anomaly-vs-own-trend và lời khuyên hành động; tip có rank, dismiss, pin. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L128-L139] | Monthly prose summary, prediction, complex AI và autonomous action nằm ngoài MVP. [`docs/AI-JEV.md` §8, L91-L93; `docs/PRD.md` §5, L65-L68; `docs/DELIVERY-PLAN.md` §9, L57-L60] | Đây là cơ hội UX lớn nhất ngoài auto-category nhưng chỉ được triển khai như async/read-time advisory dựa trên deterministic snapshot, có provenance và dismiss/save/feedback. | **Defer phase sau; không dùng trong MVP.** |
| Budget warning/notification | SRS muốn progress real-time và in-app warning khi sắp chạm/vượt budget. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L141-L145] | Budget chỉ là warning, không authorization; core trả warning sau commit; notification nằm ngoài critical path. [`docs/DOMAIN-MODEL.md` §1 và §4, L11-L14, L54-L67; `docs/contracts/API-REVIEW.md` §Response, L32-L37; `docs/DELIVERY-PLAN.md` §9, L57-L60] | JEV không xác định ngưỡng, không chặn payment. Phase sau chỉ có thể viết contextual nudge sau deterministic warning. | **Ship warning deterministic; defer JEV coaching/notification copy.** |
| Admin | SRS rộng cho CRUD default category, user account, thống kê toàn hệ thống. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6 “Bảng điều khiển quản trị viên”, L152-L159] | Admin là issue/report triage, status/priority/note và scope được cấp; không sửa ledger/balance/audit. [`docs/ARCHITECTURE.md` §2, L21-L27; `docs/ADMIN-OPERATIONS.md` §1-4, L3-L36; `docs/contracts/openapi.yaml` `/issues`, `/admin/issues`, L262-L338] | Không dùng JEV để tự triage, đổi priority, kết luận dispute, xem raw financial data hoặc cấp quyền. | **Ship deterministic issue flow; reject autonomous admin JEV.** |

**Conflict cần báo rõ:** SRS cũng nêu password hash, `expense`, sửa/xóa trực tiếp và bảng `Insight` minh họa; đó là ví dụ/scope rộng, không override các invariant canonical `income|payment`, immutable ledger, Google-only và JEV advisory. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.8, L236-L291; `docs/DOMAIN-MODEL.md` §2-4, L21-L67; `docs/AUTHENTICATION.md` §2-4, L9-L31]

---

## 2. Journey map end-to-end

Bảng dưới map hành động thật của sinh viên, pain point, nơi đặt JEV (hoặc lý do không đặt), placement, deterministic authority, control và fallback. “Không có JEV” là một quyết định product có chủ đích, không phải thiếu phân tích.

| Bước | User goal + pain point | Insertion point / execution placement | Deterministic authority | User control, provenance, fallback | Phase |
|---|---|---|---|---|---|
| **J0. Vào app, auth, onboarding** | Sinh viên lần đầu cần vào nhanh và biết app là sổ tự nhập; lỗi OAuth/session không được làm họ tưởng dữ liệu đã mất. Pain: OAuth redirect/re-auth/disabled account khó hiểu. | **Không gọi JEV.** Read-time copy, checklist và trạng thái onboarding là UI/API deterministic; không đưa user description hay identity vào AI. | Google OAuth state/PKCE/nonce/claims, opaque session, owner scope và `walletInitialized` từ backend. [`docs/AUTHENTICATION.md` §3-6, L16-L51; `docs/contracts/openapi.yaml` `/auth/google/*`, L31-L69, `/auth/session`, L52-L61] | User chọn locale và tiếp tục/bỏ qua onboarding; không có AI hỏi thêm. Auth/provider/DB lỗi phải fail closed, không guest/local fallback. [`docs/AUTHENTICATION.md` §6, L41-L51] | **Ship core; reject JEV.** |
| **J1. Mở wallet** | User cần nhập số dư hiện có nhưng dễ nhầm đây là income hoặc nghĩ app tự biết số dư. Pain: baseline không có lịch sử. | **Không gọi JEV.** Inline deterministic explanation “opening balance là baseline”; validation synchronous trước `POST /wallet/baseline`. | `initial_wallet_balance`/`available_balance`, integer VND; baseline tạo wallet/savings/audit một lần, không tạo income giả. [`docs/DOMAIN-MODEL.md` §2, L21-L24; §5, L69-L77; `docs/contracts/openapi.yaml` L82-L101] | User nhập/sửa giá trị trước submit; idempotency và lỗi 409/422 giữ form. Fallback là sửa thủ công, không đoán số. | **Ship core; reject JEV arithmetic/advice.** |
| **J2. Add income/payment** | User nhập nhanh khoản trợ cấp, lương part-time, đồ ăn, đi lại… Pain: gõ mô tả rồi phải tìm category; sợ mất form khi suggestion lỗi. | **JEV insertion chính:** explicit button sau khi có `transactionType` + description và candidate list; **synchronous advisory pre-submit**, không giữ money transaction khi chờ. Không gọi mỗi keystroke. | Amount/date/type/category active, wallet lock, balance check, idempotency, ledger/audit/projection và budget warning do API/domain. [`docs/DOMAIN-MODEL.md` §5, L69-L77; `docs/contracts/openapi.yaml` `/ledger/transactions`, L102-L129, schema L440-L449] | Preview suggestion; user **Use** hoặc override manual; final Save riêng. Provenance tối thiểu là category do user chọn và acknowledgement nếu contract giữ; persistence chi tiết suggestion/feedback là unresolved. Timeout/schema/low confidence/unavailable → manual, giữ toàn bộ form. | **Manual/core ship; JEV optional sau UX/domain gate.** |
| **J3. Chọn category / auto-category** | Category list dài và category income/payment khác nhau; disabled category vẫn cần đọc trong history. | Manual picker luôn hiển thị; JEV chỉ chọn trong candidate set giới hạn theo `appliesTo`; response phải được kiểm tra membership/active trước render. Đây là **read-time suggestion** ngay trước submit. | `GET /categories?appliesTo=…`, `active|disabled|retired`, localized name `en|vi`; server revalidate category/type. [`docs/contracts/openapi.yaml` L180-L201, L533-L544; `docs/AI-JEV.md` §3-4, L21-L23, L33-L62] | Không auto-select ngầm; selection manual thắng late response; locale/type change làm stale suggestion bị bỏ. Candidate lỗi → picker thủ công, không map “gần đúng”. [`docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §4.2-4.3, L189-L205] | **Ship manual; defer/guard JEV.** |
| **J4. Review, correction và history** | User phát hiện sai amount/category/date sau commit; muốn hiểu lịch sử mà không bị “xóa dấu vết”. Pain: SRS gọi là sửa/xóa, còn canonical là reversal/correction append-only. | **Không đặt JEV trong correction command.** Read-time static explanation về lineage/reason có thể là phase sau; không cho JEV chọn role, new amount/category hay submit correction. | Ledger immutable; correction giữ row cũ, tạo row mới có reason/actor/reference/audit; report/rebuild theo policy. [`docs/DOMAIN-MODEL.md` §3-5, L26-L28, L50-L52, L83-L85; `docs/contracts/API-REVIEW.md` §Ledger correction, L23-L30; `docs/contracts/openapi.yaml` L138-L152] | User tự review target/reason và confirm correction; history vẫn đọc được. Fallback static domain copy + support issue; không sửa trực tiếp nếu JEV unavailable. Persistence JEV explanation chưa có schema. | **Ship deterministic correction/history; defer explanation; reject JEV mutation.** |
| **J5. Đặt budget và theo dõi** | User đặt hạn mức theo category/tháng, cần biết đã dùng bao nhiêu; pain: warning “vượt” nhưng không biết bước nhỏ tiếp theo. | Core budget read/mutation synchronous deterministic. **Phase sau:** JEV read-time/async coaching chỉ sau khi nhận `BudgetSummary` authoritative; không để JEV tính `used`, ngưỡng hay quyết định reject. | Budget theo payment category + local month HCMC; `usedVnd`, `isOverrun`; overrun warning-only. [`docs/DOMAIN-MODEL.md` §2, L34-L36; §4, L48-L50, L65-L67; `docs/contracts/openapi.yaml` `/budgets*`, L215-L245, L559-L584] | User đặt/thay budget và dismiss/ignore coaching; provenance phải chỉ ra month/category/snapshot. Fallback progress + warning deterministic; payment wallet-sufficient vẫn đi qua. | **Ship budget core; defer JEV coaching.** |
| **J6. Dashboard/widgets** | User muốn thấy “mình đang ở đâu” ngay khi mở app; pain: nhiều số và chart nhưng khó biết thay đổi nào đáng chú ý. | Core snapshot read-time. **Phase sau:** narrative overlay sau khi backend trả snapshot; có thể precompute async sau commit và đọc lại read-time. JEV không tạo widget/số mới. | `/reports/dashboard`, wallet/savings/currentMonth/recentTransactions, chart/table equivalent. [`docs/contracts/openapi.yaml` L255-L261, L602-L610; `docs/PRD.md` §3.3, L33-L37] | User mở rộng source row/report, dismiss/save/feedback insight nếu có; hiển thị timestamp/month và “dựa trên dữ liệu đã ghi”. Fallback card/chart/table deterministic, không có insight thì không hiển thị zero giả. | **Ship dashboard deterministic; defer JEV overlay.** |
| **J7. Monthly report** | User muốn hiểu category/month trend và income-vs-payment; pain: report chính xác nhưng chưa dễ đọc. | Report calculation synchronous/read-time deterministic. **Phase sau:** batch/async narrative sau khi tháng/report snapshot sẵn sàng; read-time chỉ lấy artifact đã tạo. Không gọi JEV trong report calculation/money transaction. | `/reports/monthly`, HCMC month, opening/total income/total payment/closing/category breakdown. [`docs/contracts/openapi.yaml` L246-L254, L585-L601; `docs/DOMAIN-MODEL.md` §3-4, L38-L52, L66-L67] | User chọn month/filter và kiểm tra bảng nguồn; save/dismiss/feedback narrative là proposal. Fallback report/table deterministic; stale/missing artifact → chỉ report, không bịa summary. | **Ship report core; defer narrative/PDF.** |
| **J8. CSV batch import** | User muốn đưa lịch sử từ file thay vì nhập từng dòng; pain: mapping cột, category ambiguity, lỗi một row có thể ảnh hưởng cả batch. | SRS có upload/batch suggestion, nhưng canonical cắt CSV. Nếu mở phase sau: **batch preview/staging**, JEV xử lý row-level async/bounded, không commit tự động; không gửi raw file trực tiếp. | Chưa có canonical import contract, staging schema, row error semantics hay batch transaction policy. CSV/PDF explicit ngoài MVP. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71; §1.6, L77-L84, L113-L118; `docs/PRD.md` §5, L65-L68] | User xem preview, sửa từng row/chọn category, confirm import; provenance row/file version; lỗi row fallback manual/skip có báo rõ. Không có import endpoint thì không hứa UI. | **Defer toàn bộ CSV; defer JEV batch.** |
| **J9. Monthly insight / tips** | User cần câu trả lời đơn giản: “chi nào tăng?”, “mình có thể thử gì tuần này?” Pain: số liệu deterministic không tự chuyển thành hành động. | **Insertion point ngoài auto-category có product fit cao nhất:** async batch sau month/report snapshot; read-time render narrative có source links/metric cards. Tách factual metrics (backend) khỏi wording/advice (JEV). | Monthly report và budget summary là nguồn số authoritative; JEV chỉ diễn đạt pattern đã được chọn, không tính arithmetic/date/balance. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L128-L139; `docs/AI-JEV.md` §8, L91-L93; `docs/PRD.md` §5, L65-L68] | User xem source metric, accept/ignore/dismiss/save/pin/feedback; tip không tự đổi budget/transaction. Cần provenance (month, snapshot, source metrics, generated time, status); persistence/history chưa canonical. Fallback report + deterministic rule-based labels hoặc không có tip. | **Defer phase sau; không ship MVP.** |
| **J10. Budget warning / notification** | User dễ bỏ lỡ warning hoặc bị alert fatigue; cần warning đúng lúc nhưng không bị chặn giao dịch. | Core trigger/threshold deterministic sau commit. **Phase sau:** JEV có thể viết contextual nudge trên warning đã có, async/read-time; không quyết định khi nào gửi, không email/push nếu chưa có contract. | Budget warning từ domain/API; payment wallet check độc lập; warning không authorization. [`docs/DOMAIN-MODEL.md` §4, L54-L67; `docs/contracts/API-REVIEW.md` §Response, L32-L37] | User dismiss/snooze/không làm gì; provenance category/month/used/limit và thời điểm. Fallback warning ngắn + progress; JEV lỗi không mất warning. Notification persistence/channel/throttle chưa canonical. | **Ship warning core; defer JEV wording/notification.** |
| **J11. Report issue / admin** | User cần báo sai số dư, payment thiếu hoặc bug; admin cần triage nhưng không được biến thành teller. Pain: report tài chính nhạy cảm, cần correlation/case mà không gửi full ledger. | **Không dùng JEV cho admin triage hoặc dispute decision.** Có thể nghiên cứu static form help/read-time mask sau này; không đưa raw ledger/secret/PII vào JEV. | `/issues`, admin status/priority/note/audit; server enforce owner/least privilege; correction qua domain command. [`docs/contracts/openapi.yaml` L262-L338; `docs/ADMIN-OPERATIONS.md` §1-4, L3-L36] | User gửi title/description/category và related transaction nếu ownership hợp lệ; admin quyết định status/priority/note. Fallback support deterministic; P0/P1 escalate/disable write path theo runbook. | **Ship deterministic issue flow; reject autonomous/admin JEV.** |

---

## 3. Insertion-point matrix và product-fit rationale

| ID | Insertion point | User value | Automation value | Placement | Input boundary tối thiểu | Output + control | Deterministic authority | Fallback | Disposition |
|---|---|---|---|---|---|---|---|---|---|
| **P0** | Pre-submit category suggestion | Giảm thao tác tìm category, hữu ích khi mô tả tự do | Gợi ý từ candidate set, nhưng user vẫn quyết định | Synchronous explicit request; ngoài money transaction | `transactionType`, redacted `description`, active candidate IDs/labels, locale; không amount/date/balance/ledger/session | Advisory preview; **Use** hoặc override; provenance category/user action/suggestion status | Category lifecycle, type, amount/date validation, wallet/budget/ledger | Manual picker vẫn usable khi JEV off/timeout/schema/low confidence | **Ship manual; JEV optional after gates** |
| **P1** | Dashboard “what changed?” | Biến số liệu thành điểm đáng chú ý, giảm cognitive load | Tạo diễn giải ngắn từ snapshot đã tính | Read-time overlay hoặc async precompute sau commit | Structured snapshot + selected metric IDs; snapshot/month/locale | Insight có source metric, timestamp; dismiss/save/feedback | Dashboard/report API và table/chart | Hiển thị snapshot/chart/table, không zero giả | **Defer** |
| **P2** | Monthly report narrative | Sinh viên hiểu xu hướng sáu tháng/tháng hiện tại bằng ngôn ngữ đơn giản | Tóm tắt pattern đã chọn, không tự tính | Async batch khi report snapshot hoàn tất; read-time fetch artifact | `MonthlyReport` deterministic, budget summary nếu contract cho phép, month HCMC | Narrative + links đến category breakdown; user review/dismiss/save | `/reports/monthly`, HCMC period, rebuild policy | Deterministic report/table | **Defer** |
| **P3** | Personalized saving tip | Có bước nhỏ cụ thể hơn chart | Xếp hạng/nêu lựa chọn, không tự đặt budget | Async/read-time sau user mở dashboard/report; không trong commit | Approved aggregates + explicit goals only when canonicalized; no raw ledger by default | Tip advisory; pin/dismiss/feedback; must not mutate state | Budget/report formulas | Static rule label hoặc không hiển thị tip | **Defer; persistence unresolved** |
| **P4** | Budget coaching sau warning | Warning bớt “khô”, giúp cân nhắc hành động | Diễn đạt nudge theo category/month | Async/read-time after deterministic warning | `usedVnd`, `limitVnd`, `isOverrun`, category/month snapshot; no hidden inference | “Bạn có thể cân nhắc…”; dismiss/snooze/feedback | Budget threshold and payment authorization | Core warning/progress remains | **Defer** |
| **P5** | CSV row category assist | Giảm công sức map lịch sử hàng loạt | Gợi ý theo từng row và abstain khi mơ hồ | Batch preview/staging, bounded async | Row description/type/candidate; file metadata; no auto-commit | Per-row suggestion, accept/override/retry; commit only after user review | Import validator, idempotency, ledger/domain transaction | Manual row mapping/skip/error report | **Defer with CSV** |
| **P6** | Correction/history explainer | Giải thích reversal/lineage để user không nghĩ dữ liệu bị xóa | Viết copy theo structured lineage | Read-time only, phase sau | Approved event labels/reference; avoid raw ledger unless explicit privacy contract | Static/narrative explanation; user still enters reason and confirms correction | Append-only correction command | Deterministic help/support issue | **Defer; reject mutation** |
| **P7** | Notification wording | Warning rõ hơn, ít alert fatigue | Chọn wording/nudge từ warning có sẵn | Async/read-time after event; not trigger | Warning event + category/month snapshot | Dismiss/snooze; no channel auto-action | Threshold/event delivery | Deterministic in-app warning | **Defer; no JEV trigger** |
| **P8** | Admin issue assistance | Có thể giảm phân loại thủ công | Tiềm năng tóm tắt issue, nhưng dữ liệu nhạy cảm | Không đặt trong MVP | Không dùng raw issue/financial detail cho JEV khi chưa có contract | Không có autonomous output; admin tự triage | Admin role/audit/issue workflow | Deterministic status/priority/note | **Reject autonomous admin JEV** |

### Vì sao P1–P4 đáng ưu tiên hơn các ý tưởng “AI làm thay”

1. **Bám vào pain thật sau khi user đã nhập dữ liệu:** sinh viên thường không thiếu một con số nữa; họ thiếu diễn giải và bước tiếp theo có thể cân nhắc. SRS mô tả dashboard, report, summary và tips chính ở các điểm này. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.6, L101-L105, L120-L139]
2. **Tách authority khỏi language:** backend tiếp tục tính wallet/budget/report; JEV chỉ diễn đạt các metric đã chọn. Điều này giữ invariant `JEV output không bypass validation, calculation hoặc authorization`. [`docs/DOMAIN-MODEL.md` §4, L54-L67; `AGENTS.md` §JEV/OpenRouter, L133-L141]
3. **Không làm hỏng money path:** đặt JEV sau commit hoặc tại read-time/batch, không giữ transaction khi chờ AI. Đây là boundary canonical. [`docs/ARCHITECTURE.md` §4-6, L35-L56; `docs/AI-JEV.md` §5, L64-L72]
4. **Có thể fallback sạch:** nếu JEV unavailable, chart/table/warning/manual picker vẫn trả giá trị. Không có fallback deterministic thì không nên ship insertion point đó.
5. **Dễ chứng minh provenance:** mỗi narrative có month, source metric, snapshot time và trạng thái advisory; user có thể mở chi tiết thay vì tin một câu văn không nguồn. Đây là proposal cần persistence/contract.

---

## 4. Use-case cards

Các card dưới đây là proposal product để integrator/Team Leader cân nhắc; chúng không mở rộng canonical contract. Mỗi card có đủ trigger, input, processing, output, user control, persistence, fallback, success metric và cấm đoán.

### UC-01 — Category suggestion trước submit (insertion point được canonical cho phép)

- **Disposition:** **Ship manual/core ngay; JEV suggestion chỉ enable sau safety/UX/domain gates.**
- **Trigger:** User đã chọn `income` hoặc `payment`, nhập description và bấm hành động “Gợi ý danh mục”; không gọi mỗi keystroke.
- **Input:** `transactionType`, description đã redact/giới hạn, active candidate set đúng `appliesTo`, locale `en|vi`. Không gửi amount, date, balance, savings, raw ledger, session, Google claims, secret hay PII thừa. [`docs/AI-JEV.md` §3-4, L21-L45, §6, L74-L78; `docs/contracts/openapi.yaml` L662-L677]
- **Processing:** Server validate session/CSRF/feature state; JEV trả typed status; server kiểm tra schema, candidate membership, active status, confidence threshold. Không giữ DB money transaction trong lúc đợi. [`docs/AI-JEV.md` §4-5, L47-L72]
- **Output:** Preview một category hoặc trạng thái manual/disabled/unavailable; không coi là selected/approved. Money create vẫn là request riêng qua `/ledger/transactions`.
- **User control:** User bấm **Use this category** hoặc chọn category khác; phải review và Save; override thắng suggestion đến muộn; `confirmedCategorySuggestion` nếu dùng phải phản ánh explicit acknowledgement, không phải authorization. [`docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §3 UX-02, L42-L56; `docs/contracts/openapi.yaml` L440-L449]
- **Persistence/provenance:** Transaction lưu category user cuối cùng và domain audit như canonical. Persistence cho suggestion status, candidate snapshot, acceptance/override, feedback chưa có contract — **[Unresolved]**; không tự thêm field.
- **Fallback:** Manual picker giữ nguyên input khi JEV off, timeout, quota/rate, schema, privacy, low confidence, 401/403/429/5xx; không đoán category.
- **Success metric [Proposal]:** 100% suggestion hợp lệ thuộc active candidate/đúng type; 100% commit có category + explicit review; 100% failure fallback manual; đo override và completion riêng `en|vi` × `income|payment`. Không claim score runtime.
- **Cấm đoán:** auto-select/auto-submit/auto-commit; tính amount/date/balance/budget; authorize payment; raw provider detail trong UI/log; chat prose/JSON parse; browser gọi provider. [`docs/AI-JEV.md` §3, L21-L31; `AGENTS.md` §JEV/OpenRouter, L133-L141]

### UC-02 — Giải thích “what changed?” trên dashboard

- **Disposition:** **Defer phase sau.** Ship dashboard deterministic trước.
- **Trigger:** User mở dashboard hoặc bấm vào widget/highlight; không tự tạo insight trước khi có snapshot authoritative.
- **Input:** Snapshot dashboard/monthly report đã tính, metric IDs, month HCMC, locale; ưu tiên structured aggregate và không truyền raw ledger. Dashboard contract gồm wallet, savings, currentMonth, recentTransactions. [`docs/contracts/openapi.yaml` L255-L261, L602-L610]
- **Processing:** Backend lấy snapshot; JEV diễn đạt một hoặc vài biến động đã chọn. Numeric arithmetic, date period, category total do backend/domain; JEV không suy ra số mới.
- **Output:** Một câu/đoạn ngắn có liên kết đến metric/category breakdown, timestamp và nhãn “gợi ý/để tham khảo”; không gọi là correct/guaranteed.
- **User control:** User mở source data, dismiss, save/pin hoặc feedback nếu persistence được duyệt; không có nút hành động tài chính trực tiếp.
- **Persistence/provenance:** Cần insight artifact chứa user scope, month, source snapshot/version, source metric IDs, generated time, locale, status và dismissal/feedback. Các field này **[Unresolved]** trong canonical; không ghi vào `Insight` SRS minh họa như đã có.
- **Fallback:** Chart/table/dashboard authoritative vẫn hiển thị; snapshot lỗi dùng trạng thái lỗi + retry, không hiển thị số 0 hoặc narrative cũ không đánh dấu stale.
- **Success metric [Proposal]:** Tỷ lệ user mở source metric sau insight, hiểu đúng pattern qua task test, dismiss/feedback hợp lệ, zero narrative trích sai snapshot. Không dùng click-through một mình làm “đúng”.
- **Cấm đoán:** không tạo balance/report mới; không tự khẳng định “chi tăng X” nếu metric không có; không đề xuất transfer/payment; không tự gửi notification hay thay đổi widget.

### UC-03 — Monthly insight sau report close

- **Disposition:** **Defer phase sau; SRS rộng nhưng AI-JEV canonical loại khỏi MVP.**
- **Trigger:** Report tháng đã được backend tính xong và user mở tháng đó, hoặc job được phép chạy sau khi có snapshot; không gọi trong transaction tạo payment.
- **Input:** `MonthlyReport` deterministic, category breakdown, budget summary nếu contract đã cho phép, month `YYYY-MM` HCMC, locale và snapshot version. [`docs/contracts/openapi.yaml` L375, L585-L601; `docs/DOMAIN-MODEL.md` §3-4, L38-L52]
- **Processing:** Async/batch tạo narrative có cấu trúc: observation → evidence metric → caveat → optional nudge. JEV chỉ chọn/diễn đạt dữ liệu có sẵn; không làm forecasting, arithmetic, diagnosis hay financial advice.
- **Output:** Summary ngắn, mỗi claim trỏ về category/month metric; trạng thái `generated|stale|unavailable` là proposal, không phải API hiện tại.
- **User control:** User đọc source, dismiss, save/pin, feedback; không tự apply budget/transaction. User có thể bỏ qua toàn bộ insight và dùng report.
- **Persistence/provenance:** Lưu lịch sử summary chỉ khi có schema/retention/owner/audit decision; SRS có bảng `Insight` minh họa nhưng canonical chưa có endpoint/schema. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.8, L282-L295] **[Unresolved].**
- **Fallback:** Report deterministic + bảng/chart; nếu artifact stale/missing, nói rõ chưa có insight thay vì tái dùng không đánh dấu.
- **Success metric [Proposal]:** Claim-to-source validity 100%; tỷ lệ đọc source/dismiss/feedback; giảm report-support issue; zero unsafe advice. Không lấy “đã sinh text” làm success.
- **Cấm đoán:** không gửi full ledger/balance/session/claims/secret; không tạo lời hứa tiết kiệm; không khuyên vay/BNPL/đầu tư; không bịa baseline/trend khi thiếu data. [`docs/AI-JEV.md` §3, L25-L31; `docs/ARCHITECTURE.md` §5, L43-L47]

### UC-04 — Personalized saving tip / budget coaching

- **Disposition:** **Defer phase sau.** Budget warning/progress deterministic ship trước.
- **Trigger:** User mở budget/dashboard hoặc có deterministic `isOverrun`/near-limit event; JEV không tự quyết định ngưỡng.
- **Input:** `categoryId`, month, `usedVnd`, `limitVnd`, `isOverrun`, approved historical comparison nếu có; chỉ dùng user data cần thiết. Mục tiêu tiết kiệm trong SRS chưa có canonical profile contract — **[Unresolved]**.
- **Processing:** Sau khi backend tính budget, JEV viết nudge theo pattern đã xác định, ví dụ cân nhắc một giới hạn tuần; không tính lại used/limit, không sửa budget, không block payment.
- **Output:** Copy advisory với source category/month và caveat; không gọi là financial advice/guarantee. Warning core vẫn hiển thị tách biệt.
- **User control:** User dismiss/snooze/ignore/save/feedback; nếu muốn đặt budget phải mở flow deterministic và tự confirm.
- **Persistence/provenance:** Dismiss/snooze/feedback, source snapshot và tip version cần persistence; chưa có canonical notification/tip/feedback schema **[Unresolved]**.
- **Fallback:** Thanh progress + warning deterministic; nếu JEV lỗi, không mất warning và không retry vô hạn.
- **Success metric [Proposal]:** User hiểu đúng trạng thái budget; giảm dismiss nhanh/alert fatigue; tỷ lệ mở budget detail; zero payment bị chặn do tip.
- **Cấm đoán:** JEV không chọn threshold, không tự tạo/chỉnh budget, không authorize/reject payment, không gửi email/push tự động, không suy đoán mục tiêu hay khả năng chi trả.

### UC-05 — CSV row-level category assist

- **Disposition:** **Defer cùng CSV; không phải MVP.**
- **Trigger:** Chỉ sau khi user upload file và hệ thống hoàn tất parse/validation vào staging preview.
- **Input:** Từng row đã schema hóa: transaction type, description, candidate set, source row ID; không gửi raw file, credentials, unredacted PII hoặc amount/date nếu không cần category.
- **Processing:** Batch/bounded async; mỗi row có suggestion hoặc abstain; lỗi một row không commit các row khác. User xem preview trước import.
- **Output:** Per-row category suggestion, confidence/status nội bộ, error reason đã localized; không tự ghi ledger.
- **User control:** User accept/override/skip từng row hoặc nhóm row, sửa field và final-confirm import; cần preview diff và idempotency.
- **Persistence/provenance:** Staging file hash/row ID, mapping, suggestion status, user decision, import batch ID và ledger references cần schema/retention; hiện chưa có canonical import contract **[Unresolved].**
- **Fallback:** Manual mapping/skip/error report; nếu JEV unavailable, batch vẫn có thể import sau manual review nếu import feature đã được duyệt.
- **Success metric [Proposal]:** Không mất/nhân đôi row; 100% commit row có explicit confirmation; candidate validity và fallback completeness 100%; giảm thời gian mapping so với manual baseline.
- **Cấm đoán:** không auto-commit toàn file; không để một suggestion sai làm thay đổi amount/date/type; không bypass wallet/idempotency/owner scope; không dùng CSV để tự học production.

### UC-06 — History/correction explainer

- **Disposition:** **Defer; reject mọi JEV correction authority.**
- **Trigger:** User mở lineage của transaction hoặc cần hiểu vì sao correction tạo row mới.
- **Input:** Chỉ structured status/role/reference đã được domain cho phép; không gửi raw ledger/history mặc định. `adjustment`/`replacement` vẫn là internal command cho tới khi có contract/UI approval. [`docs/contracts/API-REVIEW.md` §Ledger correction, L23-L30]
- **Processing:** Read-time narrative/static help mô tả original → reversal/correction → hiệu lực; không tính lại report và không chọn correction role.
- **Output:** Explanation có link tới transaction rows và reason đã user nhập; nếu thiếu dữ liệu thì nói không đủ thông tin.
- **User control:** User tự chọn target, reason, new fields theo API và confirm correction; có thể dismiss/help hoặc mở issue.
- **Persistence/provenance:** Không cần lưu JEV output MVP; nếu lưu phải gắn target/reference, timestamp và source version; hiện **[Unresolved].**
- **Fallback:** Copy deterministic của domain + history table + support issue; correction flow không phụ thuộc JEV.
- **Success metric [Proposal]:** Giảm nhầm “xóa giao dịch”, tăng completion correction hợp lệ, zero correction commit ngoài domain command.
- **Cấm đoán:** không gửi command tới ledger; không tự tạo reversal/adjustment/replacement; không sửa/xóa row; không suy diễn lý do gian lận hoặc lỗi user.

### UC-07 — Notification contextualizer

- **Disposition:** **Defer cùng notification; warning deterministic ship.**
- **Trigger:** Domain đã phát ra warning sau commit hoặc user mở notification center; không để JEV phát hiện overrun.
- **Input:** Warning event, category/month, used/limit, source snapshot và locale.
- **Processing:** Async/read-time chọn câu chữ ngắn, có thể action-oriented nhưng không action-executing; channel, frequency và trigger do deterministic notification policy.
- **Output:** In-app contextual message có source và dismiss/snooze; không tự gửi email/push khi chưa có channel contract.
- **User control:** Dismiss/snooze/mark read; user tự mở budget để quyết định.
- **Persistence/provenance:** Notification ID, event ID, snapshot, read/dismiss/snooze và message version cần schema/throttle policy **[Unresolved].**
- **Fallback:** Warning copy deterministic, vẫn hiển thị khi JEV unavailable.
- **Success metric [Proposal]:** Warning delivery/readability, ít alert trùng, không tăng payment abandonment do wording; zero missed core warning.
- **Cấm đoán:** không đổi threshold, không chặn payment, không tự sửa budget, không tự gửi outbound message, không dùng narrative stale như warning mới.

### UC-08 — Admin issue assistance

- **Disposition:** **Reject autonomous JEV triage trong MVP và phase chưa có privacy/role contract.**
- **Trigger:** Admin mở issue đã mask; deterministic triage đủ cho MVP.
- **Input:** Nếu nghiên cứu sau này, chỉ masked issue metadata được security owner phê duyệt; không raw ledger/balance/audit secret/PII. [`docs/ADMIN-OPERATIONS.md` §3-6, L16-L44]
- **Processing:** Không tự quyết định priority/status, không kết luận financial dispute. Support/admin xem case, hỏi thêm thông tin, ghi note và escalate theo runbook.
- **Output:** **Không tạo JEV output để ship.** Trạng thái/priority/note do admin endpoint và audit xác định. [`docs/contracts/openapi.yaml` L295-L338]
- **User control:** User tạo issue; admin có explicit action với least privilege; security/owner quyết định incident.
- **Persistence/provenance:** Issue/issue_events/audit canonical; không lưu JEV raw prompt/response. Nếu sau này có assist phải có role, audit, redaction và opt-out decision **[Unresolved].**
- **Fallback:** Deterministic triage P0/P1/P2, read-only/disable write path, reconcile từ immutable ledger.
- **Success metric [Proposal]:** Issue được xử lý đúng scope, không lộ dữ liệu, không có admin mutation ngoài contract.
- **Cấm đoán:** auto-triage, auto-close, auto-change priority, cross-user financial inference, admin authority, raw JEV/ledger exposure. [`docs/ADMIN-OPERATIONS.md` §1-2, L3-L15, §7-10, L46-L68]

---

## 5. Journey-level control và provenance contract (proposal)

Đây là lớp product cần có nếu phase sau thật sự ship insight/coaching; hiện chưa phải canonical API.

| Artifact hiển thị cho user | Provenance tối thiểu nên hiển thị/tra cứu | User control | Nếu stale/lỗi |
|---|---|---|---|
| Category suggestion | transaction type, candidate snapshot, locale, status, thời điểm request; category authoritative từ current `/categories` | Accept/override/manual; final review | Manual picker; không map gần đúng |
| Dashboard/report narrative | month HCMC, source metric IDs, source snapshot/version, generated time, locale, advisory label | Open source, dismiss/save/feedback | Show deterministic chart/table; đánh dấu unavailable/stale |
| Budget coaching | category/month, `usedVnd`, `limitVnd`, `isOverrun`, warning event | Dismiss/snooze/ignore; mở budget để tự quyết | Warning deterministic vẫn hiển thị |
| CSV row suggestion | batch ID/file version/row ID, candidate set, suggestion status, user decision | Accept/override/skip trước import | Row error/manual mapping; không partial silent commit |
| Admin issue assist (nếu từng được duyệt) | masked case ID, actor, role, action, reason, audit timestamp | Admin explicit action; security escalation | Deterministic triage/read-only |

**Verified boundary:** AI/JEV output phải được trình bày là đề xuất để user xem xét/ghi đè; không phải certified financial advice. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71]

**Proposal:** mọi narrative/tiếp cận coaching nên có `source` link tới metric/report, nhãn thời gian và action `dismiss/save/feedback`; không dùng feedback để âm thầm thay đổi category model hoặc money rule. Persistence/retention/feedback endpoint cần product decision.

**Unresolved:** canonical chưa có schema/endpoint cho `Insight`, `Tip`, `Notification`, `Feedback`, `Dismissal`, generated artifact version, stale policy, read-after-correction invalidation hay monthly job. SRS bảng `Insight` chỉ là ví dụ và nói rõ không bắt buộc theo cấu trúc đó. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.8, L230-L295]

---

## 6. Phase disposition và thứ tự đề xuất

### 6.1 Ship MVP

1. Google OAuth/session/onboarding và owner isolation; không JEV tại auth. [`docs/PRD.md` §3.1, L17-L23; `docs/AUTHENTICATION.md` §3-7, L16-L61]
2. Opening wallet baseline, income/payment form, manual category picker, immutable history/correction, savings và budget warning. [`docs/PRD.md` §3.2-3.3, L25-L37; `docs/DOMAIN-MODEL.md` §4-5, L54-L85]
3. Deterministic dashboard/monthly report + table/chart equivalent; JEV off không làm mất money path. [`docs/ARCHITECTURE.md` §1-2, L3-L27; `docs/PRD.md` §4, L53-L63]
4. User issue/report và admin least-privilege triage; không admin financial mutation. [`docs/ADMIN-OPERATIONS.md` §1-4, L3-L36; `docs/contracts/openapi.yaml` L262-L338]
5. Nếu JEV category suggestion được bật sau các gate canonical, UX vẫn manual-first: explicit request, confirmation/override, typed fallback, no auto-commit. [`docs/AI-JEV.md` §3-7, L21-L89; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` §10-12, L345-L375]

### 6.2 Phase sau (đáng nghiên cứu theo thứ tự)

1. **P1/P2 — Dashboard/report explanation và monthly insight:** product value cao, đặt sau deterministic report; async/read-time, source-linked, persisted artifact cần contract.
2. **P3/P4/P7 — Budget coaching, tips, contextual warning copy:** chỉ sau warning/progress deterministic và notification policy; user dismiss/snooze, không tự hành động.
3. **P5 — CSV import + row-level suggestion:** xây import staging/preview/idempotency/error semantics trước, rồi mới thêm JEV batch.
4. **P6 — Correction/history explainer:** chỉ là read-time help, không liên quan authority; ưu tiên sau khi correction UI/lineage canonical ổn định.

Các phase sau phù hợp ý định SRS nhưng hiện bị canonical scope cut: monthly prose summary, complex AI, prediction, CSV/PDF, recurring và notification. [`docs/AI-JEV.md` §8, L91-L93; `docs/PRD.md` §5, L65-L68; `docs/DELIVERY-PLAN.md` §9, L57-L60]

### 6.3 Reject rõ ràng

- JEV tự tính wallet/savings/budget/amount/date/report hoặc thay deterministic backend.
- JEV authorize/reject payment, auto-submit/auto-commit category, tự tạo/sửa/xóa ledger/savings/budget/correction.
- JEV tự chạy recurring/auto-transfer, tự gửi payment/notification/email hoặc làm action tài chính không có explicit confirmation.
- JEV đọc raw ledger, balance, Google claims, session, secret, admin note hoặc PII thừa.
- JEV auto-triage/admin mutation, kết luận dispute, truy cập cross-owner data.
- Dùng chat/prose parse để thay typed contract hoặc để suggestion failure khóa manual path.

Các cấm đoán này là ranh giới đã verified trong AGENTS, DOMAIN, ARCHITECTURE, AI-JEV và ADMIN-OPERATIONS. [`AGENTS.md` §Không được đụng, L51-L63; §JEV/OpenRouter, L133-L141; `docs/DOMAIN-MODEL.md` §1 và §4, L3-L14, L54-L67; `docs/ARCHITECTURE.md` §5 và §8, L43-L47, L67-L69; `docs/ADMIN-OPERATIONS.md` §10, L66-L68]

---

## 7. Dependencies cần có trước từng insertion point

| Dependency | Cần cho | Trạng thái |
|---|---|---|
| Deterministic dashboard/report/budget response có month HCMC, metric/category IDs và snapshot semantics | P1–P4/P7 | **[Verified]** Core endpoints/authority đã mô tả; snapshot version/stale semantics **[Unresolved]**. [`docs/contracts/openapi.yaml` L215-L260, L585-L610] |
| Active category candidate set, `appliesTo`, localized labels, lifecycle và stale response policy | P0 | **[Verified]** API có `active|disabled|retired` + `en|vi`; ordering/snapshot/late response **[Unresolved]**. [`docs/contracts/openapi.yaml` L180-L201, L533-L544] |
| Manual-first accessible UI với loading/error/focus/keyboard/en-vi | P0 và toàn core | **[Verified requirement]**, runtime smoke chưa có trong docs. [`docs/PRD.md` §3.4, L39-L43; `AGENTS.md` §React/frontend, L87-L97; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` L69-L83] |
| Suggestion confirmation/override semantics và binding với category | P0 | **[Unresolved]** `confirmedCategorySuggestion` có field nhưng server semantics chưa chứng minh. [`docs/contracts/openapi.yaml` L440-L449; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` L42-L56] |
| Insight/tip/feedback/dismiss/save persistence, retention, invalidation sau correction | P1–P4/P7 | **[Unresolved]** Chưa có canonical endpoint/schema; SRS `Insight` chỉ minh họa. |
| Async job/batch lifecycle, idempotency, retry/failure và stale artifact policy | P1–P5/P7 | **[Unresolved]** Không tự thêm worker/queue/notification contract; JEV không được gọi trong money transaction. [`docs/ARCHITECTURE.md` §4-6, L35-L56] |
| CSV parser/staging/preview/row error/import commit contract | P5 | **[Deferred]** CSV ngoài MVP. [`docs/PRD.md` §5, L65-L68; `docs/DELIVERY-PLAN.md` §9, L57-L60] |
| Admin role/audit/redaction và masked case boundary | P8 | **[Verified]** Admin least privilege/issue workflow; JEV assist chưa có product/security contract. [`docs/ADMIN-OPERATIONS.md` §1-6, L3-L44] |
| Provenance/feedback metrics và kill/disable evidence | Tất cả JEV enablement | **[Verified requirement + unresolved implementation]** Default-off/manual fallback là canonical; audit/kill operational design phải explicit. [`docs/AI-JEV.md` §5-7, L64-L89; `docs/ADMIN-OPERATIONS.md` §5-7, L38-L51; `docs/contracts/API-REVIEW.md` §Admin, L14-L21] |

---

## 8. Risks và mitigations

| Risk | Hậu quả trên journey | Mitigation / gate |
|---|---|---|
| **Authority confusion**: user đọc narrative như số liệu authoritative | Có thể đổi budget/payment theo câu văn sai | Tách metric card/backend khỏi narrative; source link, advisory copy, explicit review; JEV không ghi money state. [`docs/DOMAIN-MODEL.md` §4, L54-L67] |
| **Stale insight sau correction/new payment** | Dashboard/report mới nhưng insight cũ vẫn hiện | Snapshot/version + generated time + stale state; nếu chưa có invalidation thì chỉ hiển thị deterministic report. **[Proposal/Unresolved].** |
| **Hallucinated pattern/advice** | Sinh viên hiểu sai thói quen, mất niềm tin | Chỉ cho phép claim có source metric; abstain/no insight khi thiếu data; human/product review; không hứa financial advice. [`SRS_End-to-End Web Solutions/CampusCoin End-to-End Web Solutions_SRS_vi.md` §1.5, L65-L71] |
| **JEV failure blocks core** | Không add transaction/budget/report được khi optional path lỗi | Manual picker, report, warning và issue flow độc lập; JEV request không khóa Save/manual. [`docs/AI-JEV.md` §5-7, L64-L89; `docs/ARCHITECTURE.md` §6, L49-L56] |
| **PII/prompt injection/raw financial leakage** | Lộ dữ liệu nhạy cảm hoặc model bị description điều khiển | Redact/allowlist structured input; không gửi session/claims/raw ledger; treat description as untrusted; fallback manual. [`docs/AI-JEV.md` §3, L25-L31, §6, L74-L78; `docs/AUTHENTICATION.md` §6, L41-L51] |
| **Category lifecycle/locale mismatch** | Suggest disabled/retired/wrong `income|payment`, label sai `en|vi` | Candidate membership + active/type validation; render current category labels; stale response discard. [`docs/contracts/openapi.yaml` L533-L544; `docs/working/jev-analysis/CC-JEV-UX-EVAL.md` L58-L67, L100-L109] |
| **Correction semantics conflict** | User nghĩ delete được; JEV đề xuất sai reversal/amount | Giữ append-only correction, reason/reference/audit; JEV chỉ explain phase sau; no mutation. [`docs/contracts/API-REVIEW.md` L23-L30; `docs/DOMAIN-MODEL.md` L83-L85] |
| **CSV partial/duplicate import** | Mất row, duplicate ledger, sai category hàng loạt | Defer; khi làm phải staging, preview, row-level errors, idempotency, explicit batch confirm. [`docs/PRD.md` §5, L65-L68; `docs/DOMAIN-MODEL.md` §4, L56-L63] |
| **Alert fatigue / unwanted action** | User tắt cảnh báo hoặc tưởng warning là payment rejection | Threshold/warning deterministic; JEV chỉ nudge tùy chọn; dismiss/snooze; budget warning không authorization. [`docs/DOMAIN-MODEL.md` §4, L65-L67] |
| **Missing persistence/feedback contract** | Không biết insight có stale, user feedback không usable; vô tình “học” vào money path | Không claim learning từ correction; defer schema/retention/feedback decision; save artifact only after canonical decision. |
| **SRS scope creep** | Team build password, CSV, PDF, recurring, chatbot hoặc admin CRUD trái MVP | Giữ conflict table và disposition; mọi feature mới cần product/ADR/canonical decision, không suy ra từ SRS rộng. [`docs/PRD.md` §5, L65-L68; `docs/DELIVERY-PLAN.md` §9, L57-L60] |

---

## 9. Unresolved questions để Team Leader quyết định trước phase sau

1. Narrative artifact sẽ là resource nào, có owner/month/snapshot version/status nào, và invalid khi correction/new transaction ra sao?
2. Có lưu suggestion acceptance/override/feedback không? Nếu có, retention và audit nào; có được dùng để “học” hay chỉ analytics? **Không mặc định học từ correction.**
3. Budget coaching có được dùng historical comparison hoặc savings goal không? Canonical hiện chưa có đủ profile/goal contract để gửi dữ liệu này.
4. Notification chỉ in-app hay có channel khác; ai sở hữu trigger, dedupe, throttle, read/dismiss/snooze và localization?
5. CSV có import contract, staging schema, batch idempotency và partial-failure semantics nào trước khi nghĩ tới JEV?
6. `confirmedCategorySuggestion` bind với một suggestion/category snapshot cụ thể thế nào; user đổi type/locale/category khi request pending xử lý ra sao?
7. SRS yêu cầu daily/weekly/six-month/PDF/export nhưng canonical chỉ bảo đảm monthly deterministic; phase nào phê duyệt các report mở rộng?
8. Có cần history/correction explainer không, hay static deterministic copy đủ để tránh thêm dữ liệu ledger vào JEV?

**Không câu hỏi nào trong danh sách được phép biến thành implicit scope.** Khi chưa có quyết định/evidence, chọn manual/deterministic fallback.

---

## 10. Handoff conclusion

- **Nơi JEV nên nằm ngoài auto-category:** sau deterministic computation ở dashboard/monthly report/budget-warning surface, dưới dạng **source-linked explanation và optional nudge**, chạy async hoặc read-time, có dismiss/save/feedback, không có action tài chính tự động.
- **MVP:** onboarding, opening wallet, income/payment, manual category, correction/history, budget, dashboard, monthly report và issue/admin phải hoạt động độc lập với JEV. JEV feature nếu bật vẫn chỉ advisory category suggestion pre-submit và không được block manual flow.
- **Phase sau:** monthly insight → dashboard/report explanation → budget tips/coaching → contextual warning → CSV row assist, theo đúng dependency và persistence contract; không mở rộng chỉ vì SRS mô tả.
- **Reject:** mọi authority về tiền, ledger/correction, budget/report arithmetic, payment authorization, autonomous notification/admin, raw data access và auto-commit.

Handoff này là evidence cho integrator đọc cùng ba lane còn lại; không tự biến proposal thành canonical decision.
