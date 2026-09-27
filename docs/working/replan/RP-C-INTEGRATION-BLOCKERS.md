# C integration blockers

## Contract-safe work in this branch

- `src/web/amount-vnd.ts` validates positive decimal digits and serializes the documented integer `amountVnd` field.
- `src/web/App.tsx` sends the documented `type`, integer `amountVnd`, required `categoryId`, `occurredAt`, optional `description`, CSRF header, and idempotency key.
- The form keeps the browser presentation-only: it does not calculate balances, authorize payments, or submit a final balance.

## Blocked upstream integration

The canonical OpenAPI contract documents `/reports/dashboard`, `/ledger/transactions`, and `/categories`, but this C snapshot currently mounts only auth, preferences, and health routes in `src/app/server.ts`. A working category picker and dashboard/ledger smoke therefore require the canonical API implementation and route stack to be selected and mounted by the owning A/B workstreams. C does not add substitute routes, mock categories, client balance calculations, or an alternate auth/session stack.

The form accepts a category ID as a contract-required field and collects the documented optional description. Replacing the ID field with an authoritative localized category picker remains blocked until `GET /categories?appliesTo=<income|payment>` is available on the selected API stack. The existing field remains server-validated; it is not an authorization boundary.

## Verification scope

The focused VND serialization tests and TypeScript/frontend checks are local evidence only. End-to-end authenticated dashboard, category, and ledger submission smoke remains blocked while the upstream routes are unmounted and the canonical A/B auth/API stack is unresolved.
