import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { readDbEnv, sslOption } from "./env.ts";

const ENVIRONMENTS = ["local", "development", "preview", "staging", "production"] as const;
const OPERATIONS = ["migration", "reconcile", "restore"] as const;

export type DbOperationEnvironment = (typeof ENVIRONMENTS)[number];
export type DbOperationKind = (typeof OPERATIONS)[number];

export interface DbOperationLogInput {
  projectKey: string;
  environment: DbOperationEnvironment;
  operation: DbOperationKind;
  outcome: "success" | "failure";
  durationMs: number;
  migrationVersion: string | null;
  externalReference: string | null;
  errorCode: string | null;
}

export function parseDbOperationLogArgs(args: readonly string[]): DbOperationLogInput {
  if (args.length !== 8) {
    throw new Error(
      "usage: db:operation-log <project-key> <environment> <operation> <outcome> <duration-ms> <migration-version|-> <external-reference|-> <error-code|->",
    );
  }
  const [projectKey, environmentValue, operationValue, outcomeValue, durationValue,
    migrationVersionValue, externalReferenceValue, errorCodeValue] = args;
  if (projectKey === undefined || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(projectKey)) {
    throw new Error("invalid project-key");
  }
  if (environmentValue === undefined || !ENVIRONMENTS.includes(environmentValue as DbOperationEnvironment)) {
    throw new Error("invalid environment");
  }
  if (operationValue === undefined || !OPERATIONS.includes(operationValue as DbOperationKind)) {
    throw new Error("invalid operation");
  }
  if (outcomeValue !== "success" && outcomeValue !== "failure") throw new Error("invalid outcome");
  if (durationValue === undefined || !/^\d+$/.test(durationValue)) throw new Error("invalid duration-ms");
  const durationMs = Number(durationValue);
  if (!Number.isSafeInteger(durationMs)) throw new Error("duration-ms out of range");

  const migrationVersion = migrationVersionValue === "-" ? null : migrationVersionValue ?? null;
  if (operationValue === "migration") {
    if (migrationVersion === null || !/^\d{4}$/.test(migrationVersion)) throw new Error("migration requires NNNN version");
  } else if (migrationVersion !== null) {
    throw new Error("migration version is only valid for migration operation");
  }

  const externalReference = externalReferenceValue === "-" ? null : externalReferenceValue ?? null;
  if (externalReference !== null && !/^[A-Za-z0-9._:/#-]{1,128}$/.test(externalReference)) {
    throw new Error("invalid external-reference");
  }

  const errorCode = errorCodeValue === "-" ? null : errorCodeValue ?? null;
  if (outcomeValue === "failure") {
    if (errorCode === null || !/^[A-Z][A-Z0-9_]{0,63}$/.test(errorCode)) throw new Error("failure requires a stable error-code");
  } else if (errorCode !== null) {
    throw new Error("error-code is only valid for failure outcome");
  }

  return {
    projectKey,
    environment: environmentValue as DbOperationEnvironment,
    operation: operationValue as DbOperationKind,
    outcome: outcomeValue,
    durationMs,
    migrationVersion,
    externalReference,
    errorCode,
  };
}

/** Persist only bounded, redacted operation metadata using the CLI-only ops principal. */
export async function recordDbOperationLog(input: DbOperationLogInput): Promise<string> {
  const env = readDbEnv();
  const user = process.env["CAMPUS_COIN_DB_OPS_USER"];
  const password = process.env["CAMPUS_COIN_DB_OPS_PASSWORD"];
  const isLocalDisposableTest = process.env["CAMPUS_COIN_TEST_DB"] === "1" &&
    (env.host === "localhost" || env.host === "127.0.0.1" || env.host === "::1");
  if (user === undefined || user.length === 0 || password === undefined ||
    (password.length === 0 && !isLocalDisposableTest)) {
    throw new Error("CAMPUS_COIN_DB_OPS_USER and CAMPUS_COIN_DB_OPS_PASSWORD are required");
  }

  const operationId = randomUUID();
  const ssl = sslOption(env);
  const connection = await mysql.createConnection({
    host: env.host,
    port: env.port,
    database: env.database,
    user,
    password,
    ...(ssl === undefined ? {} : { ssl }),
    charset: "utf8mb4",
    timezone: "Z",
  });
  try {
    await connection.query(
      `INSERT INTO db_operation_logs
        (operation_id, project_key, environment_key, operation, outcome, migration_version,
         external_reference, duration_ms, error_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        operationId,
        input.projectKey,
        input.environment,
        input.operation,
        input.outcome,
        input.migrationVersion,
        input.externalReference,
        input.durationMs,
        input.errorCode,
      ],
    );
  } finally {
    await connection.end();
  }
  return operationId;
}
