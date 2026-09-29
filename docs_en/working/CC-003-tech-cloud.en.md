# CC-003 — Technology, Cloud, and Database Handoff

- **Human Owner:** Developer B; collaborating with A/D.
- **Status:** Recommendations integrated; provider/region awaiting Day 1.
- **Decisions:** [ADR-0003](../adr/0003-cloud-mysql-validation-gate.en.md), [ADR-0004](../adr/0004-vercel-domain-no-custom-email.en.md).

## Deployment Architecture

React/TypeScript and Node API/TypeScript running on a Vercel-provided domain; cloud MySQL over TLS. Provider, region, quota, connection limits, latency, backup/restore, and engine behavior must not be assumed without verification.

## Rationale for MySQL

MySQL/InnoDB is suited for monetary transactions, foreign keys, wallet row locking, immutable references, and monthly reporting. MongoDB was rejected as the authoritative source for MVP. Local databases must not be used in production.

## Data Principles

- VND integer or exact decimal; never use FLOAT/DOUBLE or floating-point JS numbers for authoritative arithmetic.
- Technical timestamps are UTC-compatible; local monthly and daily boundaries strictly adhere to `Asia/Ho_Chi_Minh`.
- Migrations are versioned and non-destructive; the runtime DB role must not have UPDATE/DELETE privileges on ledger/audit tables.
- Serverless connection pool must be strictly bounded; secrets reside exclusively in Vercel environment variables.
- Backup/restore rehearsals must occur in an isolated DB with reconciliation verified against the immutable ledger.

## Day-1 Evidence

Developer B documents provider documentation/account evidence, TLS configuration, limits, Vercel connectivity, restore/export capabilities, migration preflight results, and expected latency. If the free tier proves insufficiently stable, the Team Leader selects another verified candidate or approves a paid alternative.

## Handoff

Developer B delivers migrations and versioning, API contracts, health/readiness endpoints, restore smoke tests, and DB error boundary definitions to Developer D; and delivers owner-scoped read models to Developer C. Developer A owns sessions and environment variables; Developer D owns release procedures. Canonical details reside in `ARCHITECTURE.md`, `DOMAIN-MODEL.md`, and `DELIVERY-PLAN.md`.
