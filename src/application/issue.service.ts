// Issue workflow: reporters access only their own issues; admin-wide methods
// require an explicitly supplied server-derived admin actor.

import type { PoolConnection } from "mysql2/promise";
import { forbidden, invalidInput, notFound } from "../domain/errors.js";
import { decodeCursor, encodeCursor, isPageLimit } from "../domain/period.js";
import { readCursorSigningKey } from "../infrastructure/db/env.js";
import type { Db } from "../infrastructure/db/pool.js";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.js";
import {
  findIssueByIdForAdmin,
  findIssueEventById,
  findUserIssueById,
  insertIssue,
  insertIssueEvent,
  listAllIssuesForAdminPage,
  listIssueEventsForAdmin as listIssueEventsForAdminRepository,
  listUserIssueEvents as listUserIssueEventsFromRepository,
  listUserIssuesPage,
  updateIssueForAdmin as updateIssueForAdminRow,
  updateUserIssue as updateUserIssueRow,
  type IssueEventRow,
  type IssuePageQuery,
  type IssueRow,
} from "../infrastructure/persistence/issue.repository.js";
import { findTransactionById } from "../infrastructure/persistence/ledger.repository.js";
import { withIdempotentMutation } from "./idempotency.js";

export type IssueStatus = IssueRow["status"];
export type IssuePriority = IssueRow["priority"];
export type IssueCategory = IssueRow["category"];

/** Supplied by the trusted server boundary; never derive this actor from request payload. */
export interface IssueActor {
  userId: number;
  role: "user" | "admin" | "security";
}

export interface IssuePageOptions {
  cursor?: string;
  limit?: number;
  status?: IssueStatus;
  priority?: IssuePriority;
}

export interface IssuePage {
  data: IssueView[];
  meta: { cursor: string | null; hasNext: boolean };
}

export interface IssueView {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: string;
}

function toIssueView(row: IssueRow): IssueView {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
  };
}

function assertPositiveId(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw invalidInput(`${label} must be a positive integer`);
}

function requireAdminActor(actor: IssueActor): void {
  assertPositiveId(actor.userId, "actor userId");
  if (actor.role !== "admin") throw forbidden();
}

function parseIssuePageOptions(options: IssuePageOptions): IssuePageQuery {
  const limit = options.limit ?? 20;
  if (!isPageLimit(limit)) throw invalidInput("limit must be an integer from 1 to 100");
  if (options.status !== undefined && !isIssueStatus(options.status)) throw invalidInput("invalid issue status filter");
  if (options.priority !== undefined && !isIssuePriority(options.priority)) {
    throw invalidInput("invalid issue priority filter");
  }
  let cursorId: number | null = null;
  if (options.cursor !== undefined) {
    try {
      cursorId = decodeCursor(options.cursor, readCursorSigningKey());
    } catch {
      throw invalidInput("invalid cursor");
    }
  }
  return {
    cursorId,
    limit,
    ...(options.status === undefined ? {} : { status: options.status }),
    ...(options.priority === undefined ? {} : { priority: options.priority }),
  };
}

function toIssuePage(page: { rows: IssueRow[]; hasNext: boolean }): IssuePage {
  const last = page.rows[page.rows.length - 1];
  return {
    data: page.rows.map(toIssueView),
    meta: {
      cursor: page.hasNext && last !== undefined ? encodeCursor(last.id, readCursorSigningKey()) : null,
      hasNext: page.hasNext,
    },
  };
}

export interface CreateUserIssueInput {
  userId: number;
  relatedTransactionId: number | null;
  title: string;
  description: string;
  category: IssueCategory;
  idempotencyKey: string;
  requestHash: string;
}

export async function createUserIssue(db: Db, input: CreateUserIssueInput): Promise<IssueView> {
  assertPositiveId(input.userId, "userId");
  if (input.relatedTransactionId !== null) assertPositiveId(input.relatedTransactionId, "relatedTransactionId");
  if (input.title.length === 0 || input.title.length > 160) throw invalidInput("title required (max 160)");
  if (input.description.length === 0 || input.description.length > 4000) {
    throw invalidInput("description required (max 4000)");
  }
  if (!isIssueCategory(input.category)) throw invalidInput("invalid issue category");
  validateIdempotency(input.idempotencyKey, input.requestHash);

  return withIdempotentMutation({
    db,
    userId: input.userId,
    scope: "issue.create",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      if (input.relatedTransactionId !== null) {
        const transaction = await findTransactionById(conn, input.userId, input.relatedTransactionId);
        if (transaction === null) throw notFound();
      }
      const issueId = await insertIssue(conn, {
        userId: input.userId,
        relatedTransactionId: input.relatedTransactionId,
        title: input.title,
        description: input.description,
        category: input.category,
        idempotencyId,
      });
      await insertIssueEvent(conn, {
        issueId,
        actorUserId: input.userId,
        kind: "created",
        note: null,
      });
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "issue.create",
        scope: "issue",
        targetId: issueId,
        outcome: "success",
      });
      const issue = await findUserIssueById(conn, input.userId, issueId);
      if (issue === null) throw new Error("issue row missing after insert");
      return toIssueView(issue);
    },
  });
}

