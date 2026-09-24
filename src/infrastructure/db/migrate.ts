// CLI migrate: `node src/infrastructure/db/migrate.ts [up|status|preflight]`
// Chạy qua npm scripts: db:migrate, db:status, db:preflight.
// Không log bất kỳ giá trị secret; chỉ in tên biến lỗi.

import path from "node:path";
import mysql from "mysql2/promise";
import {
  applyMigration,
  loadAppliedMigrations,
  MigrationError,
  planMigrations,
  scanMigrationDir,
  supportsCheckConstraints,
  type MigrationConnection,
  withMigrationLock,
} from "./migration-engine.ts";
import { sslOption, DbEnvError, migrationCreds, readDbEnv, type DbEnv } from "./env.ts";

const MIGRATIONS_DIR =
  process.env["CAMPUS_COIN_MIGRATIONS_DIR"] ??
  path.resolve(import.meta.dirname, "..", "..", "..", "db", "migrations");



async function connect(dbEnv: DbEnv, multipleStatements: boolean): Promise<mysql.Connection> {
  const creds = migrationCreds(dbEnv);
  const ssl = sslOption(dbEnv);
  return mysql.createConnection({
    host: dbEnv.host,
    port: dbEnv.port,
    database: dbEnv.database,
    user: creds.user,
    password: creds.password,
    ...(ssl === undefined ? {} : { ssl }),
    multipleStatements,
    charset: "utf8mb4",
    timezone: "Z",
    supportBigNumbers: true,
  });
}

async function close(conn: mysql.Connection | null): Promise<void> {
  if (conn !== null) {
    await conn.end().catch(() => undefined);
  }
}

interface CheckResult {
  ok: boolean;
  warn: boolean;
  label: string;
  detail: string;
}

