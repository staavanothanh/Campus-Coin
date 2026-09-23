# RP-B — Handoff domain immutable và MySQL

- **Human owner:** Developer B
- **Trạng thái:** Tư vấn đã hợp nhất; provider/region chờ Day 1.
- **ADR:** [0003](../../adr/0003-cloud-mysql-validation-gate.md), [0005](../../adr/0005-immutable-money-domain.md).

## Thin slice

Wallet baseline, immutable `income`/`payment`, atomic insufficient-wallet block, correction append-only, savings transfer atomic, payment budget warning, category history, owner-scoped report, idempotency, keyset pagination, issue queue và backup/restore.

## Invariant

Owner lấy từ session A; amount integer VND; type chỉ income/payment; ledger/audit không update/delete; payment lock wallet; savings lock wallet rồi savings; budget warning không authorize; period HCMC; retry idempotent; JEV không nằm trong money transaction.

## Schema/API tối thiểu

`wallet_accounts`, `ledger_transactions`, `savings_accounts`, `savings_transfers`, `categories`, `budgets`, `mutation_idempotency`, `audit_events`, `issues` và `issue_events`. API không nhận final balance hoặc owner tùy client. Error code locale-neutral, UI tự dịch.

## Day-1/Day-4 gate

Kiểm chứng MySQL provider/region/free-tier, TLS, connection, engine/ORM, Vercel connectivity, backup/export/restore và latency. Day 4 restore DB cô lập, reconcile wallet/savings/FK/reversal/idempotency/append-only trước mở write.

## Handoff

B cung cấp authoritative read model/error/period/idempotency cho C; migration, health, restore và log boundary cho D. B không parse Google token, không tính tiền ở client và không gọi JEV trong transaction. Team Leader quyết định provider/region và release.