export async function getUserIssue(db: Db, userId: number, issueId: number): Promise<IssueView> {
  assertPositiveId(userId, "userId");
  assertPositiveId(issueId, "issueId");
  const issue = await findUserIssueById(db, userId, issueId);
  if (issue === null) throw notFound();
  return toIssueView(issue);
}

export async function listUserIssues(db: Db, userId: number, options: IssuePageOptions = {}): Promise<IssuePage> {
  assertPositiveId(userId, "userId");
  return toIssuePage(await listUserIssuesPage(db, userId, parseIssuePageOptions(options)));
}

export interface UpdateUserIssueInput {
  userId: number;
  issueId: number;
  title?: string;
  description?: string;
  category?: IssueCategory;
}

export async function updateUserIssue(db: Db, input: UpdateUserIssueInput): Promise<IssueView> {
  assertPositiveId(input.userId, "userId");
  assertPositiveId(input.issueId, "issueId");
  if (input.title !== undefined && (input.title.length === 0 || input.title.length > 160)) {
    throw invalidInput("title required (max 160)");
  }
  if (input.description !== undefined && (input.description.length === 0 || input.description.length > 4000)) {
    throw invalidInput("description required (max 4000)");
  }
  if (input.category !== undefined && !isIssueCategory(input.category)) throw invalidInput("invalid issue category");
  if (input.title === undefined && input.description === undefined && input.category === undefined) {
    throw invalidInput("at least one issue field is required");
  }

  return withIssueTransaction(db, async (conn) => {
    const current = await findUserIssueById(conn, input.userId, input.issueId, true);
    if (current === null) throw notFound();
    const patch: { title?: string; description?: string; category?: IssueCategory } = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.category !== undefined) patch.category = input.category;
    const hasChange =
      (patch.title !== undefined && patch.title !== current.title) ||
      (patch.description !== undefined && patch.description !== current.description) ||
      (patch.category !== undefined && patch.category !== current.category);
    if (!hasChange) return toIssueView(current);
    const updated = await updateUserIssueRow(conn, input.userId, input.issueId, patch);
    if (!updated) throw notFound();
    await insertIssueEvent(conn, {
      issueId: input.issueId,
      actorUserId: input.userId,
      kind: "reporter_update",
      note: null,
    });
    await insertAuditEvent(conn, {
      userId: input.userId,
      actorType: "user",
      actorUserId: input.userId,
      action: "issue.update",
      scope: "issue",
      targetId: input.issueId,
      outcome: "success",
    });
    const issue = await findUserIssueById(conn, input.userId, input.issueId);
    if (issue === null) throw new Error("issue row missing after update");
    return toIssueView(issue);
  });
}

export async function listUserIssueEvents(
  db: Db,
  userId: number,
  issueId: number,
): Promise<IssueEventRow[]> {
  assertPositiveId(userId, "userId");
  assertPositiveId(issueId, "issueId");
  const events = await listUserIssueEventsFromRepository(db, userId, issueId);
  if (events === null) throw notFound();
  return events;
}

export async function listAllIssuesForAdmin(
  db: Db,
  actor: IssueActor,
  options: IssuePageOptions = {},
): Promise<IssuePage> {
  requireAdminActor(actor);
  return toIssuePage(await listAllIssuesForAdminPage(db, parseIssuePageOptions(options)));
}

export async function getIssueForAdmin(db: Db, actor: IssueActor, issueId: number): Promise<IssueView> {
  requireAdminActor(actor);
  assertPositiveId(issueId, "issueId");
  const issue = await findIssueByIdForAdmin(db, issueId);
  if (issue === null) throw notFound();
  return toIssueView(issue);
}

export async function listIssueEventsForAdmin(
  db: Db,
  actor: IssueActor,
  issueId: number,
): Promise<IssueEventRow[]> {
  requireAdminActor(actor);
  assertPositiveId(issueId, "issueId");
  const issue = await findIssueByIdForAdmin(db, issueId);
  if (issue === null) throw notFound();
  return listIssueEventsForAdminRepository(db, issueId);
}

