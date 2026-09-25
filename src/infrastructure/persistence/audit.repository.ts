// Audit append-only: chỉ INSERT; UPDATE/DELETE bị chặn bởi trigger ở DB.
// Không ghi secret, cookie, raw provider payload hoặc financial detail thừa.

import type { Db } from "../db/pool.js";
import { amountFromDb, isoFromDb } from "./rows.js";

export interface AuditInput {
  userId: number | null;
  actorType: "user" | "admin" | "system";
  actorUserId: number | null;
  action: string;
  scope: string;
  targetId: number | null;
  outcome: "success" | "failure";
  reason?: string;
  requestId?: string;
}

export interface AuditEventRow {
  id: number;
  action: string;
  outcome: string;
  createdAt: string;
}

export type AuditScalar = {
  query(sql: string, params?: unknown[]): Promise<unknown>;
};

export async function insertAuditEvent(conn: AuditScalar, input: AuditInput): Promise<number> {
  const [result] = (await conn.query(
    `INSERT INTO audit_events (user_id, actor_type, actor_user_id, action, scope, target_id, outcome, reason, request_id, masked_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      input.userId,
      input.actorType,
      input.actorUserId,
      input.action,
      input.scope,
      input.targetId,
      input.outcome,
      input.reason ?? null,
      input.requestId ?? null,
    ],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

/** Admin truy vấn audit đã redact (chỉ action/outcome/time — không raw payload). */
export async function listAuditEvents(
  db: Db,
  cursorId: number | null,
  limit: number,
): Promise<{ rows: AuditEventRow[]; hasNext: boolean }> {
  const [rows] = (await db.query(
    `SELECT id, action, outcome, created_at
     FROM audit_events
     WHERE (? IS NULL OR id < ?)
     ORDER BY id DESC
     LIMIT ?`,
    [cursorId, cursorId, limit + 1],
  )) as [{ id: number | string; action: string; outcome: string; created_at: Date }[], unknown];
  const hasNext = rows.length > limit;
  const page = rows.slice(0, limit);
  return {
    rows: page.map((r) => ({
      id: amountFromDb(r.id),
      action: r.action,
      outcome: r.outcome,
      createdAt: isoFromDb(r.created_at),
    })),
    hasNext,
  };
}