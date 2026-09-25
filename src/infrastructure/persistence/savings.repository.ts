// Savings: aggregate riêng (ADR-0005); transfer atomic, lock order wallet → savings ở service.

import type { TransferDirection } from "../../domain/money.js";
import { amountFromDb, isoFromDb } from "./rows.js";
import { isPageLimit } from "../../domain/period.js";
import { isPositiveVnd } from "../../domain/money.js";

export interface SavingsRow {
  id: number;
  userId: number;
  balanceVnd: number;
  currency: string;
  updatedAt: string;
}

export interface SavingsScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface SavingsDbRow {
  id: number | string;
  user_id: number | string;
  balance_vnd: number | string;
  currency: string;
  updated_at: Date;
}

function mapSavingsRow(row: SavingsDbRow): SavingsRow {
  return {
    id: amountFromDb(row.id),
    userId: amountFromDb(row.user_id),
    balanceVnd: amountFromDb(row.balance_vnd),
    currency: row.currency,
    updatedAt: isoFromDb(row.updated_at),
  };
}

const SAVINGS_COLUMNS = "id, user_id, balance_vnd, currency, updated_at";

export async function findSavingsByUserId(db: SavingsScalar, userId: number): Promise<SavingsRow | null> {
  const [rows] = (await db.query(`SELECT ${SAVINGS_COLUMNS} FROM savings_accounts WHERE user_id = ?`, [userId])) as [
    SavingsDbRow[],
    unknown,
  ];
  const row = rows[0];
  return row === undefined ? null : mapSavingsRow(row);
}

/** Lock savings cho deposit/withdraw — lock sau wallet theo thứ tự cố định. */
export async function lockSavingsForUpdate(db: SavingsScalar, userId: number): Promise<SavingsRow | null> {
  const [rows] = (await db.query(`SELECT ${SAVINGS_COLUMNS} FROM savings_accounts WHERE user_id = ? FOR UPDATE`, [
    userId,
  ])) as [SavingsDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapSavingsRow(row);
}

export interface NewTransferRow {
  userId: number;
  direction: TransferDirection;
  amountVnd: number;
  note: string | null;
  idempotencyId: number | null;
}

export async function insertSavingsTransfer(db: SavingsScalar, row: NewTransferRow): Promise<number> {
  if (!isPositiveVnd(row.amountVnd)) throw new Error("invalid savings transfer amount");
  const [result] = (await db.query(
    "INSERT INTO savings_transfers (user_id, direction, amount_vnd, note, idempotency_id) VALUES (?, ?, ?, ?, ?)",
    [row.userId, row.direction, row.amountVnd, row.note, row.idempotencyId],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}

export interface SavingsTransferRow {
  id: number;
  direction: TransferDirection;
  amountVnd: number;
  note: string | null;
  createdAt: string;
}

interface TransferDbRow {
  id: number | string;
  direction: TransferDirection;
  amount_vnd: number | string;
  note: string | null;
  created_at: Date;
}

export async function findTransferById(
  db: SavingsScalar,
  userId: number,
  transferId: number,
): Promise<SavingsTransferRow | null> {
  const [rows] = (await db.query(
    `SELECT id, direction, amount_vnd, note, created_at FROM savings_transfers WHERE id = ? AND user_id = ?`,
    [transferId, userId],
  )) as [TransferDbRow[], unknown];
  const row = rows[0];
  if (row === undefined) return null;
  return {
    id: amountFromDb(row.id),
    direction: row.direction,
    amountVnd: amountFromDb(row.amount_vnd),
    note: row.note,
    createdAt: isoFromDb(row.created_at),
  };
}

export async function listSavingsTransfersPage(
  db: SavingsScalar,
  userId: number,
  cursorId: number | null,
  limit: number,
): Promise<{ rows: SavingsTransferRow[]; hasNext: boolean }> {
  if (!isPageLimit(limit)) throw new Error("invalid page limit");
  const params: unknown[] = [userId];
  let cursorClause = "";
  if (cursorId !== null) {
    cursorClause = "AND id < ?";
    params.push(cursorId);
  }
  params.push(limit + 1);
  const [rows] = (await db.query(
    `SELECT id, direction, amount_vnd, note, created_at FROM savings_transfers
     WHERE user_id = ? ${cursorClause}
     ORDER BY id DESC
     LIMIT ?`,
    params,
  )) as [TransferDbRow[], unknown];
  const hasNext = rows.length > limit;
  return {
    rows: rows.slice(0, limit).map((r) => ({
      id: amountFromDb(r.id),
      direction: r.direction,
      amountVnd: amountFromDb(r.amount_vnd),
      note: r.note,
      createdAt: isoFromDb(r.created_at),
    })),
    hasNext,
  };
}
