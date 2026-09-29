# Engineering Principles and Practical Application to Campus Coin

This document answers technical questions applicable to Campus Coin, connecting each answer to the project's actual stack and engineering rules. Sections A through J contain 110 questions covering web core, forms, and accessibility; Section K contains 16 questions covering JEV design boundaries applicable if AI features are enabled later. Each section clarifies when a referenced technology is not part of the project's current stack.

Campus Coin uses React + TypeScript, a Node.js API, and MySQL. The project does not use Bootstrap, Express, or MongoDB. Questions addressing those technologies are answered by mapping underlying principles to existing code without introducing superfluous frameworks or changing databases.

## A. Web Flow and HTTP Contracts

1. **From click to UI update:** The React handler validates the form and invokes the API with JSON; the Node route authenticates, authorizes, and calls application services; services interact with MySQL or dispatch emails; the API returns status and envelopes; React updates state and re-renders. Every step defines explicit inputs and outputs.
2. **HTML, CSS, JavaScript, browser, server, and database:** HTML defines structure and semantics, CSS handles presentation, JavaScript manages behavior; the browser renders and dispatches requests; the server enforces trusted business rules; MySQL provides durable persistence. Never send secrets or financial calculation authority to the browser.
3. **HTTP request:** Method indicates the action; path targets the endpoint/resource; query selects read parameters; headers transmit metadata, cookies, and CSRF tokens; body carries mutation payloads. The server validates each component before use.
4. **HTTP response:** Status codes report protocol-level outcomes; headers and bodies supply metadata and data/error envelopes for clients to determine display or retry behaviors.
5. **Stateless HTTP:** Requests do not implicitly remember preceding calls, yet applications maintain server-side sessions. The browser sends an opaque session cookie; the server validates the session and resolves the owner from it.
6. **JSON is not a live object:** JSON transmits serialized data only; functions, prototypes, reference identity, and `undefined` are dropped. Both sides parse against the API schema rather than assuming intact object identity.
7. **Why browser validation is insufficient:** Clients can be bypassed or tampered with; the API must validate types, ranges, formats, and authorization; MySQL enforces final invariants like foreign keys, UNIQUE, CHECK constraints, and ACID transactions.
8. **CORS, authentication, authorization:** CORS restricts cross-origin response reading in browsers; authentication establishes identity; authorization dictates permitted actions. CORS does not substitute for CSRF/Origin checks and does not prove entity ownership.

## B. JavaScript: Values, Identity, and Asynchrony

9. **Do types belong to variables or values:** Types belong to values; a `let` variable can point sequentially to different types. At API boundaries, parse and validate before binding to strongly typed DTOs.
10. **Type coercion and truthy/falsy:** `===` avoids implicit coercion during comparison but does not replace validation. Handle `0`, `''`, `null`, and `undefined` explicitly; evaluate conditions matching expected types.
11. **What `const` protects:** It prevents rebinding variables, but does not freeze internal object state. For React state and shared data, create new objects or arrays to maintain immutable snapshots.
12. **Block scope:** `let` and `const` exist strictly within enclosing blocks and cannot be accessed prior to declaration. Declare variables close to their usage to narrow error scope.
13. **Functions as transformations:** Functions receive inputs, apply rules, and return outputs; DB operations, email dispatches, and logging represent side effects isolated to services and boundaries.
14. **Closures:** Functions capture bindings within their lexical scope at creation time, without deep-copying data. React handlers observe the render state that created them.
15. **Callbacks and higher-order functions:** Callbacks describe actions to execute; receiving functions dictate invocation timing and mechanics. Use them only when enhancing clarity, avoiding needless abstraction.
16. **Primitive vs. object assignment:** Primitive assignment copies values; object assignment creates additional references pointing to the same instance. Mutating through one reference alters all references.
17. **Shallow copy behavior of spread:** `{...x}` and `[...x]` copy only outer layers; nested objects remain shared references. When updating nested structures, copy each modified layer explicitly.
18. **`map`/`filter` vs. `sort`/`reverse`:** `map` and `filter` return new arrays; `sort` and `reverse` mutate arrays in-place. When sorting state, sort a copied array.
19. **Classes and prototypes:** JavaScript `class` syntax operates on prototype inheritance; instances share prototype methods. Campus Coin uses classes where necessary at boundaries, but clean procedural services remain preferred for readability.
20. **`this` and arrow functions:** Standard functions bind `this` based on invocation context; arrow functions capture lexical `this`. Avoid relying on `this` when pure functions or closures provide simpler implementations.
21. **`try/catch` and Promises:** Errors are caught when Promises are `await`ed within `try` blocks or passed along active promise chains. Unhandled promises must not escape error boundaries.
22. **ESM and CommonJS:** Different module loading systems. `package.json` designates the project as ESM; continue using uniform `import`/`export` syntax.
23. **Omitting `return` in Promises:** `.then()` chains wait only for returned Promises. When sequencing asynchronous DB/API operations, return the Promise or use `await`.
24. **`async` does not spawn OS threads:** `await` yields during I/O operations; intensive synchronous computation still blocks the event loop. Partition or bound CPU-intensive tasks when measurements indicate bottlenecks.
25. **`setTimeout(fn, 0)`:** Schedules callbacks after current call stacks and priority microtask queues empty. Never rely on timers as immediate execution guarantees.
26. **`fetch` and HTTP 404:** `fetch` resolves successfully for 404 responses; clients must inspect `response.ok` and status codes. `auth.api.ts` standardizes error handling so 4xx responses are not treated as successes.

