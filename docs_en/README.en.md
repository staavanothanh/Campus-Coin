# Campus Coin — Documentation and Decision Map

## 1. Purpose

Campus Coin is a bilingual web application designed for university students to track manually entered `income` and `payment` transactions, manage wallet and savings balances, establish budgets, and review financial reports. The product is not a bank, does not hold real funds, does not process real monetary transactions, does not provide lending or BNPL services, and does not provide certified financial advice.

This document serves as the documentation map. Irreversible decisions reside in [`adr/README.en.md`](./adr/README.en.md). Current execution plans reside in [`DELIVERY-PLAN.en.md`](./DELIVERY-PLAN.en.md). Documentation alone does not prove that third-party providers are operational without release verification evidence.

## 1.1. Directory Structure

```text
docs/
├── README.md                 # Documentation map and precedence rules
├── DECISIONS.md              # Quick-reference decision table
├── PRD.md                    # Product requirements and scope
├── ARCHITECTURE.md           # System architecture and boundaries
├── DOMAIN-MODEL.md           # Domain data models and invariants
├── AUTHENTICATION.md         # Authentication and authorization
├── AI-JEV.md                 # OpenRouter and JEV boundaries
├── ADMIN-OPERATIONS.md       # Administration and operational runbooks
├── ROADMAP.md                # Roadmap and deferred work
├── DELIVERY-PLAN.md          # 5-day delivery plan (Days 0–5)
├── TEAM-BOARD.md             # Human team execution board
├── CURRENT-STATUS.md         # Decisions, pushed commits, evidence, and open gates
├── QUALITY-AND-SCORING.md    # Scoring rubric and evidence requirements
├── DB-STAGING-TESTING.md     # Isolated DB testing, staging auth, and owner scoping
├── ENGINEERING-PRINCIPLES-APPLICATION.md # Technical questions and practical applications
├── adr/                      # Architectural decision records (canonical history)
└── working/                  # Handoffs, replan artifacts, and interim evidence
    ├── README.md             # Working docs rules and taxonomy
    ├── team-handoff-2026-09-26/ # DB/benchmark, UI, and Vercel/SMTP owner tasks
    └── replan/               # Evidence for current replan cycle
```

Root `docs/` houses canonical product documentation; `adr/` houses canonical architectural history; files in `working/` must never override decisions in ADRs or canonical documents.

## 2. Locked Decisions

| Subject | Decision | ADR |
|---|---|---|
| Authentication | Email + password + OTP; optional Google Sign-In; opaque server-side session | [ADR-0008](./adr/0008-email-password-otp-auth.en.md), [ADR-0009](./adr/0009-optional-google-sign-in.en.md) |
| Browser Session | Opaque server-side session, secure cookies, owner resolved from session | [ADR-0002](./adr/0002-opaque-browser-session.en.md) |
| Database | Cloud MySQL following provider/region/free-tier/restore validation gates | [ADR-0003](./adr/0003-cloud-mysql-validation-gate.en.md) |
| Deployment & Email | Vercel domain; custom email domain not required; OTP SMTP provider must be verified | [ADR-0004](./adr/0004-vercel-domain-no-custom-email.en.md), [ADR-0008](./adr/0008-email-password-otp-auth.en.md) |
| Money | Immutable `income`/`payment`, integer VND, segregated savings, warning-only budgets | [ADR-0005](./adr/0005-immutable-money-domain.en.md) |
| JEV | Optional, backend-only, OpenRouter typed contract, default-off, manual fallback | [ADR-0006](./adr/0006-optional-openrouter-jev.en.md) |
| User Profile | Optional birth date and gender, self-service only, restricted access permissions | [ADR-0010](./adr/0010-optional-profile-details.en.md) |
| Delivery | 4–5 day thin-slice, four developers, Team Leader owns GO/NO-GO | [ADR-0007](./adr/0007-five-day-thin-slice.md) |

## 3. Canonical Documentation Map

