// datatest runner — chạy test SQL trực tiếp trên MySQL (cần CAMPUS_COIN_DB_*).
// Tạo database tạm, migrate mọi version hiện có (0001–0005), chạy datatest/sql/:
//  - file thường: phải chạy không lỗi (assert idiom: DO 1 / (điều_kiện)).
//  - file có header `-- expect-error[: <chuỗi>]`: đúng 1 statement, PHẢI lỗi
//    và message phải chứa chuỗi (nếu khai báo). Ngược lại là FAIL.
// Cuối cùng drop database tạm. Exit code = 0 khi toàn bộ PASS.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql, { type Connection } from "mysql2/promise";
import { DbEnvError, migrationCreds, readDbEnv, sslOption } from "../src/infrastructure/db/env.ts";
import { applyMigration, scanMigrationDir, type MigrationConnection } from "../src/infrastructure/db/migration-engine.ts";
import { assertIsolatedTestDatabase } from "../test/helpers/db-test-guard.ts";

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

function parseFile(content: string): { expectError: string | null; sql: string } {
  let expectError: string | null = null;
  for (const line of content.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith("--")) break;
    const match = /^--\s*expect-error(?::\s*(.*))?$/.exec(trimmed);
    if (match !== null) {
      expectError = (match[1] ?? "").trim().length > 0 ? match[1]!.trim() : "error";
    }
  }
  return { expectError, sql: content };
}

async function collectFiles(dir: string): Promise<SqlFile[]> {
  const entries = await readdir(dir);
  const files: SqlFile[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".sql")) continue;
    const content = await readFile(path.join(dir, entry), "utf8");
    const { expectError, sql } = parseFile(content);
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
    for (const file of await scanMigrationDir(path.resolve(import.meta.dirname, "..", "db", "migrations"))) {
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

    const files = await collectFiles(SQL_DIR);
    for (const file of files) {
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
  } catch (error) {
    results.push({ name: "datatest setup", ok: false, detail: errorMessage(error) });
  } finally {
    if (conn !== null) await conn.end().catch(() => undefined);
    if (mig !== null) await mig.end().catch(() => undefined);
    if (admin !== null) {
      await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``).catch(() => undefined);
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

process.exitCode = await main();
