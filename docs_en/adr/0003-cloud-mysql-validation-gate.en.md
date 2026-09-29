# ADR-0003: Cloud MySQL via Validation Gate

- **Date:** 2026-09-24
- **Status:** Conditionally Accepted
- **Decider:** Team Leader (user)

## Context

The immutable ledger, wallet, savings, row locking, foreign keys, and monthly reporting naturally fit a relational database. The product requires a cloud/free-tier deployment, but assuming providers, regions, quotas, or backup capabilities without verification is prohibited.

## Decision

Use a single managed MySQL instance on the cloud after verifying the provider and region on Day 1: TLS, quota, connection limit, latency, Vercel connectivity, backup/export/restore, and engine/ORM behavior. Production will not use a local database.

## Rejected Alternatives

- **MongoDB as authoritative source:** inferior to MySQL for row locking, foreign keys, and monetary transactions.
- **Production local database:** does not satisfy persistence, backup, and operational requirements.
- **Selecting vendor before gathering evidence:** creates unverified claims regarding quotas, SLAs, or restore capabilities.

## Consequences

Developer B owns schema, migrations, transactions, and restoration. If no free tier proves sufficiently stable, the Team Leader must select another verified candidate or approve a paid alternative; requirements must not be quietly lowered.

## Risks and Verification

Isolated backup/restore, serverless connection pool, migration preflight, and reconciliation must have evidence prior to GO.
