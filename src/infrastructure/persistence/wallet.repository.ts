// Wallet: một user một wallet; available_balance là projection cập nhật trong transaction.

import { amountFromDb, isoFromDb } from "./rows.ts";
import { isNonNegativeVnd } from "../../domain/money.ts";

export interface WalletRow {
  id: number;
  userId: number;
  initialized: boolean;
  initialBalanceVnd: number;
  availableBalanceVnd: number;
  currency: string;
  updatedAt: string;
}

export interface WalletScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface WalletDbRow {
  id: number | string;
  user_id: number | string;
  initialized: number;
  initial_balance_vnd: number | string;
  available_balance_vnd: number | string;
  currency: string;
  updated_at: Date;
}

export function mapWalletRow(row: WalletDbRow): WalletRow {
  return {
    id: amountFromDb(row.id),
    userId: amountFromDb(row.user_id),
    initialized: row.initialized === 1,
    initialBalanceVnd: amountFromDb(row.initial_balance_vnd),
    availableBalanceVnd: amountFromDb(row.available_balance_vnd),
    currency: row.currency,
    updatedAt: isoFromDb(row.updated_at),
  };
}

const WALLET_COLUMNS = "id, user_id, initialized, initial_balance_vnd, available_balance_vnd, currency, updated_at";

export async function findWalletByUserId(db: WalletScalar, userId: number): Promise<WalletRow | null> {
  const [rows] = (await db.query(`SELECT ${WALLET_COLUMNS} FROM wallet_accounts WHERE user_id = ?`, [userId])) as [
    WalletDbRow[],
    unknown,
  ];
  const row = rows[0];
  return row === undefined ? null : mapWalletRow(row);
}

/** Lock row wallet cho mutation (payment/savings/correction) — bắt buộc FOR UPDATE. */
export async function lockWalletForUpdate(db: WalletScalar, userId: number): Promise<WalletRow | null> {
  const [rows] = (await db.query(
    `SELECT ${WALLET_COLUMNS} FROM wallet_accounts WHERE user_id = ? FOR UPDATE`,
    [userId],
  )) as [WalletDbRow[], unknown];
  const row = rows[0];
  return row === undefined ? null : mapWalletRow(row);
}

/** Tạo wallet + savings baseline atomic (service điều phối transaction). */
export async function insertWallet(
  db: WalletScalar,
  userId: number,
  initialBalanceVnd: number,
  idempotencyId: number,
): Promise<number> {
  if (!isNonNegativeVnd(initialBalanceVnd)) throw new Error("invalid wallet balance");
  const [result] = (await db.query(
    `INSERT INTO wallet_accounts (user_id, initialized, initial_balance_vnd, available_balance_vnd, currency, idempotency_id)
     VALUES (?, 1, ?, ?, 'VND', ?)`,
    [userId, initialBalanceVnd, initialBalanceVnd, idempotencyId],
  )) as [{ insertId: number | string }, unknown];
  return Number(result.insertId);
}
