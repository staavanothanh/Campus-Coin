# Domain Model — Campus Coin

## 1. Principles

Campus Coin is a manual ledger tracking expenses entered by users, not a bank statement parser. The domain prioritizes correctness, auditability, owner scoping, and reproducible state reconstruction.

- Single Currency: strictly VND.
- Amounts are positive integers; never floating-point.
- Only two transaction types: `income` and `payment`.
- Committed ledger entries and audit records are immutable and append-only.
- The wallet is the exclusive source for payments; savings is an independent aggregate.
- Budgets provide advisory warnings only; they do not perform authorization.
- JEV never writes balances, decides authorization, or mutates ledger rows.
- Business calendar and reporting periods adhere to `Asia/Ho_Chi_Minh`.

## 2. Entities

### User and AuthCredential

`User` contains an immutable `id`, display name, verified email, status, locale, timezone, and timestamps; date of birth (`birth_date`) and gender (`gender`) are optional profile fields, readable and writable only by the current authenticated owner. Admin listings never expose these fields. `AuthCredential` stores server-side password salt/hashes; OTP challenges record hash, purpose, expiration, attempt counts, and creation timestamp. Optional Google Sign-In records identities as `(provider=google, subject=sub)` in `auth_identities`; account linking requires an active session and explicit user action, with no automatic merging by email. Never store personal Gmail credentials, inboxes, APIs, or Google tokens. All financial queries are strictly scoped by `user_id` derived from the session.

### WalletAccount

Each user possesses exactly one wallet. `initial_wallet_balance` represents a baseline entered by the user during onboarding; it is not an income transaction and creates no synthetic history. `available_balance` is a projection updated atomically by the backend within transactions.

### LedgerTransaction

An immutable record containing owner, `type`, `amount_vnd`, category, occurred timestamp, role, correction references, audit metadata, and idempotency key. The `type` is strictly `income|payment`; role can be `original|reversal|adjustment|replacement` without introducing a third transaction type.

### SavingsAccount and SavingsTransfer

Savings is an independent aggregate. A deposit decreases wallet balance and increases savings; a withdrawal increases wallet balance and decreases savings. Savings transfers are neither income nor payment, and do not contribute to budget utilization. Lock ordering is always wallet first, then savings.

### Category, Budget, AuditEvent

Categories define `applies_to`, active/disabled/retired status, and readable history. Default categories and referenced categories cannot be hard-deleted. Budgets define user, payment category, local calendar month, and spending limit. Audit logs are append-only and never store secrets.

## 3. Authoritative Formulas

```text
wallet_available = opening_balance
                 + income_effects
                 - payment_effects
                 - savings_deposits
                 + savings_withdrawals

savings_balance = deposits - withdrawals
budget_used = sum of active original payments
              sharing owner/category in HCMC month
```

Reversals preserve the original record, create a new row, and apply the opposing financial effect. Never mutate or delete previous rows. Reports exclude reversed transactions according to established policies.

## 4. Mandatory Invariants

1. `type ∈ {income, payment}`.
2. `amount_vnd` is a positive integer, free from overflow; `income` cannot exceed 100,000,000 VND and `payment` cannot exceed 100,000,000,000 VND. Identical limits apply to adjustments and replacements according to original transaction type.
3. Every row has exactly one owner; every read and write is scoped to that owner.
4. Committed ledger and audit rows cannot be updated or deleted.
5. Payments commit only if available wallet balance `>= amount` at lock/commit time.
6. Payments with insufficient balance never create rows or permit negative wallet balances.
7. Retries with the same idempotency key return the stored result without duplicate execution; different bodies return conflict.
8. Savings transactions are atomic and excluded from income, payment, and budget aggregates.
9. Budget overruns emit warnings without rejecting payments if wallet funds are sufficient.
10. Disabled categories accept no new rows while preserving historical read access.
11. Reports calculate using half-open intervals in local HCMC timezone.
12. JEV outputs never bypass validation, financial arithmetic, or authorization rules.

## 5. Business Workflows

### Wallet Onboarding

Validate session and verify opening balance is non-negative; create wallet, savings account, and initial audit record atomically within a single transaction. Do not generate synthetic income records.

### Creating Income / Payment

Validate session, CSRF/origin, amount, category, occurrence timestamp, and idempotency prior to opening transactions. Lock the wallet; income increases balance, payment inserts only if funds are sufficient; insert ledger/audit entries and update projections atomically. Budget warnings are calculated post-commit.

### Savings Deposits and Withdrawals

Lock wallet then savings account; verify sufficient balances; insert transfer record, update both aggregates, and commit atomically. Never invoke JEV or send emails inside the transaction.

### Adjustments and Corrections

Retain original rows; insert reversal, adjustment, or replacement rows containing reason, actor, reference, and audit details. No direct SQL updates or deletes from UI or admin surfaces.

## 6. Domain Acceptance Criteria

- Given opening balance 500,000, income 100,000, payment 200,000, deposit 50,000: wallet equals 350,000, savings equals 50,000, total payments equal 200,000.
- A payment of 400,001 on a wallet with 400,000 is rejected with no rows created.
- Two concurrent payments of 80,000 against a wallet balance of 100,000 result in at most one successful commit without intervening replenishment.
- Rebuilding projections yields values matching ledger history byte-for-byte; discrepancies trigger incidents and fail closed.

## 7. Governing ADRs

[ADR-0005](./adr/0005-immutable-money-domain.en.md), [ADR-0003](./adr/0003-cloud-mysql-validation-gate.en.md).
