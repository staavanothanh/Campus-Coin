// Migration engine: versioned, forward-only, non-destructive (ADR-0003).
// - File db/migrations/NNNN_name.sql chạy theo thứ tự version; mỗi file ghi checksum.
// - Lock migration bằng GET_LOCK để tránh chạy đồng thời (serverless multi-instance).
// - Không có `down`: rollback = migration sửa lỗi tiếp theo hoặc restore (xem db/README.md).

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface MigrationFile {
  version: string;
  name: string;
  checksum: string;
  sql: string;
}

/** Một baseline entry trong db/baselines.json (ADR-0009, database shared). */
export interface BaselineEntry {
  version: string;
  kind: "historical" | "external";
  acceptedChecksums: string[];
  reason: string;
}

export interface MigrationBaselines {
  historical: Map<string, BaselineEntry>;
  external: Map<string, BaselineEntry>;
}

const EMPTY_BASELINES: MigrationBaselines = { historical: new Map(), external: new Map() };

const VERSION_PATTERN = /^\d{4}$/;
const CHECKSUM_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Đọc db/baselines.json cạnh thư mục migrations (db/baselines.json khi dir là
 * db/migrations). File vắng mặt → baseline rỗng (behavior strict cũ).
 * File sai shape → MigrationError fail-closed.
 */
export async function loadBaselines(migrationsDir: string): Promise<MigrationBaselines> {
  const { readFile } = await import("node:fs/promises");
  const filePath = path.join(migrationsDir, "..", "baselines.json");
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return { historical: new Map(), external: new Map() };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new MigrationError(`invalid baselines JSON: ${filePath}`);
  }
  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as { entries?: unknown }).entries)) {
    throw new MigrationError(`invalid baselines shape: ${filePath} (expected { entries: [...] })`);
  }
  const baselines: MigrationBaselines = { historical: new Map(), external: new Map() };
  for (const item of (parsed as { entries: unknown[] }).entries) {
    if (typeof item !== "object" || item === null) throw new MigrationError(`invalid baseline entry: ${filePath}`);
    const entry = item as Record<string, unknown>;
    if (typeof entry["version"] !== "string" || !VERSION_PATTERN.test(entry["version"])) {
      throw new MigrationError(`invalid baseline version: ${filePath}`);
    }
    if (entry["kind"] !== "historical" && entry["kind"] !== "external") {
      throw new MigrationError(`invalid baseline kind for ${entry["version"]}: ${filePath}`);
    }
    if (!Array.isArray(entry["acceptedChecksums"]) || entry["acceptedChecksums"].length === 0 ||
        !entry["acceptedChecksums"].every((c) => typeof c === "string" && CHECKSUM_PATTERN.test(c))) {
      throw new MigrationError(`invalid baseline checksums for ${entry["version"]}: ${filePath}`);
    }
    if (typeof entry["reason"] !== "string" || entry["reason"].trim().length === 0) {
      throw new MigrationError(`baseline ${entry["version"]} requires a reason: ${filePath}`);
    }
    const version = entry["version"];
    if (baselines.historical.has(version) || baselines.external.has(version)) {
      throw new MigrationError(`duplicate baseline version ${version}: ${filePath}`);
    }
    const target = entry["kind"] === "historical" ? baselines.historical : baselines.external;
    target.set(version, {
      version,
      kind: entry["kind"],
      acceptedChecksums: [...entry["acceptedChecksums"] as string[]],
      reason: entry["reason"] as string,
    });
  }
  return baselines;
}

export interface MigrationConnection {
  query(sql: string, params?: unknown[]): Promise<unknown>;
  end(): Promise<void>;
}

export interface SchemaMigrationRow {
  version: string;
  name: string;
  checksum: string;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationError";
  }
}

const FILE_PATTERN = /^(\d{4})_[a-z0-9_]+\.sql$/;
const VALID_STATEMENT_STARTS = new Set([
  "ALTER", "CREATE", "DELETE", "DROP", "INSERT", "RENAME", "REPLACE", "SELECT", "SET", "TRUNCATE", "UPDATE",
]);

function fileChecksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

