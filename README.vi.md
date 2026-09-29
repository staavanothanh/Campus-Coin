# Campus Coin

Campus Coin là ứng dụng web quản lý tài chính cá nhân song ngữ Việt/Anh dành cho sinh viên. Người dùng tự ghi nhận các giao dịch `income` và `payment`, theo dõi ví VND, savings, ngân sách, báo cáo tháng và lịch sử giao dịch.

> **Trạng thái:** application runtime đã được triển khai trong repository. Production readiness của database cloud, SMTP, OAuth provider, backup/restore và deployment vẫn cần được kiểm tra theo các gate vận hành tương ứng.

Campus Coin **không phải ngân hàng**, không giữ tiền thật, không xử lý thanh toán thật, không cho vay, không cung cấp BNPL và không đưa ra tư vấn tài chính được chứng nhận.

## Tính năng chính

- Đăng ký, xác minh email bằng OTP, đăng nhập và khôi phục mật khẩu.
- Google Sign-In tùy chọn qua server-side OIDC; không lưu Google token và không dùng Gmail API.
- Session opaque phía server trong cookie bảo mật; owner scope luôn lấy từ session.
- Wallet VND với số dư khởi tạo; payment chỉ được ghi khi ví đủ tiền.
- Ledger append-only cho đúng hai loại giao dịch: `income` và `payment`.
- Savings deposit/withdraw tách khỏi ledger và không tính vào budget.
- 11 danh mục canonical: 4 nhóm thu nhập và 7 nhóm chi tiêu.
- Ngăn danh mục tùy chỉnh trùng ý nghĩa với danh mục canonical; danh mục đã được tham chiếu không bị hard-delete.
- Budget theo danh mục/tháng, cảnh báo vượt hạn mức nhưng không chặn payment khi ví đủ tiền.
- Báo cáo deterministic theo tháng `Asia/Ho_Chi_Minh`, gồm dòng tiền và phân bổ theo danh mục.
- Gợi ý danh mục trước khi lưu giao dịch bằng Luna (`gpt-6-luna`) qua adapter server-only, với privacy redaction và manual fallback.
- Giao diện React/Vite responsive, Việt/Anh, light/dark theme, loading/error/accessibility states.
- Khu vực admin cho issue/report triage, audit và quản lý trạng thái tài khoản theo least privilege.

### 11 danh mục canonical

| Loại | ID | Tên tiếng Việt | Tên tiếng Anh |
|---|---:|---|---|
| Thu nhập | 1 | Lương | Salary |
| Thu nhập | 2 | Trợ cấp | Allowance |
| Thu nhập | 3 | Quà tặng | Gift |
| Thu nhập | 4 | Thu nhập khác | Other income |
| Chi tiêu | 5 | Ăn uống | Food & Dining |
| Chi tiêu | 6 | Di chuyển | Transport |
| Chi tiêu | 7 | Mua sắm | Shopping |
| Chi tiêu | 8 | Giải trí | Entertainment |
| Chi tiêu | 9 | Học tập | Education |
| Chi tiêu | 10 | Nhà ở & Điện nước | Rent & Utilities |
| Chi tiêu | 11 | Chi tiêu khác | Other payment |

## Bắt đầu nhanh

### Yêu cầu

- Node.js `24.x`.
- npm tương thích với lockfile.
- Git.
- MySQL cô lập cho runtime local và các test database gated.
- Không dùng database production hoặc shared database cho local/test.

Kiểm tra phiên bản:

```bash
node --version
npm --version
git --version
```

### Cài dependency

```bash
npm ci
```

### Tạo cấu hình local

```bash
copy .env.example .env
```

Trên PowerShell có thể dùng:

```powershell
Copy-Item .env.example .env
```

Điền các giá trị local vào `.env`. **Không commit `.env` và không in API key/secret vào log hoặc chat.** Backend sẽ fail closed nếu thiếu auth secret, SMTP hoặc database configuration bắt buộc.

Profile Luna hiện tại:

```env
JEV_LOCAL_CATEGORY_SUGGESTION_ENABLED=false
JEV_CATEGORY_SUGGESTION_ENABLED=false
NGHIENAI_LLM_ENABLED=true
NGHIENAI_API_KEY=<secret-local-only>
NGHIENAI_BASE_URL=https://api.aixingialaire.shop/v1
NGHIENAI_MINIMUM_CONFIDENCE=0.8
NGHIENAI_MAX_CANDIDATES=10
```

Luna chỉ nhận description đã redacted, transaction type, locale và candidate category labels. Luna không có quyền ghi transaction, thay đổi wallet, tính balance hoặc authorize payment. Khi Luna timeout, quota lỗi, privacy fail hoặc trả schema không hợp lệ, UI quay về chọn danh mục thủ công.

### Chạy local

Chạy cả API và frontend:

```bash
npm run dev
```

- API: `http://127.0.0.1:3000`
- Web: `http://127.0.0.1:5173`
- Vite proxy chuyển `/api/*` tới API local.

Chạy riêng frontend:

```bash
npm run dev:web
```

Chạy riêng API:

```bash
npm run dev:api
```

Frontend riêng không tự khởi động API; các request `/api/*` vẫn cần backend trên port `3000`.

## Lệnh kiểm tra

### Typecheck và build

```bash
npm run typecheck
npm run build
npm run lint
```

`lint` hiện dùng TypeScript compiler (`tsc --noEmit`) theo scripts của project.

### Test

Test mặc định dùng Node test runner và `tsx`:

