import type { Db } from '../infrastructure/db/pool.ts';
import { withTransaction } from '../infrastructure/db/pool.ts';
import { decodeCursor, encodeCursor } from '../domain/period.js';
import { forbidden, invalidInput, notFound } from '../domain/errors.js';
import { withIdempotentMutation } from './idempotency.ts';
import { findTransactionById } from '../infrastructure/persistence/ledger.repository.ts';
import {
  findIssueById,
  insertIssue,
  insertIssueEvent,
  listIssueEvents,
  listIssuesPage,
  updateIssue,
  type IssueRow,
} from '../infrastructure/persistence/issue.repository.ts';
import { insertAuditEvent } from '../infrastructure/persistence/audit.repository.ts';

export type IssueCategory = IssueRow['category'];
export type IssueStatus = IssueRow['status'];
export type IssuePriority = IssueRow['priority'];

const issueCategories = ['financial_dispute', 'bug', 'other'] as const;
const issueStatuses = ['open', 'in_triage', 'resolved', 'closed'] as const;
const issuePriorities = ['P0', 'P1', 'P2'] as const;

function isIssueCategory(value: unknown): value is IssueCategory {
  return typeof value === 'string' && (issueCategories as readonly string[]).includes(value);
}

function isIssueStatus(value: unknown): value is IssueStatus {
  return typeof value === 'string' && (issueStatuses as readonly string[]).includes(value);
}

function isIssuePriority(value: unknown): value is IssuePriority {
  return typeof value === 'string' && (issuePriorities as readonly string[]).includes(value);
}

function cursorId(cursor: string | undefined) {
  if (cursor === undefined) return null;
  try {
    return decodeCursor(cursor);
  } catch {
    throw invalidInput('invalid cursor');
  }
}

function boundedLimit(limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw invalidInput('limit must be between 1 and 100');
  return limit;
}

function issueView(issue: IssueRow) {
  return {
    id: String(issue.id),
    title: issue.title,
    description: issue.description,
    category: issue.category,
    relatedTransactionId: issue.relatedTransactionId === null ? null : String(issue.relatedTransactionId),
    status: issue.status,
    priority: issue.priority,
    createdAt: issue.createdAt,
  };
}

export async function createUserIssue(
  _db: Db,
  input: {
    userId: number;
    relatedTransactionId: number | null;
    title: string;
    description: string;
    category: unknown;
    idempotencyKey: string;
    requestHash: string;
  },
) {
  if (!Number.isSafeInteger(input.userId) || input.userId < 1) throw forbidden();
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 1 || title.length > 160) throw invalidInput('title length is invalid');
  if (description.length < 1 || description.length > 4000) throw invalidInput('description length is invalid');
  if (!isIssueCategory(input.category)) throw invalidInput('category is invalid');
  const category = input.category;

  return withIdempotentMutation({
    userId: input.userId,
    scope: 'issue.create',
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async connection => {
      if (input.relatedTransactionId !== null) {
        const relatedTransaction = await findTransactionById(connection, input.userId, input.relatedTransactionId);
        if (!relatedTransaction) throw notFound();
      }
      const issueId = await insertIssue(connection, {
        userId: input.userId,
        relatedTransactionId: input.relatedTransactionId,
        title,
        description,
        category,
      });
      await insertIssueEvent(connection, {
        issueId,
        actorUserId: input.userId,
        kind: 'created',
        note: null,
      });
      await insertAuditEvent(connection, {
        userId: input.userId,
        actorType: 'user',
        actorUserId: input.userId,
        action: 'issue.create',
        scope: 'issue',
        targetId: issueId,
        outcome: 'success',
      });
      const issue = await findIssueById(connection, issueId);
      if (!issue) throw new Error('issue missing after insert');
      return issueView(issue);
    },
  });
}