/** Quét migration theo thứ tự version; bỏ qua auxiliary files nhưng từ chối SQL filename sai pattern. */
export async function scanMigrationDir(dir: string): Promise<MigrationFile[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (error) {
    throw new MigrationError(`cannot read migrations dir ${dir}: ${String(error)}`);
  }
  const files: MigrationFile[] = [];
  for (const entry of entries) {
    const match = FILE_PATTERN.exec(entry);
    if (match === null) {
      if (entry.toLowerCase().endsWith(".sql")) {
        throw new MigrationError(`invalid migration filename: ${entry} (expected NNNN_name.sql)`);
      }
      continue;
    }
    const sql = await readFile(path.join(dir, entry), "utf8").catch((error: unknown) => {
      throw new MigrationError(`cannot read migration file ${entry}: ${String(error)}`);
    });
    const executableSql = sql
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\n)\s*--[^\r\n]*/g, "$1")
      .replace(/(^|\n)\s*#[^\r\n]*/g, "$1")
      .trim();
    if (executableSql.length === 0) throw new MigrationError(`migration file is empty: ${entry}`);
    const firstKeyword = /^[a-z]+/i.exec(executableSql)?.[0].toUpperCase();
    if (firstKeyword === undefined || !VALID_STATEMENT_STARTS.has(firstKeyword)) {
      throw new MigrationError(`invalid SQL migration content: ${entry}`);
    }
    files.push({
      version: match[1]!,
      name: entry,
      checksum: fileChecksum(sql),
      sql,
    });
  }
  files.sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : 0));
  for (let index = 1; index < files.length; index += 1) {
    if (files[index - 1]!.version === files[index]!.version) {
      throw new MigrationError(`duplicate migration version ${files[index]!.version}: ${files[index - 1]!.name}, ${files[index]!.name}`);
    }
  }
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    const expectedVersion = String(index + 1).padStart(4, "0");
    if (file.version !== expectedVersion) {
      throw new MigrationError(`migration version gap: expected ${expectedVersion}, found ${file.version}`);
    }
  }
  return files;
}

/** Đọc trạng thái schema_migrations; trả map version → checksum (empty nếu table chưa có). */
export async function loadAppliedMigrations(conn: MigrationConnection): Promise<Map<string, string>> {
  const applied = new Map<string, string>();
  try {
    const [rows] = (await conn.query("SELECT version, name, checksum FROM schema_migrations")) as [
      SchemaMigrationRow[],
      unknown,
    ];
    for (const row of rows) {
      applied.set(row.version, row.checksum);
    }
  } catch (error) {
    const message = String(error);
    if (message.includes("doesn't exist") || message.includes("does not exist")) {
      return applied; // first run: table chưa tồn tại
    }
    throw error;
  }
  return applied;
}

export interface MigrationPlan {
  pending: MigrationFile[];
  appliedClean: string[];
  /** Version khớp checksum lịch sử đã pin (ADR-0009), không phải checksum file hiện tại. */
  appliedHistorical: string[];
  /** Version external đã apply và khớp checksum pin (không có file local). */
  appliedExternal: string[];
  appliedMismatch: Array<{ version: string; expected: string; actual: string }>;
  appliedMissing: string[];
  pendingOutOfOrder: string[];
}

/**
 * So khớp file local với state DB.
 * Checksum lệch → lỗi hard (fail closed): không âm thầm apply lại file đã chạy.
 * Ngoại lệ duy nhất là baseline đã khai trong db/baselines.json (ADR-0009).
 */
