import { decodeCursor, encodeCursor } from '../domain/period.ts';
import { invalidInput, forbidden, notFound } from '../domain/errors.js';
import { listAuditEvents, insertAuditEvent } from '../infrastructure/persistence/audit.repository.ts';
import { readUserStats, readAdminMetrics } from '../infrastructure/persistence/admin.repository.ts';
import {
  listAdminUsersPage,
  findUserByIdForAdmin,
  updateUserStatusByAdmin,
  type AdminUserRow,
} from '../infrastructure/persistence/user.repository.ts';
import type { Db } from '../infrastructure/db/pool.ts';
import { readCursorSigningKey } from '../infrastructure/db/env.ts';
import { withIdempotentMutation } from './idempotency.ts';

function requireAdmin(actor: { userId: number; role: string }): void {
  if (!Number.isSafeInteger(actor?.userId) || actor.userId < 1) throw invalidInput('actor userId');
  if (actor.role !== 'admin') throw forbidden();
}

export async function getAdminStats(db: Db) {
  return readUserStats(db);
}

export async function getAdminMetrics(db: Db) {
  return readAdminMetrics(db);
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

/** Masks an email for admin listing; keeps a short prefix so results stay identifiable. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const keep = Math.max(1, Math.min(2, Math.floor(local.length / 2)));
  return `${local.slice(0, keep)}${'*'.repeat(Math.max(1, local.length - keep))}${domain}`;
}

export interface AdminUserView extends Omit<AdminUserRow, 'email' | 'id'> {
  id: string;
  emailMasked: string;
}

function toAdminUserView(row: AdminUserRow): AdminUserView {
  return {
    id: String(row.id),
    emailMasked: maskEmail(row.email),
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    locale: row.locale,
    createdAt: row.createdAt,
  };
}

export async function listAdminUsers(
  db: Db,
  actor: { userId: number; role: string },
  cursor: string | undefined,
  limit: number,
) {
  requireAdmin(actor);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw invalidInput('limit must be between 1 and 100');
  let cursorId: number | null = null;
  if (cursor !== undefined) {
    try {
      cursorId = decodeCursor(cursor, readCursorSigningKey());
    } catch {
      throw invalidInput('invalid cursor');
    }
  }
  const page = await listAdminUsersPage(db, cursorId, limit);
  const last = page.rows.at(-1);
  return {
    data: page.rows.map(toAdminUserView),
    meta: {
      cursor: page.hasNext && last ? encodeCursor(last.id, readCursorSigningKey()) : null,
      hasNext: page.hasNext,
    },
  };
}

export interface AdminSetUserStatusInput {
  actor: { userId: number; role: string };
  userId: number;
  status: 'active' | 'disabled';
  reason: string;
  idempotencyKey: string;
  requestHash: string;
}

export async function setAdminUserStatus(db: Db, input: AdminSetUserStatusInput): Promise<AdminUserView> {
  requireAdmin(input.actor);
  if (!Number.isSafeInteger(input.userId) || input.userId < 1) throw notFound();
  if (input.userId === input.actor.userId) throw invalidInput('cannot change own account status');
  if (input.status !== 'active' && input.status !== 'disabled') throw invalidInput('invalid user status');
  if (input.reason.length < 3 || input.reason.length > 500) throw invalidInput('reason required (3-500 chars)');

  return withIdempotentMutation({
    db,
    userId: input.actor.userId,
    scope: 'admin.user.status_change',
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn) => {
      const current = await findUserByIdForAdmin(conn, input.userId);
      if (current === null) throw notFound();
      if (current.status === input.status) return toAdminUserView(current);
      const updated = await updateUserStatusByAdmin(conn, input.userId, input.status);
      if (!updated) throw notFound();
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: 'admin',
        actorUserId: input.actor.userId,
        action: 'admin.user.status_change',
        scope: 'user',
        targetId: input.userId,
        outcome: 'success',
        reason: input.reason,
      });
      const refreshed = await findUserByIdForAdmin(conn, input.userId);
      if (refreshed === null) throw new Error('user row missing after status change');
      return toAdminUserView(refreshed);
    },
  });
}