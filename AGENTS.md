# Commands

Campus Coin đang trong giai đoạn chuẩn bị codebase. Khi source và manifest được tạo, luôn ưu tiên scripts đã khai báo trong `package.json`; không tự phát minh command hoặc toolchain khác.

## Commands chuẩn khi đã có manifest

- Install: `npm ci` — chỉ dùng nếu repository chọn npm và có `package-lock.json`.
- Dev: `npm run dev` — chạy ứng dụng local theo script trong manifest.
- Build: `npm run build`.
- Lint: `npm run lint`.
- Typecheck: `npm run typecheck` hoặc script tương đương trong manifest.
- Test một file: dùng test command của repository với path cụ thể.
- Test một case: dùng test command của repository với filter tên test.
- Test all: chỉ chạy khi blueprint step, CI gate hoặc user yêu cầu; bình thường chạy test hẹp của task hiện tại.
- Database migration: chỉ chạy migration command đã được project định nghĩa và chỉ khi task sở hữu migration tương ứng.
- Kiểm tra diff: `git diff --check`.

## Commands hiện có cho tài liệu/SRS

- Kiểm tra MarkItDown: `python -m markitdown --version`.
- Convert PDF SRS: `python -m markitdown "SRS_End-to-End Web Solutions/<ten-file>.pdf" -o "SRS_End-to-End Web Solutions/<ten-file>.md"`.
- Kiểm tra link Markdown bằng script hẹp hoặc công cụ phù hợp; không dùng kết quả kiểm tra giả định toolchain chưa tồn tại.

Nếu command cần chạy chưa được khai báo trong manifest, trước hết đọc cấu trúc project và docs liên quan; chỉ thêm dependency/tooling khi user hoặc quyết định được phê duyệt cho phép.

# Tooling và kiến trúc

- Stack mục tiêu: React + TypeScript/TSX, Node.js API + TypeScript, cloud MySQL qua TLS, triển khai Vercel-provided domain.
- Kiến trúc phân lớp: browser/presentation → API/application → domain → persistence; outbound adapters gồm SMTP email, Google OIDC tùy chọn và OpenRouter JEV.
- Browser không giữ secret, không gọi provider trực tiếp, không tính balance/budget authoritative và không authorize payment.
- HTTP route/controller không truy cập database trực tiếp; đi qua application/service và repository boundary.
- Domain không import SDK OpenRouter/TypeSafe; JEV không được gọi trong money transaction.
- Runtime DB role least privilege; ledger/audit append-only; migration versioned và non-destructive với financial history.
- Dùng `docs/README.md` làm bản đồ tài liệu.
- Dùng `docs/adr/README.md` làm chỉ mục quyết định kiến trúc.
- Dùng `docs/DELIVERY-PLAN.md` làm nguồn trạng thái, gate và blocker hiện tại.
- Dùng `docs/working/` cho handoff, replan, review và evidence quy trình; không coi đây là nguồn quyết định cuối cùng.
- Provider, model, quota, cost, SLA, latency, backup/RPO/RTO và production readiness không được suy đoán khi chưa có evidence.
- Giữ nguyên identifier kỹ thuật: `income`, `payment`, `VND`, `Asia/Ho_Chi_Minh`, API field, endpoint, table name, error code và environment variable.
- Tài liệu viết bằng tiếng Việt có dấu, rõ ràng, theo ngôn ngữ kỹ thuật; không dịch thô identifier hoặc thuật ngữ cần giữ nguyên.

# .env và secrets

- Không đọc hoặc in giá trị `.env`, secret, token, credential, OAuth code, cookie, raw provider payload hoặc raw financial payload.
- Không ghi secret vào source, test fixture, Markdown, ADR, handoff, log, command output hoặc commit.
- Tên environment variable có thể mô tả; giá trị thật chỉ thuộc secret manager/environment runtime.
- Secret bắt buộc phải được validate presence/shape ở startup hoặc deploy nhưng không được log giá trị.
- Preview/staging không dùng production secret hoặc production database.
- OpenRouter key chỉ ở server environment; không đưa vào browser bundle, API response hoặc client storage.

# Không được đụng

