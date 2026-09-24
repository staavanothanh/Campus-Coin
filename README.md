# Campus Coin

Ứng dụng Web song ngữ cho sinh viên ghi nhận `income` và `payment` do người dùng tự nhập, theo dõi wallet, savings, budget và báo cáo deterministic.

Campus Coin không phải ngân hàng, không giữ tiền thật, không xử lý payment thật, không cho vay, không BNPL và không cung cấp tư vấn tài chính được chứng nhận.

> Trạng thái hiện tại: đang chuẩn bị API contract và môi trường phát triển local. Chưa có application runtime hoàn chỉnh.

## 1. Bắt đầu nhanh

### Yêu cầu máy

- Node.js `24.14.1` hoặc compatible LTS đã được Team Leader duyệt.
- npm `11` hoặc compatible.
- Git.
- Không dùng pnpm, Yarn hoặc Bun khi chưa có quyết định riêng.
- Không cần database local cho bước contract hiện tại.

Kiểm tra:

```bash
node --version
npm --version
git --version
```

### Cài dependency

Tại root repository:

```bash
npm ci
```

Nếu chưa có `package-lock.json` tương ứng, không dùng `npm install` tùy tiện để thay đổi dependency graph; báo integrator hoặc Team Leader trước.

### Xác minh API contract

```bash
npm run api:validate
npm run api:bundle
npm run api:types
npm run verify:docs
```

Các artifact sinh ra:

```text
artifacts/openapi.json
artifacts/api.d.ts
```

Không sửa tay hai file này. Nguồn duy nhất là [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml).

### Trạng thái source runtime

Workspace có contract/tooling, tài liệu và lane MySQL (migrations + persistence services, `src/infrastructure/db`, `src/infrastructure/persistence`, `src/application`, tests). Scripts `typecheck`, `db:preflight`, `db:status`, `db:migrate`, `test` đã khả dụng. `dev`, `build`, `lint` chưa tồn tại cho đến khi app runtime (routes/UI) được tạo; không coi script placeholder là môi trường chạy được.

## 2. Cấu trúc project dự kiến

```text
.
├── AGENTS.md                         # Quy tắc bắt buộc cho toàn codebase
├── README.md                         # Hướng dẫn setup và workflow team
├── package.json                      # Scripts và dependency canonical
├── package-lock.json                 # Lockfile npm
├── docs/
│   ├── README.md                     # Bản đồ và thứ tự ưu tiên tài liệu
│   ├── PRD.md                        # Phạm vi và acceptance sản phẩm
│   ├── ARCHITECTURE.md               # Boundary kiến trúc
│   ├── DOMAIN-MODEL.md               # Entity, formula, invariant tiền
│   ├── AUTHENTICATION.md             # OAuth, session, CSRF, owner scope
│   ├── AI-JEV.md                     # JEV/OpenRouter boundary
│   ├── DELIVERY-PLAN.md              # Gate và trạng thái giao hàng
│   ├── adr/                          # Quyết định khó đảo ngược
│   ├── contracts/
│   │   ├── openapi.yaml              # HTTP contract canonical
│   │   ├── README.md                 # Quy tắc contract/generated files
│   │   ├── API-REVIEW.md             # Risk review và constraint cần chốt
│   │   └── TEAM-HANDOFF.md           # Handoff điều phối API
│   └── working/                      # Handoff/replan/evidence quy trình
├── artifacts/                        # Generated; không sửa tay
│   ├── openapi.json
│   └── api.d.ts
├── src/                              # Application source sẽ được tạo sau
│   ├── app/ hoặc routes/             # HTTP routes/pages/entrypoints
│   ├── features/ hoặc modules/       # Feature/domain slices
│   ├── domain/                       # Entity, value object, invariant, use case
│   ├── application/                 # Orchestration và ports
│   ├── infrastructure/              # DB, OAuth, OpenRouter, external adapters
│   ├── components/                   # UI components dùng chung
│   ├── hooks/                        # React hooks dùng chung
│   ├── lib/                          # Utility không chứa money authority
│   └── types/                        # Shared boundary types nếu cần
├── tests/                            # Unit, integration, contract, E2E/smoke
└── SRS_End-to-End Web Solutions/     # SRS nguồn; không sửa tùy tiện
```

