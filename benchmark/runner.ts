import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import mysql, { type Connection, type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";
import {
  assertBenchmarkOptIn,
  assertLocalBenchmarkHost,
  benchmarkSummary,
  checkBenchmarkDeadline,
  createBenchmarkSchemaName,
  quoteBenchmarkSchemaName,
  readBenchmarkConfig,
  withOwnedBenchmarkSchema,
  type BenchmarkConfig,
} from "./runner-core.ts";
import { createTransaction, listTransactions } from "../src/application/ledger.service.ts";
import { listUserCategories } from "../src/application/category.service.ts";
import { dashboard, monthlyReport } from "../src/application/report.service.ts";
import { initializeWallet } from "../src/application/wallet.service.ts";
import { currentMonthKey, monthRangeUtc } from "../src/domain/period.ts";
import { readDbEnv, migrationCreds, sslOption, type DbEnv } from "../src/infrastructure/db/env.ts";
import { closePool, getPool, type Db } from "../src/infrastructure/db/pool.ts";
import {
  applyMigration,
  scanMigrationDir,
  supportsCheckConstraints,
  type MigrationConnection,
} from "../src/infrastructure/db/migration-engine.ts";

const CONNECT_TIMEOUT_MS = 5_000;
const SELECT_TIMEOUT_MS = 5_000;
const LOCK_WAIT_TIMEOUT_SECONDS = 5;
const MAX_POOL_CONNECTIONS = 5;
const MIGRATIONS_DIR = fileURLToPath(new URL("../db/migrations/", import.meta.url));

interface ServerInfo {
  version: string;
  maxConnections: number;
}

interface ScenarioResult {
  name: string;
  count: number;
  p50Ms: number;
  p95Ms: number;
}

interface ExplainSummary {
  scenario: string;
  steps: Array<{
    table: string;
    access: string;
    index: string;
    estimatedRows: number | null;
    extra: string;
  }>;
}

interface BenchmarkResult {
  commit: string;
  mysqlVersion: string;
  maxConnections: number;
  migrationCount: number;
  syntheticRows: number;
  poolConnections: number;
  config: BenchmarkConfig;
  scenarios: ScenarioResult[];
  explain: ExplainSummary[];
}

function safeFailureCode(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[A-Z0-9_]{1,48}$/.test(code)) return code;
  }
  if (error instanceof Error && error.name === "BenchmarkGuardError") return "CONFIG_REJECTED";
  if (error instanceof Error && error.name === "BenchmarkDeadlineError") return "TIME_LIMIT_REACHED";
  return "BENCHMARK_FAILED";
}

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

function makeConnectionOptions(env: DbEnv, database?: string) {
  const credentials = migrationCreds(env);
  const ssl = sslOption(env);
  return {
    host: env.host,
    port: env.port,
    user: credentials.user,
    password: credentials.password,
    ...(database === undefined ? {} : { database }),
    ...(ssl === undefined ? {} : { ssl }),
    connectTimeout: CONNECT_TIMEOUT_MS,
    charset: "utf8mb4",
    timezone: "Z" as const,
    supportBigNumbers: true,
    ...(database === undefined ? {} : { multipleStatements: true }),
  };
}

async function readServerInfo(admin: Connection): Promise<ServerInfo> {
  const [rows] = await admin.query("SELECT VERSION() AS version, @@max_connections AS max_connections");
  const first = (rows as Array<{ version: string; max_connections: number | string }>)[0];
  if (first === undefined || !supportsCheckConstraints(first.version)) {
    throw new Error("The local target must be MySQL 8.0.16 or newer.");
  }
  return {
    version: first.version,
    maxConnections: Number(first.max_connections),
  };
}

async function applyCurrentMigrations(database: string, env: DbEnv, startedAtMs: number, config: BenchmarkConfig) {
  const files = await scanMigrationDir(MIGRATIONS_DIR);
  if (files.length === 0) throw new Error("No application migrations were found.");

  const connection = await mysql.createConnection(makeConnectionOptions(env, database));
  try {
    const migrationConnection = connection as unknown as MigrationConnection;
    for (const file of files) {
      checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());
      await applyMigration(migrationConnection, file);
    }
  } finally {
    await connection.end();
  }
  return files.length;
}

async function setSessionLimits(pool: Pool, count: number): Promise<void> {
  const connections: PoolConnection[] = [];
  try {
    const acquired = await Promise.all(Array.from({ length: count }, () => pool.getConnection()));
    connections.push(...acquired);
    await Promise.all(connections.map(async (connection) => {
      await connection.query(`SET SESSION MAX_EXECUTION_TIME = ${SELECT_TIMEOUT_MS}`);
      await connection.query(`SET SESSION innodb_lock_wait_timeout = ${LOCK_WAIT_TIMEOUT_SECONDS}`);
    }));
  } finally {
    for (const connection of connections) connection.release();
  }
}

