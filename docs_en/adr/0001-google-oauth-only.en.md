# ADR-0001: Use Google OAuth Only in MVP

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader (user)

## Context

The MVP requires secure login within a short timeframe and should not expand attack surfaces around password handling, account recovery, or identity linking. Gmail is only used as an identity source and email claim provided by Google.

## Decision

The MVP uses only Google OAuth Authorization Code flow with state, PKCE, nonce, issuer, audience, subject, expiry, and verified email policy. The identity key is `(provider=google, subject=sub)`. The callback creates or reuses the user, then creates a server-side opaque session.

The MVP does not include local passwords, password credentials, account linking, OTP/password resets, SMS, other OAuth providers, reading Gmail inboxes, or using personal Gmail credentials.

## Rejected Alternatives

- **Local email/password:** increases the scope of storage, hashing, resets, and enumeration prevention.
- **Automatic merge by email:** risks account takeover or accidental merging.
- **OTP via email/Gmail:** requires an email provider and adds unnecessary security paths for MVP.

## Consequences

- Users who cannot use Google are out of scope for the MVP.
- Developer A owns the callback, session, CSRF/origin, and IDOR protection.
- No security email dependency on the critical path.

## Risks and Verification

Production callback, claims, session revocation, and owner isolation must be verified on the Vercel domain on Day 1. Failure is a NO-GO.
