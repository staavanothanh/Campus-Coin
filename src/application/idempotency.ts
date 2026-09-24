// Wrapper idempotent cho mutation: retry cùng key+body → replay response đã lưu;
// cùng key khác body → conflict. Claim và ghi response trong cùng transaction với mutation.

import type { PoolConnection } from "mysql2/promise";
import { idempotencyConflict } from "../domain/errors.ts";
import type { Db } from "../infrastructure/db/pool.ts";
import {
  findIdempotency,
  insertIdempotencyPlaceholder,
  updateIdempotencyResponse,
} from "../infrastructure/persistence/idempotency.repository.ts";

export class DuplicateIdempotency extends Error {
  constructor() {
    super("duplicate idempotency claim");
    this.name = "DuplicateIdempotency";
  }
}

export interface IdempotentMutationOptions<T> {
  db: Db;
  userId: number;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  /**
   * Chạy trong transaction ngắn; mutation cần thiết có thể liên kết idempotency_id.
   * Response phải JSON-serializable (dùng cho replay).
   */
  mutate: (conn: PoolConnection, idempotencyId: number) => Promise<T>;
}

/**
 * Đảm bảo duy nhất một lần apply. Vòng lặp tối đa 2:
 * lần 1 claim + mutation; lần 2 replay nếu lần 1 thua race (rollback sạch).
 */
export async function withIdempotentMutation<T>(opts: IdempotentMutationOptions<T>): Promise<T> {
  const { db, userId, scope, idempotencyKey, requestHash } = opts;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await findIdempotency(db, userId, scope, idempotencyKey);
    if (existing !== null) {
      if (existing.requestHash !== requestHash) throw idempotencyConflict();
      // JSON do chính service này ghi; không thể tồn tại partial sau commit (placeholder
      // chỉ nằm trong transaction chưa commit).
      return existing.responseJson as T;
    }
    try {
      return await withDbTransaction(db, async (conn) => {
        const id = await insertIdempotencyPlaceholder(conn, userId, scope, idempotencyKey, requestHash);
        if (id === null) throw new DuplicateIdempotency();
        const response = await opts.mutate(conn, id);
        await updateIdempotencyResponse(conn, id, response);
        return response;
      });
    } catch (error) {
      if (error instanceof DuplicateIdempotency) continue;
      throw error;
    }
  }
  throw idempotencyConflict();
}

async function withDbTransaction<T>(db: Db, run: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const isPool = "getConnection" in db;
  const conn = isPool ? await db.getConnection() : db;
  try {
    await conn.beginTransaction();
    const result = await run(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // Keep the original mutation/transaction error.
    }
    throw error;
  } finally {
    if (isPool) conn.release();
  }
}
