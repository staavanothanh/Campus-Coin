// Ledger immutable: chỉ INSERT; UPDATE/DELETE bị chặn bởi trigger.
// Correction (reversal/adjustment/replacement) là row mới có reference + reason + audit.

import type { CorrectionRole, TransactionType } from "../../domain/money.js";
import { amountFromDb, idFromDb, isoFromDb } from "./rows.js";
import { isPageLimit } from "../../domain/period.js";
import { isPositiveVnd } from "../../domain/money.js";

export interface LedgerRow {
  id: number;
  userId: number;
  type: TransactionType;
  amountVnd: number;
  categoryId: number;
  occurredAt: string;
  role: "original" | CorrectionRole;
  referenceId: number | null;
  description: string | null;
  reason: string | null;
  createdAt: string;
}

export interface LedgerScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface LedgerDbRow {
  id: number | string;
  user_id: number | string;
  type: TransactionType;
  amount_vnd: number | string;
  category_id: number | string;
  occurred_at: Date;
  role: "original" | CorrectionRole;
  reference_id: number | string | null;
  description: string | null;
  reason: string | null;
  created_at: Date;
}

export function mapLedgerRow(row: LedgerDbRow): LedgerRow {
  return {
    id: idFromDb(row.id),
    userId: amountFromDb(row.user_id),
    type: row.type,
    amountVnd: amountFromDb(row.amount_vnd),
    categoryId: amountFromDb(row.category_id),
    occurredAt: isoFromDb(row.occurred_at),
    role: row.role,
    referenceId: row.reference_id === null ? null : idFromDb(row.reference_id),
    description: row.description,
    reason: row.reason,
    createdAt: isoFromDb(row.created_at),
  };
}

const LEDGER_COLUMNS =
  "id, user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, description, reason, created_at";

export interface NewLedgerRow {
  userId: number;
  type: TransactionType;
  amountVnd: number;
  categoryId: number;
  occurredAt: Date;
  role: "original" | CorrectionRole;
  referenceId: number | null;
  description: string | null;
  reason: string | null;
  idempotencyId: number | null;
}

export async function insertLedgerRow(db: LedgerScalar, row: NewLedgerRow): Promise<number> {
  if (!isPositiveVnd(row.amountVnd)) throw new Error("invalid ledger amount");
  const [result] = (await db.query(
    `INSERT INTO ledger_transactions
       (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, description, reason, idempotency_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.userId,
      row.type,
      row.amountVnd,
      row.categoryId,
      row.occurredAt,
      row.role,
      row.referenceId,
      row.description,
      row.reason,
      row.idempotencyId,
    ],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

export async function findTransactionById(
  db: LedgerScalar,
  userId: number,
  transactionId: number,
  lock = false,
): Promise<LedgerRow | null> {
  const [rows] = (await db.query(
    `SELECT ${LEDGER_COLUMNS} FROM ledger_transactions WHERE id = ? AND user_id = ?${lock ? " FOR UPDATE" : ""}`,
    [transactionId, userId],
  )) as [LedgerDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapLedgerRow(row);
}

/** Kiểm tra target đã có correction chưa (chặn chain: chỉ target original, một correction). */
export async function findCorrectionForTarget(
  db: LedgerScalar,
  userId: number,
  targetId: number,
): Promise<LedgerRow | null> {
  const [rows] = (await db.query(
    `SELECT ${LEDGER_COLUMNS} FROM ledger_transactions WHERE user_id = ? AND reference_id = ? LIMIT 1`,
    [userId, targetId],
  )) as [LedgerDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapLedgerRow(row);
}

export interface TransactionQuery {
  cursorId: number | null;
  limit: number;
  type?: TransactionType;
  categoryId?: number;
  fromUtcMs?: number;
  toExclusiveUtcMs?: number;
}

/** Keyset page DESC theo id; fetch limit+1 để có hasNext; luôn scope user_id. */
export async function listTransactionsPage(
  db: LedgerScalar,
  userId: number,
  query: TransactionQuery,
): Promise<{ rows: LedgerRow[]; hasNext: boolean }> {
  if (!isPageLimit(query.limit)) throw new Error("invalid page limit");
  const conditions = ["user_id = ?"];
  const params: unknown[] = [userId];
  if (query.cursorId !== null) {
    conditions.push("id < ?");
    params.push(query.cursorId);
  }
  if (query.type !== undefined) {
    conditions.push("type = ?");
    params.push(query.type);
  }
  if (query.categoryId !== undefined) {
    conditions.push("category_id = ?");
    params.push(query.categoryId);
  }
  if (query.fromUtcMs !== undefined) {
    conditions.push("occurred_at >= ?");
    params.push(new Date(query.fromUtcMs));
  }
  if (query.toExclusiveUtcMs !== undefined) {
    conditions.push("occurred_at < ?");
    params.push(new Date(query.toExclusiveUtcMs));
  }
  params.push(query.limit + 1);
  const [rows] = (await db.query(
    `SELECT ${LEDGER_COLUMNS} FROM ledger_transactions
     WHERE ${conditions.join(" AND ")}
     ORDER BY id DESC
     LIMIT ?`,
    params,
  )) as [LedgerDbRow[], unknown];
  const hasNext = rows.length > query.limit;
  return { rows: rows.slice(0, query.limit).map(mapLedgerRow), hasNext };
}
