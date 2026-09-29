# RP-B — Immutable Domain and MySQL Handoff

- **Human Owner:** Developer B
- **Status:** Recommendations consolidated; provider/region awaiting Day 1.
- **ADRs:** [0003](../../adr/0003-cloud-mysql-validation-gate.en.md), [0005](../../adr/0005-immutable-money-domain.en.md).

## Thin Slice

Wallet baseline, immutable `income`/`payment`, atomic insufficient-wallet block, append-only corrections, atomic savings transfers, payment budget warnings, category history, owner-scoped reports, idempotency, keyset pagination, issue queues, and backup/restore.

## Invariants

Owner is derived from Developer A's session; amount is a positive integer in VND; types are strictly income/payment; ledger/audit tables cannot be updated or deleted; payments lock the wallet; savings transfers lock wallet then savings; budget warnings do not authorize; period boundaries adhere to HCMC timezone; retries are idempotent; JEV is never included in financial transactions.

## Minimum Schema/API

`wallet_accounts`, `ledger_transactions`, `savings_accounts`, `savings_transfers`, `categories`, `budgets`, `mutation_idempotency`, `audit_events`, `issues`, and `issue_events`. API does not accept client-calculated final balances or client-supplied owners. Error codes are locale-neutral; UI manages its own localization.

## Day-1 / Day-4 Gates

Verify MySQL provider/region/free-tier, TLS, connections, engine/ORM behavior, Vercel connectivity, backup/export/restore, and latency. On Day 4, restore to an isolated DB and reconcile wallet/savings/FK/reversals/idempotency/append-only invariants prior to opening writes.

## Handoff

Developer B provides authoritative read models, error contracts, period definitions, and idempotency handling to C; migration, health checks, restore procedures, and log boundaries to D. B does not parse Google tokens, does not perform financial math on the client, and does not invoke JEV inside transactions. Team Leader decides provider/region and release.
