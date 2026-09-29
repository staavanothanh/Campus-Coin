# ADR-0007: Five-Day Thin-Slice Scope and Ownership

- **Date:** 2026-09-24
- **Status:** Accepted
- **Decider:** Team Leader (user)

## Context

The MVP must be delivered to production within four to five days by four developers and one Team Leader. Scope must be sufficiently small to verify authentication, monetary invariants, restoration, and rollback, rather than expanding unverified features.

## Decision

- **Developer A:** Google OAuth, session management, CSRF/origin protection, owner scoping, Vercel/platform configuration.
- **Developer B:** MySQL, schema/migrations, immutable ledger, wallet/savings/budget/category logic, reports, and restoration.
- **Developer C:** React, UI states, `en`/`vi` internationalization, VND/HCMC formatting, accessibility, dashboard/report/admin screens.
- **Developer D:** OpenRouter/JEV optional integration, QA, smoke testing, observability, deployment/rollback.
- **Team Leader:** scope lock, contract decisions, evidence approval, and GO/NO-GO determination.

Day 0: Scope lock; Day 1: Dependency verification; Days 2–4: Integration and smoke testing; Day 5: Release and stabilization only, no new features.

## Rejected Scope

Local authentication, account linking, OTP/reset, Gmail inbox access, security email dependencies, direct banking integrations, real money processing, lending, BNPL, interest calculations, multi-currency support, CSV/PDF exports, recurring transactions, financial prediction, complex AI summaries/chat, enterprise administration, and custom email domains.

## Consequences

Lanes can run concurrently, but A and B serve as upstream contracts for C and D. No specialist has authority to execute a release independently.

## Risks and Verification

Any unmet critical/high gate results in NO-GO. Scope cuts must never degrade authentication, owner scope, ledger integrity, savings separation, VND/HCMC formatting, or database restoration.
