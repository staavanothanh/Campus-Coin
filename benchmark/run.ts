import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { readDbEnv, sslOption } from "../src/infrastructure/db/env.js";
import { applyMigration, scanMigrationDir, type MigrationConnection } from "../src/infrastructure/db/migration-engine.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "db", "migrations");

async function main(): Promise<number> {
  const env = readDbEnv();
  if (env.host !== "localhost" && env.host !== "127.0.0.1" && env.host !== "::1") {
    console.error("benchmark refused: only a local disposable MySQL host is allowed");
    return 1;
  }
  const adminUser = process.env["CAMPUS_COIN_TEST_DB_ADMIN_USER"];
  const adminPassword = process.env["CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD"];
  if (adminUser === undefined || adminUser.length === 0 || adminPassword === undefined || adminPassword.length === 0) {
    console.error("benchmark requires CAMPUS_COIN_TEST_DB_ADMIN_USER and CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD");
    return 1;
  }

  const ssl = sslOption(env);
  const database = `campus_coin_bench_${process.pid}_${randomUUID().slice(0, 8)}`;
  let admin: mysql.Connection | null = null;
  let connection: mysql.Connection | null = null;
  let databaseCreated = false;
  let exitCode = 1;
  try {
    admin = await mysql.createConnection({
      host: env.host,
      port: env.port,
      user: adminUser,
      password: adminPassword,
      ...(ssl === undefined ? {} : { ssl }),
    });
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    databaseCreated = true;
    connection = await mysql.createConnection({
      host: env.host,
      port: env.port,
      database,
      user: adminUser,
      password: adminPassword,
      ...(ssl === undefined ? {} : { ssl }),
      multipleStatements: true,
    });
    const migrationConnection = connection as unknown as MigrationConnection;
    for (const migration of await scanMigrationDir(MIGRATIONS_DIR)) {
      await applyMigration(migrationConnection, migration);
    }
    await connection.end();
    connection = await mysql.createConnection({
      host: env.host,
      port: env.port,
      database,
      user: adminUser,
      password: adminPassword,
      ...(ssl === undefined ? {} : { ssl }),
    });

    await runSqlFile(connection, path.join(ROOT, "benchmark", "001_setup.sql"));
    const measurements = await runSqlFile(connection, path.join(ROOT, "benchmark", "002_queries.sql"));
    if (measurements !== null) console.log(JSON.stringify(measurements));
    exitCode = 0;
  } catch (error) {
    console.error(`benchmark failed (${errorCode(error)}); disposable database will be dropped`);
  } finally {
    await connection?.end().catch(() => undefined);
    if (admin !== null) {
      if (databaseCreated) {
        try {
          await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        } catch (error) {
          console.error(`benchmark cleanup failed (${errorCode(error)})`);
          exitCode = 1;
        }
      }
      await admin.end().catch(() => undefined);
    }
  }
  return exitCode;
}

async function runSqlFile(connection: mysql.Connection, filePath: string): Promise<Record<string, unknown> | null> {
  const source = await readFile(filePath, "utf8");
  const statements = source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  let measurements: Record<string, unknown> | null = null;
  for (const statement of statements) {
    const [rows] = await connection.query(statement);
    if (Array.isArray(rows) && rows.length === 1 && isMeasurementRow(rows[0])) {
      measurements = rows[0];
    }
  }
  return measurements;
}

function isMeasurementRow(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  return Object.keys(value).some((key) => key.startsWith("t_") && key.endsWith("_ms"));
}

function errorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error) || typeof error.code !== "string") {
    return "UNKNOWN";
  }
  return error.code;
}

process.exitCode = await main();
