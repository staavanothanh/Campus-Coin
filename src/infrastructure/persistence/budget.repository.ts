// Budget: limit theo (user, payment category, month HCMC); overrun = warning, không authorize.

import { amountFromDb } from "./rows.ts";
import { isNonNegativeVnd } from "../../domain/money.ts";

export interface BudgetRow {
  id: number;
  userId: number;
  categoryId: number;
  month: string;
  limitVnd: number;
}

export interface BudgetScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

interface BudgetDbRow {
  id: number | string;
  user_id: number | string;
  category_id: number | string;
  month: string;
  limit_vnd: number | string;
}

const BUDGET_COLUMNS = "id, user_id, category_id, month, limit_vnd";

export async function findBudget(
  db: BudgetScalar,
  userId: number,
  categoryId: number,
  month: string,
): Promise<BudgetRow | null> {
  const [rows] = (await db.query(
    `SELECT ${BUDGET_COLUMNS} FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?`,
    [userId, categoryId, month],
  )) as [BudgetDbRow[], unknown];
  const row = rows[0];
  if (row === undefined) return null;
  return {
    id: amountFromDb(row.id),
    userId: amountFromDb(row.user_id),
    categoryId: amountFromDb(row.category_id),
    month: row.month,
    limitVnd: amountFromDb(row.limit_vnd),
  };
}

/** Upsert: cùng (user, category, month) thì thay limit. */
export async function upsertBudget(
  db: BudgetScalar,
  userId: number,
  categoryId: number,
  month: string,
  limitVnd: number,
  idempotencyId: number,
): Promise<void> {
  if (!isNonNegativeVnd(limitVnd)) throw new Error("invalid budget limit");
  await db.query(
    `INSERT INTO budgets (user_id, category_id, month, limit_vnd, idempotency_id)
     VALUES (?, ?, ?, ?, ?) AS new
     ON DUPLICATE KEY UPDATE
       limit_vnd = new.limit_vnd,
       idempotency_id = new.idempotency_id,
       updated_at = CURRENT_TIMESTAMP(3)`,
    [userId, categoryId, month, limitVnd, idempotencyId],
  );
}

export async function listBudgetsByMonth(db: BudgetScalar, userId: number, month: string): Promise<BudgetRow[]> {
  const [rows] = (await db.query(
    `SELECT ${BUDGET_COLUMNS} FROM budgets WHERE user_id = ? AND month = ? ORDER BY category_id ASC`,
    [userId, month],
  )) as [BudgetDbRow[], unknown];
  return rows.map((row) => ({
    id: amountFromDb(row.id),
    userId: amountFromDb(row.user_id),
    categoryId: amountFromDb(row.category_id),
    month: row.month,
    limitVnd: amountFromDb(row.limit_vnd),
  }));
}
