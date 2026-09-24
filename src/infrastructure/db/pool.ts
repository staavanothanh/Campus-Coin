// Connection pool cloud MySQL (ADR-0003): TLS bắt buộc (trừ local dev), bounded,
// phù hợp serverless; không giữ transaction mở qua I/O ngoài (không gọi JEV/email/webhook).

import { readFileSync } from "node:fs";
import mysql, { type Pool, type PoolConnection, type PoolOptions } from "mysql2/promise";
import { readDbEnv, type DbEnv } from "./env.ts";

export type Db = Pool | PoolConnection;

export type { Pool, PoolConnection };

let pool: Pool | null = null;

function sslOptions(dbEnv: DbEnv): PoolOptions["ssl"] {
  switch (dbEnv.sslMode) {
    case "required":
      // rejectUnauthorized=true: xác minh hostname + chain qua system CAs.
      return { rejectUnauthorized: true };
    case "verify-ca":
      return { rejectUnauthorized: true, ca: readFileSync(dbEnv.caPath!, "utf8") };
    case "disabled":
      // Chỉ dùng cho local dev; production phải required|verify-ca (kiểm tra ở preflight).
      return undefined;
  }
}

export function getPool(dbEnv: DbEnv = readDbEnv()): Pool {
  if (pool === null) {
    const ssl = sslOptions(dbEnv);
    pool = mysql.createPool({
      host: dbEnv.host,
      port: dbEnv.port,
      database: dbEnv.database,
      user: dbEnv.user,
      password: dbEnv.password,
      ...(ssl === undefined ? {} : { ssl }),
      connectionLimit: dbEnv.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "Z", // DATETIME đọc/ghi theo UTC; chuyển HCMC ở tầng application.
      supportBigNumbers: true,
      // Trả string cho giá trị > 2^53; repository chuyển qua idFromDb/amountFromDb.
    });
  }
  return pool;
}

/** Reset pool (dùng trong test). */
export function resetPool(): void {
  void closePool().catch(() => undefined);
}

export async function closePool(): Promise<void> {
  const current = pool;
  pool = null;
  if (current !== null) await current.end();
}

/** Chạy fn trong transaction ngắn; rollback khi lỗi, commit khi thành công. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // rollback lỗi (ví dụ connection chết) — lỗi gốc vẫn được ném lên.
    }
    throw error;
  } finally {
    conn.release();
  }
}

/** Read connection từ pool; caller phải release bằng callback hoặc try/finally. */
export async function withConnection<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    return await fn(conn);
  } finally {
    conn.release();
  }
}

/** Kiểm tra connectivity (SELECT 1); fail closed. */
export async function pingDb(db: Db = getPool()): Promise<void> {
  await db.query("SELECT 1");
}
