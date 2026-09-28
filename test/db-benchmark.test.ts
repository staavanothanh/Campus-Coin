import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertBenchmarkOptIn,
  assertBenchmarkSchemaName,
  assertLocalBenchmarkHost,
  benchmarkSummary,
  checkBenchmarkDeadline,
  createBenchmarkSchemaName,
  readBenchmarkConfig,
  withOwnedBenchmarkSchema,
} from "../benchmark/runner-core.ts";

test("benchmark needs two explicit local disposable database confirmations", () => {
  assert.throws(() => assertBenchmarkOptIn({}), /CAMPUS_COIN_BENCHMARK=1/);
  assert.throws(() => assertBenchmarkOptIn({ CAMPUS_COIN_BENCHMARK: "1" }), /CONFIRM_LOCAL_DISPOSABLE=YES/);
  assertBenchmarkOptIn({
    CAMPUS_COIN_BENCHMARK: "1",
    CAMPUS_COIN_BENCHMARK_CONFIRM_LOCAL_DISPOSABLE: "YES",
  });
});

test("benchmark refuses non-local database hosts", () => {
  assertLocalBenchmarkHost("localhost");
  assertLocalBenchmarkHost("127.0.0.1");
  assertLocalBenchmarkHost("::1");
  assert.throws(() => assertLocalBenchmarkHost("mysql.example.test"), /only connects to a local MySQL host/);
  assert.throws(() => assertLocalBenchmarkHost("mysql-13ae44c9.aivencloud.com"), /only connects to a local MySQL host/);
});

test("benchmark settings reject empty, non-integer, and out-of-range values", () => {
  for (const value of ["", "abc", "1.5", "-1", "501"]) {
    assert.throws(
      () => readBenchmarkConfig({ CAMPUS_COIN_BENCHMARK_ROWS: value }),
      /CAMPUS_COIN_BENCHMARK_ROWS must be a whole number/,
    );
  }
  for (const [name, value] of [
    ["CAMPUS_COIN_BENCHMARK_SAMPLES", "29"],
    ["CAMPUS_COIN_BENCHMARK_WARMUP", "21"],
    ["CAMPUS_COIN_BENCHMARK_CONCURRENCY", "5"],
    ["CAMPUS_COIN_BENCHMARK_MAX_DURATION_MS", "4000"],
  ] as const) {
    assert.throws(() => readBenchmarkConfig({ [name]: value }), new RegExp(`${name} must be a whole number`));
  }
  assert.deepEqual(readBenchmarkConfig({}), {
    rows: 100,
    samples: 100,
    warmup: 5,
    concurrency: 1,
    maxDurationMs: 60_000,
  });
});

test("temporary schema names are generated and validated before use", () => {
  const schemaName = createBenchmarkSchemaName(123, "abcdef12-3456-7890-abcd-ef1234567890");
  assert.equal(schemaName, "campus_coin_bench_123_abcdef12");
  assertBenchmarkSchemaName(schemaName);
  assert.throws(() => createBenchmarkSchemaName(123, "abcdef12; DROP DATABASE campus_coin"));
  assert.throws(() => assertBenchmarkSchemaName("campus_coin"));
  assert.throws(() => assertBenchmarkSchemaName("campus_coin_bench_123_abcdef12;DROP"));
});

test("failed schema creation never attempts a drop", async () => {
  const schemaName = createBenchmarkSchemaName(123, "abcdef12");
  const dropped: string[] = [];
  await assert.rejects(
    withOwnedBenchmarkSchema(schemaName, {
      create: async () => { throw new Error("create failed"); },
      run: async () => "unreachable",
      drop: async (name) => { dropped.push(name); },
    }),
    /create failed/,
  );
  assert.deepEqual(dropped, []);
});

test("work failure cleans only the exact temporary schema that was created", async () => {
  const schemaName = createBenchmarkSchemaName(123, "abcdef12");
  const events: string[] = [];
  await assert.rejects(
    withOwnedBenchmarkSchema(schemaName, {
      create: async (name) => { events.push(`create:${name}`); },
      run: async () => { events.push("run"); throw new Error("migration or scenario failed"); },
      drop: async (name) => { events.push(`drop:${name}`); },
    }),
    /migration or scenario failed/,
  );
  assert.deepEqual(events, [`create:${schemaName}`, "run", `drop:${schemaName}`]);
});

test("unsafe schema names are rejected before create, run, or drop callbacks", async () => {
  const events: string[] = [];
  await assert.rejects(
    withOwnedBenchmarkSchema("campus_coin; DROP DATABASE other_db", {
      create: async () => { events.push("create"); },
      run: async () => { events.push("run"); return undefined; },
      drop: async () => { events.push("drop"); },
    }),
    /not created by the benchmark runner/,
  );
  assert.deepEqual(events, []);
});

test("cleanup failure reports a generic safe error", async () => {
  const schemaName = createBenchmarkSchemaName(123, "abcdef12");
  await assert.rejects(
    withOwnedBenchmarkSchema(schemaName, {
      create: async () => undefined,
      run: async () => "done",
      drop: async () => { throw new Error("private connection details"); },
    }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.match(error.message, /temporary-schema cleanup failed/);
      assert.doesNotMatch(error.message, /private connection details/);
      return true;
    },
  );
});

test("summary reports nearest-rank p50 and p95 and enforces a deadline", () => {
  assert.deepEqual(benchmarkSummary([10, 40, 20, 30]), { count: 4, p50Ms: 20, p95Ms: 40 });
  checkBenchmarkDeadline(100, 500, 599);
  assert.throws(() => checkBenchmarkDeadline(100, 500, 600), /configured time limit/);
});

test("CLI stops with a nonzero exit before reading DB settings when opt-in is missing", () => {
  const runnerPath = fileURLToPath(new URL("../benchmark/runner.ts", import.meta.url));
  const safeEnv: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "Path", "SystemRoot", "TEMP", "TMP"]) {
    if (process.env[name] !== undefined) safeEnv[name] = process.env[name];
  }

  const result = spawnSync(process.execPath, ["--import", "tsx", runnerPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: safeEnv,
    timeout: 10_000,
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Local benchmark stopped \(CONFIG_REJECTED\)/);
  assert.doesNotMatch(result.stderr, /completed|password|host=/i);
});