## C. CSS, Layout, and Accessibility

27. **Cascade:** Browsers evaluate origin, cascade layers, and importance prior to specificity, scope, and source order. When styling fails, resolve winning rules before applying `!important`.
28. **Specificity:** Specificity resolves selectors only within the same cascade level; it cannot override higher origin or layer priorities.
29. **Inheritance:** Only certain CSS properties inherit down trees; `color` inherits by default, while `margin` does not. Declare properties directly on target components.
30. **Box model:** Content, padding, border, and margin; `border-box` includes padding and borders in element width. Global styles enforce `box-sizing: border-box`.
31. **Normal flow:** Rely on natural document flow so elements adapt height responsively; use absolute positioning sparingly for layered controls like password visibility toggles.
32. **Flexbox and Grid:** Flexbox is optimal for one-dimensional layouts; Grid for two-dimensional rows and columns. Choose based on content relationships.
33. **Flexbox axes:** `flex-direction` dictates the main axis; cross axis runs perpendicular. `justify-content` aligns along the main axis; `align-items` along the cross axis.
34. **Grid tracks and items:** Tracks form rows/columns; items occupy grid cells. Items flow into grids rather than defining them.
35. **Responsive breakpoints:** Set breakpoints where layouts feel crowded, overflow, or hinder interaction, rather than targeting specific device dimensions. Auth cards adapt dynamically to layout constraints.
36. **Absolute positioning:** Coordinates anchor to the nearest positioned ancestor containing block, not automatically to the viewport.
37. **High `z-index` losing stacking order:** Stacking contexts bound child element ordering. Inspect stacking contexts across ancestors before arbitrarily increasing numeric values.
38. **Layout vs. accessibility:** Visual presentation requires labels, keyboard focus indicators, non-color-dependent status indicators, and reduced-motion support. Auth forms use native controls, `aria-describedby`, inline error binding, and visible focus rings.
39. **Strikethrough declarations in DevTools:** Check selector matching, winning rules, and computed styles in cascade order; resolve root causes rather than appending `!important`.

## D. Bootstrap (Not a Current Dependency)

40. **What Bootstrap provides:** CSS components, utility classes, and JS plugins; it does not replace understanding semantic HTML, cascade rules, or state management. Campus Coin does not install Bootstrap and avoids adding it merely to mimic examples.
41. **Bootstrap grid:** Containers constrain width, rows manage gutters, and columns define responsive partitions; Campus Coin uses native CSS instead.
42. **Container, row, column, gutter responsibilities:** These define bounding areas, column groupings, widths, and spacing. These structural responsibilities apply equally to vanilla CSS.
43. **`.col-md-6` behavior:** In Bootstrap 5.3, columns occupy half-width from breakpoint `md` upward, defaulting to full-width below. Not directly applicable as the project uses vanilla CSS.
44. **Utilities vs. custom CSS:** Excessive utility classes scatter styling and cause cascade conflicts. If UI libraries are added later, distinguish grid classes from custom component styles.
45. **Bootstrap JS with React:** Never allow external JS plugins and React to manipulate identical DOM nodes. React must remain the single source of truth for DOM and state.