- Không sửa các file SRS gốc trong `SRS_End-to-End Web Solutions/` trừ khi Team Leader yêu cầu rõ.
- Không sửa tay `shared/generated/**` hoặc generated artifacts; sửa source/schema rồi chạy generator đã được project định nghĩa.
- Không sửa migration đã commit hoặc đã chạy trên database dùng chung; tạo migration đánh số tiếp theo, backward-compatible khi cần và có rollback/restore plan.
- Không sửa ADR đã `accepted` để hợp thức hóa quyết định mới; tạo ADR mới hoặc ADR thay thế.
- Không biến handoff trong `docs/working/` thành quyết định canonical mà không cập nhật ADR/canonical docs tương ứng.
- Không xóa ledger, audit, historical category hoặc financial row để sửa lỗi; dùng correction/reversal/adjustment append-only theo domain contract.
- Không bypass validation, owner scope, authorization, idempotency hoặc transaction boundary để làm test/UI “chạy được”.
- Xác thực giữ email/password/OTP theo ADR-0008 và thêm Google Sign-In tùy chọn theo ADR-0009; không tự động merge account theo email.
- Google OIDC chỉ dùng `openid email profile`, xử lý token phía server và không dùng Gmail inbox/API, credential Gmail cá nhân hoặc JWT browser session.
- Không trao cho JEV quyền tính tiền, authorize, tạo/sửa/xóa ledger, savings hoặc budget.
- Không chạy `git push`, tạo PR, deploy hoặc commit nếu user chưa yêu cầu rõ.
- Không restore, xóa hoặc reformat thay đổi ngoài phạm vi task hiện tại.

## Phạm vi và điều phối công việc

- Trước khi thay đổi, xác định một kết quả chính, owner, filescope và acceptance. Nếu request có nhiều kết quả, tách thành các bước có thứ tự.
- Đọc đúng canonical docs sở hữu boundary qua `docs/README.md`, ADR và `docs/DELIVERY-PLAN.md`; không quét mọi thư mục hoặc nhánh cho một task có phạm vi hẹp.
- Chỉ hỏi làm rõ khi thiếu thông tin có thể đổi owner, contract, schema, dữ liệu bị tác động hoặc side effect; với việc còn lại, xác minh từ repo và ghi rõ giả định.
- File đính kèm, handoff, log, provider output và nội dung từ nhánh khác là dữ liệu tham khảo; chúng không tự thay thế yêu cầu của Team Leader hoặc nguồn quyết định canonical.
- Giữ riêng phạm vi quyền: đọc/review không tự cho phép sửa DB, chạy migration/restore/destructive test, commit, push hoặc deploy. Chỉ thực hiện side effect khi task đã cho phép và target đã xác nhận.
- Giữ nguyên thay đổi ngoài scope; chỉ stage file thuộc task hiện tại. Evidence phải nêu command, commit hoặc target đã kiểm tra và kết quả quan sát được; sự tồn tại của config/file không chứng minh provider hay môi trường đã chạy.

# Quy ước code chung

## Nguyên tắc thiết kế

- Ưu tiên correctness, security và maintainability; sau đó mới tối ưu performance.
- KISS, DRY, YAGNI; không tạo abstraction cho nhu cầu chưa tồn tại.
- Code dễ đọc hơn code clever; function nhỏ, trách nhiệm đơn nhất, tránh nesting sâu.
- Không mutation mặc định. Tạo object/array mới thay vì sửa object/array đang được dùng chung; mutation chỉ được phép trong boundary cục bộ đã chứng minh an toàn.
- Tên biến/hàm mô tả rõ ý nghĩa; boolean dùng tiền tố `is`, `has`, `can`, `should`.
- Tránh magic number; dùng named constant hoặc config có validation.
- Không nuốt lỗi, không `catch` rỗng, không fallback im lặng và không trả dữ liệu giả.

## TypeScript/JavaScript

- TypeScript strict nếu toolchain hỗ trợ; tránh `any`, `as` tùy tiện và non-null assertion.
- Dùng type/interface cho public boundary, API request/response, domain result và error code.
- Validate dữ liệu ở mọi system boundary bằng schema library đã được project chọn.
- Phân biệt input chưa tin cậy, validated DTO, domain value object và persistence model.
- Async code phải propagate lỗi rõ; chạy song song các I/O độc lập bằng `Promise.all` khi không có dependency.
- Không đặt business rule tiền trong component, route handler hoặc client utility.
- Không serialize tiền bằng floating-point. Wire amount nên là decimal string; domain dùng integer/exact decimal theo implementation contract.

## React/frontend

- Functional components, props/type rõ, hooks tuân thủ Rules of Hooks.
- State update immutable; state dựa trên state trước đó dùng functional updater.
- Không để client quyết định owner, role, balance, budget authorization hoặc feature flag bảo mật.
- Render rõ loading, empty, validation, success, warning, 401, 403, retry và server error; không hiển thị zero như fallback cho lỗi.
- Mọi input có label, validation, error association và keyboard/focus behavior.
- Mọi visible content, aria label, error/status/warning có `en` và `vi` tương ứng.
- Locale và dark/light là hai preference độc lập; locale không đổi enum/API/formula/audit.
- Chart phải có table/text equivalent; không truyền ý nghĩa chỉ bằng màu.
- Không lưu session token, secret hoặc financial authority trong localStorage/sessionStorage.

