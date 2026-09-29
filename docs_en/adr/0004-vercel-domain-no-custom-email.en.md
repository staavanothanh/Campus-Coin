# ADR-0004: Use Vercel Domain, No Custom Email Domain Yet

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader (user)

## Context

The MVP needs to be released in four to five days. Custom domains, SPF, DKIM, DMARC, and email notifications introduce delivery, quota, and privacy risks without providing mandatory value to the critical money path.

## Decision

The Web/API is deployed on a Vercel-provided domain. Custom domains and dedicated custom email domains are not launch requirements. Notification emails are disabled by default; this will only be revisited when a verified provider-managed sender is available without delaying release.

Do not read Gmail inboxes, do not send using personal Gmail credentials, and do not use email for security resets in the Google-only MVP.

## Rejected Alternatives

- **Custom domain in MVP:** increases DNS configuration overhead and delivery gate complexity.
- **Personal Gmail as mail server:** wrong boundary, credential risk, and privacy violations.
- **Email as login dependency:** contradicts the Google OAuth-only decision.

## Consequences

JEV, optional email, and provider failures must not block the money path. Rollbacks point to known-good Vercel deployments.

## Risks and Verification

Verify exact redirect URIs, environment scopes, health checks, redacted logs, and rollbacks on the Vercel domain.
