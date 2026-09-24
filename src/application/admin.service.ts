import { getDb } from '../infrastructure/db.js';
import { decodeCursor, encodeCursor } from '../domain/period.js';
import { invalidInput } from '../domain/errors.js';
import { listAuditEvents } from '../infrastructure/persistence/audit.repository.ts';
import { readUserStats } from '../infrastructure/persistence/admin.repository.ts';

export async function getAdminStats() {
  return readUserStats(getDb());
}

export async function listAdminAuditLogs(cursor: string | undefined, limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw invalidInput('limit must be between 1 and 100');
  let cursorId: number | null = null;
  if (cursor !== undefined) {
    try {
      cursorId = decodeCursor(cursor);
    } catch {
      throw invalidInput('invalid cursor');
    }
  }
  const page = await listAuditEvents(getDb(), cursorId, limit);
  const last = page.rows.at(-1);
  return {
    data: page.rows,
    meta: { cursor: page.hasNext && last ? encodeCursor(last.id) : null, hasNext: page.hasNext },
  };
}
