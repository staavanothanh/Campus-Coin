# ADR-0009: Google Sign-In as Supplemental Method

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader — Hiệp
- **Decision Source:** Direct guidance from Team Leader during working session on 2026-09-24

## Context

Following the consolidation of email/password/OTP in ADR-0008, the Team Leader decided to add Google Sign-In as a supplemental sign-in option. The current email flow continues to operate independently; if Google configuration is absent, the application does not render the Google button.

## Decision

- Retain email/password/OTP and session flows from ADR-0008 intact.
- Add server-side Google OpenID Connect Authorization Code flow using PKCE S256, state, nonce, HTTPS callback, and minimum scopes `openid email profile`.
- Use Google `sub` as the stable identity key in `auth_identities`; do not automatically merge accounts solely due to matching emails.
- Existing email account holders must log in first, then explicitly link Google. If a Google email matches an existing account that has not been linked, require the user to sign in using their existing method and link it.
- New Google accounts may create a user after server-side verification of the ID token and `email_verified=true`.
- Both methods create opaque server-side sessions in the existing cookie. Do not store Google access tokens or refresh tokens in DB or browser.
- Do not use personal Gmail credentials, Gmail inboxes, or Gmail APIs; OAuth is used strictly for authentication and identity.
- OAuth is enabled only when all of `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, and `SESSION_SECRET` are present. When unconfigured, email/password/OTP remains functional.
- Reuse table `auth_identities` from migration `0001`; no new migration is created for this decision.

## Consequences

- ADR-0008 continues to own email/password/OTP; ADR-0009 supplements with Google Sign-In and supersedes only the prohibition against Google OAuth and account linking in ADR-0008.
- Account linking is always requested by an authenticated user with an active session; the callback must verify that the session is valid and corresponds to the user who initiated the flow.
- Short-lived signed state cookies use `HttpOnly`, `SameSite=Lax`; set to `Secure` in production. Google authorization codes are exchanged on the server, and the ID token must be verified by SDK against audience, nonce, and verified email.
- Requires OAuth client credentials, callback URI, and secrets configured by the owner in the local/deploy secret store. Never place secret values in chat, source code, or documentation.
- Acceptance of this decision does not mean the provider is configured or that live flows are verified. Real callbacks, DB integration, deployment secrets, domains, CI, and security review remain gated items.

## Rejected Alternatives

- **Google OAuth completely replacing email/OTP:** rejected; email remains the existing primary flow.
- **Automatic merge by email:** rejected due to risk of mislinking accounts.
- **Gmail API/inbox or personal Gmail credentials:** unnecessary for login and prohibited.
- **Persisting Google tokens for future logins:** unnecessary; the server uses tokens only during callback to verify identity, then discards them.

## Risks and Verification

- Test state, cookie signature, TTL, PKCE, nonce, audience, verified email, callback allowlist, account collisions, explicit link ownership, and token/session boundaries.
- Run targeted tests, CI, and MySQL integration tests only against an isolated database. Live Google callbacks are considered passed only after the owner configures the client and successfully completes end-to-end login/linking.
- Never log passwords, OTPs, OAuth codes, ID/access/refresh tokens, cookies, raw claims, or client secrets.
