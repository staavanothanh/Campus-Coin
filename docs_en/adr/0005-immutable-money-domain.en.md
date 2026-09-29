# ADR-0005: Immutable Money Domain and Separate Savings

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader (user)

## Context

The application only records monetary data entered by users; it is not a bank and does not process real money. Balance discrepancies, direct modification of transaction history, or conflating wallet with savings destroys auditability.

## Decision

There are only two enum/API transaction types: `income` and `payment`. Amount is a positive integer in VND. Committed ledger entries and audits are append-only; corrections use new reversal/adjustment/replacement rows with reason, actor, and reference. Payment locks the wallet and commits only when sufficient balance exists. Savings is an independent aggregate; deposit/withdraw are atomic and are not included in income/payment/budget. Budget is advisory only and never authorizes transactions.

All authoritative calculations are performed by backend/domain logic within short transactions. JEV must never calculate, authorize, or write financial records.

## Rejected Alternatives

- **Update/delete ledger:** breaks audit trails and reconciliation.
- **Using negative numbers for transaction direction:** blurs the positive integer amount invariant.
- **Using savings directly for payments:** conflates two separate aggregates.
- **Client calculating balance:** allows authorization bypass.

## Consequences

Reports are deterministic according to `Asia/Ho_Chi_Minh`; the UI only displays authoritative responses. Admins cannot alter ledger records through the UI or arbitrary SQL.

## Risks and Verification

Verify concurrent payments, idempotency, reversals, savings atomicity, HCMC timezone boundaries, and restore reconciliation prior to GO.