export interface UpdateIssueForAdminInput {
  actor: IssueActor;
  issueId: number;
  status?: IssueStatus;
  priority?: IssuePriority;
}

export async function updateIssueForAdmin(db: Db, input: UpdateIssueForAdminInput): Promise<IssueView> {
  requireAdminActor(input.actor);
  assertPositiveId(input.issueId, "issueId");
  if (input.status !== undefined && !isIssueStatus(input.status)) throw invalidInput("invalid issue status");
  if (input.priority !== undefined && !isIssuePriority(input.priority)) throw invalidInput("invalid issue priority");
  if (input.status === undefined && input.priority === undefined) throw invalidInput("status or priority is required");

  return withIssueTransaction(db, async (conn) => {
    const current = await findIssueByIdForAdmin(conn, input.issueId, true);
    if (current === null) throw notFound();
    const patch: { status?: IssueStatus; priority?: IssuePriority } = {};
    if (input.status !== undefined) patch.status = input.status;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.status !== undefined && input.status !== current.status) {
      await insertIssueEvent(conn, {
        issueId: current.id,
        actorUserId: input.actor.userId,
        kind: "status_change",
        note: input.status,
      });
    }
    if (input.priority !== undefined && input.priority !== current.priority) {
      await insertIssueEvent(conn, {
        issueId: current.id,
        actorUserId: input.actor.userId,
        kind: "priority_change",
        note: input.priority,
      });
    }
    const hasChange =
      (patch.status !== undefined && patch.status !== current.status) ||
      (patch.priority !== undefined && patch.priority !== current.priority);
    if (!hasChange) return toIssueView(current);
    const updated = await updateIssueForAdminRow(conn, input.issueId, patch);
    if (!updated) throw notFound();
    await insertAuditEvent(conn, {
      userId: current.userId,
      actorType: "admin",
      actorUserId: input.actor.userId,
      action: "issue.triage.update",
      scope: "issue",
      targetId: current.id,
      outcome: "success",
    });
    const issue = await findIssueByIdForAdmin(conn, input.issueId);
    if (issue === null) throw new Error("issue row missing after admin update");
    return toIssueView(issue);
  });
}

export interface AddAdminIssueNoteInput {
  actor: IssueActor;
  issueId: number;
  note: string;
  idempotencyKey: string;
  requestHash: string;
}

export async function addAdminIssueNote(db: Db, input: AddAdminIssueNoteInput): Promise<IssueEventRow> {
  requireAdminActor(input.actor);
  assertPositiveId(input.issueId, "issueId");
  if (input.note.length === 0 || input.note.length > 4000) throw invalidInput("note required (max 4000)");
  validateIdempotency(input.idempotencyKey, input.requestHash);

  return withIdempotentMutation({
    db,
    userId: input.actor.userId,
    scope: "issue.admin.note",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn) => {
      const issue = await findIssueByIdForAdmin(conn, input.issueId, true);
      if (issue === null) throw notFound();
      const eventId = await insertIssueEvent(conn, {
        issueId: issue.id,
        actorUserId: input.actor.userId,
        kind: "note",
        note: input.note,
      });
      await insertAuditEvent(conn, {
        userId: issue.userId,
        actorType: "admin",
        actorUserId: input.actor.userId,
        action: "issue.note.create",
        scope: "issue",
        targetId: issue.id,
        outcome: "success",
      });
      const event = await findIssueEventById(conn, eventId);
      if (event === null) throw new Error("issue event missing after insert");
      return event;
    },
  });
}

function validateIdempotency(idempotencyKey: string, requestHash: string): void {
  if (idempotencyKey.length === 0 || idempotencyKey.length > 255) {
    throw invalidInput("idempotency key required (max 255)");
  }
  if (!/^[a-f0-9]{64}$/.test(requestHash)) throw invalidInput("requestHash must be a SHA-256 hex digest");
}

function isIssueCategory(value: unknown): value is IssueCategory {
  return value === "financial_dispute" || value === "bug" || value === "other";
}

function isIssueStatus(value: unknown): value is IssueStatus {
  return value === "open" || value === "in_triage" || value === "resolved" || value === "closed";
}

function isIssuePriority(value: unknown): value is IssuePriority {
  return value === "P0" || value === "P1" || value === "P2";
}

async function withIssueTransaction<T>(db: Db, run: (conn: PoolConnection) => Promise<T>): Promise<T> {
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
      // Preserve the original mutation failure if rollback also fails.
    }
    throw error;
  } finally {
    if (isPool) conn.release();
  }
}
