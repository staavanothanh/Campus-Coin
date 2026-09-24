// Issue queue (RP-B thin slice): user reports + admin triage.
// issue_events append-only; issue row mutable qua là admin (status/priority).

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
  db: IssueScalar,
  input: {
    userId: number;
    relatedTransactionId: number | null;
    title: string;
    description: string;
    category: IssueRow["category"];
  },
): Promise<number> {
  const [result] = (await db.query(
    `INSERT INTO issues (user_id, related_transaction_id, title, description, category)
     VALUES (?, ?, ?, ?, ?)`,
    [input.userId, input.relatedTransactionId, input.title, input.description, input.category],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

export async function findIssueById(db: IssueScalar, issueId: number, lock = false): Promise<IssueRow | null> {
  const [rows] = (await db.query(`SELECT ${ISSUE_COLUMNS} FROM issues WHERE id = ?${lock ? " FOR UPDATE" : ""}`, [issueId])) as [
    IssueDbRow[],
    unknown,
  ];
  const row = rows[0];
  return row === undefined ? null : mapIssueRow(row);
}

export async function listIssuesPage(
  db: IssueScalar,
  options: {
    userId?: number;
    cursorId: number | null;
    limit: number;
    status?: IssueRow["status"];
    priority?: IssueRow["priority"];
  },
): Promise<{ rows: IssueRow[]; hasNext: boolean }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.userId !== undefined) {
    conditions.push("user_id = ?");
    params.push(options.userId);
  }
  if (options.cursorId !== null) {
    conditions.push("id < ?");
    params.push(options.cursorId);
  }
  if (options.status !== undefined) {
    conditions.push("status = ?");
    params.push(options.status);
  }
  if (options.priority !== undefined) {
    conditions.push("priority = ?");
    params.push(options.priority);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(options.limit + 1);
  const [rows] = (await db.query(
    `SELECT ${ISSUE_COLUMNS} FROM issues ${where} ORDER BY id DESC LIMIT ?`,
    params,
  )) as [IssueDbRow[], unknown];
  const hasNext = rows.length > options.limit;
  return { rows: rows.slice(0, options.limit).map(mapIssueRow), hasNext };
}

export async function updateIssue(
  db: IssueScalar,
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
  if (sets.length === 0) return true;
  const [result] = (await db.query(`UPDATE issues SET ${sets.join(", ")} WHERE id = ?`, [...params, issueId])) as [
    { affectedRows: number },
    unknown,
  ];
  return result.affectedRows === 1;
}

export interface IssueEventRow {
  id: number;
  issueId: number;
  actorUserId: number;
  kind: "created" | "status_change" | "priority_change" | "note";
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
  db: IssueScalar,
  input: {
    issueId: number;
    actorUserId: number;
    kind: IssueEventRow["kind"];
    note: string | null;
  },
): Promise<number> {
  const [result] = (await db.query(
    "INSERT INTO issue_events (issue_id, actor_user_id, kind, note) VALUES (?, ?, ?, ?)",
    [input.issueId, input.actorUserId, input.kind, input.note],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

export async function listIssueEvents(db: IssueScalar, issueId: number): Promise<IssueEventRow[]> {
  const [rows] = (await db.query(
    `SELECT id, issue_id, actor_user_id, kind, note, created_at FROM issue_events WHERE issue_id = ? ORDER BY id ASC`,
    [issueId],
  )) as [IssueEventDbRow[], unknown];
  return rows.map((row) => ({
    id: amountFromDb(row.id),
    issueId: amountFromDb(row.issue_id),
    actorUserId: amountFromDb(row.actor_user_id),
    kind: row.kind,
    note: row.note,
    createdAt: isoFromDb(row.created_at),
  }));
}
