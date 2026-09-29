# ADR-0008: Email, Password, and OTP Authentication

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader — Hiệp
- **Decision Source:** Direct guidance from Team Leader during working session on 2026-09-24

## Context

The `hiep` branch implemented email and OTP flows. Canonical documentation alongside ADR-0001/0007 still described Google OAuth-only, leading to team misalignment regarding Developer A's status and trajectory. The Team Leader decided to use email flows for MVP and requested updating the ADR/canonical documentation so the entire team follows a single decision.

## Decision

The MVP uses exactly two flows:

```text
register → verify OTP → login → session
forgot password → reset password
```

- Registration generates an OTP via email; users and credentials are created only after valid OTP verification.
- Login requires email and hashed password; success creates an opaque server-side session in a secure cookie.
- Forgot password returns a generic message; valid OTP resets the password and revokes previous sessions.
- All mutations enforce Origin/CSRF; owner is resolved from session. Rate limiting, lockout/backoff, OTP expiration/attempts/resend/single-use, session revocation/expiration, logging, email timeout/retry, and API error handling must be verified prior to production.
- Outbound emails pass through a server-side adapter and compatible SMTP. The specific provider is not yet locked by ADR or runtime evidence; it must be documented once selected and verified.
- **Do not use Google OAuth for Campus Coin login. Do not use personal Gmail credentials, Gmail inbox, or Gmail API.** Do not automatically link accounts by email.
- ADR-0002 regarding opaque sessions, ADR-0003 regarding MySQL validation gates, the decision against custom email domains in ADR-0004, ADR-0005 on the money domain, and ADR-0006 on JEV remain effective. This ADR supersedes the authentication decision in ADR-0001, the prohibition against security/reset emails in ADR-0004, and the authentication scope section of ADR-0007; superseded ADRs are retained as historical records.

## Consequences

- Users require an accessible email address for account verification and recovery.
- SMTP/provider becomes a hard dependency for registration and password resets; misconfigurations or provider failures must fail closed without emitting OTPs to logs or dev fallbacks.
- Migration `0032_email_auth.sql` belongs to the authentication schema (originally numbered `0004`, renamed to `0032` because slot `0004` belongs to another chain and `0031` was occupied by the shared OAuth migration — see ADR-0009); file presence does not prove that migrations have run on any database.
- The `auth_identities` table from migration `0001` is retained as historical schema and is neither read nor written by current runtime auth; its presence does not re-enable Google OAuth. Do not modify committed migrations; any schema cleanup requires new migrations with prior database/data verification.
- Existing accounts from alternative methods are not automatically merged. Identity migration or linking requires an explicit decision.
- Accepting this decision does not equate to production readiness. Rate limiting, E2E DB/email verification, provider contracts, API/domain integration, CI, and DB operations remain mandatory gated items requiring evidence.

## Rejected Alternatives

- **Google OAuth-only:** no longer the MVP authentication method per Team Leader decision.
- **Personal Gmail as SMTP or reading inboxes:** disallowed because it introduces personal credentials and exceeds the requirement for OTP delivery.
- **Auto-link by email:** risks account takeover or unintentional merges.
- **Browser-side JWT:** remains rejected; server-side opaque sessions serve as the source of truth.

## Risks and Verification

Production gates include registration, valid/invalid/expired/exceeded-attempts/resend OTP handling, invalid login/rate limiting, forgot/reset flows, session expiry/revocation/logout, cookies/CSRF/Origin/IDOR safeguards, DB/email outage handling, log redaction, and user isolation. Proper migration state, an isolated database for integration, a selected email provider, and backup/restore evidence are required. No evidence in this decision record confirms that these gates have passed yet.
