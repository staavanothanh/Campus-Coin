# JEV — OpenRouter Boundary and Safety

> JEV is an optional, manual-first feature in the MVP, utilizing TypeSafe JEV via OpenRouter. No self-hosting. Runtime operates only when explicitly enabled with `JEV_CATEGORY_SUGGESTION_ENABLED=true` alongside a server-side OpenRouter API key.

**Runtime Status:** The API mounts category suggestion routes in local and Vercel handlers. The runtime creates active services only when properly configured; without a provider key, the feature remains disabled. The route is declared in OpenAPI. See [API Contract](./contracts/README.en.md) and [Delivery Plan](./DELIVERY-PLAN.en.md).

## 1. Required Evidence

- [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one.md): typed decisions, not chat prose.
- [TypeSafe API](https://docs.typesafe.ai/api.md): state, models, questions, and typed Choice results.
- [TypeSafe confidence](https://docs.typesafe.ai/confidence.md): confidence signals are thresholds, not proof of absolute truth.
- [OpenRouter JEV](https://openrouter.ai/docs/guides/community/jev) and [System One API](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md).
- [OpenRouter privacy](https://openrouter.ai/docs/guides/privacy/data-collection.md): retention and provider policies must be verified against current terms.

Links serve as reference sources; endpoints, models, quotas, costs, and policies become factual only following Day 1 probes.

## 2. Compatibility Gates

Developer D must execute a server-only probe and document endpoints, transport model IDs, typed Choice responses, probabilities/confidence scores, HTTP errors, timeouts, quotas, `usage.cost`, latency, and privacy settings.

If the typed contract cannot be verified, JEV remains disabled/deferred. Never invoke chat completions and attempt to parse JSON/prose manually. Never substitute self-hosted models.

## 3. Permitted Use Cases

JEV strictly suggests a single category from a restricted candidate list for `income` or `payment` descriptions. Users must confirm or modify suggestions. The domain validates owner, transaction type, active category status, and idempotency prior to commit.

JEV must never:

- calculate wallet balances, savings, budgets, amounts, or dates;
- authorize payments;
- create, update, or delete ledger, savings, or budget rows;
- read balances, raw ledger records, Google claims, sessions, secrets, or admin notes;
- generate financial advice, lending/BNPL offers, or autonomous operations.

## 4. Adapter Contract

Internal server-only request:

```json
{
  "transactionType": "income|payment",
  "descriptionRedacted": "short text with PII removed",
  "candidates": [{"id": "opaque-category-key", "semanticLabel": "short label"}],
  "locale": "en|vi",
  "contractVersion": "jev-category-v1"
}
```

Standardized response:

```json
{
  "status": "suggested|manual|disabled|unavailable",
  "categoryId": "opaque-category-key|null",
  "confidence": 0.0,
  "probabilities": {},
  "modelId": "provider snapshot|null",
  "provider": "openrouter|null",
  "usageCostUsd": 0.0,
  "reasonCode": "low_confidence|timeout|quota|schema|privacy|flag_off|null"
}
```

Validate schema, candidate membership, `other_or_uncertain`, probability/confidence ranges, response size, and costs. Malformed outputs must fall back to manual selection without guesswork.

## 5. Runtime Policies

- `JEV_LOCAL_CATEGORY_SUGGESTION_ENABLED=false` disables the deterministic local index in the Luna-only deployment profile.
- `JEV_CATEGORY_SUGGESTION_ENABLED=false` disables OpenRouter JEV. This avoids all JEV requests and credits usage.
- `NGHIENAI_LLM_ENABLED=true` with `NGHIENAI_API_KEY` enables the server-only `gpt-6-luna` adapter. The configured base URL is `https://api.aixingialaire.shop/v1`; the adapter calls its `/chat/completions` endpoint with a bounded JSON-only category prompt.
- Luna is the sole active category provider in this profile. It receives only the redacted description, transaction type, locale, and validated canonical candidate labels. It cannot write transactions or alter money state.
- Minimum confidence/candidate limits are `NGHIENAI_MINIMUM_CONFIDENCE=0.8` and `NGHIENAI_MAX_CANDIDATES=10`. Invalid output, timeout, quota, privacy, or network failure falls back to manual selection.
- Timeouts, rate limits, concurrency, input lengths, candidate counts, and daily spending must be bounded.
- No retries by default; retries only when cost/latency evidence permits.
- Never hold open MySQL monetary transactions while awaiting OpenRouter responses.
- Timeouts, 4xx/5xx, 402/403/404/413/429, schema/privacy failures, or low confidence return the manual picker.
- Logs record only sanitized metadata: status, latency, model snapshot, fallback reason, and cost bucket.

## 6. Privacy and Evaluation

Redact emails, phone numbers, addresses, tokens, cookies, credentials, and internal IDs. Never send complete ledgers, balances, savings, or amounts unless required for categorization. Verify logging, training, and provider retention policies prior to activation. If privacy criteria fail, keep JEV off.

The evaluation suite comprises 50–100 synthetic/anonymized examples covering `en`/`vi`, income/payment, all categories, ambiguity, PII-like text, prompt injections, disabled categories, and corrections. Metrics measure accuracy, abstention, overrides, schema failures, fallbacks, p95 latency, and costs.

## 7. Acceptance Criteria

1. JEV disabled/unavailable preserves the monetary path identically.
2. Typed compatibility is verified or JEV remains disabled.
3. Only valid suggestions from active candidate lists reach the UI.
4. User confirmation is mandatory prior to committing transactions.
5. All errors fall back to manual category selection.
6. Never log prompts, raw responses, secrets, balances, or ledger data.
7. Never invoke JEV within monetary transactions.
8. `en`/`vi` localization is managed by the application.

## 9. Controlled Synthetic Probe Command

`npm run probe:jev-live` is a one-request, server-only compatibility probe using a fixed synthetic description and candidate set. It refuses by default. The command requires `JEV_LIVE_PROBE_APPROVED=I_APPROVE_ONE_LIVE_JEV_PROBE`, `JEV_CATEGORY_SUGGESTION_ENABLED=true`, `OPENROUTER_API_KEY`, a valid `JEV_MINIMUM_CONFIDENCE`, and `JEV_MAX_CANDIDATES` large enough for the fixed candidate set. Do not use production or personal data; this command makes one external request only after explicit approval and complete configuration. The console emits only normalized status/confidence/reasonCode, never the key, request, response, or provider error details.

This command is not a routine test and must not be run without authorization for a live external call. Fake-adapter route/save tests remain the deterministic verification path. A successful probe proves only compatibility for that one observed request; it does not establish accuracy, calibration, privacy policy compliance, cost/latency budgets, or production readiness.

### 9.1. Local Refusal Verification

The offline CLI refusal is covered by `node --test test/tools/jev-category-live-probe.test.js`; the test launches the command with only a sanitized environment and no approval setting, and asserts a non-zero exit with the explicit refusal message. This test uses only fake provider values/fetch; no OpenRouter request occurs. Do not run `npm run probe:jev-live` as a routine check: it can make one external request after explicit approval and complete configuration.

## 10. Deferred Features

Monthly prose summaries, OCR/CSV receipt extraction, recurring transaction automation, predictive analytics, conversational chat, autonomous actions, and any reasoning over amounts, dates, or balances.

## 11. Related ADRs

[ADR-0006](./adr/0006-optional-openrouter-jev.en.md).