export function planMigrations(
  files: MigrationFile[],
  applied: Map<string, string>,
  baselines: MigrationBaselines = EMPTY_BASELINES,
): MigrationPlan {
  const plan: MigrationPlan = {
    pending: [],
    appliedClean: [],
    appliedHistorical: [],
    appliedExternal: [],
    appliedMismatch: [],
    appliedMissing: [],
    pendingOutOfOrder: [],
  };
  const localVersions = new Set(files.map((file) => file.version));
  const appliedVersions = [...applied.keys()].sort();
  const externalPin = (version: string): string[] | null => {
    const entry = baselines.external.get(version);
    return entry === undefined ? null : entry.acceptedChecksums;
  };
  for (const file of files) {
    const recorded = applied.get(file.version);
    if (recorded === undefined) {
      plan.pending.push(file);
      if (appliedVersions.some((version) => version > file.version)) plan.pendingOutOfOrder.push(file.version);
    } else if (recorded === file.checksum) {
      plan.appliedClean.push(file.version);
    } else if ((baselines.historical.get(file.version)?.acceptedChecksums ?? []).includes(recorded)) {
      plan.appliedHistorical.push(file.version);
    } else if ((externalPin(file.version) ?? []).includes(recorded)) {
      // Slot thuộc chain khác (ADR-0009): chấp nhận row đã ghi, BỎ QUA file local.
      // DDL hội tụ do DBA apply thủ công có duyệt và verify (không auto-apply).
      plan.appliedExternal.push(file.version);
    } else {
      plan.appliedMismatch.push({ version: file.version, expected: file.checksum, actual: recorded });
    }
  }
  for (const [version, entry] of baselines.external) {
    if (localVersions.has(version)) continue; // đã xử lý trong vòng file ở trên.
    const recorded = applied.get(version);
    if (recorded === undefined) continue; // DB fresh: slot external vắng mặt là sạch.
    if (entry.acceptedChecksums.includes(recorded)) {
      plan.appliedExternal.push(version);
    } else {
      plan.appliedMismatch.push({ version, expected: entry.acceptedChecksums.join("|"), actual: recorded });
    }
  }
  plan.appliedMissing = [...applied.keys()]
    .filter((version) => !localVersions.has(version) && !baselines.external.has(version))
    .sort();
  return plan;
}

/** GET_LOCK (session-scoped) — lock name unique per DB; trả true khi lấy được. */
export async function acquireMigrationLock(conn: MigrationConnection, timeoutSec = 30): Promise<boolean> {
  const [rows] = (await conn.query("SELECT GET_LOCK(?, ?) AS acquired", [
    "campus_coin.migrations",
    timeoutSec,
  ])) as [{ acquired: number }[], unknown];
  return rows[0]!.acquired === 1;
}

export async function releaseMigrationLock(conn: MigrationConnection): Promise<void> {
  await conn.query("SELECT RELEASE_LOCK(?)", ["campus_coin.migrations"]);
}

/** Run the supplied reload/re-plan/apply work while holding the session migration lock. */
export async function withMigrationLock<T>(conn: MigrationConnection, action: () => Promise<T>): Promise<T> {
  if (!(await acquireMigrationLock(conn))) {
    throw new MigrationError("could not acquire migration lock (another migration may be running)");
  }
  try {
    return await action();
  } finally {
    await releaseMigrationLock(conn).catch(() => undefined);
  }
}

/**
 * Parse major/minor/patch từ VERSION() của MySQL. Server thật trả suffix
 * (`8.0.41-log`, `8.0.41-0ubuntu0.22.04.1`) nên phải cắt phần sau dấu `-`.
 * MariaDB trả null: không phải MySQL và schema/ collation không được kiểm chứng trên đó.
 * Trả null khi không parse được — caller phải fail closed.
 */
export function parseMysqlVersion(version: string): { major: number; minor: number; patch: number } | null {
  if (/mariadb/i.test(version)) return null;
  const numeric = version.split("-")[0]!.trim();
  const parts = numeric.split(".");
  if (parts.length < 2) return null;
  const values = parts.slice(0, 3).map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  const [major, minor, patch = 0] = values;
  if (Number.isNaN(major!) || Number.isNaN(minor!) || Number.isNaN(patch)) return null;
  return { major: major!, minor: minor!, patch };
}

/** true khi server là MySQL >= 8.0.16 (CHECK constraints enforced); null/không parse/MariaDB → false. */
export function supportsCheckConstraints(version: string): boolean {
  const parsed = parseMysqlVersion(version);
  if (parsed === null) return false;
  const { major, minor, patch } = parsed;
  // Série 8.0 so patch; 8.1+ (innovation) và 9+ đều mới hơn.
  return major > 8 || (major === 8 && (minor >= 1 || (minor === 0 && patch >= 16)));
}

/**
 * Apply một migration trên connection dùng multi-statement.
 * Ghi schema_migrations sau khi DDL chạy; DDL MySQL auto-commit nên file phải
 * forward-only — lỗi giữa file = dừng ngay, báo rõ, không tự ghi version.
 */
export async function applyMigration(conn: MigrationConnection, file: MigrationFile): Promise<void> {
  await conn.query(file.sql);
  try {
    await conn.query("INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)", [
      file.version,
      file.name,
      file.checksum,
    ]);
  } catch (error) {
    throw new MigrationError(
      `${file.version} DDL completed but schema_migrations recording failed; inspect database state before retry: ${String(error)}`,
    );
  }
}