## E. React: State to User Interface

46. **JSX and components:** JSX describes UI component trees; components accept inputs and return JSX. `App` renders auth screens based on `page`, `user`, status messages, and request states.
47. **Props and composition:** Parents pass data downward; callbacks signal intents upward; children never mutate props. Extract components only to reduce duplication or clarify responsibilities.
48. **Rendering lists:** Beyond calling `map`, select appropriate item representations and assign stable `key`s derived from entity IDs. Never use array indices if lists can reorder.
49. **Declarative UI:** State drives the UI; user events trigger state mutations, causing React to re-render. Loading, error, and success states are represented through state models rather than direct DOM manipulation.
50. **Pure render functions:** Identical props, state, and context must produce identical JSX; rendering must never mutate existing data or trigger side effects. API calls belong in event handlers or lifecycle effects.
51. **State snapshots:** State setters request future renders; variable values in active handlers reflect the snapshot from the initial render. Do not read state immediately after calling a setter expecting updated values.
52. **Closures in event handlers:** Handlers capture lexical scopes from the render in which they were created. In asynchronous callbacks, verify that data has not become stale before updating UI state.
53. **Functional updaters:** Consecutive calls like `setCount(count + 1)` read identical snapshots; functional updaters like `setCount(v => v + 1)` chain updates sequentially over pending states. Use functional updaters when new states derive from current values.
54. **Immutable state updates:** Construct new object or array references so React detects changes and previous snapshots remain accurate. Campus Coin uses object spread for updates to `touched` field states.
55. **Derived state:** Values like `filteredItems` derived from `items` and search queries should be computed during rendering, eliminating redundant synchronized state variables.
56. **Lifting state up:** Elevate shared state to the nearest common ancestor acting as the single owner, passing values and callbacks down. Avoid maintaining duplicate state copies.
57. **State identity:** React preserves state according to tree position, component type, and keys. Changing keys or component types resets internal state; do so only when intentionally resetting forms.
58. **Controlled inputs:** Form controls bind `value` to React state and propagate updates via `onChange`. Auth inputs follow this pattern to retain form data across validation errors.
59. **Handlers vs. Effects:** Handlers execute in response to specific user actions; Effects synchronize with external systems after rendering and DOM commit. Form submission belongs in handlers; checking session state on application load belongs in Effects.
60. **Effect dependencies and cleanup:** Dependency arrays declare all external values read by an Effect; cleanup callbacks abort or tear down previous subscriptions on unmount or re-execution. Cancel or ignore stale asynchronous responses.
61. **Refs:** Hold mutable handles or values that persist across renders without triggering UI updates. `headingRef` manages focus after page transitions; `requestInProgress` blocks duplicate submissions; visible text remains bound to state.
62. **Reducers, context, and custom Hooks:** Reducers manage complex state transitions; context shares data across component hierarchies; custom Hooks encapsulate reusable logic. Auth state currently remains sufficiently compact within `App`, making these abstractions premature.
63. **Rules of Hooks:** Hook invocation order must remain identical across all renders. Call Hooks at top-level component scope, never within conditionals, loops, or nested functions.
64. **Stale responses arriving late:** Network responses can race against newer user actions. Utilize `AbortController` or request correlation tokens to ignore superseded requests; auth forms currently prevent duplicate submissions during flight.
65. **Minimal CRUD state:** Store raw collections, search queries, active draft forms, and request statuses; derive counts and filtered views during rendering to prevent boolean state contradictions.

## F. Node.js and HTTP Server

