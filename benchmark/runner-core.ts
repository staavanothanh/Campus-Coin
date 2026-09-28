export const BENCHMARK_LIMITS = {
  rows: { min: 1, max: 500, defaultValue: 100 },
  samples: { min: 30, max: 500, defaultValue: 100 },
  warmup: { min: 0, max: 20, defaultValue: 5 },
  concurrency: { min: 1, max: 4, defaultValue: 1 },
  maxDurationMs: { min: 5_000, max: 120_000, defaultValue: 60_000 },
} as const;

export interface BenchmarkConfig {
  rows: number;
  samples: number;
  warmup: number;
  concurrency: number;
  maxDurationMs: number;
}

export class BenchmarkGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BenchmarkGuardError";
  }
}

export class BenchmarkDeadlineError extends Error {
  constructor() {
    super("Benchmark reached its configured time limit.");
    this.name = "BenchmarkDeadlineError";
  }
}

function readBoundedInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  range: { min: number; max: number; defaultValue: number },
): number {
  const raw = env[name];
  if (raw === undefined) return range.defaultValue;

  const value = raw.trim();
  if (value === "") throw new BenchmarkGuardError(`${name} must be a whole number.`);

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < range.min || parsed > range.max) {
    throw new BenchmarkGuardError(`${name} must be a whole number in [${range.min}, ${range.max}].`);
  }
  return parsed;
}

export function assertBenchmarkOptIn(env: NodeJS.ProcessEnv): void {
  if (env.CAMPUS_COIN_BENCHMARK !== "1") {
    throw new BenchmarkGuardError("Set CAMPUS_COIN_BENCHMARK=1 to opt in to a local benchmark.");
  }
  if (env.CAMPUS_COIN_BENCHMARK_CONFIRM_LOCAL_DISPOSABLE !== "YES") {
    throw new BenchmarkGuardError(
      "Confirm the local MySQL service is disposable with CAMPUS_COIN_BENCHMARK_CONFIRM_LOCAL_DISPOSABLE=YES.",
    );
  }
}

export function assertLocalBenchmarkHost(host: string): void {
  const normalizedHost = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "0:0:0:0:0:0:0:1"]);
  if (!allowedHosts.has(normalizedHost)) {
    throw new BenchmarkGuardError("The benchmark runner only connects to a local MySQL host.");
  }
}

export function readBenchmarkConfig(env: NodeJS.ProcessEnv): BenchmarkConfig {
  return {
    rows: readBoundedInteger(env, "CAMPUS_COIN_BENCHMARK_ROWS", BENCHMARK_LIMITS.rows),
    samples: readBoundedInteger(env, "CAMPUS_COIN_BENCHMARK_SAMPLES", BENCHMARK_LIMITS.samples),
    warmup: readBoundedInteger(env, "CAMPUS_COIN_BENCHMARK_WARMUP", BENCHMARK_LIMITS.warmup),
    concurrency: readBoundedInteger(env, "CAMPUS_COIN_BENCHMARK_CONCURRENCY", BENCHMARK_LIMITS.concurrency),
    maxDurationMs: readBoundedInteger(
      env,
      "CAMPUS_COIN_BENCHMARK_MAX_DURATION_MS",
      BENCHMARK_LIMITS.maxDurationMs,
    ),
  };
}

const BENCHMARK_SCHEMA_PATTERN = /^campus_coin_bench_([1-9]\d*)_([a-f0-9]{8})$/;

export function createBenchmarkSchemaName(processId: number, randomSuffix: string): string {
  if (!Number.isSafeInteger(processId) || processId < 1) {
    throw new BenchmarkGuardError("A safe process identifier is required for the temporary schema name.");
  }
  const isShortHex = /^[a-f0-9]{8}$/i.test(randomSuffix);
  const isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(randomSuffix);
  if (!isShortHex && !isUuid) {
    throw new BenchmarkGuardError("A random hexadecimal suffix is required for the temporary schema name.");
  }
  const suffix = randomSuffix.replaceAll("-", "").slice(0, 8).toLowerCase();
  const name = `campus_coin_bench_${processId}_${suffix}`;
  assertBenchmarkSchemaName(name);
  return name;
}

export function assertBenchmarkSchemaName(name: string): void {
  if (!BENCHMARK_SCHEMA_PATTERN.test(name)) {
    throw new BenchmarkGuardError("The temporary schema name was not created by the benchmark runner.");
  }
}

export function quoteBenchmarkSchemaName(name: string): string {
  assertBenchmarkSchemaName(name);
  return `\`${name}\``;
}

export interface OwnedSchemaOperations<T> {
  create(name: string): Promise<void>;
  run(name: string): Promise<T>;
  drop(name: string): Promise<void>;
}

/** The runner can only clean the exact generated schema after CREATE succeeded. */
export async function withOwnedBenchmarkSchema<T>(
  name: string,
  operations: OwnedSchemaOperations<T>,
): Promise<T> {
  assertBenchmarkSchemaName(name);
  let wasCreated = false;
  let mainOperationFailed = false;

  try {
    await operations.create(name);
    wasCreated = true;
    return await operations.run(name);
  } catch (error) {
    mainOperationFailed = true;
    throw error;
  } finally {
    if (wasCreated) {
      try {
        await operations.drop(name);
      } catch {
        const detail = mainOperationFailed
          ? "The benchmark and temporary-schema cleanup both failed."
          : "The benchmark completed, but temporary-schema cleanup failed.";
        throw new Error(`${detail} Check only the generated local benchmark schema.`);
      }
    }
  }
}

export function percentile(valuesMs: number[], percentileValue: number): number {
  if (valuesMs.length === 0 || percentileValue <= 0 || percentileValue > 1) {
    throw new BenchmarkGuardError("A percentile needs samples and a value in (0, 1].");
  }
  const sorted = [...valuesMs].sort((left, right) => left - right);
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[index]!;
}

export function checkBenchmarkDeadline(startedAtMs: number, maxDurationMs: number, nowMs: number): void {
  if (nowMs - startedAtMs >= maxDurationMs) throw new BenchmarkDeadlineError();
}

export function benchmarkSummary(samplesMs: number[]): { count: number; p50Ms: number; p95Ms: number } {
  return {
    count: samplesMs.length,
    p50Ms: Math.round(percentile(samplesMs, 0.5) * 100) / 100,
    p95Ms: Math.round(percentile(samplesMs, 0.95) * 100) / 100,
  };
}
