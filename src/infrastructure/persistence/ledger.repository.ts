// Ledger immutable: chỉ INSERT; UPDATE/DELETE bị chặn bởi trigger.
// Correction (reversal/adjustment/replacement) là row mới có reference + reason + audit.

import type { CorrectionRole, TransactionType } from "../../domain/money.ts";
import { amountFromDb, idFromDb, isoFromDb } from "./rows.ts";

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
  itemName: string | null;
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
  item_name: string | null;
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
    itemName: row.item_name,
    reason: row.reason,
    createdAt: isoFromDb(row.created_at),
  };
}

const LEDGER_COLUMNS =
  "id, user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, description, item_name, reason, created_at";

export interface NewLedgerRow {
  userId: number;
  type: TransactionType;
  amountVnd: number;
  categoryId: number;
  occurredAt: Date;
  role: "original" | CorrectionRole;
  referenceId: number | null;
  description: string | null;
  itemName: string | null;
  reason: string | null;
  idempotencyId: number | null;
}

export async function insertLedgerRow(db: LedgerScalar, row: NewLedgerRow): Promise<number> {
  const [result] = (await db.query(
    `INSERT INTO ledger_transactions
       (user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, description, item_name, reason, idempotency_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.userId,
      row.type,
      row.amountVnd,
      row.categoryId,
      row.occurredAt,
      row.role,
      row.referenceId,
      row.description,
      row.itemName,
      row.reason,
      row.idempotencyId,
    ],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

export interface FrequentPaymentItemRow {
  itemName: string;
  frequency: number;
  lastAmountVnd: number;
  lastOccurredAt: string;
  previousOccurredAt: string | null;
}

/** Owner-scoped product history; reversals are excluded and corrections update the shown amount. */
export async function listFrequentPaymentItems(
  db: LedgerScalar,
  userId: number,
  limit: number,
): Promise<FrequentPaymentItemRow[]> {
  const [rows] = (await db.query(
    `WITH eligible_purchases AS (
       SELECT
         purchase.item_name,
         CASE
           WHEN correction.role IN ('adjustment', 'replacement') THEN correction.amount_vnd
           ELSE purchase.amount_vnd
         END AS effective_amount_vnd,
         purchase.occurred_at,
         purchase.id,
         LOWER(TRIM(purchase.item_name)) AS normalized_name,
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(TRIM(purchase.item_name))
           ORDER BY purchase.occurred_at DESC, purchase.id DESC
         ) AS purchase_rank,
         COUNT(*) OVER (PARTITION BY LOWER(TRIM(purchase.item_name))) AS purchase_count
       FROM ledger_transactions AS purchase
       LEFT JOIN ledger_transactions AS correction
         ON correction.user_id = purchase.user_id
        AND correction.reference_id = purchase.id
       WHERE purchase.user_id = ?
         AND purchase.type = 'payment'
         AND purchase.role = 'original'
         AND purchase.item_name IS NOT NULL
         AND TRIM(purchase.item_name) <> ''
         AND (correction.id IS NULL OR correction.role <> 'reversal')
     )
     SELECT
       MAX(CASE WHEN purchase_rank = 1 THEN item_name END) AS item_name,
       MAX(purchase_count) AS frequency,
       MAX(CASE WHEN purchase_rank = 1 THEN effective_amount_vnd END) AS last_amount_vnd,
       MAX(CASE WHEN purchase_rank = 1 THEN occurred_at END) AS last_occurred_at,
       MAX(CASE WHEN purchase_rank = 2 THEN occurred_at END) AS previous_occurred_at
     FROM eligible_purchases
     GROUP BY normalized_name
     ORDER BY frequency DESC, last_occurred_at DESC, normalized_name ASC
     LIMIT ?`,
    [userId, limit],
  )) as [{
    item_name: string;
    frequency: number | string;
    last_amount_vnd: number | string;
    last_occurred_at: Date;
    previous_occurred_at: Date | null;
  }[], unknown];

  return rows.map((row) => ({
    itemName: row.item_name,
    frequency: amountFromDb(row.frequency),
    lastAmountVnd: amountFromDb(row.last_amount_vnd),
    lastOccurredAt: isoFromDb(row.last_occurred_at),
    previousOccurredAt: row.previous_occurred_at === null ? null : isoFromDb(row.previous_occurred_at),
  }));
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
