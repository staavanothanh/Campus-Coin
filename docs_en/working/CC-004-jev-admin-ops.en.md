# CC-004 — JEV and Admin Operations Handoff

- **Human Owner:** Developer D for JEV/QA; Team Leader approves scope.
- **Status:** Recommendations integrated; JEV awaiting Day 1 probes.
- **Decisions:** [ADR-0006](../adr/0006-optional-openrouter-jev.en.md) and boundaries in `ADMIN-OPERATIONS.md`.

## JEV

JEV only suggests categories from a candidate set for `income`/`payment`. It is backend-only, utilizes OpenRouter typed System One/Decisions, defaults to off, and mandates explicit user confirmation. Never transmit balances, ledger records, sessions, Google claims, secrets, or extraneous PII. Never invoke JEV within financial transactions.

Probing must document endpoint, transport model, typed response schemas, errors, `usage.cost`, latency, quotas, and provider privacy policy. Do not replace this with chat completions or prose parsing. On errors or policy failures, fall back to the manual picker; the core money path continues operating unaffected.

## Minimum QA Gates

- JEV off: creating income/payment preserves wallet, savings, budget, and reports identically.
- JEV success: suggestion is valid; user can override or confirm.
- JEV malformed, timed out, quota exhausted, low confidence, or privacy failure: falls back to manual selection.
- No raw prompts, responses, secrets, balances, or ledger data in logs.

## Administration

Admins only triage reports/issues, statuses, priorities, notes, and authorized content settings. Admins must never edit, delete, or reverse ledgers, alter balances, bypass insufficient funds checks, or delete audit records. Break-glass procedures require a documented reason, approval, time limit, and audit logging.

## Handoff

Developer D receives API/session boundaries from A/B, UI states from C, and release gates from the Team Leader. Developer D prepares redacted observability, health checks, kill switches, rollbacks, and verification evidence. Canonical details reside in `AI-JEV.md`, `ADMIN-OPERATIONS.md`, and `DELIVERY-PLAN.md`.
