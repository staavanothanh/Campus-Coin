// CI gate: CLI migrate fresh-install rồi idempotent re-run trên disposable MySQL.
// Dùng đúng CLI src/infrastructure/db/migrate.ts qua child process (không import trực
// tiếp vì module tự chạy main). Yêu cầu: CAMPUS_COIN_DB_* + ADMIN vars như workflow.
// Không in secret; chỉ in applied counts và exit code.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

function required(name) {
  const value = process.env[name];
  if (value === undefined || (value.length === 0 && name !== "CAMPUS_COIN_DB_PASSWORD" && name !== "CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD")) {
    console.error(`missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const host = required("CAMPUS_COIN_DB_HOST");
const port = Number(required("CAMPUS_COIN_DB_PORT"));
const adminUser = required("CAMPUS_COIN_TEST_DB_ADMIN_USER");
const adminPassword = process.env["CAMPUS_COIN_TEST_DB_ADMIN_PASSWORD"] ?? "";
const dbUser = required("CAMPUS_COIN_DB_USER");
const dbPassword = process.env["CAMPUS_COIN_DB_PASSWORD"] ?? "";
const dbName = `campus_coin_cli_gate_${process.pid}_${randomUUID().slice(0, 8)}`;

const admin = await mysql.createConnection({ host, port, user: adminUser, password: adminPassword });
try {
  await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  console.log(`created disposable database ${dbName}`);
} finally {
  await admin.end();
}

function runCli(arg) {
  const result = spawnSync(process.execPath, ["src/infrastructure/db/migrate.ts", arg], {
    env: { ...process.env, CAMPUS_COIN_DB_NAME: dbName, CAMPUS_COIN_DB_USER: dbUser, CAMPUS_COIN_DB_PASSWORD: dbPassword },
    encoding: "utf8",
  });
  console.log(`--- migrate.ts ${arg} (exit ${result.status}) ---`);
  console.log((result.stdout ?? "").trim().split("\n").slice(-4).join("\n"));
  if (result.status !== 0) {
    console.error((result.stderr ?? "").trim().split("\n").slice(-4).join("\n"));
    throw new Error(`migrate.ts ${arg} failed with exit ${result.status}`);
  }
  return (result.stdout ?? "").trim();
}

try {
  const first = runCli("up");
  if (!first.includes("applied")) throw new Error("fresh install applied nothing");
  const second = runCli("up");
  if (!second.includes("up to date")) throw new Error("second run was not idempotent");
  runCli("status");
  console.log("CLI migrate gate OK: fresh install + idempotent re-run");
} finally {
  const cleanup = await mysql.createConnection({ host, port, user: adminUser, password: adminPassword });
  try {
    await cleanup.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  } finally {
    await cleanup.end();
  }
}
