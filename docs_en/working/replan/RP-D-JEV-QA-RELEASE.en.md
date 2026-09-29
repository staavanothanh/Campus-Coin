# RP-D — JEV, QA, and Release Handoff

- **Human Owner:** Developer D
- **Status:** Recommendations consolidated; JEV awaiting compatibility probe.
- **ADRs:** [0006](../../adr/0006-optional-openrouter-jev.en.md), [0007](../../adr/0007-five-day-thin-slice.en.md).

## Evidence

OpenRouter documentation describes typed JEV/System One/Decisions. This constitutes documentation evidence only; transport model, endpoint, quota, cost, latency, and provider policies must be verified via Day 1 probes. Do not invoke chat completions and attempt to parse prose.

## Use Case and Adapter

JEV is strictly limited to pre-submission category suggestions. Server-only requests comprise transaction type, redacted description, opaque candidate IDs, locale, and contract version. Responses must be schema-validated for Choice/probability/confidence, candidate set membership, `other_or_uncertain`, cost, and status. The user confirms or overrides; the domain commits only after user action.

Never transmit sessions, Google claims, user ID/email, balances, savings, amounts, dates, raw ledger entries, admin data, or secrets. Never invoke inside database monetary transactions.

## Runtime Policy and QA

Default-off; timeout, rate limits, spending caps, concurrency, and input sizes must be bounded; no retries by default; kill switch required. When JEV is off, unavailable, malformed, timed out, returns 402/403/404/413/429, produces low confidence, or violates privacy, fall back immediately to manual selection. Logs must record only masked metadata.

Synthetic/anonymized suite of 50–100 examples in `en`/`vi`; measures accuracy, abstention rate, override rate, schema failures, fallback rates, p95 latency, and costs. On Day 4, execute auth, domain, UI, restore, and rollback suites with JEV disabled and compare monetary outputs.

## Release

Unmet JEV gates keep JEV disabled without blocking the core manual path. Failures in auth/IDOR, ledger/savings invariants, data loss, secret/PII leaks, restore procedures, or deploy-wide errors are hard NO-GOs. Team Leader decides GO/NO-GO.
