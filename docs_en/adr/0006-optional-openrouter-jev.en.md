# ADR-0006: Optional JEV via OpenRouter

- **Date:** 2026-09-24
- **Status:** Conditionally Accepted
- **Decider:** Team Leader (user)

## Context

The product may need category suggestions, but does not need self-hosted models, will not grant financial authority to AI, and lacks established evidence regarding endpoints, models, quotas, costs, or privacy policies.

## Decision

JEV is only an optional backend adapter via OpenRouter, with its feature flag disabled by default. Day 1 must verify typed System One/Decisions contracts, transport model, error handling, `usage.cost`, latency, quotas, and privacy guarantees. The sole MVP use case is suggesting a category from a restricted candidate set before form submission; the user must confirm or change it. The manual picker is always functional.

Never call from browser, never transmit secrets/raw ledger data/balances, never invoke inside financial transactions, never use unstructured chat completions with manual JSON parsing, and never allow JEV to calculate, authorize, or write financial records.

## Rejected Alternatives

- **Mandatory JEV:** provider outages would compromise the money path.
- **Chat completions with prose parsing:** fails to guarantee typed contracts.
- **Self-hosting models:** exceeds five-day operational capacity.
- **JEV as financial authority:** unacceptable safety risk.

## Consequences

On JEV errors, timeouts, quota exhaustion, schema issues, or privacy concerns, fall back to manual selection. Failure to pass JEV release gates still allows launch if the core path passes.

## Risks and Verification

Developer D owns probing, redaction, cost/latency caps, synthetic evaluations, kill switch implementation, and release evidence.
