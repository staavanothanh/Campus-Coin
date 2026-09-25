import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mysql, { type Connection } from "mysql2/promise";
import { recordDbOperationLog } from "../src/infrastructure/db/operation-log.ts";
import { readDbEnv, sslOption } from "../src/infrastructure/db/env.ts";
import { MIGRATIONS_DIR } from "./helpers/mysql-harness.ts";

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";

if (!ENABLED) {
  test("MySQL operation-log writer integration", { skip: "Gated: use test:mysql:required with an isolated MySQL server" }, () => undefined);
} else {
  const originalEnv = new Map<string, string | undefined>();
  const dbEnvKeys = [
    "CAMPUS_COIN_DB_NAME",
    "CAMPUS_COIN_DB_USER",
    "CAMPUS_COIN_DB_PASSWORD",
    "CAMPUS_COIN_DB_OPS_USER",
    "CAMPUS_COIN_DB_OPS_PASSWORD",
  ];
  let admin: Connection | null = null;
  let opsConn: Connection | null = null;
  let deniedConn: Connection | null = null;
  let dbName = "";
  let opsUser = "";
  let deniedUser = "";

  before(async () => {
    const env = readDbEnv();
    const adminUser = process.env["CAMPUS_COIN_TEST_DB_ADMIN_USER"];
    const adminPassword = process.env["CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD"];
    const isLocalDisposableTest = env.host === "localhost" || env.host === "127.0.0.1" || env.host === "::1";
    if (adminUser === undefined || adminUser.length === 0 || adminPassword === undefined ||
      (adminPassword.length === 0 && !isLocalDisposableTest)) {
      throw new Error("test database administrator credentials required");
    }

    for (const key of dbEnvKeys) originalEnv.set(key, process.env[key]);
    const ssl = sslOption(env);
    admin = await mysql.createConnection({
      host: env.host,
      port: env.port,
      user: adminUser,
      password: adminPassword,
      ...(ssl === undefined ? {} : { ssl }),
    });
    dbName = `cc_ops_test_${process.pid}_${randomUUID().slice(0, 8)}`;
    opsUser = `cc_ops_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    deniedUser = `cc_denied_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const opsPassword = randomUUID().replaceAll("-", "");
    const deniedPassword = randomUUID().replaceAll("-", "");
    await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await admin.query(`CREATE USER '${opsUser}'@'%' IDENTIFIED BY '${opsPassword}'`);
    await admin.query(`CREATE USER '${deniedUser}'@'%' IDENTIFIED BY '${deniedPassword}'`);

    for (const name of [
      "0028_db_operation_logs.sql",
      "0029_db_operation_logs_no_update.sql",
      "0030_db_operation_logs_no_delete.sql",
    ]) {
      const sql = await readFile(new URL(name, `file://${MIGRATIONS_DIR.replaceAll("\\", "/")}/`), "utf8");
      await admin.query(`USE \`${dbName}\``);
      await admin.query(sql);
    }
    await admin.query(`GRANT INSERT ON \`${dbName}\`.db_operation_logs TO '${opsUser}'@'%'`);

    process.env["CAMPUS_COIN_DB_NAME"] = dbName;
    process.env["CAMPUS_COIN_DB_USER"] = opsUser;
    process.env["CAMPUS_COIN_DB_PASSWORD"] = opsPassword;
    process.env["CAMPUS_COIN_DB_OPS_USER"] = opsUser;
    process.env["CAMPUS_COIN_DB_OPS_PASSWORD"] = opsPassword;
    const connOptions = {
      host: env.host,
      port: env.port,
      database: dbName,
      ...(ssl === undefined ? {} : { ssl }),
    };
    opsConn = await mysql.createConnection({ ...connOptions, user: opsUser, password: opsPassword });
    // denied user không có quyền nào (kể cả USE database) nên kết nối không kèm database;
    // query dùng tên bảng qualified để chứng minh INSERT bị từ chối ở grant.
    deniedConn = await mysql.createConnection({
      host: env.host,
      port: env.port,
      user: deniedUser,
      password: deniedPassword,
      ...(ssl === undefined ? {} : { ssl }),
    });
  });

  after(async () => {
    for (const c of [opsConn, deniedConn]) await c?.end().catch(() => undefined);
    opsConn = null;
    deniedConn = null;
    if (admin !== null) {
      try {
        if (dbName !== "") await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
        if (opsUser !== "") await admin.query(`DROP USER IF EXISTS '${opsUser}'@'%'`);
        if (deniedUser !== "") await admin.query(`DROP USER IF EXISTS '${deniedUser}'@'%'`);
      } finally {
        await admin.end();
        admin = null;
      }
    }
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    dbName = "";
    opsUser = "";
    deniedUser = "";
  });

  test("cc_ops writer ghi log được nhưng không đọc/sửa/xóa", async () => {
    if (admin === null || opsConn === null) throw new Error("test connections not initialized");
    const operationId = await recordDbOperationLog({
      projectKey: "campus-coin",
      environment: "staging",
      operation: "reconcile",
      outcome: "success",
      durationMs: 42,
      migrationVersion: null,
      externalReference: "run-123",
      errorCode: null,
    });
    const [rows] = (await admin.query(
      `SELECT operation, outcome, duration_ms FROM \`${dbName}\`.db_operation_logs WHERE operation_id = ?`,
      [operationId],
    )) as [{ operation: string; outcome: string; duration_ms: number | string }[], unknown];
    assert.deepEqual(rows.map((row) => [row.operation, row.outcome, Number(row.duration_ms)]), [["reconcile", "success", 42]]);

    await assert.rejects(
      opsConn.query(`SELECT operation_id FROM \`${dbName}\`.db_operation_logs LIMIT 1`),
      /command denied/,
    );
    // cc_ops không có UPDATE/DELETE grant nên bị chặn ở grant; nếu grant nới trong
    // tương lai, append-only trigger vẫn chặn. Chấp nhận cả hai lớp.
    await assert.rejects(
      opsConn.query(`UPDATE \`${dbName}\`.db_operation_logs SET outcome = 'failure' WHERE operation_id = ?`, [operationId]),
      /append-only \(update blocked\)|command denied/,
    );
    await assert.rejects(
      opsConn.query(`DELETE FROM \`${dbName}\`.db_operation_logs WHERE operation_id = ?`, [operationId]),
      /append-only \(delete blocked\)|command denied/,
    );
    // Admin đủ quyền grant nên chạm tới trigger: ghim append-only guards tồn tại.
    await assert.rejects(
      admin.query(`UPDATE \`${dbName}\`.db_operation_logs SET outcome = 'failure' WHERE operation_id = ?`, [operationId]),
      /append-only \(update blocked\)/,
    );
    await assert.rejects(
      admin.query(`DELETE FROM \`${dbName}\`.db_operation_logs WHERE operation_id = ?`, [operationId]),
      /append-only \(delete blocked\)/,
    );
  });

  test("principal không grant không ghi được operation log", async () => {
    if (deniedConn === null) throw new Error("test connection not initialized");
    await assert.rejects(
      deniedConn.query(
        `INSERT INTO \`${dbName}\`.db_operation_logs
          (operation_id, project_key, environment_key, operation, outcome, duration_ms)
         VALUES (?, 'campus-coin', 'staging', 'restore', 'success', 1)`,
        [randomUUID()],
      ),
      /command denied/,
    );
  });
}