66. **JavaScript vs. Node.js:** JavaScript is the programming language; Node.js is the runtime providing process, network, filesystem, and server APIs. Browser code does not inherently have access to Node APIs.
67. **Browser vs. Node APIs:** Modules run in both environments only if restricted to universal APIs or abstracted through adapters. Databases, SMTP connections, and secrets reside strictly on the server.
68. **Module systems:** File extensions and `package.json` govern module resolution; Campus Coin declares ESM and uses uniform `import`/`export` syntax.
69. **Event loop:** Node offloads I/O operations from the call stack, executing callbacks upon completion. This allows servicing concurrent requests without blocking during DB or email operations.
70. **CPU work in `async` functions:** `async` functions do not create OS threads; cryptographic hashing still consumes CPU time. Password hashing must use established libraries with tuned cost parameters, bounding concurrency if profiling reveals contention.
71. **Streams:** Process large payloads in chunks to minimize memory consumption and handle backpressure. Auth and API JSON payloads are currently small and bounded; streaming abstractions are unnecessary for current payloads.
72. **Environment variables:** Store server-side configuration and secrets. DB passwords, SMTP credentials, OAuth secrets, and session keys must never be exposed to `VITE_*` frontend bundles, API responses, or version control.

## G. API Pipeline and Middleware Principles

73. **Request pipeline:** Requests pass sequentially through size limits, Origin/CSRF validation, route dispatching, session resolution, schema validation, service execution, and response serialization. Incorrect ordering can result in unparsed bodies or unauthenticated access.
74. **Route matching:** Both HTTP method and URL path identify endpoints; `GET` and `POST` handlers on identical paths maintain distinct behaviors and permission requirements.
75. **Input sources:** Path parameters from URL paths, query parameters from URL query strings, and body payloads from JSON parsers. Each input source requires schema validation against established contracts.
76. **Role of JSON parsers:** Converts raw JSON strings into JavaScript objects; it does not validate field types, owner authorization, or domain constraints.
77. **Preventing hung requests:** Middleware must either terminate responses or forward control/errors exactly once. In Node routes, all asynchronous branches must return responses or propagate errors.
78. **Middleware order determines behavior:** Parsing, security checks, authentication, and routing must execute in strict sequence; pipelines must fail closed if security checks fail.
79. **404 vs. 5xx errors:** 404 indicates missing routes or resources per established policy; unexpected runtime failures yield 5xx errors. Error responses return standardized envelopes without leaking internal stack traces.
80. **Rejected async handlers:** Asynchronous errors must be caught and routed to centralized API error handlers, which sanitize messages and redact diagnostics before client response.

## H. Durable Persistence (Relational Principles)

81. **Flexible schemas vs. invariants:** While document databases permit flexible BSON documents, applications still require validation. Campus Coin uses typed MySQL schemas with foreign keys, CHECK constraints, UNIQUE indexes, and versioned migrations to enforce invariants.
82. **URL identifiers vs. Database identifiers:** URL parameters represent untrusted strings; validate formats and ranges before converting to database types. Never cast arbitrary strings or rely on client assertions.
83. **Access patterns drive schema design:** Analyze read/write patterns, relationships, and invariants first. Campus Coin uses relational tables for wallets, ledgers, savings, budgets, and users rather than serializing UI state blobs.
84. **Embedding vs. referencing:** Relational entities utilize normalized tables and foreign keys; JSON columns are reserved for auxiliary metadata that does not require indexing or joins. Never store ledger or savings records in JSON blobs.
85. **Filtering, projection, and pagination:** SQL `WHERE` filters rows, `SELECT` restricts columns, and cursor pagination bounds result sets. Financial queries must include mandatory owner predicates.
86. **Updates, replacements, and upserts:** SQL `UPDATE` statements modify allowlisted columns only; never map arbitrary request bodies directly to query builders. Upserts are permitted only when contracts explicitly define conflict resolution and idempotency semantics.
87. **Indexing:** Indexes trade disk space and write throughput for query performance. Define composite indexes matching real filter and sorting patterns; verify with `EXPLAIN` and workload profiling.
88. **Aggregation:** SQL `WHERE`, `GROUP BY`, aggregate functions, and CTEs transform records deterministically. Monthly reports and budgets calculate exclusively from active ledger records scoped by owner.
89. **Atomicity:** Single update statements provide statement-level atomicity; multi-step operations modifying wallets, ledgers, and savings require transactions with consistent lock ordering to commit or roll back together.
90. **Connection pooling:** The application reuses a bounded MySQL connection pool rather than opening connections per request; configure pool limits according to serverless instance scaling and database quotas.

