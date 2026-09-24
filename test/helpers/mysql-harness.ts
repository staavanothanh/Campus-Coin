// Harness MySQL cho test gated (CAMPUS_COIN_TEST_DB=1):
// tạo database tạm, migrate, patch CAMPUS_COIN_DB_NAME cho pool runtime, dọn dẹp.

import { randomUUID } from "node:crypto";
import path from "node:path";
import mysql, { type Connection } from "mysql2/promise";
import { readDbEnv, sslOption } from "../../src/infrastructure/db/env.ts";
import { applyMigration, scanMigrationDir, type MigrationConnection } from "../../src/infrastructure/db/migration-engine.ts";
import { closePool } from "../../src/infrastructure/db/pool.ts";

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "..", "..", "db", "migrations");

export interface MysqlHarness {
  dbName: string;
  /** Tạo user mới trong database tạm; trả user_id. */
  newUserId(): Promise<number>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createMysqlHarness(): MysqlHarness {
  let admin: Connection | null = null;
  let dbName = "";
  let runtimeUser = "";
  let runtimePassword = "";
  const originalEnv = {
    database: process.env["CAMPUS_COIN_DB_NAME"],
    user: process.env["CAMPUS_COIN_DB_USER"],
    password: process.env["CAMPUS_COIN_DB_PASSWORD"],
  };

  function restoreEnv(name: string, value: string | undefined): void {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  async function grantRuntimePrivileges(database: string, username: string): Promise<void> {
    if (admin === null) throw new Error("harness admin connection missing");
    const account = `'${username}'@'%'`;
    const readableTables = [
      "users", "auth_identities", "sessions", "wallet_accounts", "mutation_idempotency", "categories",
      "ledger_transactions", "budgets", "savings_accounts", "savings_transfers", "issues", "issue_events", "audit_events",
    ];
    const insertTables = [
      "users", "auth_identities", "sessions", "wallet_accounts", "mutation_idempotency", "categories",
      "ledger_transactions", "budgets", "savings_transfers", "issues", "issue_events", "audit_events",
    ];
    for (const table of readableTables) {
      await admin.query(`GRANT SELECT ON \`${database}\`.\`${table}\` TO ${account}`);
    }
    for (const table of insertTables) {
      await admin.query(`GRANT INSERT ON \`${database}\`.\`${table}\` TO ${account}`);
    }
    const updateGrants = [
      ["mutation_idempotency", "response_json"],
      ["categories", "name_en, name_vi, status"],
      ["budgets", "limit_vnd, idempotency_id, updated_at"],
      ["issues", "title, description, category, status, priority"],
      ["sessions", "last_seen_at, revoked_at"],
      ["users", "display_name, locale, timezone"],
    ] as const;
    for (const [table, columns] of updateGrants) {
      await admin.query(`GRANT UPDATE (${columns}) ON \`${database}\`.\`${table}\` TO ${account}`);
    }
  }

  return {
    dbName: "",

    async start(): Promise<void> {
      const env = readDbEnv();
      const adminUser = process.env["CAMPUS_COIN_TEST_DB_ADMIN_USER"];
      const adminPassword = process.env["CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD"];
      const isLocalDisposableTest = process.env["CAMPUS_COIN_TEST_DB"] === "1" &&
        (env.host === "localhost" || env.host === "127.0.0.1" || env.host === "::1");
      if (adminUser === undefined || adminUser.length === 0 || adminPassword === undefined ||
        (adminPassword.length === 0 && !isLocalDisposableTest)) {
        throw new Error("CAMPUS_COIN_TEST_DB_ADMIN_USER and CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD are required for MySQL tests");
      }
      const ssl = sslOption(env);
      admin = await mysql.createConnection({
        host: env.host,
        port: env.port,
        user: adminUser,
        password: adminPassword,
        ...(ssl === undefined ? {} : { ssl }),
      });
      dbName = `campus_coin_test_${process.pid}_${randomUUID().slice(0, 8)}`;
      this.dbName = dbName;
      runtimeUser = `cc_test_${randomUUID().replaceAll("-", "")}`;
      runtimePassword = randomUUID().replaceAll("-", "");
      await admin.query(
        `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
      );
      await closePool();

      const mig = (await mysql.createConnection({
        host: env.host,
        port: env.port,
        database: dbName,
        user: adminUser,
        password: adminPassword,
        ...(ssl === undefined ? {} : { ssl }),
        multipleStatements: true,
      })) as unknown as MigrationConnection;
      for (const file of await scanMigrationDir(MIGRATIONS_DIR)) {
        await applyMigration(mig, file);
      }
      await mig.end();

      await admin.query(`CREATE USER '${runtimeUser}'@'%' IDENTIFIED BY '${runtimePassword}'`);
      await grantRuntimePrivileges(dbName, runtimeUser);
      process.env["CAMPUS_COIN_DB_NAME"] = dbName;
      process.env["CAMPUS_COIN_DB_USER"] = runtimeUser;
      process.env["CAMPUS_COIN_DB_PASSWORD"] = runtimePassword;
      await closePool();
    },

    async newUserId(): Promise<number> {
      if (admin === null) throw new Error("harness not started");
      const [result] = await admin.query(
        `INSERT INTO \`${dbName}\`.users (display_name, email) VALUES ('Test', ?)`,
        [`t-${randomUUID()}@example.com`],
      );
      // ResultSetHeader từ mysql2 (generic mặc định không mang shape chính xác).
      const header = result as { insertId: number | string };
      return Number(header.insertId);
    },

    async stop(): Promise<void> {
      await closePool();
      if (admin !== null) {
        try {
          if (runtimeUser !== "") {
            await admin.query(`DROP USER IF EXISTS '${runtimeUser}'@'%'`);
          }
          await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        } finally {
          await admin.end();
          admin = null;
        }
      }
      restoreEnv("CAMPUS_COIN_DB_NAME", originalEnv.database);
      restoreEnv("CAMPUS_COIN_DB_USER", originalEnv.user);
      restoreEnv("CAMPUS_COIN_DB_PASSWORD", originalEnv.password);
      runtimeUser = "";
      runtimePassword = "";
    },
  };
}