async function createSyntheticOwner(pool: Pool): Promise<number> {
  const syntheticEmail = `benchmark-${randomUUID()}@example.com`;
  const [result] = await pool.query(
    "INSERT INTO users (display_name, email) VALUES (?, ?)",
    ["Synthetic benchmark user", syntheticEmail],
  );
  const insertId = (result as ResultSetHeader).insertId;
  if (!Number.isSafeInteger(Number(insertId)) || Number(insertId) <= 0) {
    throw new Error("The synthetic owner row did not receive a valid identifier.");
  }
  return Number(insertId);
}

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

async function seedSyntheticRows(
  pool: Pool,
  userId: number,
  rows: number,
  startedAtMs: number,
  config: BenchmarkConfig,
): Promise<void> {
  const categories = await listUserCategories(pool as unknown as Db, userId);
  const incomeCategory = categories.find((category) => category.appliesTo === "income" && category.status === "active");
  const paymentCategory = categories.find((category) => category.appliesTo === "payment" && category.status === "active");
  if (incomeCategory === undefined || paymentCategory === undefined) {
    throw new Error("The temporary schema is missing default income or payment categories.");
  }

  await initializeWallet(pool as unknown as Db, {
    userId,
    initialBalanceVnd: 1_000_000_000,
    idempotencyKey: `benchmark-baseline:${randomUUID()}`,
    requestHash: requestHash({ userId, initialBalanceVnd: 1_000_000_000 }),
  });

  const incomeCategoryId = Number(incomeCategory.id);
  const paymentCategoryId = Number(paymentCategory.id);
  for (let index = 0; index < rows; index += 1) {
    checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());
    const type = index % 5 === 0 ? "income" : "payment";
    const amountVnd = type === "income" ? 50_000 + (index % 7) * 1_000 : 5_000 + (index % 25) * 500;
    const daysAgo = rows === 1 ? 0 : Math.floor((index * 89) / (rows - 1));
    const occurredAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1_000).toISOString();
    const body = {
      type,
      amountVnd,
      categoryId: type === "income" ? incomeCategoryId : paymentCategoryId,
      occurredAt,
      description: "Synthetic benchmark fixture",
    };
    await createTransaction(pool as unknown as Db, {
      ...body,
      userId,
      description: body.description,
      idempotencyKey: `benchmark-ledger:${randomUUID()}`,
      requestHash: requestHash(body),
    });
  }
}

async function measureScenario(
  name: string,
  operation: () => Promise<unknown>,
  startedAtMs: number,
  config: BenchmarkConfig,
): Promise<ScenarioResult> {
  for (let index = 0; index < config.warmup; index += 1) {
    checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());
    await operation();
  }

  const samplesMs: number[] = new Array(config.samples);
  let nextSample = 0;
  const workers = Array.from({ length: Math.min(config.concurrency, config.samples) }, async () => {
    while (true) {
      const index = nextSample;
      nextSample += 1;
      if (index >= config.samples) return;

      checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());
      const requestStartedAt = performance.now();
      await operation();
      const requestFinishedAt = performance.now();
      checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, requestFinishedAt);
      samplesMs[index] = requestFinishedAt - requestStartedAt;
    }
  });
  const workerResults = await Promise.allSettled(workers);
  const failedWorker = workerResults.find((result) => result.status === "rejected");
  if (failedWorker?.status === "rejected") throw failedWorker.reason;

  const summary = benchmarkSummary(samplesMs);
  return { name, ...summary };
}

function summarizeExplainRows(scenario: string, rows: unknown): ExplainSummary {
  const records = Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
  return {
    scenario,
    steps: records.slice(0, 20).map((row) => ({
      table: String(row.table ?? ""),
      access: String(row.type ?? ""),
      index: String(row.key ?? ""),
      estimatedRows: Number.isFinite(Number(row.rows)) ? Number(row.rows) : null,
      extra: String(row.Extra ?? "").slice(0, 160),
    })),
  };
}