| Document | Primary Function |
|---|---|
| [`PRD.en.md`](./PRD.en.md) | Objectives, MVP scope, acceptance criteria, and out-of-scope boundaries |
| [`ARCHITECTURE.en.md`](./ARCHITECTURE.en.md) | Architectural layers, boundaries, deployment topology, and dependencies |
| [`DOMAIN-MODEL.en.md`](./DOMAIN-MODEL.en.md) | Domain entities, business formulas, invariants, and transaction rules |
| [`AUTHENTICATION.en.md`](./AUTHENTICATION.en.md) | Email/password/OTP, Google Sign-In, sessions, CSRF, owner scope, threat models |
| [`AI-JEV.en.md`](./AI-JEV.en.md) | OpenRouter/JEV boundaries, compatibility probes, privacy, and fallbacks |
| [`ADMIN-OPERATIONS.en.md`](./ADMIN-OPERATIONS.en.md) | Least-privilege roles, issue workflows, audit trails, and incident handling |
| [`ROADMAP.en.md`](./ROADMAP.en.md) | MVP milestones, deferred capabilities, operational risks, and gates |
| [`DELIVERY-PLAN.en.md`](./DELIVERY-PLAN.en.md) | 5-day delivery plan, ownership matrix, checklists, and rollbacks |
| [`DECISIONS.en.md`](./DECISIONS.en.md) | ADR-compatible decision index; canonical rationale lives in `docs/adr/` |
| [`TEAM-BOARD.en.md`](./TEAM-BOARD.en.md) | Human team ownership and execution status board |
| [`CURRENT-STATUS.en.md`](./CURRENT-STATUS.en.md) | Current decisions, pushed commits, test evidence, and open release gates |
| [`QUALITY-AND-SCORING.en.md`](./QUALITY-AND-SCORING.en.md) | Rubric weights, priority sequencing, and required proof artifacts |
| [`DB-STAGING-TESTING.en.md`](./DB-STAGING-TESTING.en.md) | Isolated DB testing protocol, staging auth/email, and owner checks |
| [`ENGINEERING-PRINCIPLES-APPLICATION.en.md`](./ENGINEERING-PRINCIPLES-APPLICATION.en.md) | Engineering Q&A and practical application to codebase |
| [`working/team-handoff-2026-09-26/`](../../docs/working/team-handoff-2026-09-26/README.md) | Owner guides for DB/benchmark, UI/accessibility, and Vercel/SMTP/release |

## 4. Order of Precedence on Conflict

1. Current requirements and direct decisions from the Team Leader.
2. Formally accepted ADRs.
3. Invariants documented in `DOMAIN-MODEL.md` and `AUTHENTICATION.md`.
4. PRD, architecture, delivery plan, and roadmap.
5. Handoffs in `docs/working/` are advisory evidence only and cannot reopen settled decisions.

## 5. Mandatory Vocabulary

- Use `income` and `payment` for enum/API/domain; the UI renders them as "Income" / "Thu nhập" and "Payment" / "Thanh toán".
- Never use `expense` or generic expense labels as transaction types.
- Wallet is the primary transaction account; savings is a separate savings aggregate; savings transfers are not ledger transactions.
- JEV is strictly advisory; it possesses zero financial authority.
- `en`/`vi` locale controls presentation only; it never alters enums, formulas, audits, or authorization logic.

## 6. Update Rules and Source Ownership

| Knowledge Domain | Single Source of Truth | Never Duplicate Decisions In |
|---|---|---|
| Irreversible decisions | [`adr/`](./adr/) | Handoffs, roadmaps, boards |
| Requirements / scope / acceptance | [`PRD.en.md`](./PRD.en.md) | ADRs except within decision context |
| Money invariants and formulas | [`DOMAIN-MODEL.en.md`](./DOMAIN-MODEL.en.md) | UI code or handoffs |
| Auth / session / owner scope | [`AUTHENTICATION.en.md`](./AUTHENTICATION.en.md) | Stale handoffs |
| Current status / open gates | [`DELIVERY-PLAN.en.md`](./DELIVERY-PLAN.en.md) | ADRs |
| Scoring rubric and evidence | [`QUALITY-AND-SCORING.en.md`](./QUALITY-AND-SCORING.en.md) | ADRs |
| DB / staging test procedures | [`DB-STAGING-TESTING.en.md`](./DB-STAGING-TESTING.en.md) | `.env` files or secret-bearing handoffs |
| UI, API, React, and data principles | [`ENGINEERING-PRINCIPLES-APPLICATION.en.md`](./ENGINEERING-PRINCIPLES-APPLICATION.en.md) | Canonical ADRs/domain specifications |
| Process evidence | [`working/`](./working/) | Canonical decision documents |

Authentication changes must update ADR-0008/0009/0002, `AUTHENTICATION.md`, `ARCHITECTURE.md`, and relevant acceptance criteria. ADR-0001/0007 are preserved intact as historical milestones. Monetary invariant changes must update ADR-0005, `DOMAIN-MODEL.md`, `PRD.md`, and delivery gates. JEV changes must update ADR-0006 and `AI-JEV.md`. Never record secrets, tokens, raw PII, or unverified provider claims in documentation.