```bash
npm test
```

Một số nhóm test hữu ích:

```bash
npm run test -- test/application/jev-category-suggestion.test.js
npm run test -- test/provider-contract/nghienai-gpt-6-luna.test.js
npm run test -- test/provider-contract/nghienai-category.test.js
npm run test -- test/domain/category-taxonomy.test.ts
npm run test -- test/web/jev-suggestion.test.ts
```

Test provider dùng fake `fetch` và không cần gửi request thật. Live Luna smoke test chỉ dùng dữ liệu synthetic, cần API key hợp lệ và không nên chạy như test thường xuyên.

### API contract và generated artifacts

```bash
npm run api:validate
npm run api:bundle
npm run api:types
npm run verify:docs
```

Nguồn contract duy nhất là [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml). Hai artifact sau được sinh tự động, không sửa tay:

- `artifacts/openapi.json`
- `artifacts/api.d.ts`

### Database và migration

```bash
npm run db:preflight
npm run db:status
npm run db:migrate
npm run db:datatest
```

`db:preflight` là read-only. Các test database phải chạy trên MySQL disposable/cô lập với `CAMPUS_COIN_TEST_DB=1`; không dùng Aiven `defaultdb`, production database hoặc shared schema cho thao tác tạo/xóa.

Migration forward-only, có checksum và không có `migrate down`. Không sửa migration đã apply; sửa bằng migration mới hoặc restore theo runbook.

## Kiến trúc runtime

```text
React/Vite browser
        │
        ▼
Node API / Vercel Function
  validation · session · Origin/CSRF · owner scope · idempotency
        │
        ├── Application services
        │     wallet · ledger · savings · category · budget · report · issue · admin
        │
        ├── Provider adapters
        │     SMTP · Google OIDC · Luna category suggestion
        │
        └── Cloud/MySQL persistence
              repositories · locks · audit · append-only boundaries
```

Local entrypoint: `src/local-server.ts`.

Vercel entrypoint: `api/v1/[...path].ts`.

Vercel build dùng `npm run typecheck && npm run build && npm run api:validate`, output frontend ở `dist` và API function có `maxDuration` 60 giây.

## Quy tắc miền và bảo mật quan trọng

- Tiền là integer VND; không dùng floating point.
- Ledger và audit đã commit là immutable/append-only.
- `income` và `payment` là hai transaction type duy nhất.
- Wallet là nguồn sự thật cho payment; payment thiếu tiền bị reject atomic.
- Savings là aggregate riêng và lock theo thứ tự wallet rồi savings.
- Budget overrun chỉ là warning; không tự authorize payment.
- Retry mutation cần cùng `Idempotency-Key`; body khác trả conflict.
- Owner ID không lấy từ request client; luôn lấy từ session server-side.
- Mutation cần Origin hợp lệ và CSRF policy; response/redirect dùng `Cache-Control: no-store, private`.
- Không log password, OTP, cookie, OAuth token, API key, raw PII, raw provider response hoặc financial detail không cần thiết.
- Category đã tham chiếu chỉ được disable/retire để giữ lịch sử.

## Cấu trúc repository

```text
.
├── src/
│   ├── application/       # Use cases và orchestration
│   ├── api/               # API boundary và validation
│   ├── domain/            # Money, period, taxonomy, profile types
│   ├── features/auth/     # Auth, OTP, session, CSRF, rate limit
│   ├── infrastructure/   # MySQL, repositories, SMTP, OAuth, providers
│   └── web/               # React UI, screens, components, hooks
├── api/v1/                # Vercel Node function adapter
├── db/migrations/         # SQL migrations forward-only
├── artifacts/             # Generated OpenAPI bundle/types
├── docs/                  # Product, architecture, security, ADR, runbooks
├── test/                  # Unit, integration, contract, DB-gated tests
├── tests/                 # Additional auth/startup/support tests
├── datatest/              # SQL datatest harness
├── public/                # Static assets
├── .env.example           # Secret-free environment template
└── vercel.json            # Deployment/build/routing configuration
```

## Tài liệu chính

- [Bản đồ tài liệu](docs/README.md)
- [PRD](docs/PRD.md)
- [Kiến trúc](docs/ARCHITECTURE.md)
- [Mô hình miền](docs/DOMAIN-MODEL.md)
- [Xác thực và bảo mật](docs/AUTHENTICATION.md)
- [AI/Luna category boundary](docs/AI-JEV.md)
- [Kế hoạch giao hàng và gate](docs/DELIVERY-PLAN.md)
- [Trạng thái hiện tại](docs/CURRENT-STATUS.md)
- [API contract](docs/contracts/openapi.yaml)
- [DB/staging testing](docs/DB-STAGING-TESTING.md)
- [ADR index](docs/adr/README.md)
- [English documentation index](docs_en/README.en.md)

## Giới hạn và trách nhiệm

Repository có code runtime và test coverage cho local/CI, nhưng không tự chứng minh production readiness. Trước khi deploy cần có evidence riêng cho:

- cloud MySQL đúng target, TLS, grants, backup/restore và reconcile;
- SMTP provider, timeout/retry và redacted logs;
- Google OAuth live login/link nếu bật;
- Vercel environment/secrets, preview smoke và rollback;
- accessibility/browser compatibility và production monitoring.

Không suy ra production readiness chỉ từ việc build pass, health endpoint pass hoặc file cấu hình tồn tại.

## License

Chưa công bố license cho repository này.
