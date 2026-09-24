import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mysql, { type Connection } from "mysql2/promise";
import { readDbEnv, sslOption } from "../src/infrastructure/db/env.ts";
import { withMigrationLock, type MigrationConnection } from "../src/infrastructure/db/migration-engine.ts";
import { createMysqlHarness } from "./helpers/mysql-harness.ts";

const ENABLED = process.env["CAMPUS_COIN_TEST_DB"] === "1";

if (!ENABLED) {
  test("migration concurrency (MySQL)", { skip: "Gated: use npm run test:mysql:required with an isolated MySQL server" }, () => undefined);
} else {
  const harness = createMysqlHarness();
  let first: Connection | null = null;
  let second: Connection | null = null;
  let admin: Connection | null = null;
  const tableName = `migration_lock_probe_${process.pid}`;

  before(async () => {
    await harness.start();
    const env = readDbEnv();
    const user = process.env["CAMPUS_COIN_TEST_DB_ADMIN_USER"];
    const password = process.env["CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD"];
    if (user === undefined || password === undefined) throw new Error("test admin credentials required");
    const ssl = sslOption(env);
    const options = {
      host: env.host,
      port: env.port,
      database: harness.dbName,
      user,
      password,
      ...(ssl === undefined ? {} : { ssl }),
    };
    admin = await mysql.createConnection(options);
    first = await mysql.createConnection(options);
    second = await mysql.createConnection(options);
    await admin.query(`CREATE TABLE \`${tableName}\` (version CHAR(4) PRIMARY KEY) ENGINE=InnoDB`);
  });

  after(async () => {
    await first?.end().catch(() => undefined);
    await second?.end().catch(() => undefined);
    if (admin !== null) {
      await admin.query(`DROP TABLE IF EXISTS \`${tableName}\``).catch(() => undefined);
      await admin.end().catch(() => undefined);
    }
    await harness.stop();
  });

  test("concurrent runners reload migration state under lock and insert one version", async () => {
    if (first === null || second === null) throw new Error("MySQL connections not initialized");
    const connections = [first, second] as const;
    let appliedCount = 0;

    await Promise.all(connections.map((connection) => withMigrationLock(
      connection as unknown as MigrationConnection,
      async () => {
        const applied = await loadProbeVersion(connection, tableName);
        if (applied) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
        await connection.query(`INSERT INTO \`${tableName}\` (version) VALUES ('0001')`);
        appliedCount += 1;
      },
    )));

    const applied = await loadProbeVersion(first, tableName);
    assert.equal(applied, true);
    assert.equal(appliedCount, 1);
  });
}

async function loadProbeVersion(connection: Connection, tableName: string): Promise<boolean> {
  const [rows] = (await connection.query(`SELECT version FROM \`${tableName}\` WHERE version = '0001'`)) as [
    { version: string }[],
    unknown,
  ];
  return rows.length === 1;
}
