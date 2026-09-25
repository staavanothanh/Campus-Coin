import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  applyMigration,
  loadAppliedMigrations,
  loadBaselines,
  MigrationError,
  planMigrations,
  scanMigrationDir,
  supportsCheckConstraints,
  withMigrationLock,
  type MigrationBaselines,
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

test("scanMigrationDir: bỏ qua auxiliary files và sắp migration theo version", async () => {
  const dir = makeDir({
    "0001_first.sql": "CREATE TABLE a (id INT);",
    "0003_third.sql": "CREATE TABLE c (id INT);",
    "0002_second.sql": "CREATE TABLE b (id INT);",
    "notes.txt": "not a migration",
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

test("scanMigrationDir: từ chối SQL filename không đúng pattern", async () => {
  const dir = makeDir({ "0001_bad-name.sql": "SELECT 1;", "notes.txt": "auxiliary" });
  try {
    await assert.rejects(scanMigrationDir(dir), { name: "MigrationError", message: /invalid migration filename: 0001_bad-name\.sql/ });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanMigrationDir: từ chối duplicate version", async () => {
  const dir = makeDir({ "0001_first.sql": "SELECT 1;", "0001_second.sql": "SELECT 2;" });
  try {
    await assert.rejects(scanMigrationDir(dir), { name: "MigrationError", message: /duplicate migration version 0001/ });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanMigrationDir: từ chối version gap", async () => {
  const dir = makeDir({ "0001_first.sql": "SELECT 1;", "0003_third.sql": "SELECT 3;" });
  try {
    await assert.rejects(scanMigrationDir(dir), { name: "MigrationError", message: /version gap: expected 0002, found 0003/ });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanMigrationDir: từ chối migration SQL rỗng", async () => {
  const dir = makeDir({ "0001_empty.sql": " -- no executable statements\n " });
  try {
    await assert.rejects(scanMigrationDir(dir), { name: "MigrationError", message: /migration file is empty/ });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanMigrationDir: từ chối nội dung không phải SQL statement", async () => {
  const dir = makeDir({ "0001_invalid.sql": "NOT A MYSQL STATEMENT;" });
  try {
    await assert.rejects(scanMigrationDir(dir), { name: "MigrationError", message: /invalid SQL migration content/ });
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
  assert.deepEqual(plan.appliedMissing, []);
  assert.deepEqual(plan.pendingOutOfOrder, []);
});

test("planMigrations: applied DB version without local migration is drift", () => {
  const files: MigrationFile[] = [{ version: "0001", name: "0001_a.sql", checksum: "aaa", sql: "x" }];
  const plan = planMigrations(files, new Map([["0001", "aaa"], ["0002", "bbb"]]));
  assert.deepEqual(plan.appliedMissing, ["0002"]);
  assert.deepEqual(plan.pending, []);
  assert.deepEqual(plan.pendingOutOfOrder, []);
});

test("planMigrations: pending migration before an applied later version is drift", () => {
  const files: MigrationFile[] = [
    { version: "0001", name: "0001_a.sql", checksum: "aaa", sql: "x" },
    { version: "0002", name: "0002_b.sql", checksum: "bbb", sql: "x" },
  ];
  const plan = planMigrations(files, new Map([["0002", "bbb"]]));
  assert.deepEqual(plan.pending.map((file) => file.version), ["0001"]);
  assert.deepEqual(plan.pendingOutOfOrder, ["0001"]);
});

test("withMigrationLock: acquire before reload/re-plan and release afterward", async () => {
  const events: string[] = [];
  const conn = fakeConn((sql) => {
    if (sql.includes("GET_LOCK")) {
      events.push("lock");
      return [[{ acquired: 1 }]];
    }
    if (sql.includes("FROM schema_migrations")) {
      events.push("reload");
      return [[{ version: "0001", name: "0001_a.sql", checksum: "aaa" }]];
    }
    if (sql.includes("RELEASE_LOCK")) {
      events.push("release");
      return [[]];
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  await withMigrationLock(conn, async () => {
    const applied = await loadAppliedMigrations(conn);
    const plan = planMigrations(
      [{ version: "0001", name: "0001_a.sql", checksum: "aaa", sql: "x" }],
      applied,
    );
    events.push("re-plan");
    assert.deepEqual(plan.pending, []);
  });
  assert.deepEqual(events, ["lock", "reload", "re-plan", "release"]);
});

test("withMigrationLock: releases the lock when the locked operation fails", async () => {
  const events: string[] = [];
  const conn = fakeConn((sql) => {
    if (sql.includes("GET_LOCK")) {
      events.push("lock");
      return [[{ acquired: 1 }]];
    }
    if (sql.includes("RELEASE_LOCK")) {
      events.push("release");
      return [[]];
    }
    throw new Error(`unexpected query: ${sql}`);
  });
  await assert.rejects(withMigrationLock(conn, async () => {
    events.push("operation");
    throw new MigrationError("drift");
  }), /drift/);
  assert.deepEqual(events, ["lock", "operation", "release"]);
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

test("applyMigration: reports DDL/history split clearly if recording the version fails", async () => {
  const conn = fakeConn((sql) => {
    if (sql.startsWith("INSERT INTO schema_migrations")) throw new Error("permission denied");
    return [[]];
  });
  await assert.rejects(
    applyMigration(conn, { version: "0001", name: "0001_a.sql", checksum: "abc", sql: "SELECT 1;" }),
    { name: "MigrationError", message: /DDL completed but schema_migrations recording failed; inspect database state before retry/ },
  );
});

function baselinesOf(entries: Array<{ version: string; kind: "historical" | "external"; checksum: string }>): MigrationBaselines {
  const historical = new Map();
  const external = new Map();
  for (const e of entries) {
    const target = e.kind === "historical" ? historical : external;
    target.set(e.version, { version: e.version, kind: e.kind, acceptedChecksums: [e.checksum], reason: "test" });
  }
  return { historical, external };
}

test("scanMigrationDir: strict contiguity, không cần biết baselines", async () => {
  const dir = makeDir({
    "0001_first.sql": "CREATE TABLE a (id INT);",
    "0002_second.sql": "CREATE TABLE b (id INT);",
  });
  try {
    const files = await scanMigrationDir(dir);
    assert.deepEqual(files.map((f) => f.version), ["0001", "0002"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scanMigrationDir: không có baselines thì gap vẫn fail-closed", async () => {
  const dir = makeDir({ "0001_first.sql": "SELECT 1;", "0003_third.sql": "SELECT 3;" });
  try {
    await assert.rejects(scanMigrationDir(dir), { name: "MigrationError", message: /version gap: expected 0002/ });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadBaselines: thiếu file thì rỗng; sai shape thì fail-closed", async () => {
  const parent = mkdtempSync(path.join(tmpdir(), "cc-base-"));
  try {
    const empty = await loadBaselines(path.join(parent, "migrations"));
    assert.equal(empty.historical.size, 0);
    assert.equal(empty.external.size, 0);
    writeFileSync(path.join(parent, "baselines.json"), JSON.stringify({
      entries: [{ version: "0002", kind: "external", acceptedChecksums: ["a".repeat(64)], reason: "other chain" }],
    }));
    const loaded = await loadBaselines(path.join(parent, "migrations"));
    assert.deepEqual([...loaded.external.keys()], ["0002"]);
    writeFileSync(path.join(parent, "baselines.json"), JSON.stringify({ entries: [{ version: "zz", kind: "external" }] }));
    await assert.rejects(loadBaselines(path.join(parent, "migrations")), { name: "MigrationError" });
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("planMigrations: chấp nhận historical/external đã pin, từ chối checksum lạ", () => {
  const files: MigrationFile[] = [
    { version: "0001", name: "0001_a.sql", checksum: "aaa", sql: "x" },
    { version: "0002", name: "0002_b.sql", checksum: "bbb", sql: "x" },
    { version: "0003", name: "0003_c.sql", checksum: "ccc", sql: "x" },
  ];
  const baselines = baselinesOf([
    { version: "0001", kind: "historical", checksum: "HIST" },
    { version: "0002", kind: "external", checksum: "EXT" },
  ]);
  // Slot external có file local nhưng row đã ghi khớp pin → skip file, không pending.
  const plan = planMigrations(
    files,
    new Map([["0001", "HIST"], ["0002", "EXT"]]),
    baselines,
  );
  assert.deepEqual(plan.appliedHistorical, ["0001"]);
  assert.deepEqual(plan.appliedExternal, ["0002"]);
  assert.deepEqual(plan.appliedMismatch, []);
  assert.deepEqual(plan.appliedMissing, []);
  assert.deepEqual(plan.pending.map((f) => f.version), ["0003"]);

  const bad = planMigrations(files, new Map([["0001", "aaa"], ["0002", "UNKNOWN"]]), baselines);
  assert.deepEqual(bad.appliedMismatch, [{ version: "0002", expected: "bbb", actual: "UNKNOWN" }]);
  assert.deepEqual(bad.pending.map((f) => f.version), ["0003"]);

  const fresh = planMigrations(files, new Map(), baselines);
  assert.deepEqual(fresh.appliedExternal, []);
  assert.deepEqual(fresh.appliedMismatch, []);
  assert.deepEqual(fresh.pending.map((f) => f.version), ["0001", "0002", "0003"]);
});
