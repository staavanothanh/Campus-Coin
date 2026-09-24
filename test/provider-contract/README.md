# DevD provider-contract test handoff

## Board

| ID | Title | Owner | State | Scope | Acceptance / evidence | Merge gate |
|---|---|---|---|---|---|---|
| DEV-D-ORCH-STOP | Stop and preserve prior orchestrator | DevDProviderContractOrchestratorV2 | archived | Prior `.agents/worktrees/provider-contract-tests` branch/worktree (never reused or edited) | Safe-stop report: branch `test/provider-contracts`, worktree `.agents/worktrees/provider-contract-tests`, base `ff4f9697fbccc80c4113d0096b99d18dc12ed56e`, no changed files/artifacts; prior agent acknowledged stop | Preserve old worktree unchanged |
| DEV-D-JEV-DOCS | Research JEV 1.13 HTTP contract | JevContractDocs | review | Public primary-source docs only | OpenRouter System One and TypeSafe sources below; no provider API calls | Source-supported contract and explicit schema gaps |
| DEV-D-NGHIEN-DOCS | Research NghienAI exact model contract | NghienModelDocs | review | Public docs only; exact model `gpt-6-luna` | No authoritative NghienAI API contract found. Treat only OpenAI-compatible transport hypothesis as provisional | Do not call or claim NghienAI support; request docs/authorized probe before implementation |
| DEV-D-ADVERSARIAL | Review test assertions | TestThreatReview | blocked | Read-only contract threat review | Agent job failed at model backend due insufficient credits; no review evidence | Orchestrator manually kept tests evidence-bound; no API calls |
| DEV-D-TESTS | Add contract tests and capture RED | DevDProviderContractOrchestratorV2 | review | This isolated worktree test files and test support only | Focused Node test run reports missing adapter implementation, not test setup or dependencies | Review tests and confirm scope; no implementation, push, merge, or commit |

## OpenRouter System One / JEV 1.13

Official sources:

- [OpenRouter Jev documentation](https://openrouter.ai/docs/guides/community/jev)
- [OpenRouter System One API reference](https://openrouter.ai/docs/api/api-reference/systemone/submit-a-system-one-request.md)
- [OpenRouter TypeSafe SDK guide](https://openrouter.ai/docs/guides/community/typesafe-sdk)
- [TypeSafe Choice primitive](https://docs.typesafe.ai/primitives/choice)
- [TypeSafe HTTP API](https://docs.typesafe.ai/api.md)
- [TypeSafe confidence](https://docs.typesafe.ai/confidence.md)

Documented request: POST `https://openrouter.ai/api/v1/systemone`, JSON, `Authorization: Bearer <OpenRouter API key>` and `Content-Type: application/json`; required body keys `model`, `state`, and `questions`. Pinned model ID is `typesafe/jev-1.13` (the endpoint also documents bare `jev-1.13` alias mapping). Choice question includes `type: "choice"`, `instructions`, and option-keyed `criteria`; response is an `answers[questionId]` typed choice.

TypeSafe describes Choice output as selected `choice`, per-option `probabilities`, and `confidence` (range 0–1; not a truth guarantee). However, OpenRouter's current System One OpenAPI requires only `type` and `choice` for the Choice answer; its schema lists `probabilities` and `confidence` but does not require either. This mismatch remains an integration contract risk: the tests exercise the intended TypeSafe Choice shape but do not prove it is mandatory for every OpenRouter response.

OpenRouter response schema requires top-level `model`, `answers`, `usage`, and usage `input_tokens` / `output_tokens`; the docs do not make `id`, `provider`, or `usage.cost` required. Response model may contain a dated release suffix; don't assert exact equality with the requested model. Documented HTTP error statuses include 400, 401, 402, 403, 404, 413, 429, 500, 502, 503, 524, and 529 with error.code/error.message examples. The docs do not establish retries, a timeout duration, or one mandatory response body for all errors.

## NghienAI `gpt-6-luna`

The requested identifier is sent literally as `gpt-6-luna`; it is not substituted. Research checked provider public site content (`https://api.aixingialaire.shop/v1`, `/`, `/docs`, `/openapi.json`, `/api-docs`) and found an SPA shell, not API documentation or a model catalog. The visible config had no documented `api_base_url` or `doc_url`. No NghienAI API request or authenticated call was made.

Therefore model availability, URL path compatibility, headers, request/response schema, error envelope, timeout, retries, and streaming semantics are **unverified for NghienAI**. Test expectations for `/chat/completions`, bearer authorization, JSON `{ model, messages }`, and a Chat Completions-compatible answer use OpenAI's own reference only as a **provisional hypothesis**. They do not assert that NghienAI supports that transport or exposes `gpt-6-luna`. Do not ship an adapter until provider docs or an explicitly authorized controlled probe verifies the contract.

## Coverage and verification

Run only this focused contract test command from the isolated worktree:

```sh
node --test test/provider-contract/*.test.js
```

The repository uses Node's built-in `node --test` runner. The tests use deterministic injected fetch functions; no real provider calls or API keys are used. Expected RED must be caused by missing adapter module/API, not test setup or dependency failures. No dependency installation, provider implementation, full suite, build, formatter, linter, network call, push, PR, or merge is in scope. The test-only changes were committed locally on the isolated branch as authorized; nothing was committed to `main`.

## Files

- `test/provider-contract/openrouter-jev.test.js` — documented JEV request shape, typed Choice, malformed response validation, all OpenRouter-documented HTTP error statuses, normalized timeout, and redaction behavior.
- `test/provider-contract/nghienai-gpt-6-luna.test.js` — **provisional** OpenAI-compatible transport hypothesis with exact `gpt-6-luna`, minimal completion response, malformed response, normalized HTTP error, timeout, and redaction behavior.
- `test/support/provider-adapter-contract.js` — isolated test-only helpers; confirms intended module absence before import so RED can be distinguished from missing setup.