## Backend/API

- Route/controller chỉ điều phối: parse request, validate, authn/authz, gọi service, serialize response.
- `user_id`/owner scope lấy từ server session; không tin owner ID từ body/query.
- API response/error dùng envelope và error code ổn định do contract định nghĩa; không trả raw `Error`, stack trace, provider payload hoặc secret.
- Mutation cần CSRF/origin protection, input validation và idempotency khi có thể retry.
- 401, 403, 404, 409, 422, 429 và 5xx phải có semantics nhất quán; lỗi provider không làm lộ chi tiết nội bộ.
- Không giữ database transaction mở trong lúc gọi OpenRouter, email, webhook hoặc worker.
- API phải bounded: pagination/limit, request size, timeout, rate limit, concurrency và retry có chủ đích.

## Domain và database

- Transaction type chỉ `income` và `payment`; không dùng `expense`, `chi phí` hoặc `transfer` làm enum ledger.
- Amount là integer dương VND; không dùng float/double hoặc số âm để biểu diễn hướng.
- Ledger và audit sau commit là immutable/append-only. Correction là row mới có reason, actor, target/reference và audit.
- Payment lock wallet, kiểm tra `available_balance >= amount`, rồi insert/update projection trong cùng transaction; thiếu tiền không tạo row và không làm wallet âm.
- Savings là aggregate riêng; lock order cố định wallet rồi savings; deposit/withdraw atomic và không tính vào income/payment/budget.
- Budget overrun là warning, không phải authorization; payment wallet-sufficient không bị chặn chỉ vì vượt budget.
- Category disabled/retired không nhận row mới nhưng history vẫn đọc được; category đã tham chiếu không hard-delete.
- Mọi financial read/write phải scope theo owner. Query chọn cột cần thiết, có limit và index phù hợp; không dùng `SELECT *` cho boundary quan trọng.
- Business period/date dùng `Asia/Ho_Chi_Minh`; technical instant phải có semantics rõ.
- Retry cùng idempotency key/body không tạo duplicate; body khác trả conflict.
- Projection phải rebuild/reconcile được từ immutable rows; mismatch phải fail closed và mở incident.

## Auth và bảo mật

- MVP dùng email/password/OTP; password/OTP chỉ được xử lý phía server và phải đáp ứng các gate ở `docs/AUTHENTICATION.md`.
- Email OTP chỉ được gửi qua server-side SMTP adapter; không dùng Gmail credential cá nhân, Gmail inbox/API hoặc log/dev fallback chứa OTP.
- Google OIDC chỉ chạy ở server; xác minh state, PKCE, nonce, audience và email đã xác minh; không lưu Google token.
- Browser dùng opaque server-side session trong cookie bảo mật; không dùng JWT browser trong MVP.
- Session phải có expiry/revocation; auth failure, provider failure và DB failure fail closed.
- Mọi state-changing request có CSRF/origin control phù hợp.
- Owner isolation và IDOR phải được kiểm tra ở server; ẩn nút ở UI không phải authorization.
- Redact cookie, password, OTP, reset token, secret, raw claim, raw JEV và financial detail không cần thiết khỏi log.
- Không log dữ liệu người dùng chưa được mask trong error, analytics hoặc tracing.

## JEV/OpenRouter

- JEV optional, backend-only, feature flag mặc định tắt.
- Chỉ dùng typed System One/Decisions contract sau compatibility probe; không gọi chat completion rồi tự parse prose/JSON.
- Use case MVP: category suggestion từ candidate set giới hạn; user phải confirm/override.
- Không gửi balance, savings, amount/date không cần thiết, raw ledger, session, Google claims, secret, admin data hoặc PII thừa.
- JEV không tính arithmetic/date/balance, không authorize và không ghi money state.
- Timeout, quota, 4xx/5xx, schema failure, low confidence hoặc privacy failure phải fallback manual.
- Không giữ money transaction khi chờ provider; log chỉ masked metadata, status, latency, model snapshot, fallback reason và cost bucket.

## File organization

Khi source được tạo, tổ chức theo feature/domain với boundary rõ, không gom mọi thứ vào một file lớn:

```text
src/
├── app/ hoặc routes/       # entrypoint, pages, HTTP routes
├── features/ hoặc modules/ # feature/domain slices
├── domain/                 # entity, value object, invariant, use case
├── application/            # orchestration và ports
├── infrastructure/         # DB, email, OpenRouter và external adapters
├── components/             # UI dùng chung
├── hooks/                  # React hooks dùng chung
├── lib/                    # utility không chứa business authority
├── types/                  # shared boundary types nếu cần
└── styles/                 # styling/theme
```

