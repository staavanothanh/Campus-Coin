// datatest runner — chạy test SQL trực tiếp trên MySQL (cần CAMPUS_COIN_DB_*).
// Tạo database tạm, migrate mọi version hiện có (0001–0010), chạy datatest/sql/:
//  - file thường: phải chạy không lỗi (assertions dùng CHECK trong bảng tạm).
//  - file có header `-- expect-error[: <chuỗi>]`: đúng 1 statement, PHẢI lỗi
//    và message phải chứa chuỗi (nếu khai báo). Ngược lại là FAIL.
// Cuối cùng drop database tạm. Exit code = 0 khi toàn bộ PASS.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type Connection } from "mysql2/promise";
import { DbEnvError, migrationCreds, readDbEnv, sslOption } from "../src/infrastructure/db/env.ts";
import { applyMigration, scanMigrationDir, type MigrationConnection } from "../src/infrastructure/db/migration-engine.ts";
import { assertIsolatedTestDatabase } from "../test/helpers/db-test-guard.ts";
import { parseSqlFile } from "./sql-file.ts";

const SQL_DIR =
  process.env["CAMPUS_COIN_DATATEST_DIR"] ?? path.resolve(import.meta.dirname, "sql");

interface SqlFile {
  name: string;
  sql: string;
  expectError: string | null; // null = phải thành công; string = phải lỗi chứa chuỗi này
}

/** Tách statements: bỏ dòng comment `--`, split ';'. File test không được chứa ';' trong string. */
function splitStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function collectFiles(dir: string): Promise<SqlFile[]> {
  const entries = await readdir(dir);
  const files: SqlFile[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".sql")) continue;
    const content = await readFile(path.join(dir, entry), "utf8");
    const { expectError, sql } = parseSqlFile(content);
    files.push({ name: entry, sql, expectError });
  }
  return files;
}

