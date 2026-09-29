# RP-C — React, i18n, and Accessibility Handoff

- **Human Owner:** Developer C
- **Status:** Recommendations consolidated; no source changes in handoff.
- **ADRs:** [0005](../../adr/0005-immutable-money-domain.en.md), [0007](../../adr/0007-five-day-thin-slice.en.md).

## Authority

The browser only renders API-authoritative values. Do not calculate balances/budgets, do not submit final balances, do not authorize payments, do not call OpenRouter directly, and do not hold secrets. The query cache must clear/isolate on sign-out or session change.

## Screen/State Thin Slice

Google sign-in; wallet onboarding; dashboard; add income/payment; history; savings; category/budget; reports with pie/bar charts and tables; user reports; admin queue; settings for locale/theme. Each screen provides loading, empty, success, validation, 401, 403, retry, and server error states as appropriate.

Insufficient wallet balance for payment is an error; budget overruns are non-blocking warnings. Savings transfers are displayed distinctly. History provides no edit/delete capabilities; disabled categories remain readable. Admin screens handle only issues, statuses, and notes, with server-enforced 403s.

## i18n and Accessibility

All visible labels, headings, validation messages, errors, successes, warnings, chart/table data, and aria names must support `en`/`vi`. Locale does not alter enums, business formulas, or audit records. Amount is integer VND; dates and months follow HCMC timezone. Dark/light theme and language are independent controls. Semantic forms, labels, keyboard navigation/focus, live regions, contrast ratios, accessible table alternatives, and reduced motion support are mandatory.

## JEV-Off

When flags are off, unavailable, timed out, or returning low confidence/malformed schema, do not show an AI spinner; the manual category picker must always remain functional. Suggestions must be clearly labeled, require user confirmation/override, and never create records automatically.

## Handoff

Developer C receives session and error contracts from A/B, and JEV status from D. Developer C delivers route/state matrices, bilingual smoke test results, and accessibility evidence. Developer C does not make independent balance or authorization decisions.