function report(results: CheckResult[]): number {
  for (const r of results) {
    const tag = r.ok ? (r.warn ? "WARN" : "ok  ") : "FAIL";
    console.log(`${tag}  ${r.label}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  return results.some((r) => !r.ok) ? 1 : 0;
}

// --- preflight ---

async function cmdPreflight(): Promise<number> {
  let dbEnv: DbEnv;
  try {
    dbEnv = readDbEnv();
  } catch (error) {
    if (error instanceof DbEnvError) {
      console.log(`FAIL  ${error.message}`);
      return 1;
    }
    throw error;
  }

  const results: CheckResult[] = [];
  results.push({
    ok: true,
    warn: dbEnv.sslMode === "disabled",
    label: "db env shape",
    detail: dbEnv.sslMode === "disabled" ? "ssl disabled (local dev only)" : `host=${dbEnv.host}:${dbEnv.port} db=${dbEnv.database}`,
  });

  let conn: mysql.Connection | null = null;
  try {
    conn = await connect(dbEnv, false);
    await conn.query("SELECT 1");
    results.push({ ok: true, warn: false, label: "connect + TLS handshake", detail: "ok" });

    if (dbEnv.sslMode !== "disabled") {
      const [sslRows] = (await conn.query("SHOW SESSION STATUS LIKE 'Ssl_cipher'")) as [Array<{ Value: string | null }>, unknown];
      const cipher = sslRows[0]?.Value;
      results.push({
        ok: cipher !== null && cipher !== "",
        warn: false,
        label: "TLS cipher negotiated",
        detail: cipher ?? "none",
      });
    }

    const [versionRows] = (await conn.query("SELECT VERSION() AS version")) as [{ version: string }[], unknown];
    const version = versionRows[0]!.version;
    results.push({
      ok: supportsCheckConstraints(version),
      warn: false,
      label: "MySQL version >= 8.0.16 (CHECK constraints)",
      detail: version,
    });

    const [charsetRows] = (await conn.query("SELECT @@character_set_server AS cs, @@collation_server AS cl")) as [
      { cs: string; cl: string }[],
      unknown,
    ];
    const cs = charsetRows[0]!;
    results.push({
      ok: cs.cs.toLowerCase().startsWith("utf8mb4"),
      warn: true,
      label: "server charset utf8mb4",
      detail: `${cs.cs}/${cs.cl}`,
    });

    const [schemaRows] = (await conn.query(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [dbEnv.database],
    )) as [{ SCHEMA_NAME: string }[], unknown];
    results.push({
      ok: schemaRows.length === 1,
      warn: false,
      label: "database exists",
      detail: schemaRows.length === 1 ? dbEnv.database : `missing '${dbEnv.database}' (chạy CREATE DATABASE theo db/grants.example.sql)`,
    });

    const [maxConnRows] = (await conn.query("SELECT @@max_connections AS max_connections")) as [
      { max_connections: number }[],
      unknown,
    ];
    results.push({
      ok: dbEnv.connectionLimit < maxConnRows[0]!.max_connections,
      warn: true,
      label: "pool bounded vs server max_connections",
      detail: `pool=${dbEnv.connectionLimit} server=${maxConnRows[0]!.max_connections}`,
    });

    const files = await scanMigrationDir(MIGRATIONS_DIR);
    const applied = await loadAppliedMigrations(conn as unknown as MigrationConnection);
    const plan = planMigrations(files, applied);
    const hasDrift = plan.appliedMismatch.length > 0 || plan.appliedMissing.length > 0 || plan.pendingOutOfOrder.length > 0;
    results.push({
      ok: !hasDrift,
      warn: false,
      label: "migration files vs schema_migrations",
      detail: hasDrift
        ? [
            ...(plan.appliedMismatch.length > 0
              ? [`checksum mismatch: ${plan.appliedMismatch.map((m) => m.version).join(", ")}`]
              : []),
            ...(plan.appliedMissing.length > 0
              ? [`applied versions missing locally: ${plan.appliedMissing.join(", ")}`]
              : []),
            ...(plan.pendingOutOfOrder.length > 0
              ? [`pending versions precede already-applied versions: ${plan.pendingOutOfOrder.join(", ")}`]
              : []),
          ].join("; ")
        : `applied=${plan.appliedClean.length} pending=${plan.pending.length} total=${files.length}`,
    });
  } catch (error) {
    results.push({ ok: false, warn: false, label: "preflight execution", detail: String(error) });
  } finally {
    await close(conn);
  }

  return report(results);
}

// --- status ---

async function cmdStatus(): Promise<number> {
  let dbEnv: DbEnv;
  try {
    dbEnv = readDbEnv();
  } catch (error) {
    if (error instanceof DbEnvError) {
      console.log(`FAIL  ${error.message}`);
      return 1;
    }
    throw error;
  }
  let conn: mysql.Connection | null = null;
  try {
    conn = await connect(dbEnv, false);
    const files = await scanMigrationDir(MIGRATIONS_DIR);
    const applied = await loadAppliedMigrations(conn as unknown as MigrationConnection);
    const plan = planMigrations(files, applied);
    console.log(`Migrations dir: ${MIGRATIONS_DIR}`);
    for (const file of files) {
      const state = applied.has(file.version)
        ? (plan.appliedMismatch.some((m) => m.version === file.version) ? "MISMATCH" : "applied ")
        : "pending ";
      console.log(`${state}  ${file.version}  ${file.name}`);
    }
    if (plan.appliedMismatch.length > 0 || plan.appliedMissing.length > 0 || plan.pendingOutOfOrder.length > 0) {
      if (plan.appliedMismatch.length > 0) {
        console.log(`FAIL  checksum mismatch: ${plan.appliedMismatch.map((m) => m.version).join(", ")}`);
      }
      if (plan.appliedMissing.length > 0) {
        console.log(`FAIL  applied versions missing locally: ${plan.appliedMissing.join(", ")}`);
      }
      if (plan.pendingOutOfOrder.length > 0) {
        console.log(`FAIL  pending versions precede already-applied versions: ${plan.pendingOutOfOrder.join(", ")}`);
      }
      console.log("HINT  dừng deploy và kiểm tra migration history thủ công");
      return 1;
    }
    return 0;
  } catch (error) {
    console.log(`FAIL  ${String(error)}`);
    return 1;
  } finally {
    await close(conn);
  }
}

// --- up ---

async function cmdUp(): Promise<number> {
  let dbEnv: DbEnv;
  try {
    dbEnv = readDbEnv();
  } catch (error) {
    if (error instanceof DbEnvError) {
      console.log(`FAIL  ${error.message}`);
      return 1;
    }
    throw error;
  }
  let conn: mysql.Connection | null = null;
  try {
    conn = await connect(dbEnv, true);
    const files = await scanMigrationDir(MIGRATIONS_DIR);
    return await withMigrationLock(conn as unknown as MigrationConnection, async () => {
      const applied = await loadAppliedMigrations(conn as unknown as MigrationConnection);
      const plan = planMigrations(files, applied);
      if (plan.appliedMismatch.length > 0 || plan.appliedMissing.length > 0 || plan.pendingOutOfOrder.length > 0) {
        if (plan.appliedMismatch.length > 0) {
          console.log(`FAIL  checksum mismatch: ${plan.appliedMismatch.map((m) => m.version).join(", ")}`);
        }
        if (plan.appliedMissing.length > 0) {
          console.log(`FAIL  applied versions missing locally: ${plan.appliedMissing.join(", ")}`);
        }
        if (plan.pendingOutOfOrder.length > 0) {
          console.log(`FAIL  pending versions precede already-applied versions: ${plan.pendingOutOfOrder.join(", ")}`);
        }
        return 1;
      }
      if (plan.pending.length === 0) {
        console.log("up to date");
        return 0;
      }
      for (const file of plan.pending) {
        try {
          await applyMigration(conn as unknown as MigrationConnection, file);
          console.log(`applied  ${file.version}  ${file.name}`);
        } catch (error) {
          console.log(`FAIL  ${file.version} ${file.name} — ${String(error)}`);
          console.log(`HINT  migration forward-only: sửa lỗi bằng migration mới, không sửa file đã chạy`);
          return 1;
        }
      }
      return 0;
    });
  } catch (error) {
    if (error instanceof MigrationError) {
      console.log(`FAIL  ${error.message}`);
      return 1;
    }
    console.log(`FAIL  ${String(error)}`);
    return 1;
  } finally {
    await close(conn);
  }
}

async function main(): Promise<number> {
  const command = process.argv[2] ?? "status";
  switch (command) {
    case "up":
      return cmdUp();
    case "status":
      return cmdStatus();
    case "preflight":
      return cmdPreflight();
    default:
      console.log("usage: node src/infrastructure/db/migrate.ts [up|status|preflight]");
      return 2;
  }
}

process.exitCode = await main();
