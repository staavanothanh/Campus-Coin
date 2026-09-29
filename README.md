# Campus Coin

Campus Coin is a bilingual Vietnamese/English web application for student personal finance. Users record their own `income` and `payment` transactions, track a VND wallet, savings, budgets, monthly reports, and transaction history.

> **Status:** the application runtime is implemented in this repository. Production readiness for cloud database, SMTP, OAuth provider, backup/restore, and deployment still requires the corresponding operational gates.

Campus Coin is **not a bank**, does not hold real money, does not process real payments, does not provide loans or BNPL, and does not provide certified financial advice.

## Main features

- Registration, email OTP verification, login, and password recovery.
- Optional Google Sign-In through server-side OIDC; Google tokens are not stored and Gmail APIs are not used.
- Opaque server-side sessions in secure cookies; owner scope always comes from the session.
- VND wallet with an opening balance; payments are recorded only when the wallet has enough funds.
- Append-only ledger with exactly two transaction types: `income` and `payment`.
- Savings deposits/withdrawals are separate from the ledger and excluded from budgets.
- 11 canonical categories: 4 income categories and 7 payment categories.
- Custom categories cannot duplicate the meaning of canonical categories; referenced categories are never hard-deleted.
- Per-category, per-month budgets; exceeding a budget shows a warning but does not block a wallet-sufficient payment.
- Deterministic monthly reports using `Asia/Ho_Chi_Minh`, including cash flow and category breakdowns.
- Pre-submit category suggestions through Luna (`gpt-6-luna`) via a server-only adapter with privacy redaction and manual fallback.
- Responsive React/Vite UI, Vietnamese/English localization, light/dark themes, loading/error/accessibility states.
- Admin area for issue/report triage, audit review, and least-privilege account status management.

### 11 canonical categories

| Type | ID | Vietnamese | English |
|---|---:|---|---|
| Income | 1 | Lương | Salary |
| Income | 2 | Trợ cấp | Allowance |
| Income | 3 | Quà tặng | Gift |
| Income | 4 | Thu nhập khác | Other income |
| Payment | 5 | Ăn uống | Food & Dining |
| Payment | 6 | Di chuyển | Transport |
| Payment | 7 | Mua sắm | Shopping |
| Payment | 8 | Giải trí | Entertainment |
| Payment | 9 | Học tập | Education |
| Payment | 10 | Nhà ở & Điện nước | Rent & Utilities |
| Payment | 11 | Chi tiêu khác | Other payment |

## Quick start

### Requirements

- Node.js `24.x`.
- An npm version compatible with the lockfile.
- Git.
- Isolated MySQL for local runtime and gated database tests.
- Never use a production or shared database for local development/tests.

Check versions:

```bash
node --version
npm --version
git --version
```

### Install dependencies

```bash
npm ci
```

### Create local configuration

```bash
copy .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

Fill local values in `.env`. **Never commit `.env` or print API keys/secrets to logs or chat.** The backend fails closed when required auth, SMTP, or database configuration is missing.

Current Luna profile:

```env
JEV_LOCAL_CATEGORY_SUGGESTION_ENABLED=false
JEV_CATEGORY_SUGGESTION_ENABLED=false
NGHIENAI_LLM_ENABLED=true
NGHIENAI_API_KEY=<secret-local-only>
NGHIENAI_BASE_URL=https://api.aixingialaire.shop/v1
NGHIENAI_MINIMUM_CONFIDENCE=0.8
NGHIENAI_MAX_CANDIDATES=10
```

Luna receives only a redacted description, transaction type, locale, and candidate category labels. It cannot write transactions, change the wallet, calculate balances, or authorize payments. If Luna times out, hits quota, fails privacy checks, or returns an invalid schema, the UI falls back to manual category selection.

### Run locally

Run the API and frontend together:

```bash
npm run dev
```

- API: `http://127.0.0.1:3000`
- Web: `http://127.0.0.1:5173`
- Vite proxies `/api/*` to the local API.

Run only the frontend:

```bash
npm run dev:web
```

Run only the API:

```bash
npm run dev:api
```

Running the frontend alone does not start the API; `/api/*` requests still require the backend on port `3000`.

## Verification commands

### Typecheck and build

```bash
npm run typecheck
npm run build
npm run lint
```

The current `lint` script runs the TypeScript compiler (`tsc --noEmit`).

### Tests

The default test command uses Node's test runner with `tsx`:

```bash
npm test
```

Useful focused suites:

