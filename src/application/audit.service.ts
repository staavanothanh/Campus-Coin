import { forbidden, invalidInput } from "../domain/errors.ts";
import { decodeCursor, encodeCursor, isPageLimit } from "../domain/period.ts";
import { readCursorSigningKey } from "../infrastructure/db/env.ts";
import type { Db } from "../infrastructure/db/pool.ts";
import { listAuditEvents } from "../infrastructure/persistence/audit.repository.ts";

export interface SecurityActor {
  userId: number;
  role: "user" | "admin" | "security";
}

export async function listAuditEventsForSecurity(
  db: Db,
  actor: SecurityActor,
  cursor: string | undefined,
  limit: number,
): Promise<{ data: Array<{ id: string; action: string; outcome: string; createdAt: string }>; meta: { cursor: string | null; hasNext: boolean } }> {
  if (actor.role !== "security") throw forbidden();
  if (!Number.isSafeInteger(actor.userId) || actor.userId < 1) throw forbidden();
  if (!isPageLimit(limit)) throw invalidInput("limit must be an integer from 1 to 100");
  let cursorId: number | null = null;
  if (cursor !== undefined) {
    try {
      cursorId = decodeCursor(cursor, readCursorSigningKey());
    } catch {
      throw invalidInput("invalid cursor");
    }
  }
  const page = await listAuditEvents(db, cursorId, limit);
  const last = page.rows[page.rows.length - 1];
  return {
    data: page.rows.map((row) => ({ ...row, id: String(row.id) })),
    meta: {
      cursor: page.hasNext && last !== undefined ? encodeCursor(last.id, readCursorSigningKey()) : null,
      hasNext: page.hasNext,
    },
  };
}
