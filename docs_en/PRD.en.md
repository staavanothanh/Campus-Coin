# PRD — Campus Coin

## 1. Executive Summary

Campus Coin is a bilingual web application designed for university students to track manually entered `income` and `payment` transactions, manage wallet and savings balances, establish budgets, and review financial reports. The product is not a bank, does not hold real funds, does not process real monetary transactions, does not provide lending or BNPL services, and does not provide certified financial advice.

The objective is to empower users with visibility over their personal cash flows through deterministic calculations. The backend/domain logic is the single source of truth; the browser never calculates balances, and JEV possesses no financial authority.

## 2. Users and Core Principles

- University students can register and verify accounts via email OTP, and log in using email/password or optional Google Sign-In; users access and modify only their own data.
- Administrators possess constrained access limited to handling reports/issues, authorized content updates, and audit reviews; admins cannot modify ledger records or balances.
- The `en`/`vi` locale affects only copy and display formatting. Currency is strictly VND. Reporting periods follow `Asia/Ho_Chi_Minh`.
- Profile birth date and gender are optional; viewable and editable only by the authenticated owner, and excluded from admin listings.

## 3. 4–5 Day MVP Scope

### 3.1 Authentication and Sessions

- Register with email → dedicated OTP verification screen → full name/password; users and credentials are created only after the endpoint re-verifies and consumes the OTP.
- Login with email and password; successful authentication creates an opaque server-side session stored in a secure cookie.
- Forgot password via email OTP → dedicated OTP verification screen → new password; password reset re-verifies/consumes the OTP and atomically revokes prior sessions.
- Login rate-limiting keyed by account and IP; OTP expiration, maximum attempt limits, resend cooldowns, and single-use enforcement.
- Google Sign-In via server-side OIDC; authenticated email users can explicitly link Google within an active session.
- No automatic account merging by email; no personal Gmail credentials, Gmail inboxes, or Gmail APIs.
- Outbound emails routed through an SMTP server adapter; the specific provider must be selected and verified.

### 3.2 Wallet, Ledger, and Savings

- User enters an opening wallet baseline; the baseline is not an income transaction.
- Ledger accepts only `income` and `payment` types; amounts must be positive integer VND.
- Maximum per-transaction cap: 100,000,000 VND for `income`; 100,000,000,000 VND for `payment`. The server/domain enforces these caps.
- Committed ledger entries are immutable; corrections are append-only rows containing reason, reference, and audit metadata.
- Payments commit only when wallet funds are sufficient at transaction commit time; insufficient funds trigger an atomic rejection.
- Savings deposits and withdrawals are atomic internal transfers, separated from income, payment, and budget aggregates.

### 3.3 Categories, Budgets, and Reports

- Categories specify `applies_to=income|payment`; disabled categories accept no new transactions while preserving historical references.
- Budgets track payments grouped by user, category, and local calendar month. Exceeding a budget produces an advisory warning without blocking wallet-sufficient payments.
- Dashboards and reports are calculated deterministically by the backend; charts provide equivalent accessible table representations.

### 3.4 UI and Administration

- Onboarding wallet setup, dashboard, income/payment forms, history, savings management, categories/budgets, reports, and user feedback submission.
- Minimal admin triage queue: status, priority, and notes; server enforces least-privilege permissions.
- Full `en`/`vi` bilingual support, VND formatting, HCMC timezone, pie/bar charts, independent dark/light themes, keyboard/focus management, and accessible loading/error states.

### 3.5 Optional JEV

- JEV strictly suggests categories from a restricted candidate list prior to form submission.
- Backend invokes OpenRouter typed System One/Decisions; never invoked directly from the browser.
- Feature flag defaults to disabled; transport models and endpoints require Day-1 probing.
- Explicit user confirmation is mandatory; timeouts, quota limits, schema issues, privacy restrictions, or low confidence fall back to the manual category picker.
- JEV never calculates money, authorizes payments, or writes ledger rows.

## 4. Acceptance Criteria

1. Register/email → OTP verify → credentials → login/session, and forgot/email → OTP verify → password reset satisfy authentication security gates; endpoints re-verify and consume single-use OTPs; User A cannot access User B's resources.
2. Ledger accepts only `income` and `payment` types in positive integer VND with matching category types.
2a. `income` does not exceed 100,000,000 VND; `payment` does not exceed 100,000,000,000 VND; API and UI enforce identical caps.
3. Payments with insufficient wallet balance are rejected atomically without creating ledger rows or allowing negative balances; idempotent retries prevent duplicates.
4. Savings transfers are atomic and excluded from income, payment, and budget totals.
5. Category history remains intact when disabled; reports are deterministic under `Asia/Ho_Chi_Minh`.
6. Budget warnings do not block payments when wallet funds are sufficient.
7. Disabling JEV leaves the complete monetary workflow functional; enabling JEV returns suggestions that require user confirmation.
8. UI provides bilingual `en`/`vi` support, VND formatting, HCMC dates, charts with table equivalents, independent dark/light modes, and accessible interaction states.
9. Cloud MySQL and Vercel deployments release only after verification of TLS, connectivity, quotas, backup/restore, authentication, and rollback procedures.

## 5. Out of MVP Scope

Personal Gmail credentials/inboxes, automatic account merging by email, SMS/passkeys/mandatory MFA, banking integrations, real payments, digital wallets, lending, BNPL, interest calculations, investments, multi-currency support, enterprise administration, CSV/PDF exports, recurring transactions, financial predictions, conversational AI chat, complex AI summaries, autonomous agent actions, custom email domains, and automated transfers without safety gates.

## 6. Verification Gates

- MySQL provider/region/free-tier, TLS, connectivity, Vercel network access, and restore: verified on Day 1; no local DB in production.
- OpenRouter API key, typed endpoint/model, quota, cost, latency, and privacy policies: verified on Day 1; failures disable JEV.
- Team Leader decides GO/NO-GO following evidence across authentication, domain integrity, restoration, security, UI, rollbacks, and production smoke tests.

## 7. Governing Decisions

Refer to [ADR-0008](./adr/0008-email-password-otp-auth.en.md), [ADR-0009](./adr/0009-optional-google-sign-in.en.md), [ADR-0005](./adr/0005-immutable-money-domain.en.md), [ADR-0006](./adr/0006-optional-openrouter-jev.en.md), and [ADR-0007](./adr/0007-five-day-thin-slice.en.md).
