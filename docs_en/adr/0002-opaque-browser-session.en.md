# ADR-0002: Server-Side Opaque Session for Browser

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader (user)

## Context

Campus Coin is a browser application sharing the same domain with its API. Data ownership and mutation privileges must be determined by the server, never from client-supplied emails, roles, or IDs.

## Decision

After the OAuth callback, the server creates a random opaque session, storing only the hashed session token alongside the user, expiration time, revocation status, and minimal metadata. Cookies use `HttpOnly`, `Secure`, and `SameSite=Lax` or stricter following callback testing. Mutations apply CSRF/origin control; the owner is resolved from the session.

JWTs are not used as browser sessions in MVP. JWTs will only be considered for specific service-to-service consumers in the future.

## Rejected Alternatives

- **Default browser JWT:** difficult to revoke immediately and easily leaks permissions if mismanaged.
- **Email or user ID from request:** permits IDOR and cannot serve as the source of truth.
- **Tokens in localStorage or URL:** increases the risk of XSS, referer leakage, and access log exposure.

## Consequences

Auth, API, and UI must distinguish 401 from 403. Sign-out, expiration, user disabling, and revocation must eliminate access permissions prior to reading data.

## Risks and Verification

Callback, cookies, expiration, revocation, CSRF, owner isolation, and provider failure testing during smoke tests on Days 1–4.
