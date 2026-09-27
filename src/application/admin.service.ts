import { decodeCursor, encodeCursor } from '../domain/period.ts';
import { invalidInput } from '../domain/errors.js';
import { listAuditEvents } from '../infrastructure/persistence/audit.repository.ts';
import { readUserStats } from '../infrastructure/persistence/admin.repository.ts';
import type { Db } from '../infrastructure/db/pool.ts';
import { readCursorSigningKey } from '../infrastructure/db/env.ts';

export async function getAdminStats(db: Db) {
  return readUserStats(db);
}

export async function listAdminAuditLogs(db: Db, cursor: string | undefined, limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw invalidInput('limit must be between 1 and 100');
  let cursorId: number | null = null;
  if (cursor !== undefined) {
    try {
      cursorId = decodeCursor(cursor, readCursorSigningKey());
    } catch {
      throw invalidInput('invalid cursor');
    }
  }
  const page = await listAuditEvents(db, cursorId, limit);
  const last = page.rows.at(-1);
  return {
    data: page.rows,
    meta: {
      cursor: page.hasNext && last ? encodeCursor(last.id, readCursorSigningKey()) : null,
      hasNext: page.hasNext,
    },
  };
}
