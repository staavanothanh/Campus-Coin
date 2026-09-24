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

function fileChecksum(sql: string): string {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n"), "utf8").digest("hex");
}

function oldWindowsChecksum(sql: string): string {
  const crlf = sql.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  return createHash("sha256").update(crlf, "utf8").digest("hex");
}

/** Quét db/migrations theo thứ tự version; bỏ file không đúng pattern (không âm thầm). */
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
    if (match === null) continue;
    const sql = await readFile(path.join(dir, entry), "utf8");
    files.push({
      version: match[1]!,
      name: entry,
      checksum: fileChecksum(sql),
      sql,
    });
  }
  files.sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : 0));
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
  appliedMismatch: Array<{ version: string; expected: string; actual: string }>;
}

/**
 * So khớp file local với state DB.
 * Checksum lệch → lỗi hard (fail closed): không âm thầm apply lại file đã chạy.
 */
export function planMigrations(files: MigrationFile[], applied: Map<string, string>): MigrationPlan {
  const plan: MigrationPlan = { pending: [], appliedClean: [], appliedMismatch: [] };
  for (const file of files) {
    const recorded = applied.get(file.version);
    if (recorded === undefined) {
      plan.pending.push(file);
    } else if (recorded === file.checksum || recorded === oldWindowsChecksum(file.sql)) {
      plan.appliedClean.push(file.version);
    } else {
      plan.appliedMismatch.push({ version: file.version, expected: file.checksum, actual: recorded });
    }
  }
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
  await conn.query("INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)", [
    file.version,
    file.name,
    file.checksum,
  ]);
}
