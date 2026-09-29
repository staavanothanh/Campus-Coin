# Quality and Scoring Criteria

## Rubric

| Category | Weight | Required Demonstration for Campus Coin |
|---|---:|---|
| Functionality Testing | 35 | Acceptance per SRS; register/OTP/login/reset/session; wallet; income/payment; savings; budget; reports; categories; issue/admin; validation, error handling, and owner permissions. |
| UI & Accessibility Testing | 15 | Clear navigation, responsiveness, loading/error/success/empty/expired states, labels, keyboard/focus management, accessibility announcements, and multi-browser/viewport testing. |
| Source Code | 10 | Layered/feature-based structure, clear naming, consistent validation and error handling, readable and explainable code; tests accompanying changes. |
| Database Testing | 10 | SQL scripts, migrations, PK/FK/UNIQUE/CHECK/indexes, seeds, transactional append-only integrity, and owner isolation verified on dedicated test MySQL instances. |
| Compatibility Testing | 5 | Minimum browser verification across Chrome, Firefox, Edge, and Opera; documenting test date, version, and concise findings. |
| Documentation | 10 | Report includes problem statement, architectural diagrams, module/logic breakdown, team allocations, installation/run/test instructions, limitations, and evidence. |
| Plagiarism Testing | 10 | Traceable code origins, documented references, clear team comprehension and ability to explain architectural choices and implementations. |
| Ontime Submission | 5 | Early scope freeze, reserving adequate runway for builds, demos, reports, and submission bundling prior to deadline. |
| **Total** | **100** | |

## Priority Ordering

1. **Functionality (35 pts):** Establish SRS requirement matrix → features → tests; implement thin UI slices for wallet/dashboard, income/payment/history, then remaining domains; test auth/email and critical failure modes.
2. **UI & Accessibility (15 pts):** Fix usability obstacles, form validation issues, and keyboard/focus traps before introducing new screens.
3. **Source Code + Database (20 pts):** Keep code simple, verify migrations and data integrity against an isolated MySQL instance.
4. **Documentation + Originality (20 pts):** Finalize reports, diagrams, ownership matrices, and citations.
5. **Compatibility + On-time Delivery (10 pts):** Test browsers and package submissions well ahead of deadlines.

## Current Status Against Rubric

| Category | Current Status | Remaining Work for Submission Evidence |
|---|---|---|
| Functionality Testing — 35 | Auth and domain APIs have unit/integration coverage; owner isolation passed on isolated CI MySQL. Team Leader reported Part 2 auth staging complete. | Post-login domain UI remains pending. Checkout lacks formal SRS, requiring SRS requirement matrix → feature/API → test/evidence mapping; retain team staging evidence and deliver complete end-to-end product demo. |
| UI & Accessibility Testing — 15 | Auth UI features validation, bilingual copy, and basic keyboard semantics. | Build domain screens; verify responsiveness, keyboard/focus/screen-reader flows, and error/loading states across the full application. |
| Source Code — 10 | Typecheck/build and layered structure verified in CI; Vercel adapter calls shared API handler, avoiding duplicate business routing. | Awaiting fresh CI run; team code review, documenting module boundaries, keeping changes simple and adhering to established conventions. |
| Database Testing — 10 | CI disposable MySQL executed migrations, seeds/test-data, and integration suites; added regression coverage for foreign corrections, categories, and related transactions. | Awaiting fresh CI run; Developer B must confirm migration chain, least-privilege grants, TLS/CA, backup/restore, and benchmarks on an isolated clone. |
| Compatibility Testing — 5 | No browser test matrix currently recorded. | Record results across Chrome, Firefox, Edge, and Opera with browser versions, viewports, and timestamps. |
| Documentation — 10 | Canonical product, auth, architecture, DB, and scoring documentation complete. | Finalize Project Report detailing problem statement, diagrams, module logic, assignments, and execution/testing runbooks. |
| Plagiarism Testing — 10 | No originality audit formally recorded. | Document references; team self-review and ability to explain source, algorithms, schemas, and design decisions. |
| Ontime Submission — 5 | No submission bundle or final demo evidence recorded yet. | Lock scope, clean build, verify demo flows, record commits/tags, and prepare submission bundle before deadline. |

Status marked "no evidence recorded" denotes unverified or unrecorded items; do not substitute assumptions for actual test results.

## Performance Benchmarking

Benchmarking is not an individually weighted rubric category, but measurements support evaluations of source code quality and functional user experience. `db/README.md` documents legacy reference measurements on local MySQL 8.0.41 with ~101,000 ledger rows across 21 owners. This metric does not prove Aiven/Vercel latency and lacks an in-repo harness to replicate the measurement. The Vercel adapter attaches pool lifecycle hooks for idle MySQL connections, but has not profiled p50/p95 latency, connection headroom, or deployment load.

Once the MySQL clone and deployment runtime are verified, Developer B benchmarks report/dashboard/list/payment endpoints; documenting commit SHA, MySQL version/region, synthetic row/owner counts, concurrency, warm-up runs, iterations, p50/p95 latencies, query execution plans, and connection headroom. Never use real user data. Current status: cloud benchmark not yet executed; checklist in [Developer B Handoff](./working/team-handoff-2026-09-26/DEV-B-DB-AND-BENCHMARK.md).

## Required Evidence Artifacts

- Functionality: acceptance checklists and test outputs per flow.
- UI/accessibility: screenshots or checklists covering forms, keyboard navigation, focus indicators, mobile viewports, and 4 major browsers.
- Source: typecheck/build logs, module structure, and concise explanations of primary boundaries.
- Database: migration versions, `db:datatest` outputs, MySQL integration results, and owner-isolation proofs.
- Documentation: project report, ER/domain/API diagrams, task assignments, and execution runbooks.
- Compatibility: browsers, versions, viewports, test dates, and resolved defects.
- Deadline: submission commit/tag and operational demo recording.

Technical principles questions and how the team translated them into decisions for React, HTML forms, APIs, Node.js, and MySQL reside in [ENGINEERING-PRINCIPLES-APPLICATION.en.md](./ENGINEERING-PRINCIPLES-APPLICATION.en.md). That document distinguishes implemented decisions from future release gates; it does not substitute for actual test evidence.

## Decision Governance and Code Standards

Canonical product/architectural decisions reside in the [ADR Index](./adr/README.en.md), where email/OTP continues alongside optional Google Sign-In per ADR-0008/0009; MySQL and owner authorization follow ADR-0003/0005; JEV remains optional/default-off per ADR-0006. The rubric does not alter these decisions.

Code emphasizes short functions, descriptive naming, linear control flows, and validation at boundaries. Avoid premature abstractions or dependencies that do not solve concrete requirements. Every test must demonstrate observable behavior, rather than merely verifying that code was invoked.