async function explainReadQueries(pool: Pool, userId: number): Promise<ExplainSummary[]> {
  const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc(currentMonthKey());
  const [listResult] = await pool.query(
    `EXPLAIN SELECT id, user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, description, item_name, reason, created_at
     FROM ledger_transactions
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    [userId, 51],
  );
  const [reportResult] = await pool.query(
    `EXPLAIN SELECT
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_vnd ELSE 0 END), 0) AS income_total,
       COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount_vnd ELSE 0 END), 0) AS payment_total
     FROM ledger_transactions t
     WHERE t.user_id = ?
       AND t.occurred_at >= ? AND t.occurred_at < ?
       AND t.role <> 'reversal'
       AND NOT EXISTS (
         SELECT 1 FROM ledger_transactions c
         WHERE c.user_id = t.user_id AND c.reference_id = t.id
       )`,
    [userId, new Date(startUtcMs), new Date(endExclusiveUtcMs)],
  );
  return [
    summarizeExplainRows("transaction_list", listResult),
    summarizeExplainRows("monthly_report_totals", reportResult),
  ];
}

async function runInTemporarySchema(
  database: string,
  baseEnv: DbEnv,
  serverInfo: ServerInfo,
  config: BenchmarkConfig,
  startedAtMs: number,
): Promise<Omit<BenchmarkResult, "commit">> {
  const migrationCount = await applyCurrentMigrations(database, baseEnv, startedAtMs, config);
  checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());

  const poolConnections = Math.min(MAX_POOL_CONNECTIONS, config.concurrency + 1);
  const benchmarkEnv: DbEnv = {
    ...baseEnv,
    database,
    connectionLimit: poolConnections,
  };
  const pool = getPool(benchmarkEnv);
  try {
    await setSessionLimits(pool, poolConnections);
    const userId = await createSyntheticOwner(pool);
    await seedSyntheticRows(pool, userId, config.rows, startedAtMs, config);
    const month = currentMonthKey();

    const scenarios: ScenarioResult[] = [];
    scenarios.push(await measureScenario(
      "dashboard",
      () => dashboard(pool as unknown as Db, userId),
      startedAtMs,
      config,
    ));
    scenarios.push(await measureScenario(
      "transaction_list_keyset",
      () => listTransactions(pool as unknown as Db, userId, { limit: 50 }),
      startedAtMs,
      config,
    ));
    scenarios.push(await measureScenario(
      "monthly_report",
      () => monthlyReport(pool as unknown as Db, userId, month),
      startedAtMs,
      config,
    ));

    checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());
    const explain = await explainReadQueries(pool, userId);
    checkBenchmarkDeadline(startedAtMs, config.maxDurationMs, performance.now());
    const result = {
      mysqlVersion: serverInfo.version,
      maxConnections: serverInfo.maxConnections,
      migrationCount,
      syntheticRows: config.rows,
      poolConnections,
      config,
      scenarios,
      explain,
    };
    return result;
  } finally {
    await closePool();
  }
}

async function runLocalBenchmark(): Promise<BenchmarkResult> {
  const env = process.env;
  assertBenchmarkOptIn(env);
  const dbEnv = readDbEnv(env);
  assertLocalBenchmarkHost(dbEnv.host);
  const config = readBenchmarkConfig(env);
  const startedAtMs = performance.now();
  const adminCredentials = migrationCreds(dbEnv);
  const ssl = sslOption(dbEnv);
  const admin = await mysql.createConnection({
    host: dbEnv.host,
    port: dbEnv.port,
    user: adminCredentials.user,
    password: adminCredentials.password,
    ...(ssl === undefined ? {} : { ssl }),
    connectTimeout: CONNECT_TIMEOUT_MS,
    charset: "utf8mb4",
  });

  let createAttempted = false;
  let cleanupSucceeded = false;
  let serverInfo: ServerInfo;
  try {
    serverInfo = await readServerInfo(admin);
    const schemaName = createBenchmarkSchemaName(process.pid, randomUUID());
    const result = await withOwnedBenchmarkSchema(schemaName, {
      create: async (name) => {
        createAttempted = true;
        await admin.query(
          `CREATE DATABASE ${quoteBenchmarkSchemaName(name)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
        );
      },
      run: (name) => runInTemporarySchema(name, dbEnv, serverInfo, config, startedAtMs),
      drop: async (name) => {
        await admin.query(`DROP DATABASE ${quoteBenchmarkSchemaName(name)}`);
        cleanupSucceeded = true;
      },
    });
    return { commit: currentCommit(), ...result };
  } catch (error) {
    if (createAttempted && !cleanupSucceeded) {
      process.stderr.write("Cleanup status: not confirmed; do not remove any schema except a runner-generated local schema.\n");
    }
    throw error;
  } finally {
    await admin.end();
  }
}

function printResult(result: BenchmarkResult): void {
  process.stdout.write("Local disposable MySQL benchmark completed.\n");
  process.stdout.write(`Commit: ${result.commit}\n`);
  process.stdout.write(`MySQL version: ${result.mysqlVersion}\n`);
  process.stdout.write("Target type: local disposable\n");
  process.stdout.write(`Migrations applied: ${result.migrationCount}\n`);
  process.stdout.write(`Synthetic ledger rows: ${result.syntheticRows}\n`);
  process.stdout.write(`Pool connections: ${result.poolConnections}\n`);
  process.stdout.write(`Max server connections: ${result.maxConnections}\n`);
  process.stdout.write(
    `Parameters: warmup=${result.config.warmup}, samples=${result.config.samples}, concurrency=${result.config.concurrency}, maxDurationMs=${result.config.maxDurationMs}\n`,
  );
  for (const scenario of result.scenarios) {
    process.stdout.write(
      `${scenario.name}: n=${scenario.count}, p50=${scenario.p50Ms}ms, p95=${scenario.p95Ms}ms\n`,
    );
  }
  process.stdout.write(`EXPLAIN (read-only): ${JSON.stringify(result.explain)}\n`);
  process.stdout.write("Cleanup: temporary schema dropped.\n");
  process.stdout.write("These local results are not a cloud or Vercel benchmark.\n");
}

async function main(): Promise<void> {
  try {
    const result = await runLocalBenchmark();
    printResult(result);
  } catch (error) {
    process.stderr.write(`Local benchmark stopped (${safeFailureCode(error)}). Sensitive connection details are suppressed.\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  void main();
}