async function listIssues(
  db: Db,
  options: {
    userId?: number;
    cursor?: string;
    limit: number;
    status?: IssueStatus;
    priority?: IssuePriority;
  },
) {
  const limit = boundedLimit(options.limit);
  const page = await listIssuesPage(db, {
    ...(options.userId === undefined ? {} : { userId: options.userId }),
    cursorId: cursorId(options.cursor),
    limit,
    ...(options.status === undefined ? {} : { status: options.status }),
    ...(options.priority === undefined ? {} : { priority: options.priority }),
  });
  const last = page.rows.at(-1);
  return {
    data: page.rows.map(issueView),
    meta: { cursor: page.hasNext && last ? encodeCursor(last.id) : null, hasNext: page.hasNext },
  };
}

export async function listUserIssues(db: Db, userId: number, cursor: string | undefined, limit: number) {
  return listIssues(db, { userId, ...(cursor === undefined ? {} : { cursor }), limit });
}

export async function listAdminIssues(
  db: Db,
  options: { cursor?: string; limit: number; status?: unknown; priority?: unknown },
) {
  const status = options.status === undefined ? undefined : options.status;
  const priority = options.priority === undefined ? undefined : options.priority;
  if (status !== undefined && !isIssueStatus(status)) throw invalidInput('status is invalid');
  if (priority !== undefined && !isIssuePriority(priority)) throw invalidInput('priority is invalid');
  return listIssues(db, {
    ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
    limit: options.limit,
    ...(status === undefined ? {} : { status }),
    ...(priority === undefined ? {} : { priority }),
  });
}

export async function getAdminIssue(db: Db, issueId: number) {
  const issue = await findIssueById(db, issueId);
  if (!issue) throw notFound();
  const events = await listIssueEvents(db, issueId);
  return {
    ...issueView(issue),
    events: events.map(event => ({ kind: event.kind, note: event.note, createdAt: event.createdAt })),
  };
}

export async function updateAdminIssue(
  adminUserId: number,
  issueId: number,
  patch: { status?: unknown; priority?: unknown },
) {
  const update: { status?: IssueStatus; priority?: IssuePriority } = {};
  if (patch.status !== undefined) {
    if (!isIssueStatus(patch.status)) throw invalidInput('status is invalid');
    update.status = patch.status;
  }
  if (patch.priority !== undefined) {
    if (!isIssuePriority(patch.priority)) throw invalidInput('priority is invalid');
    update.priority = patch.priority;
  }
  if (Object.keys(update).length === 0) throw invalidInput('at least one issue field is required');

  return withTransaction(async connection => {
    const previous = await findIssueById(connection, issueId, true);
    if (!previous) throw notFound();
    const updated = await updateIssue(connection, issueId, update);
    if (!updated) throw notFound();
    if (update.status !== undefined && update.status !== previous.status) {
      await insertIssueEvent(connection, { issueId, actorUserId: adminUserId, kind: 'status_change', note: update.status });
    }
    if (update.priority !== undefined && update.priority !== previous.priority) {
      await insertIssueEvent(connection, { issueId, actorUserId: adminUserId, kind: 'priority_change', note: update.priority });
    }
    await insertAuditEvent(connection, {
      userId: previous.userId,
      actorType: 'admin',
      actorUserId: adminUserId,
      action: 'issue.update',
      scope: 'issue',
      targetId: issueId,
      outcome: 'success',
    });
    const result = await findIssueById(connection, issueId);
    if (!result) throw new Error('issue missing after update');
    return issueView(result);
  });
}

export async function addAdminIssueNote(
  adminUserId: number,
  issueId: number,
  note: string,
  idempotencyKey: string,
  requestHash: string,
) {
  const normalizedNote = note.trim();
  if (normalizedNote.length < 1 || normalizedNote.length > 4000) throw invalidInput('note length is invalid');
  return withIdempotentMutation({
    userId: adminUserId,
    scope: `issue.note:${issueId}`,
    idempotencyKey,
    requestHash,
    mutate: async connection => {
      const issue = await findIssueById(connection, issueId);
      if (!issue) throw notFound();
      await insertIssueEvent(connection, { issueId, actorUserId: adminUserId, kind: 'note', note: normalizedNote });
      await insertAuditEvent(connection, {
        userId: issue.userId,
        actorType: 'admin',
        actorUserId: adminUserId,
        action: 'issue.note',
        scope: 'issue',
        targetId: issueId,
        outcome: 'success',
      });
      return { issueId: String(issueId), created: true };
    },
  });
}
