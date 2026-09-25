# Benchmark

Run only against a local, disposable MySQL server. `npm run benchmark` creates a uniquely named schema, applies all migrations, loads the synthetic fixtures, runs the query set, prints only timing values, and drops the entire schema in `finally`. It never cleans financial rows with `DELETE`, because ledger and savings transfer history is append-only.

The command requires `CAMPUS_COIN_TEST_DB_ADMIN_USER` and `CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD`. `benchmark/run.ts` refuses non-local hosts; do not weaken this guard for production or shared databases.

The current fixture is small and the SQL timing values are observational only. It does not reproduce the historical volume or p50/p95 claims in `db/README.md`.
