// Wrapper idempotent cho mutation money: retry cùng key+body → replay response đã lưu;
// cùng key khác body → conflict. Claim response trước, ghi response sau, trong cùng tx.

import type { PoolConnection } from "mysql2/promise";
import { idempotencyConflict } from "../domain/errors.ts";
import {
  findIdempotency,
  insertIdempotencyPlaceholder,
  updateIdempotencyResponse,
} from "../infrastructure/persistence/idempotency.repository.ts";
import { getPool, withTransaction } from "../infrastructure/db/pool.ts";

export class DuplicateIdempotency extends Error {
  constructor() {
    super("duplicate idempotency claim");
    this.name = "DuplicateIdempotency";
  }
}

export interface IdempotentMutationOptions<T> {
  userId: number;
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  /** Acquire required owner/domain locks before writing the idempotency row. */
  lockBeforeClaim?: (conn: PoolConnection) => Promise<void>;
  /**
   * Chạy trong transaction ngắn với idempotency_id để ghi vào row money.
   * Response phải JSON-serializable (dùng cho replay).
   */
  mutate: (conn: PoolConnection, idempotencyId: number) => Promise<T>;
}

/**
 * Đảm bảo duy nhất một lần apply. Vòng lặp tối đa 2:
 * lần 1 mutate + claim; lần 2 replay nếu lần 1 thua race (rollback sạch).
 */
export async function withIdempotentMutation<T>(opts: IdempotentMutationOptions<T>): Promise<T> {
  const { userId, scope, idempotencyKey, requestHash } = opts;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await findIdempotency(getPool(), userId, scope, idempotencyKey);
    if (existing !== null) {
      if (existing.requestHash !== requestHash) throw idempotencyConflict();
      // JSON do chính service này ghi; không thể tồn tại partial sau commit (placeholder
      // chỉ nằm trong transaction chưa commit).
      return existing.responseJson as T;
    }
    try {
      return await withTransaction(async (conn) => {
        if (opts.lockBeforeClaim !== undefined) await opts.lockBeforeClaim(conn);
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
