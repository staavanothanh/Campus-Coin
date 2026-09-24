// Report deterministic theo tháng HCMC, tính từ ledger immutable (không projection).
// Policy "effective": row đóng góp nếu role <> 'reversal' và không bị correction nào
// tham chiếu (reversal/replacement/adjustment). Reversal row tự nó = 0 và loại target.
// → budget_used = tổng payment effective cùng owner/category/tháng (DOMAIN-MODEL §3).

import { amountFromDb } from "./rows.ts";
import { mapLedgerRow, type LedgerDbRow, type LedgerRow } from "./ledger.repository.ts";

export interface ReportScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

/**
 * Hiệu ứng tài khoản (income +, payment −) của toàn bộ ledger effective trước một mốc.
 * Dùng cho opening balance của tháng: opening = initial_balance + delta.
 */
export async function walletDeltaBefore(db: ReportScalar, userId: number, startUtcMs: number): Promise<number> {
  const [rows] = (await db.query(
    `SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_vnd ELSE -t.amount_vnd END), 0) AS delta
     FROM ledger_transactions t
     WHERE t.user_id = ?
       AND t.occurred_at < ?
       AND t.role <> 'reversal'
       AND NOT EXISTS (SELECT 1 FROM ledger_transactions c WHERE c.reference_id = t.id)`,
    [userId, new Date(startUtcMs)],
  )) as [{ delta: number | string }[], unknown];
  return amountFromDb(rows[0]!.delta);
}

export interface MonthTotals {
  incomeTotalVnd: number;
  paymentTotalVnd: number;
}

export async function monthTotals(
  db: ReportScalar,
  userId: number,
  startUtcMs: number,
  endExclusiveUtcMs: number,
): Promise<MonthTotals> {
  const [rows] = (await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_vnd ELSE 0 END), 0) AS income_total,
       COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount_vnd ELSE 0 END), 0) AS payment_total
     FROM ledger_transactions t
     WHERE t.user_id = ?
       AND t.occurred_at >= ? AND t.occurred_at < ?
       AND t.role <> 'reversal'
       AND NOT EXISTS (SELECT 1 FROM ledger_transactions c WHERE c.reference_id = t.id)`,
    [userId, new Date(startUtcMs), new Date(endExclusiveUtcMs)],
  )) as [{ income_total: number | string; payment_total: number | string }[], unknown];
  return {
    incomeTotalVnd: amountFromDb(rows[0]!.income_total),
    paymentTotalVnd: amountFromDb(rows[0]!.payment_total),
  };
}

/** Payment effective theo category trong khoảng — dùng cho budget used + report breakdown. */
export async function paymentTotalsByCategory(
  db: ReportScalar,
  userId: number,
  startUtcMs: number,
  endExclusiveUtcMs: number,
): Promise<Map<number, number>> {
  const [rows] = (await db.query(
    `SELECT t.category_id, COALESCE(SUM(t.amount_vnd), 0) AS total
     FROM ledger_transactions t
     WHERE t.user_id = ?
       AND t.type = 'payment'
       AND t.occurred_at >= ? AND t.occurred_at < ?
       AND t.role <> 'reversal'
       AND NOT EXISTS (SELECT 1 FROM ledger_transactions c WHERE c.reference_id = t.id)
     GROUP BY t.category_id`,
    [userId, new Date(startUtcMs), new Date(endExclusiveUtcMs)],
  )) as [{ category_id: number | string; total: number | string }[], unknown];
  const totals = new Map<number, number>();
  for (const row of rows) {
    totals.set(amountFromDb(row.category_id), amountFromDb(row.total));
  }
  return totals;
}

export async function paymentTotalForCategory(
  db: ReportScalar,
  userId: number,
  categoryId: number,
  startUtcMs: number,
  endExclusiveUtcMs: number,
): Promise<number> {
  const [rows] = (await db.query(
    `SELECT COALESCE(SUM(t.amount_vnd), 0) AS total
     FROM ledger_transactions t
     WHERE t.user_id = ?
       AND t.type = 'payment'
       AND t.category_id = ?
       AND t.occurred_at >= ? AND t.occurred_at < ?
       AND t.role <> 'reversal'
       AND NOT EXISTS (SELECT 1 FROM ledger_transactions c WHERE c.reference_id = t.id)`,
    [userId, categoryId, new Date(startUtcMs), new Date(endExclusiveUtcMs)],
  )) as [{ total: number | string }[], unknown];
  return amountFromDb(rows[0]!.total);
}

/** Recent transactions cho dashboard — keyset DESC, owner scope. */
export async function recentLedgerRows(db: ReportScalar, userId: number, limit: number): Promise<LedgerRow[]> {
  const [rows] = (await db.query(
    `SELECT id, user_id, type, amount_vnd, category_id, occurred_at, role, reference_id, description, reason, created_at
     FROM ledger_transactions
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT ?`,
    [userId, limit],
  )) as [LedgerDbRow[], unknown];
  return rows.map(mapLedgerRow);
}