async function main(): Promise<number> {
  try {
    assertIsolatedTestDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cấu hình DB test không hợp lệ.";
    console.log(`FAIL  ${message}`);
    return 1;
  }

  let dbEnv;
  try {
    dbEnv = readDbEnv();
  } catch (error) {
    if (error instanceof DbEnvError) {
      console.log(`FAIL  ${error.message}`);
      return 1;
    }
    throw error;
  }

  const creds = migrationCreds(dbEnv);
  const ssl = sslOption(dbEnv);

  let admin: Connection | null = null;
  let mig: Connection | null = null;
  let conn: Connection | null = null;
  const dbName = `campus_coin_datatest_${process.pid}_${Date.now()}`;

  const results: Array<{ name: string; ok: boolean; detail: string }> = [];
  try {
    admin = await mysql.createConnection({
      host: dbEnv.host,
      port: dbEnv.port,
      user: creds.user,
      password: creds.password,
      ...(ssl === undefined ? {} : { ssl }),
    });
    await admin.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );

    mig = await mysql.createConnection({
      host: dbEnv.host,
      port: dbEnv.port,
      database: dbName,
      user: creds.user,
      password: creds.password,
      ...(ssl === undefined ? {} : { ssl }),
      multipleStatements: true,
    });
    const migrations = await scanMigrationDir(path.resolve(import.meta.dirname, "..", "db", "migrations"));
    const oldMigrations = migrations.filter((file) => file.version <= "0005");
    const safeIntegerMigrations = migrations.filter((file) => file.version >= "0006");
    const files = await collectFiles(SQL_DIR);
    const fixture = files.find((file) => file.name === "000_fixtures.sql");
    if (oldMigrations.length !== 5 || safeIntegerMigrations.length !== 5 || fixture === undefined) {
      throw new Error("migration upgrade test files are incomplete");
    }
    for (const file of oldMigrations) {
      await applyMigration(mig as unknown as MigrationConnection, file);
    }
    await mig.query(fixture.sql);
    results.push({ name: "000_fixtures.sql (schema 0001–0005)", ok: true, detail: "pass" });
    for (const file of safeIntegerMigrations) {
      await applyMigration(mig as unknown as MigrationConnection, file);
    }
    await mig.end();
    mig = null;

    conn = await mysql.createConnection({
      host: dbEnv.host,
      port: dbEnv.port,
      database: dbName,
      user: creds.user,
      password: creds.password,
      ...(ssl === undefined ? {} : { ssl }),
      multipleStatements: true,
    });

    for (const file of files) {
      if (file.name === "000_fixtures.sql") continue;
      if (file.expectError === null) {
        try {
          await conn.query(file.sql);
          results.push({ name: file.name, ok: true, detail: "pass" });
        } catch (error) {
          results.push({ name: file.name, ok: false, detail: `unexpected error: ${errorMessage(error)}` });
        }
      } else {
        const statements = splitStatements(file.sql);
        if (statements.length !== 1) {
          results.push({
            name: file.name,
            ok: false,
            detail: `expect-error file phải có đúng 1 statement (có ${statements.length})`,
          });
          continue;
        }
        try {
          await conn.query(file.sql);
          results.push({ name: file.name, ok: false, detail: "expected error nhưng statement chạy thành công" });
        } catch (error) {
          const message = errorMessage(error);
          const ok =
            file.expectError === "error" ||
            (file.expectError !== "error" && message.includes(file.expectError));
          results.push({
            name: file.name,
            ok,
            detail: ok ? `blocked: ${message.slice(0, 120)}` : `error mismatch: expected '${file.expectError}', got ${message.slice(0, 120)}`,
          });
        }
      }
    }
    try {
      await testUnsafeLegacyUpgrade(admin, dbEnv, creds, ssl);
      results.push({ name: "safe integer migration stops at invalid legacy data without changing it", ok: true, detail: "pass" });
    } catch (error) {
      results.push({ name: "safe integer migration stops at invalid legacy data without changing it", ok: false, detail: errorMessage(error) });
    }
  } catch (error) {
    results.push({ name: "datatest setup", ok: false, detail: errorMessage(error) });
  } finally {
    if (conn !== null) await conn.end().catch(() => undefined);
    if (mig !== null) await mig.end().catch(() => undefined);
    if (admin !== null) {
      try {
        await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      } catch (error) {
        results.push({ name: "datatest cleanup", ok: false, detail: errorMessage(error) });
      }
      await admin.end().catch(() => undefined);
    }
  }

  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail !== "pass" ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`datatest: ${results.length - failed}/${results.length} pass`);
  return failed === 0 ? 0 : 1;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function testUnsafeLegacyUpgrade(
  admin: Connection,
  dbEnv: ReturnType<typeof readDbEnv>,
  creds: ReturnType<typeof migrationCreds>,
  ssl: ReturnType<typeof sslOption>,
): Promise<void> {
  const dbName = `campus_coin_datatest_upgrade_${process.pid}_${Date.now()}`;
  let conn: Connection | null = null;
  try {
    await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    conn = await mysql.createConnection({
      host: dbEnv.host,
      port: dbEnv.port,
      database: dbName,
      user: creds.user,
      password: creds.password,
      ...(ssl === undefined ? {} : { ssl }),
      multipleStatements: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    const migrations = await scanMigrationDir(path.resolve(import.meta.dirname, "..", "db", "migrations"));
    const oldMigrations = migrations.filter((file) => file.version <= "0005");
    const walletMigration = migrations.find((file) => file.version === "0006");
    const ledgerMigration = migrations.find((file) => file.version === "0007");
    const fixture = (await collectFiles(SQL_DIR)).find((file) => file.name === "000_fixtures.sql");
    if (oldMigrations.length !== 5 || walletMigration === undefined || ledgerMigration === undefined || fixture === undefined) {
      throw new Error("upgrade test files are incomplete");
    }

    for (const migration of oldMigrations) {
      await applyMigration(conn as unknown as MigrationConnection, migration);
    }
    await conn.query(fixture.sql);
    await conn.query(
      `INSERT INTO ledger_transactions (user_id, type, amount_vnd, category_id, occurred_at, role)
       VALUES (1, 'income', 9007199254740992, 1, '2026-09-02 00:00:00.000', 'original')`,
    );
    await applyMigration(conn as unknown as MigrationConnection, walletMigration);

    let migrationError: unknown;
    try {
      await applyMigration(conn as unknown as MigrationConnection, ledgerMigration);
    } catch (error) {
      migrationError = error;
    }
    if (migrationError === undefined || !errorMessage(migrationError).includes("chk_ledger_amount_safe")) {
      throw new Error("ledger migration did not stop at the over-limit legacy row");
    }

    const [migrationRows] = (await conn.query("SELECT version FROM schema_migrations ORDER BY version")) as [
      Array<{ version: string }>,
      unknown,
    ];
    const [legacyRows] = (await conn.query(
      "SELECT COUNT(*) AS n FROM ledger_transactions WHERE user_id = 1 AND CAST(amount_vnd AS CHAR) = '9007199254740992'",
    )) as [[{ n: number | string }], unknown];
    if (migrationRows.length !== 6 || migrationRows.some((row) => row.version === "0007") || Number(legacyRows[0]!.n) !== 1) {
      throw new Error("over-limit legacy upgrade changed data or recorded the failed migration");
    }
  } finally {
    if (conn !== null) await conn.end().catch(() => undefined);
    try {
      await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    } catch (error) {
      throw new Error(`could not drop temporary upgrade database: ${errorMessage(error)}`);
    }
  }
}

process.exitCode = await main();
