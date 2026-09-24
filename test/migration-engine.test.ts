import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  applyMigration,
  loadAppliedMigrations,
  planMigrations,
  scanMigrationDir,
  supportsCheckConstraints,
  type MigrationFile,
} from "../src/infrastructure/db/migration-engine.ts";

function makeDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "cc-mig-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

function fakeConn(handler: (sql: string, params?: unknown[]) => unknown) {
  return {
    query: async (sql: string, params?: unknown[]) => handler(sql, params),
    end: async () => undefined,
  };
}

test("scanMigrationDir: chỉ nhận NNNN_name.sql, sắp theo version", async () => {
  const dir = makeDir({
    "0001_first.sql": "CREATE TABLE a (id INT);",
    "0003_third.sql": "CREATE TABLE c (id INT);",
    "0002_second.sql": "CREATE TABLE b (id INT);",
    "notes.txt": "not a migration",
    "0004_bad_name!.sql": "ignored",
  });
  try {
    const files = await scanMigrationDir(dir);
    assert.deepEqual(files.map((f) => f.version), ["0001", "0002", "0003"]);
    assert.deepEqual(files.map((f) => f.name), ["0001_first.sql", "0002_second.sql", "0003_third.sql"]);
    const expectedChecksum = createHash("sha256").update("CREATE TABLE c (id INT);", "utf8").digest("hex");
    assert.equal(files[2]!.checksum, expectedChecksum);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadAppliedMigrations: bảng chưa tồn tại → danh sách rỗng (first run)", async () => {
  const conn = fakeConn(() => {
    throw new Error("Table 'campus_coin.schema_migrations' doesn't exist");
  });
  const applied = await loadAppliedMigrations(conn);
  assert.equal(applied.size, 0);
});

test("loadAppliedMigrations: đọc các version đã áp dụng", async () => {
  const conn = fakeConn(() => [
    [
      { version: "0001", name: "0001_a.sql", checksum: "aaa" },
      { version: "0002", name: "0002_b.sql", checksum: "bbb" },
    ],
  ]);
  const applied = await loadAppliedMigrations(conn);
  assert.deepEqual([...applied.entries()], [
    ["0001", "aaa"],
    ["0002", "bbb"],
  ]);
});

test("planMigrations: pending/applied/checksum mismatch", async () => {
  const files: MigrationFile[] = [
    { version: "0001", name: "0001_a.sql", checksum: "aaa", sql: "x" },
    { version: "0002", name: "0002_b.sql", checksum: "bbb", sql: "x" },
    { version: "0003", name: "0003_c.sql", checksum: "ccc", sql: "x" },
  ];
  const plan = planMigrations(
    files,
    new Map([
      ["0001", "aaa"],
      ["0002", "CHANGED"],
    ]),
  );
  assert.deepEqual(plan.pending.map((f) => f.version), ["0003"]);
  assert.deepEqual(plan.appliedClean, ["0001"]);
  assert.deepEqual(plan.appliedMismatch, [{ version: "0002", expected: "bbb", actual: "CHANGED" }]);
});

test("supportsCheckConstraints: phiên bản >= 8.0.16 kể cả khi VERSION() có suffix", () => {
  // Server thật trả suffix; parse sai sẽ khiến gate fail-closed nhầm trên cloud.
  for (const version of ["8.0.16", "8.0.41", "8.0.41-log", "8.0.41-0ubuntu0.22.04.1", "8.1.0", "8.4.2-log", "9.1.0"]) {
    assert.equal(supportsCheckConstraints(version), true, `${version} phải được hỗ trợ`);
  }
  for (const version of ["8.0.15", "8.0.0", "5.7.44-log", "10.4.28-MariaDB", "garbage", "8", ""]) {
    assert.equal(supportsCheckConstraints(version), false, `${version} không được coi là hỗ trợ`);
  }
});

test("applyMigration: chạy SQL rồi ghi schema_migrations", async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const conn = fakeConn((sql, params) => {
    if (params === undefined) {
      calls.push({ sql });
    } else {
      calls.push({ sql, params });
    }
    return [[]];
  });
  const file: MigrationFile = { version: "0001", name: "0001_a.sql", checksum: "abc", sql: "CREATE TABLE t (id INT);" };
  await applyMigration(conn, file);
  assert.equal(calls.length, 2);
  assert.equal(calls[0]!.sql, "CREATE TABLE t (id INT);");
  assert.equal(calls[1]!.sql.startsWith("INSERT INTO schema_migrations"), true);
  assert.deepEqual(calls[1]!.params, ["0001", "0001_a.sql", "abc"]);
});

test("scanMigrationDir: LF và CRLF có cùng checksum", async () => {
  const dir = makeDir({
    "0001_lf.sql": "CREATE TABLE a (id INT);\nSELECT 1;\n",
    "0002_crlf.sql": "CREATE TABLE a (id INT);\r\nSELECT 1;\r\n",
  });
  try {
    const files = await scanMigrationDir(dir);
    assert.equal(files[0]!.checksum, files[1]!.checksum);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("planMigrations: chấp nhận checksum CRLF đã lưu trước đây", async () => {
  const dir = makeDir({ "0001_old.sql": "SELECT 1;\nSELECT 2;\n" });
  try {
    const files = await scanMigrationDir(dir);
    const oldSql = files[0]!.sql.replace(/\n/g, "\r\n");
    const oldChecksum = createHash("sha256").update(oldSql, "utf8").digest("hex");
    const plan = planMigrations(files, new Map([["0001", oldChecksum]]));
    assert.deepEqual(plan.appliedClean, ["0001"]);
    assert.deepEqual(plan.appliedMismatch, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
