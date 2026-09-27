# Dev D backend handoff

## Current state

JEV category suggestion is integrated behind the canonical authenticated Node API route `/api/v1/ai/category-suggestion`. The route is advisory-only: it never writes money state and returns a suggestion only for explicit UI confirmation.

Runtime configuration is server-only and fail-closed:

- `JEV_CATEGORY_SUGGESTION_ENABLED` must be explicitly `true`; unset/`false` keeps JEV disabled.
- `OPENROUTER_API_KEY` is required only when the flag is explicitly enabled.
- Confidence and candidate bounds default to `0.8` and `10` when enabled.
- OpenRouter requests use the pinned typed System One adapter with a fixed endpoint, `redirect: "error"`, request/response size limits, and a ten-second timeout.
- The route applies bounded in-process actor/concurrency admission and redacts descriptions before provider access.

## Not a production approval

The following remain required before enabling JEV in production: live provider compatibility and privacy review, model accuracy/abstention evidence, cost and abuse-budget policy, staging verification, and operational monitoring. The synthetic adapter suite does not prove those gates.

## Verification

Deterministic provider, service, route, config, and UI tests are the verification path. Do not run the live probe without explicit authorization; it performs one external provider request.