```bash
npm run test -- test/application/jev-category-suggestion.test.js
npm run test -- test/provider-contract/nghienai-gpt-6-luna.test.js
npm run test -- test/provider-contract/nghienai-category.test.js
npm run test -- test/domain/category-taxonomy.test.ts
npm run test -- test/web/jev-suggestion.test.ts
```

Provider contract tests use fake `fetch` and do not send real requests. A live Luna smoke test uses synthetic data only, requires a valid API key, and should not be run as a routine test.

### API contract and generated artifacts

```bash
npm run api:validate
npm run api:bundle
npm run api:types
npm run verify:docs
```

The only contract source is [`docs/contracts/openapi.yaml`](docs/contracts/openapi.yaml). The following files are generated and must not be edited manually:

- `artifacts/openapi.json`
- `artifacts/api.d.ts`

### Database and migrations

```bash
npm run db:preflight
npm run db:status
npm run db:migrate
npm run db:datatest
```

`db:preflight` is read-only. Database tests must use an isolated/disposable MySQL instance with `CAMPUS_COIN_TEST_DB=1`; do not use Aiven `defaultdb`, a production database, or a shared schema for create/drop operations.

Migrations are forward-only, checksummed, and have no `migrate down`. Never edit an applied migration; use a new migration or restore according to the runbook.

## Runtime architecture

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

Vercel builds with `npm run typecheck && npm run build && npm run api:validate`, serves the frontend from `dist`, and configures the API function with a 60-second maximum duration.

## Important domain and security rules

- Money is integer VND; floating point is not used.
- Committed ledger and audit records are immutable/append-only.
- `income` and `payment` are the only transaction types.
- The wallet is authoritative for payments; insufficient-funds payments are rejected atomically.
- Savings is a separate aggregate and locks wallet before savings.
- Budget overrun is a warning; it does not authorize a payment.
- Mutation retries require the same `Idempotency-Key`; a different body returns a conflict.
- Owner IDs are never trusted from client input; the server session is authoritative.
- Mutations require a valid Origin and CSRF policy; responses/redirects use `Cache-Control: no-store, private`.
- Never log passwords, OTPs, cookies, OAuth tokens, API keys, raw PII, raw provider responses, or unnecessary financial details.
- Referenced categories are disabled/retired instead of hard-deleted to preserve history.

## Repository layout

```text
.
├── src/
│   ├── application/       # Use cases and orchestration
│   ├── api/               # API boundary and validation
│   ├── domain/            # Money, period, taxonomy, profile types
│   ├── features/auth/     # Auth, OTP, session, CSRF, rate limits
│   ├── infrastructure/   # MySQL, repositories, SMTP, OAuth, providers
│   └── web/               # React UI, screens, components, hooks
├── api/v1/                # Vercel Node function adapter
├── db/migrations/         # Forward-only SQL migrations
├── artifacts/             # Generated OpenAPI bundle/types
├── docs/                  # Product, architecture, security, ADRs, runbooks
├── test/                  # Unit, integration, contract, DB-gated tests
├── tests/                 # Additional auth/startup/support tests
├── datatest/              # SQL datatest harness
├── public/                # Static assets
├── .env.example           # Secret-free environment template
└── vercel.json            # Deployment/build/routing configuration
```

## Documentation

- [Documentation map](docs/README.md)
- [PRD](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Domain model](docs/DOMAIN-MODEL.md)
- [Authentication and security](docs/AUTHENTICATION.md)
- [AI/Luna category boundary](docs/AI-JEV.md)
- [Delivery plan and gates](docs/DELIVERY-PLAN.md)
- [Current status](docs/CURRENT-STATUS.md)
- [API contract](docs/contracts/openapi.yaml)
- [Database/staging testing](docs/DB-STAGING-TESTING.md)
- [ADR index](docs/adr/README.md)
- [Vietnamese README](README.md)
- [English documentation index](docs_en/README.en.md)

## Scope and responsibility

The repository contains runtime code and local/CI test coverage, but it does not by itself prove production readiness. Before deployment, obtain separate evidence for:

- the correct cloud MySQL target, TLS, grants, backup/restore, and reconciliation;
- the SMTP provider, bounded timeout/retry behavior, and redacted logs;
- live Google OAuth login/link flows if enabled;
- Vercel environment/secrets, preview smoke tests, and rollback;
- accessibility/browser compatibility and production monitoring.

Do not infer production readiness from a passing build, a healthy endpoint, or the existence of a configuration file alone.

## License

No repository license has been published yet.