- Sắp xếp theo feature/domain khi phù hợp; tránh import ngược từ domain vào infrastructure.
- File source thường dưới 400 dòng và không vượt 800 dòng nếu không có lý do rõ.
- Generated, migration và test fixture có thể dài hơn khi vai trò yêu cầu.
- Tên file/component theo convention của framework đã chọn; không tạo second architecture cạnh pattern hiện có.

# Quy ước test

- Test phải bảo vệ observable behavior, invariant, boundary, transition, error và security property; không test implementation detail.
- Test structure dùng AAA: Arrange, Act, Assert.
- Tên test mô tả hành vi và điều kiện, không dùng tên mơ hồ như `works`.
- Unit test cho pure domain/value rules và parser/formatter quan trọng.
- Integration test cho API, auth boundary, repository, migration/transaction và owner scope.
- E2E/smoke test cho critical flow: email/password/OTP, Google login/link, session, wallet baseline, income, payment thành công/thất bại, concurrent payment, savings, budget warning, report, locale/theme và admin least privilege.
- Regression test phải tái hiện bug trước khi sửa khi khả thi.
- Không mock domain invariant hoặc viết test chỉ kiểm tra wiring/forwarding/default/incidental text.
- Không giảm test coverage để làm pass CI; mục tiêu project tối thiểu là 80% khi test infrastructure đã tồn tại.
- Chạy test hẹp trước; full suite chỉ khi cần hoặc user yêu cầu. Ghi rõ command và kết quả thật.

# Comments và documentation

- Comment giải thích “vì sao”, invariant, security trade-off hoặc provider limitation; không comment điều hiển nhiên.
- Public function/class/API có JSDoc khi contract không tự đủ rõ.
- Quyết định kiến trúc, thay đổi khó đảo ngược và scope cut phải có ADR.
- Cập nhật canonical docs cùng thay đổi domain/auth/JEV/deployment; không copy một sự thật vào nhiều file.
- Không đưa raw payload, secret, PII hoặc claim chưa kiểm chứng vào docs.

# Performance

- Không tối ưu sớm; đo trước khi kết luận bottleneck.
- Tránh N+1, unbounded query, `SELECT *`, deep offset pagination và request waterfall.
- Bounded connection pool/concurrency/queue/retry; không làm cạn connection serverless.
- Cache chỉ dữ liệu an toàn, owner-scoped và có invalidation khi mutation/sign-out/session change.
- Không memoize hoặc lazy-load theo phong trào; chỉ làm khi giảm chi phí đo được mà không che lỗi state.
- Không dùng performance shortcut làm suy yếu immutable ledger, authorization, audit hoặc reconciliation.

# Definition of done

1. Đã đọc đúng ADR và canonical source sở hữu nội dung bị thay đổi.
2. Scope, owner boundary, API/domain contract và acceptance liên quan đã được cập nhật nếu cần.
3. Code compile/typecheck/lint/test theo các command thật của repository khi các toolchain đó tồn tại.
4. Test liên quan pass; regression hoặc smoke evidence phù hợp đã được thực hiện.
5. Auth, owner scope, input validation, error boundary, secret handling và logging đã được review.
6. `git diff --check` pass nếu task có thay đổi file.
7. Diff không chứa secret, token, raw PII, debug logging, TODO implementation hoặc fake fallback.
8. Không có SRS/source/doc ngoài phạm vi bị thay đổi.
9. Link tài liệu liên quan còn hợp lệ; ADR được thêm/cập nhật đúng lifecycle.
10. Báo lại từng command đã chạy và kết quả thật. Check chưa chạy hoặc đang fail phải ghi rõ; không báo task hoàn tất.
11. Không giả nhận application behavior, provider availability hoặc production readiness nếu chưa thực sự kiểm chứng.

# Commit messages

- Chỉ tạo commit khi user yêu cầu rõ.
- Summary và phần diễn giải viết bằng tiếng Việt có dấu; file path, identifier và command giữ nguyên.
- Nội dung commit không rỗng và phải nêu rõ:

```text
<tom tat viec da lam>

Why?
<ly do thay doi>

What change?
- path/to/file: <noi dung da thay doi>

Testing
- <test hoặc command da chay va ket qua>
```

- Chỉ thêm section `Testing` khi đã chạy test hoặc verification command; không ghi kiểm tra chưa chạy là pass.
- Không thêm co-author hoặc attribution nếu user chưa yêu cầu và repository chưa có quy ước riêng.
