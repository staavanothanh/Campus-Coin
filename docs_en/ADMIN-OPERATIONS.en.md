# Administration and Operations — Campus Coin

## 1. Objectives and Boundaries

Admin is a lightweight operational role: receiving reports/issues, triage, updating status, recording internal notes, and managing authorized content configuration. Admins are not tellers; they do not adjust balances, modify or delete ledger entries, bypass payment checks, or view complete user financial records without explicit authorization scope.

## 2. Least Privilege Roles

| Role | Permitted | Not Permitted |
|---|---|---|
| Support | View masked issues, request additional information, update issue status | View raw ledger/balance or modify money records |
| Ops/Content | Manage authorized categories/copy/feature flags with versioning/audit | Delete referenced categories or alter invariants |
| Security/Owner | Handle security incidents, break-glass with reason and time bounds | Disable security controls for "quick fixes" |
| Admin | Only authorized scope with full audit logging | Modify ledger, balances, audit logs, or grant JEV authority |

## 3. Report/Issue Workflow

```text
User submits report
  -> validate + rate limit + mask PII
  -> create append-only case
  -> triage priority/status
  -> assign owner
  -> note/audit
  -> resolve or escalate incident
```

- `P0`: suspected IDOR, loss of ledger integrity, secret/PII leak, or corrupted payment/savings invariants; disable write paths if needed and escalate immediately.
- `P1`: authentication outages, multiple users unable to submit payments, provider failures affecting the core path.
- `P2`: UX bugs, copy errors, category issues, or non-urgent report problems.

Reports must never ask for passwords, OTPs, cookies, tokens, or complete ledgers. Input must be validated, rate-limited, and redacted.

## 4. Handling Financial Reports

If a user reports an incorrect balance, missing payment, or correction request: do not modify records directly. Collect case ID, request/correlation ID, timestamp, and minimum data; route to Developer B to verify projections and ledger integrity. Corrections occur exclusively through append-only domain commands with documented reasons and audit trails. Never run raw SQL `UPDATE` or `DELETE` to fix data.

## 5. Content and Settings

Default categories, warning copy, and feature flags must have versioning, owners, reasons, approvals, and audit trails. Disabling or retiring categories must retain history. Do not enable JEV via client-side flags. JEV is always default-off and possesses no financial authority.

## 6. Audit and Privacy

The append-only audit log records actor, scope, target, action, reason, request/correlation ID, outcome, and timestamp at minimum. Never log passwords, OTPs, cookies, tokens, OAuth codes, secrets, raw JEV prompts/responses, or extraneous financial details. Break-glass operations require a documented reason, approval, time limit, and post-mortem review.

## 7. Incidents and Rollbacks

- **Auth/IDOR:** block access, revoke sessions, preserve forensic evidence, escalate to Developer A.
- **Ledger/Payment/Savings:** toggle read-only mode or disable writes; do not delete rows; reconcile from the immutable ledger.
- **JEV/Privacy/Cost:** disable JEV immediately; the manual picker must continue operating.
- **DB/Deploy:** revert to known-good deployment and follow database restore runbooks; Team Leader decides rollback/NO-GO.

## 8. Metrics

Collect only operational aggregates: issue counts, authentication failures, payment rejection rates, latency, JEV fallback/cost buckets, restore outcomes, and error rates. Do not display total money across all users as a default admin feature.

## 9. Acceptance Criteria

1. Admins can triage, assign, update status, and record notes on issues without modifying ledger entries.
2. Reports do not solicit secrets and are masked and rate-limited.
3. Admin APIs enforce 403 status codes and least-privilege permissions on the server.
4. Category/content updates maintain versioning and audit trails without destroying history.
5. Payment/savings anomalies have an append-only/read-only incident mitigation path.
6. Failures in JEV, email, or third-party providers do not disrupt the money path.

## 10. Out of Scope

Admins modifying/deleting transactions, adjusting balances, bypassing payment validation, deleting audit logs, viewing complete user financial portfolios, reading Gmail inboxes, using personal Gmail accounts, or delegating autonomous financial authority to JEV.
