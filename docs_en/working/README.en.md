# Working Documentation — Campus Coin

## Role

`docs/working/` contains handoffs, replan artifacts, reviews, and process evidence. This is not the canonical source of product decisions.

## Order of Precedence

1. Direct requests and decisions from the Team Leader.
2. Accepted ADRs in [`../adr/README.en.md`](../adr/README.en.md).
3. Canonical docs in the parent directory.
4. Working handoffs and replan documents only provide analysis, assumptions, evidence, or status.

## Classification

- `CC-*.md`: Specialized handoffs from initial analysis lanes.
- [`CC-005-dev-a-auth-ui-proposal.en.md`](CC-005-dev-a-auth-ui-proposal.en.md): Email/password/OTP handoff per ADR-0008, supplemented with optional Google Sign-In per ADR-0009.
- `INTEGRATION-HANDOFF.en.md`: Consolidated integration of handoffs.
- `FINAL-REVIEW.en.md`: Document review conclusions.
- `TEAM-BOARD.en.md`: Coordination board for working passes.
- `replan/`: Evidence for the 4–5 day delivery plan and RP-A through RP-D handoffs.
- [`team-handoff-2026-09-26/`](../../docs/working/team-handoff-2026-09-26/README.md): Remaining action items for DevB (DB/benchmark), DevC (UI/accessibility), and DevD (Vercel/SMTP/release).

## Update Rules

- Never record secrets, tokens, raw PII, or raw provider payloads.
- Do not modify source code or SRS in a docs-only pass.
- Do not convert provider/model assumptions into facts without concrete evidence.
- When working docs conflict with canonical/ADR documents, explicitly mark them as advisory or superseded; do not reopen decisions unilaterally.
- Historical handoffs/replans/reviews stating Google OAuth-only or email-only represent historical milestones; current authoritative status is owned by ADR-0008 and ADR-0009.
- When replanning is complete, retain reviews and blockers for traceability; do not use working docs as production status boards in place of `DELIVERY-PLAN.md`.