`db/` và `src/`/`tests/` đã có phần persistence MySQL (migrations, pool, repositories, services money) và unit tests; app runtime (routes/UI) chưa được scaffold. Cấu trúc trên là target architecture — xem [`db/README.md`](db/README.md) cho lane DB.

## 3. Tài liệu cần đọc theo task

| Công việc | Đọc trước | Nguồn kiểm chứng |
|---|---|---|
| API/HTTP contract | `docs/contracts/openapi.yaml`, `docs/contracts/README.md` | `npm run api:validate` |
| Auth/session | `docs/AUTHENTICATION.md`, ADR-0001/0002 | Auth/IDOR/CSRF tests |
| Money/domain | `docs/DOMAIN-MODEL.md`, ADR-0005 | Transaction/reconciliation tests |
| Kiến trúc | `docs/ARCHITECTURE.md` | Source boundary và integration tests |
| Scope/gate | `docs/PRD.md`, `docs/DELIVERY-PLAN.md` | Acceptance/smoke evidence |
| Quyết định mới | `docs/adr/README.md` | ADR lifecycle |
| Handoff/quy trình | `docs/working/README.md` | Working evidence, không phải authority |

Thứ tự ưu tiên khi có mâu thuẫn:

1. Yêu cầu hiện hành của Team Leader.
2. ADR đã chấp nhận.
3. Invariant trong `DOMAIN-MODEL.md` và `AUTHENTICATION.md`.
4. Canonical product/architecture/delivery docs.
5. Working handoff và replan.

## 4. Quy ước API bắt buộc

- Prefix API: `/api/v1`.
- `docs/contracts/openapi.yaml` là contract HTTP duy nhất.
- Không tạo DTO/schema độc lập ở frontend và backend.
- Generated types phải sinh từ OpenAPI.
- Error code là locale-neutral; UI tự dịch message.
- Browser dùng opaque server-side session cookie; không dùng JWT browser trong MVP.
- Owner scope luôn lấy từ session; client không gửi owner authority.
- State-changing request cần Origin/CSRF policy.
- Money mutation cần `Idempotency-Key`.
- Retry cùng idempotency key và cùng body phải trả kết quả đã lưu; body khác trả conflict.
- Tiền là integer VND; không dùng floating point.
- Ledger chỉ có `income` và `payment`; ledger immutable/append-only.
- Wallet và savings là hai aggregate riêng.
- Savings transfer không phải ledger transaction và không tính budget.
- Budget overrun là warning, không authorize hoặc block payment khi wallet đủ.
- List lớn dùng opaque keyset cursor; không yêu cầu exact `total`.
- JEV backend-only, optional, default-off, typed contract, manual fallback; không tính/authorize/ghi tiền.

## 5. Quy ước code

- TypeScript strict khi toolchain hỗ trợ; tránh `any`, cast tùy tiện và non-null assertion.
- Validate mọi input tại system boundary.
- Route/controller chỉ parse, auth, validate, gọi service và serialize; không gọi database trực tiếp.
- Domain không import SDK OpenRouter/TypeSafe.
- Không mutation mặc định; không sửa object/array dùng chung nếu không cần.
- Không nuốt lỗi, `catch` rỗng, fake data hoặc fallback im lặng.
- Tên hàm dùng verb-noun; boolean dùng `is`, `has`, `can`, `should`.
- Tránh magic number, N+1, unbounded query, `SELECT *`, deep offset và retry vô hạn.
- Function/file phải nhỏ và có trách nhiệm rõ; không tạo second architecture cạnh pattern đã chọn.
- Comment giải thích “vì sao”, invariant hoặc security trade-off; không ghi điều hiển nhiên.

## 6. Domain và bảo mật

Không được phá các bất biến sau:

- Google OAuth-only; không local password, linking, OTP/reset hoặc Gmail inbox.
- Session opaque server-side, expiry/revocation, CSRF/Origin và owner isolation.
- Payment lock wallet, kiểm tra đủ tiền atomic; wallet không bao giờ âm.
- Savings lock theo thứ tự wallet rồi savings.
- Correction không update/delete ledger cũ; dùng append-only row có reason/reference/audit.
- Category đã tham chiếu không hard-delete; disable/retire để giữ history.
- Period/report dùng `Asia/Ho_Chi_Minh`.
- Admin không sửa ledger, balance hoặc audit; role phải least privilege.
- Không log OAuth token, cookie, password, OTP, secret, raw JEV, raw PII hoặc financial detail không cần thiết.