## I. Full-Stack Slices and Diagnostics

91. **Tracing an end-to-end operation:** Form state → JSON request → validated input → service/repository → MySQL row → response envelope → React state → rendered DOM. Each boundary transforms representation and enforces validation.
92. **CRUD contracts:** Endpoints follow OpenAPI definitions; resource creation returns `201`, reads and updates return `200` with payload bodies, deletions return appropriate status codes; errors return consistent status codes and error codes.
93. **Three-layer validation:** Clients provide immediate UX feedback; APIs act as the authority for inputs, authorization, and domain logic; databases enforce invariants via constraints and transactions. Never omit a layer because another performs checks.
94. **Search and filtering:** Small pre-loaded datasets can be filtered in React; large or paginated datasets must query the API and database with limits, owner scoping, and indexes.
95. **Stable entity identifiers:** The same entity ID is represented as a React key, a URL string, and a database primary key across different boundaries. Conversions and checks occur server-side; never trust client-supplied owner IDs.
96. **UI state machines:** Explicit finite states (loading, ready, saving, error) prevent contradictory boolean flags. Auth forms currently use page, busy, and message fields; transition to union states if interaction complexity grows.
97. **Four security boundaries:** CORS governs browser cross-origin policy; authentication establishes identity; authorization validates actions and ownership; secrets reside exclusively in server environments. Never substitute one boundary for another.
98. **Custom CSS vs. frameworks:** Bootstrap is not in project dependencies. Custom CSS manages presentation; React controls state and markup. If adding UI frameworks later, distinguish grid utilities from custom component styles.
99. **Diagnosing slow requests:** Capture timestamps across UI, network, API, and DB queries to identify latency bottlenecks; optimize only layers with empirical measurements. Never log request bodies, passwords, OTPs, tokens, or raw financial details.
100. **Acceptance of full-stack slices:** Complete operations must flow from forms through APIs to MySQL and be readable in return, accompanied by validation, error handling, accessible UI states, owner isolation, constraints, and automated tests. Isolated mocks or builds do not constitute production readiness.

## J. HTML Forms and Patch Reviews

101. **Why `label`, `fieldset`, and `legend` form contracts:** `label` names individual controls; `fieldset` groups related controls; `legend` titles groups. Browsers and assistive technologies rely on these semantic elements, which generic `div` tags cannot replace. Auth forms implement these groupings.
102. **Form submissions with native validation:** Use `<form onSubmit>` with `type="submit"` buttons; HTML enforces native validation (`required`, `type`, `pattern`, min/max) before invoking React handlers. Auth forms removed `noValidate` and utilize `onInvalid` to render inline errors.
103. **Binding custom error messages:** Form inputs set `aria-describedby` pointing to error element IDs and update `aria-invalid`; error messages provide clear explanations beyond visual color changes. Auth forms adhere to this pattern.
104. **Owner handling in PATCH requests:** Extract `user_id` from the authenticated session and inject it into database update queries. Never trust owner identifiers from request bodies or URLs; return contract-specified errors on unowned resources.
105. **Expected vs. unexpected errors:** Handled validation, conflict, and authorization failures return specific HTTP status codes and public error codes; unhandled exceptions return generic 500 responses. Logs redact secrets, and public responses omit stack traces.
106. **Never map request bodies directly to SQL:** Parse and allowlist fields permitted by the use case; services construct parameterized SQL statements. Clients cannot select columns, predicates, or query operators.
107. **Unique constraints and race conditions:** Pre-checking existence does not prevent concurrent insertions; unique indexes enforce final authority. Map duplicate-key errors to HTTP conflict responses.
108. **Interpreting `EXPLAIN ANALYZE`:** Review access paths, index usage, examined rows, returned rows, sorting, temporary tables, and execution durations. Do not transfer document database assumptions to MySQL.
109. **Auditing requests without leaking data:** Log request/correlation IDs, HTTP methods, paths, status codes, durations, and error codes; never log request bodies, full emails, OTPs, passwords, cookies, reset tokens, or raw financial payloads.
110. **Rejecting patches based on happy path alone:** Compare requirements against diffs; execute focused and cumulative test suites; evaluate invalid, stale, unauthorized, and provider failure conditions; review secret and transaction boundaries; record unproven areas explicitly.

