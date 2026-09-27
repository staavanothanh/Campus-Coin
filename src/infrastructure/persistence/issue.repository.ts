// Issue queue persistence. User operations always scope by owner; admin-wide
// queries are named explicitly. issue_events is append-only.

import { amountFromDb, isoFromDb } from "./rows.ts";

export interface IssueRow {
  id: number;
  userId: number;
  relatedTransactionId: number | null;
  title: string;
  description: string;
  category: "financial_dispute" | "bug" | "other";
  status: "open" | "in_triage" | "resolved" | "closed";
  priority: "P0" | "P1" | "P2";
  createdAt: string;
}

export interface IssueScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface IssueDbRow {
  id: number | string;
  user_id: number | string;
  related_transaction_id: number | string | null;
  title: string;
  description: string;
  category: IssueRow["category"];
  status: IssueRow["status"];
  priority: IssueRow["priority"];
  created_at: Date;
}

function mapIssueRow(row: IssueDbRow): IssueRow {
  return {
    id: amountFromDb(row.id),
    userId: amountFromDb(row.user_id),
    relatedTransactionId: row.related_transaction_id === null ? null : amountFromDb(row.related_transaction_id),
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    priority: row.priority,
    createdAt: isoFromDb(row.created_at),
  };
}

const ISSUE_COLUMNS =
  "id, user_id, related_transaction_id, title, description, category, status, priority, created_at";

