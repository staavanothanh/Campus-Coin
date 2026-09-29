# CC-001 — Product Domain Handoff

- **Human Owner:** Developer B
- **Status:** Recommendations integrated; canonical sources are `docs/PRD.md` and `docs/DOMAIN-MODEL.md`.
- **Governing Decisions:** [ADR-0005](../adr/0005-immutable-money-domain.en.md), [ADR-0007](../adr/0007-five-day-thin-slice.en.md).

## Scope

Campus Coin is a manual personal expense tracking ledger entered by students. It does not hold real funds, connect to banking rails, execute real-money payments, or provide automated financial advisory services.

## Standard Vocabulary

| Vietnamese UI | API / Domain | Boundary |
|---|---|---|
| Thu nhập | `income` | Increases wallet balance |
| Thanh toán | `payment` | Decreases wallet balance if sufficient funds |
| Ví | wallet | Exclusive funding source for payments |
| Tiết kiệm | savings | Independent aggregate |
| Chuyển savings | savings transfer | Isolated ledger transfer |
| Danh mục | category | Must match `applies_to` |
| Ngân sách | budget | Advisory warning only |

## Invariants

- Strictly `income` and `payment`; amount must be a positive integer in VND.
- Ledger is immutable; corrections use append-only reversal/adjustment/replacement rows.
- Savings deposit/withdraw operations are atomic and excluded from income/payment/budget.
- Payments lock the wallet and reject on insufficient balance.
- All rows and queries are strictly scoped by user; HCMC is the authoritative business timezone.
- JEV only suggests categories without holding financial authority.

## Implementation Handoff

Developer B receives owner/session context from Developer A, provides authoritative APIs to Developer C, and provides JEV-off boundaries to Developer D. Developer B does not parse Google tokens, does not accept client-supplied owners or final balances, and does not invoke JEV inside transactions. Detailed formulas, schemas, and acceptance criteria reside in `DOMAIN-MODEL.md`.

## Out of Scope

Excluded from MVP: banking integrations, real-money transfers, lending, BNPL, interest calculations, multi-currency support, recurring transactions, CSV/PDF exports, financial predictions, complex AI summaries, and automated transfers without safety gates.
