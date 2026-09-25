// Harness MySQL cho test gated (CAMPUS_COIN_TEST_DB=1):
// tạo database tạm, migrate, patch CAMPUS_COIN_DB_NAME cho pool runtime, dọn dẹp.

import { randomUUID } from "node:crypto";
import path from "node:path";
import mysql, { type Connection } from "mysql2/promise";
import { readDbEnv, sslOption } from "../../src/infrastructure/db/env.ts";
import {
  applyMigration,
  scanMigrationDir,
  type MigrationConnection,
  type MigrationFile,
} from "../../src/infrastructure/db/migration-engine.ts";
import { closePool } from "../../src/infrastructure/db/pool.ts";

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "..", "..", "db", "migrations");

export interface MysqlHarness {
  dbName: string;
  migrationUser: string;
  /** Tạo user mới trong database tạm; trả user_id. */
  newUserId(): Promise<number>;
  listTriggerDefiners(): Promise<string[]>;
  setAuditInsertFailure(enabled: boolean): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createMysqlHarness(): MysqlHarness {
  let admin: Connection | null = null;
  let dbName = "";
  let migrationUser = "";
  let migrationPassword = "";
  let runtimeUser = "";
  let runtimePassword = "";
  let auditInsertFailureInstalled = false;
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
      // MySQL 8 kiểm tra quyền UPDATE cho SELECT ... FOR UPDATE (locking read).
      // Các grant dưới chỉ để services lock row; services không UPDATE trực tiếp:
      // - wallet/savings: chỉ updated_at (timestamp, không phải projection/money);
      //   available_balance_vnd/balance_vnd vẫn bị từ chối (projection trigger-only).
      // - ledger: chỉ description, và mọi UPDATE ledger vẫn bị append-only trigger chặn.
      ["wallet_accounts", "updated_at"],
      ["savings_accounts", "updated_at"],
      ["ledger_transactions", "description"],
    ] as const;
    for (const [table, columns] of updateGrants) {
      await admin.query(`GRANT UPDATE (${columns}) ON \`${database}\`.\`${table}\` TO ${account}`);
    }
  }

  async function grantMigrationDdlPrivileges(database: string, username: string): Promise<void> {
    if (admin === null) throw new Error("harness admin connection missing");
    const account = `'${username}'@'%'`;
    await admin.query(
      `GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, TRIGGER ON \`${database}\`.* TO ${account}`,
    );
  }

  async function grantMigrationHistoryPrivileges(database: string, username: string): Promise<void> {
    if (admin === null) throw new Error("harness admin connection missing");
    const account = `'${username}'@'%'`;
    await admin.query(`GRANT SELECT, INSERT ON \`${database}\`.schema_migrations TO ${account}`);
  }

  async function grantMigrationDataPrivileges(database: string, username: string): Promise<void> {
    if (admin === null) throw new Error("harness admin connection missing");
    const account = `'${username}'@'%'`;
    await admin.query(`GRANT INSERT ON \`${database}\`.categories TO ${account}`);
    await admin.query(`GRANT INSERT, UPDATE ON \`${database}\`.savings_accounts TO ${account}`);
    const readableTables = [
      "categories", "ledger_transactions", "mutation_idempotency", "budgets", "wallet_accounts", "savings_accounts",
      "savings_transfers", "issues",
    ];
    for (const table of readableTables) {
      await admin.query(`GRANT SELECT ON \`${database}\`.\`${table}\` TO ${account}`);
    }
  }

  /**
   * Cấp UPDATE đúng cột mà BEFORE triggers gán qua NEW.* (DEFINER = migration
   * principal; xem 0016/0018/0020/0021/0023–0027). Thiếu là ER_COLUMNACCESS_DENIED
   * khi runtime INSERT/UPDATE. Chạy sau full migration vì wallet_delta_vnd chỉ
   * tồn tại từ 0011.
   */
  async function grantMigrationTriggerColumnPrivileges(database: string, username: string): Promise<void> {
    if (admin === null) throw new Error("harness admin connection missing");
    const account = `'${username}'@'%'`;
    await admin.query(`GRANT UPDATE (user_id, available_balance_vnd) ON \`${database}\`.wallet_accounts TO ${account}`);
    await admin.query(`GRANT UPDATE (user_id, wallet_delta_vnd) ON \`${database}\`.ledger_transactions TO ${account}`);
    await admin.query(`GRANT UPDATE (user_id, name_en) ON \`${database}\`.categories TO ${account}`);
    await admin.query(`GRANT UPDATE (user_id) ON \`${database}\`.savings_transfers TO ${account}`);
    await admin.query(`GRANT UPDATE (user_id) ON \`${database}\`.budgets TO ${account}`);
    await admin.query(`GRANT UPDATE (user_id) ON \`${database}\`.issues TO ${account}`);
  }

  async function applyMigrationWithDiagnostics(mig: MigrationConnection, file: MigrationFile): Promise<void> {
    try {
      await applyMigration(mig, file);
    } catch (error) {
      let detail = "InnoDB foreign-key detail unavailable";
      if (admin !== null) {
        try {
          const [rows] = (await admin.query("SHOW ENGINE INNODB STATUS")) as [{ Status: string }[], unknown];
          const status = rows[0]?.Status ?? "";
          const start = status.indexOf("LATEST FOREIGN KEY ERROR");
          detail = start < 0
            ? "InnoDB status contains no latest foreign-key error"
            : status.slice(start, start + 1800).replace(/\s+/g, " ").trim();
        } catch (diagnosticError) {
          const code = typeof diagnosticError === "object" && diagnosticError !== null && "code" in diagnosticError &&
              typeof diagnosticError.code === "string"
            ? diagnosticError.code
            : "unknown";
          detail = `InnoDB status query failed (${code})`;
        }
      }
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "MIGRATION_FAILED";
      const message = typeof error === "object" && error !== null && "sqlMessage" in error &&
          typeof error.sqlMessage === "string"
        ? error.sqlMessage
        : "migration SQL failed";
      throw new Error(`migration ${file.name} failed (${code}): ${message}; ${detail}`, { cause: error });
    }
  }

  return {
    dbName: "",
    migrationUser: "",

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
      migrationUser = `cc_migrate_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
      migrationPassword = randomUUID().replaceAll("-", "");
      this.migrationUser = migrationUser;
      runtimeUser = `cc_test_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
      runtimePassword = randomUUID().replaceAll("-", "");
      await admin.query(
        `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
      );
      await closePool();
      await admin.query(`CREATE USER '${migrationUser}'@'%' IDENTIFIED BY '${migrationPassword}'`);
      await grantMigrationDdlPrivileges(dbName, migrationUser);
      const migrations = await scanMigrationDir(MIGRATIONS_DIR);
      const initialMigration = migrations[0];
      if (initialMigration === undefined) throw new Error("no migrations found for MySQL harness");

      const mig = (await mysql.createConnection({
        host: env.host,
        port: env.port,
        database: dbName,
        user: migrationUser,
        password: migrationPassword,
        ...(ssl === undefined ? {} : { ssl }),
        multipleStatements: true,
      })) as unknown as MigrationConnection;
      try {
        // Bootstrap history with the migration principal before granting table-level access.
        await mig.query(
          `CREATE TABLE schema_migrations (
             version VARCHAR(64) NOT NULL,
             name VARCHAR(255) NOT NULL,
             checksum CHAR(64) NOT NULL,
             applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
             PRIMARY KEY (version)
           ) ENGINE = InnoDB`,
        );
        await grantMigrationHistoryPrivileges(dbName, migrationUser);
        await applyMigrationWithDiagnostics(mig, initialMigration);
        await grantMigrationDataPrivileges(dbName, migrationUser);
        for (const file of migrations.slice(1)) {
          await applyMigrationWithDiagnostics(mig, file);
        }
        await grantMigrationTriggerColumnPrivileges(dbName, migrationUser);
      } finally {
        await mig.end();
      }

      await admin.query(`CREATE USER '${runtimeUser}'@'%' IDENTIFIED BY '${runtimePassword}'`);
      await grantRuntimePrivileges(dbName, runtimeUser);
      process.env["CAMPUS_COIN_DB_NAME"] = dbName;
      process.env["CAMPUS_COIN_DB_USER"] = runtimeUser;
      process.env["CAMPUS_COIN_DB_PASSWORD"] = runtimePassword;
      await closePool();
    },

    async listTriggerDefiners(): Promise<string[]> {
      if (admin === null) throw new Error("harness not started");
      const [rows] = (await admin.query(
        "SELECT DEFINER AS definer FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME",
        [dbName],
      )) as [{ definer: string }[], unknown];
      return rows.map((row) => row.definer);
    },

    async setAuditInsertFailure(enabled: boolean): Promise<void> {
      if (admin === null) throw new Error("harness not started");
      const trigger = `\`${dbName}\`.\`trg_test_reject_audit_insert\``;
      if (enabled) {
        await admin.query(
          `CREATE TRIGGER ${trigger} BEFORE INSERT ON \`${dbName}\`.audit_events
           FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test audit insert rejected'`,
        );
        auditInsertFailureInstalled = true;
      } else if (auditInsertFailureInstalled) {
        await admin.query(`DROP TRIGGER IF EXISTS ${trigger}`);
        auditInsertFailureInstalled = false;
      }
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
          if (auditInsertFailureInstalled) {
            await admin.query(`DROP TRIGGER IF EXISTS \`${dbName}\`.\`trg_test_reject_audit_insert\``);
            auditInsertFailureInstalled = false;
          }
          await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
          if (migrationUser !== "") {
            await admin.query(`DROP USER IF EXISTS '${migrationUser}'@'%'`);
          }
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
      migrationUser = "";
      migrationPassword = "";
      this.migrationUser = "";
    },
  };
}