Không thêm admin bootstrap, role provisioning, correction authority, incident read-only switch hoặc JEV authority mới nếu chưa có contract/review/ADR phù hợp.

## 7. Workflow team

### Trước khi code

1. Đọc `AGENTS.md`.
2. Đọc canonical docs sở hữu boundary.
3. Xác định owner, filescope, acceptance và merge gate.
4. Nếu thay đổi API, sửa OpenAPI trước implementation.
5. Kiểm tra consumer/provider affected.

### Trong khi code

- Làm task nhỏ, một owner, không overlap writes.
- Không sửa ADR/architecture/SRS ngoài scope được duyệt.
- Không sửa generated artifacts bằng tay.
- Ghi blocker và assumption vào handoff; không biến assumption thành fact.
- Chạy verification hẹp sau mỗi boundary change.

### Trước khi giao

- Contract validate.
- Generated artifacts regenerate được.
- Test/verification liên quan pass.
- Security và owner scope được review.
- `git diff --check` pass.
- Diff không chứa secret, token, raw PII, debug log, fake fallback hoặc TODO implementation.
- Báo đúng command đã chạy và kết quả thật.

## 8. Testing và verification

Khi runtime tồn tại, tối thiểu cần:

- Unit: domain formula, amount/date/category/idempotency rules.
- Integration: API, session, CSRF, owner scope, repository, MySQL transaction/migration.
- Contract: provider response và consumer fixtures cùng validate từ OpenAPI.
- E2E/smoke: Google login, onboarding, income, payment success/failure, concurrent payment, savings, budget warning, report, locale/theme, admin least privilege và JEV-off.
- Regression test cho bug đã sửa.

Chạy test hẹp trước; chỉ chạy full suite khi blueprint step, CI gate hoặc Team Leader yêu cầu.

## 9. Environment và secrets

- Không commit `.env`, `.env.*`, Vercel local state, secret hoặc credential.
- Chỉ commit `.env.example` nếu không chứa giá trị thật.
- Preview/staging không dùng production secret/database.
- OpenRouter key chỉ ở server environment.
- Không in secret trong startup validation, log hoặc error response.
- Database production phải là cloud MySQL sau TLS/connectivity/backup/restore gate; không dùng local DB làm production fallback.

## 10. Lệnh thường dùng

```bash
npm ci
npm run api:validate
npm run api:bundle
npm run api:types
npm run verify:docs
npm run typecheck
npm test
npm run db:preflight   # cần CAMPUS_COIN_DB_* (xem db/README.md)
npm run db:migrate
git diff --check
```

Các lệnh sau chỉ khả dụng sau khi implementation tương ứng tồn tại:

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```

Không tự thêm hoặc chạy lệnh chưa được khai báo trong `package.json` nếu chưa đọc manifest và xác định toolchain.

## 11. Commit và release

- Không commit, push, tạo PR hoặc deploy nếu user chưa yêu cầu rõ.
- Commit message viết bằng tiếng Việt có dấu; path, identifier và command giữ nguyên.
- Mọi commit phải nêu `Why?`, `What change?` và `Testing` nếu đã chạy kiểm tra.
- Release chỉ được gọi là ready khi auth, owner scope, domain invariant, restore, security, logs, rollback và production smoke có evidence.
- JEV chưa đạt probe vẫn có thể launch với JEV off và manual category picker.

## 12. Liên kết chính

- [AGENTS.md](AGENTS.md)
- [Bản đồ tài liệu](docs/README.md)
- [API contract](docs/contracts/openapi.yaml)
- [Quy tắc API contract](docs/contracts/README.md)
- [API risk review](docs/contracts/API-REVIEW.md)
- [API team handoff](docs/contracts/TEAM-HANDOFF.md)
- [ADR index](docs/adr/README.md)
- [Delivery plan](docs/DELIVERY-PLAN.md)