## K. 16 Conditional Principles for JEV

This section defines architectural boundaries for optional JEV capabilities. JEV is currently default-off and possesses no authority to create, modify, or delete ledger, wallet, savings, or budget rows.

111. **Deterministic logic vs. model inference:** Balances, budgets, permissions, and validations are strictly deterministic code; models only suggest categories from candidate sets when enabled.
112. **Why static workflows serve as baselines:** Category suggestions feature fixed inputs and outputs; small deterministic workflows are significantly easier to secure than autonomous multi-step agent loops.
113. **When tasks do not require agent loops:** Single-turn model invocations with structured schemas and reject/confirm flows do not require tool loops or autonomous actions.
114. **Scoping context and provenance:** Transmit only minimal descriptions and category candidates; distinguish user-supplied data from system instructions. Never transmit sessions, secrets, or financial history.
115. **Safe tool invocation chains:** If tools are introduced later, parse requests → validate schemas → authorize server-side → execute allowlisted tools → return empirical observations. JEV currently has no tool invocation authority.
116. **Schema validation before side effects:** Validate typed outputs prior to consumption; model outputs must never directly mutate databases or authorize payments.
117. **Returning empirical observations:** Report only actual categories and provider results returned by the system; timeouts and schema failures must not invent synthetic successes.
118. **Stop conditions and resource budgets:** Suggestions operate under step limits, timeouts, and cost budgets; exceeding thresholds aborts execution and falls back to manual entry.
119. **Insufficient evidence:** Return "insufficient data" or fall back to manual selection; never guess categories with false certainty.
120. **Least privilege:** JEV receives minimal input data and suggestion permissions only; it possesses no DB write credentials, session access, or financial authority.
121. **Secrets excluded from prompts and tool results:** OpenRouter keys, SMTP/DB credentials, cookies, and tokens reside in server secret stores; never expose them to models or clients.
122. **Retries:** Retry transient network failures only; bound timeouts and retries, ensuring side effects do not duplicate. Suggestions have no write side effects.
123. **Mandatory human approval:** Users confirm or modify category suggestions before transactions are saved; models never submit payments autonomously.
124. **Handling high uncertainty:** Signal uncertainty and prompt manual selection rather than forcing category assignments.
125. **Cost and latency boundaries:** Define timeouts, spending caps, concurrency limits, and fallbacks prior to provider activation; verify empirical quotas without speculation.
126. **Testing beyond happy paths:** When deploying JEV, test malformed schemas, timeouts, 4xx/5xx responses, adversarial prompts, missing inputs, quota exhaustion, log redaction, and fallback mechanisms prior to launch.

## Status of Principles Implementation

- Questions 1–100 have been answered and translated into engineering rules across web, React, Node/API, and MySQL. Multiple principles are implemented in auth/API/domain code and CI; they cannot be considered fully applied across the user surface until post-login domain UI screens are implemented.
- Questions 101–110 focus on form semantics and patch reviews. Auth forms implement semantic HTML, native validation, single submit handlers, error binding, and keyboard focus. Application-wide accessibility requires validation once domain screens exist.
- Questions 111–126 apply only when JEV is enabled. JEV is currently optional and default-off, making these items architectural guardrails rather than implemented code.
- Consequently, principles are documented with varying implementation statuses: some are applied in code, some represent acceptance criteria, and some await UI or provider activation. Mark items "applied" only when backed by code or test evidence.

## Applied Code Changes in this Pass

- Auth forms utilize `fieldset` and `legend` to group controls, with `label` bound to inputs; forms receive accessible names from headings.
- Native HTML validation is enabled; `onInvalid` displays inline errors; forms implement single `onSubmit` handlers and submit buttons declare `type="submit"`.
- Added keyboard focus outlines for buttons and links; errors bind to fields via `aria-describedby` and `aria-invalid`.
- Sanitized email formatting in owner-isolation tests to prevent validation failures caused by whitespace.
- Additional principles recorded as architectural decisions and acceptance criteria. This document does not claim MySQL tests, staging SMTP, accessibility audits, or live JEV tests have passed without dedicated evidence.