export async function insertIssue(
  conn: IssueScalar,
  input: {
    userId: number;
    relatedTransactionId: number | null;
    title: string;
    description: string;
    category: IssueRow["category"];
    idempotencyId: number;
  },
): Promise<number> {
  const [result] = (await conn.query(
    `INSERT INTO issues (user_id, related_transaction_id, title, description, category, idempotency_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.userId, input.relatedTransactionId, input.title, input.description, input.category, input.idempotencyId],
  )) as [{ insertId: number | string }, unknown];
  return amountFromDb(result.insertId);
}

export async function findUserIssueById(
  db: IssueScalar,
  userId: number,
  issueId: number,
  lock = false,
): Promise<IssueRow | null> {
  const [rows] = (await db.query(
    `SELECT ${ISSUE_COLUMNS} FROM issues WHERE user_id = ? AND id = ?${lock ? " FOR UPDATE" : ""}`,
    [userId, issueId],
  )) as [IssueDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapIssueRow(row);
}

/** Unscoped issue access is reserved for callers that have explicitly authorized an admin. */
export async function findIssueByIdForAdmin(db: IssueScalar, issueId: number, lock = false): Promise<IssueRow | null> {
  const [rows] = (await db.query(
    `SELECT ${ISSUE_COLUMNS} FROM issues WHERE id = ?${lock ? " FOR UPDATE" : ""}`,
    [issueId],
  )) as [IssueDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapIssueRow(row);
}

export interface IssuePageQuery {
  cursorId: number | null;
  limit: number;
  status?: IssueRow["status"];
  priority?: IssueRow["priority"];
}

async function listIssuePage(
  db: IssueScalar,
  query: IssuePageQuery,
  ownerId: number | null,
): Promise<{ rows: IssueRow[]; hasNext: boolean }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (ownerId !== null) {
    conditions.push("user_id = ?");
    params.push(ownerId);
  }
  if (query.cursorId !== null) {
    conditions.push("id < ?");
    params.push(query.cursorId);
  }
  if (query.status !== undefined) {
    conditions.push("status = ?");
    params.push(query.status);
  }
  if (query.priority !== undefined) {
    conditions.push("priority = ?");
    params.push(query.priority);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(query.limit + 1);
  const [rows] = (await db.query(
    `SELECT ${ISSUE_COLUMNS} FROM issues ${where} ORDER BY id DESC LIMIT ?`,
    params,
  )) as [IssueDbRow[], unknown];
  const hasNext = rows.length > query.limit;
  return { rows: rows.slice(0, query.limit).map(mapIssueRow), hasNext };
}

export function listUserIssuesPage(
  db: IssueScalar,
  userId: number,
  query: IssuePageQuery,
): Promise<{ rows: IssueRow[]; hasNext: boolean }> {
  return listIssuePage(db, query, userId);
}

/** All-owner issue listing is intentionally an admin-named repository operation. */
export function listAllIssuesForAdminPage(
  db: IssueScalar,
  query: IssuePageQuery,
): Promise<{ rows: IssueRow[]; hasNext: boolean }> {
  return listIssuePage(db, query, null);
}

export async function updateUserIssue(
  conn: IssueScalar,
  userId: number,
  issueId: number,
  patch: { title?: string; description?: string; category?: IssueRow["category"] },
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    params.push(patch.description);
  }
  if (patch.category !== undefined) {
    sets.push("category = ?");
    params.push(patch.category);
  }
  if (sets.length === 0) return false;
  const [result] = (await conn.query(
    `UPDATE issues SET ${sets.join(", ")} WHERE user_id = ? AND id = ?`,
    [...params, userId, issueId],
  )) as [{ affectedRows: number }, unknown];
  return result.affectedRows === 1;
}

export async function updateIssueForAdmin(
  conn: IssueScalar,
  issueId: number,
  patch: { status?: IssueRow["status"]; priority?: IssueRow["priority"] },
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.status !== undefined) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (patch.priority !== undefined) {
    sets.push("priority = ?");
    params.push(patch.priority);
  }
  if (sets.length === 0) return false;
  const [result] = (await conn.query(`UPDATE issues SET ${sets.join(", ")} WHERE id = ?`, [...params, issueId])) as [
    { affectedRows: number },
    unknown,
  ];
  return result.affectedRows === 1;
}

export interface IssueEventRow {
  id: number;
  issueId: number;
  actorUserId: number;
  kind: "created" | "reporter_update" | "status_change" | "priority_change" | "note";
  note: string | null;
  createdAt: string;
}

interface IssueEventDbRow {
  id: number | string;
  issue_id: number | string;
  actor_user_id: number | string;
  kind: IssueEventRow["kind"];
  note: string | null;
  created_at: Date;
}

export async function insertIssueEvent(
  conn: IssueScalar,
  input: {
    issueId: number;
    actorUserId: number;
    kind: IssueEventRow["kind"];
    note: string | null;
  },
): Promise<number> {
  const [result] = (await conn.query(
    "INSERT INTO issue_events (issue_id, actor_user_id, kind, note) VALUES (?, ?, ?, ?)",
    [input.issueId, input.actorUserId, input.kind, input.note],
  )) as [{ insertId: number | string }, unknown];
  return amountFromDb(result.insertId);
}

export async function findIssueEventById(db: IssueScalar, eventId: number): Promise<IssueEventRow | null> {
  const [rows] = (await db.query(
    "SELECT id, issue_id, actor_user_id, kind, note, created_at FROM issue_events WHERE id = ?",
    [eventId],
  )) as [IssueEventDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapIssueEventRow(row);
}

export async function listUserIssueEvents(
  db: IssueScalar,
  userId: number,
  issueId: number,
): Promise<IssueEventRow[] | null> {
  const [rows] = (await db.query(
    `SELECT e.id, e.issue_id, e.actor_user_id, e.kind, e.note, e.created_at
     FROM issue_events AS e
     INNER JOIN issues AS i ON i.id = e.issue_id
     WHERE i.user_id = ? AND i.id = ? AND e.kind <> 'note'
     ORDER BY e.id ASC`,
    [userId, issueId],
  )) as [IssueEventDbRow[], unknown];
  if (rows.length === 0) {
    const issue = await findUserIssueById(db, userId, issueId);
    if (issue === null) return null;
  }
  return rows.map(mapIssueEventRow);
}

/** Includes internal notes and must only be called after admin authorization. */
export async function listIssueEventsForAdmin(db: IssueScalar, issueId: number): Promise<IssueEventRow[]> {
  const [rows] = (await db.query(
    `SELECT id, issue_id, actor_user_id, kind, note, created_at
     FROM issue_events WHERE issue_id = ? ORDER BY id ASC`,
    [issueId],
  )) as [IssueEventDbRow[], unknown];
  return rows.map(mapIssueEventRow);
}

function mapIssueEventRow(row: IssueEventDbRow): IssueEventRow {
  return {
    id: amountFromDb(row.id),
    issueId: amountFromDb(row.issue_id),
    actorUserId: amountFromDb(row.actor_user_id),
    kind: row.kind,
    note: row.note,
    createdAt: isoFromDb(row.created_at),
  };
}
