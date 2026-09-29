# ADR-0009: Migration Convergence Baselines on Shared Database

- **Date:** 2026-09-25
- **Status:** Accepted
- **Decider:** Team Leader

## Context

The `campus_coin` database on Aiven is shared: another migration chain previously applied `0004_email_auth.sql` and `0005_auth_rate_limits.sql`, colliding with versions `0004`/`0005` of the Campus Coin chain. The migration engine correctly failed closed (checksum mismatch) with no bypass mechanism. A read-only probe on 2026-09-25 verified this on MySQL 8.4.8. Same-day erratum: the initial mismatch on `0001`/`0003` turned out to be working tree CRLF artifacts (LF files matched recorded checksums byte-for-byte); no historical pin remains active. The `historical` mechanism is retained in the engine for future safety.

- Applied DDL for `0001`/`0003` ≡ current file intent (verified table-by-table; the sole drift in ledger was `0003`'s own index). The mismatch for these two versions was file-level only (content when applied differed), not semantic.
- Objects for `0004`/`0005` in our chain **did not exist**; versions had been claimed by the other chain.
- Test data from our chain was cleanly purged in a controlled manner (Phase 1); seeds and tables belonging to the other chain remain intact.

## Decision

1. Keep current files/versions unchanged (do not move or alter applied files) so fresh installations and CI remain consistent.
2. Add `db/baselines.json` defining two slot types, with pinned checksums and rationales:
   - `external`: version belongs to another chain; applied row must match pinned checksum (absence on a fresh DB is also clean). When an external slot matches the pin, **the local file of the same version is skipped** — converged DDL is applied manually by DBA following review and verification per statement, not auto-applied (item 4).
   - `historical`: version has a local file; applied row is clean when matching local file checksum **or** pinned historical checksum (only after DBA reconciliation of DDL as described above).
3. Engine enforcement: strict contiguity as before; `appliedMissing` still fails closed on undeclared alien versions; checksums outside pins still report mismatch. No silent bypass: all exceptions exist in a reviewable file.
4. Missing DDL for `0004`/`0005` on Aiven is executed manually by DBA matching current file content (reviewed statement-by-statement), then verified via read-only probe for object existence before continuing `migrate up`. Do not edit applied migration files to match checksums; do not manually `UPDATE` `schema_migrations` outside the baseline mechanism.

## Rejected Alternatives

- **Modifying `0001`/`0003`/`0004`/`0005` to match recorded checksums:** destroys history, breaking fresh-install and CI.
- **Not moving domain DDL `0004`/`0005` to new versions (`0031`/`0032`):** files `0006`+ require indexes/constraints from the domain chain and must run sequentially. Auth DDL previously occupying numbers `0004`/`0005` is re-sequenced to `0032`/`0033`; `0031` preserves the OAuth migration applied to the shared DB.
- **Manually updating `schema_migrations`:** unreviewable history surgery that cannot be reproduced on new databases.
- **Dropping/recreating database:** shared database contains tables and data belonging to another chain.
- **Duplicating DDL `0004`/`0005` into new migrations while keeping old files:** creates two sources of truth for identical objects and duplicate errors on fresh DBs.

## Consequences

`db/baselines.json` is code-reviewable; fresh CI (lacking external slots) remains strict. Applying to Aiven requires provisioning `cc_migrate`/`cc_runtime`, applying `0006`–`0033` using the migration role, reviewing grants/trigger `DEFINER`s, reconciliation, and restore rehearsal — steps that remain operator-gated per `docs/DB-RESTORE-RUNBOOK.md`.

## Risks and Verification

Incorrect pinned checksums or misdeclaring external versions would legitimize unexpected schema drift. Mitigation: pins are derived directly from `schema_migrations` (via read-only probe), DDL is reconciled before pinning `historical`, unit tests cover every accept/reject path, and full MySQL gates must be green following changes.

## Erratum Following DevB Merge (2026-09-28)

A read-only probe on the active database recorded `0031_create_oauth_challenges.sql` with checksum `224c88833ddc0a19cf2c2f40cec91a681dd7d511262d9ddd4ac31031576939db`. Main must retain this migration at `0031`; email auth and rate-limit state use `0032_email_auth.sql` and `0033_auth_rate_limits.sql`. This is a renumbering of unapplied local files, not a modification of applied rows or manual updates to `schema_migrations`.
