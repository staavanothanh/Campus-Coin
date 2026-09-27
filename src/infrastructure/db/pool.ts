// Connection pool cloud MySQL (ADR-0003): TLS bắt buộc (trừ local dev), bounded,
// phù hợp serverless; không giữ transaction mở qua I/O ngoài (không gọi JEV/email/webhook).

import mysql, { type Pool, type PoolConnection } from "mysql2/promise";
import { DbEnvError, assertDbTlsAllowed, readDbEnv, sslOption, type DbEnv } from "./env.ts";

export type Db = Pool | PoolConnection;

export type { Pool, PoolConnection };

let pool: Pool | null = null;
let poolEnvironment: DbEnv | null = null;

export function getPool(dbEnv?: DbEnv): Pool {
  const config = dbEnv ?? poolEnvironment ?? readDbEnv();
  assertDbTlsAllowed(config);
  if (pool === null) {
    const ssl = sslOption(config);
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ...(ssl === undefined ? {} : { ssl }),
      connectionLimit: config.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      charset: "utf8mb4",
      timezone: "Z", // DATETIME đọc/ghi theo UTC; chuyển HCMC ở tầng application.
      supportBigNumbers: true,
      // Trả string cho giá trị > 2^53; repository chuyển qua idFromDb/amountFromDb.
    });
    poolEnvironment = config;
  }
  return pool;
}

/** Close the shared pool and wait until all pool connections are shut down. */
export async function closePool(): Promise<void> {
  const currentPool = pool;
  pool = null;
  poolEnvironment = null;
  if (currentPool !== null) await currentPool.end();
}

/** Reset the shared pool for tests that change database environment variables. */
export function resetPool(): void {
  void closePool().catch(() => undefined);
}

/** Run fn in a short transaction, rolling back on error and committing on success. */
export async function withTransaction<T>(db: Db, fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = "getConnection" in db ? await db.getConnection() : db;
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // Rollback failure must not replace the original transaction error.
    }
    throw error;
  } finally {
    if ("getConnection" in db) conn.release();
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
