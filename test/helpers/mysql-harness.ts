// Harness MySQL cho test gated (CAMPUS_COIN_TEST_DB=1):
// tạo database tạm, migrate, patch CAMPUS_COIN_DB_NAME cho pool runtime, dọn dẹp.

import { randomUUID } from "node:crypto";
import path from "node:path";
import mysql, { type Connection } from "mysql2/promise";
import { migrationCreds, readDbEnv } from "../../src/infrastructure/db/env.ts";
import { applyMigration, scanMigrationDir, type MigrationConnection } from "../../src/infrastructure/db/migration-engine.ts";
import { resetPool } from "../../src/infrastructure/db/pool.ts";

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "..", "..", "..", "db", "migrations");

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

  function sslOption(env: ReturnType<typeof readDbEnv>): mysql.ConnectionOptions["ssl"] {
    if (env.sslMode === "verify-ca") {
      const ca = env.caPath;
      if (ca === undefined) throw new Error("CA path missing for verify-ca");
      return { rejectUnauthorized: true, ca };
    }
    if (env.sslMode === "disabled") return undefined;
    return { rejectUnauthorized: true };
  }

  return {
    dbName: "",

    async start(): Promise<void> {
      const env = readDbEnv();
      const creds = migrationCreds(env);
      const ssl = sslOption(env);
      admin = await mysql.createConnection({
        host: env.host,
        port: env.port,
        user: creds.user,
        password: creds.password,
        ...(ssl === undefined ? {} : { ssl }),
      });
      dbName = `campus_coin_test_${process.pid}_${randomUUID().slice(0, 8)}`;
      this.dbName = dbName;
      await admin.query(
        `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
      );

      process.env["CAMPUS_COIN_DB_NAME"] = dbName;
      resetPool();

      const mig = (await mysql.createConnection({
        host: env.host,
        port: env.port,
        database: dbName,
        user: creds.user,
        password: creds.password,
        ...(ssl === undefined ? {} : { ssl }),
        multipleStatements: true,
      })) as unknown as MigrationConnection;
      for (const file of await scanMigrationDir(MIGRATIONS_DIR)) {
        await applyMigration(mig, file);
      }
      await mig.end();
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
      resetPool();
      if (admin !== null) {
        try {
          await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        } finally {
          await admin.end();
          admin = null;
        }
      }
      delete process.env["CAMPUS_COIN_DB_NAME"];
    },
  };
}