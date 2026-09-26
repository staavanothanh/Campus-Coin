// Report deterministic theo tháng HCMC, tính từ ledger immutable (không projection).
// Policy "effective": row đóng góp nếu role <> 'reversal' và không bị correction nào
// tham chiếu (reversal/replacement/adjustment). Reversal row tự nó = 0 và loại target.
// → budget_used = tổng payment effective cùng owner/category/tháng (DOMAIN-MODEL §3).
//
// Antijoin correction LUÔN kèm `c.user_id = t.user_id`: invariant owner-scope bắt buộc
// correction cùng owner với target. Bỏ predicate này khiến MySQL materialize
// DISTINCT reference_id của TOÀN BẢNG (mọi tenant) rồi dò từng row → chi phí cố định
// ~30ms bất kể owner có 1 hay 200.000 row, và dữ liệu tenant khác lọt vào đường tính
// tiền của owner hiện tại. Đo trên 200k row: user 200 row 31.6ms → 0.75ms sau khi scope.

import { amountFromDb, deltaFromDb } from "./rows.ts";
import { mapLedgerRow, type LedgerDbRow, type LedgerRow } from "./ledger.repository.ts";

/** Predicate "row chưa bị correction nào thay thế", scope theo owner của chính row. */
const NOT_CORRECTED = `NOT EXISTS (
      SELECT 1 FROM ledger_transactions c
      WHERE c.user_id = t.user_id AND c.reference_id = t.id
    )`;

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
       AND ${NOT_CORRECTED}`,
    [userId, new Date(startUtcMs)],
  )) as [{ delta: number | string }[], unknown];
  return deltaFromDb(rows[0]!.delta);
}

/** Kiểm tra giới hạn tháng và report trước khi commit một thay đổi ledger. */
export async function ledgerMutationKeepsReportsInRange(
  db: ReportScalar,
  userId: number,
  startUtcMs: number,
  monthKey: string,
  incomeDelta: number,
  paymentDelta: number,
): Promise<boolean> {
  const maxSafe = Number.MAX_SAFE_INTEGER;
  // occurred_at is stored as UTC; adding seven hours groups rows by HCMC business month.
  const [rows] = (await db.query(
    `WITH history AS (
       SELECT COALESCE(SUM(CASE
         WHEN t.type = 'income' THEN CAST(t.amount_vnd AS DECIMAL(65, 0))
         ELSE -CAST(t.amount_vnd AS DECIMAL(65, 0))
       END), 0) AS delta_before
       FROM ledger_transactions t
       WHERE t.user_id = ? AND t.occurred_at < ?
         AND t.role <> 'reversal' AND ${NOT_CORRECTED}
     ), actual_months AS (
       SELECT DATE_FORMAT(DATE_ADD(t.occurred_at, INTERVAL 7 HOUR), '%Y-%m') AS month_key,
         SUM(CASE WHEN t.type = 'income' THEN CAST(t.amount_vnd AS DECIMAL(65, 0)) ELSE 0 END) AS income_total,
         SUM(CASE WHEN t.type = 'payment' THEN CAST(t.amount_vnd AS DECIMAL(65, 0)) ELSE 0 END) AS payment_total,
         SUM(CASE
           WHEN t.type = 'income' THEN CAST(t.amount_vnd AS DECIMAL(65, 0))
           ELSE -CAST(t.amount_vnd AS DECIMAL(65, 0))
         END) AS month_delta
       FROM ledger_transactions t
       WHERE t.user_id = ? AND t.occurred_at >= ?
         AND t.role <> 'reversal' AND ${NOT_CORRECTED}
       GROUP BY month_key
     ), candidate AS (
       SELECT ? AS month_key, ? AS income_delta, ? AS payment_delta
     ), combined_months AS (
       SELECT month_key, income_total, payment_total, month_delta FROM actual_months
       UNION ALL
       SELECT month_key, income_delta, payment_delta, income_delta - payment_delta FROM candidate
     ), monthly_deltas AS (
       SELECT month_key, SUM(income_total) AS income_total, SUM(payment_total) AS payment_total,
         SUM(month_delta) AS month_delta
       FROM combined_months
       GROUP BY month_key
     ), base AS (
       SELECT CAST(wallet.initial_balance_vnd AS DECIMAL(65, 0)) + history.delta_before AS balance
       FROM wallet_accounts wallet
       CROSS JOIN history
       WHERE wallet.user_id = ?
     ), monthly_balances AS (
       SELECT base.balance + COALESCE(SUM(monthly_deltas.month_delta) OVER (
           ORDER BY monthly_deltas.month_key
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ), 0) AS opening_balance,
         base.balance + SUM(monthly_deltas.month_delta) OVER (
           ORDER BY monthly_deltas.month_key
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) AS closing_balance
       FROM monthly_deltas
       CROSS JOIN base
     )
     SELECT (
       NOT EXISTS (
         SELECT 1 FROM monthly_deltas
         WHERE month_key = ? AND (income_total < 0 OR income_total > ? OR payment_total < 0 OR payment_total > ?)
       )
       AND NOT EXISTS (
         SELECT 1 FROM monthly_balances
         WHERE opening_balance < ? OR opening_balance > ?
           OR closing_balance < ? OR closing_balance > ?
       )
     ) AS is_safe`,
    [
      userId,
      new Date(startUtcMs),
      userId,
      new Date(startUtcMs),
      monthKey,
      incomeDelta,
      paymentDelta,
      userId,
      monthKey,
      maxSafe,
      maxSafe,
      -maxSafe,
      maxSafe,
      -maxSafe,
      maxSafe,
    ],
  )) as [{ is_safe: number | string | boolean }[], unknown];
  return Number(rows[0]!.is_safe) === 1;
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
       AND ${NOT_CORRECTED}`,
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
       AND ${NOT_CORRECTED}
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
       AND ${NOT_CORRECTED}`,
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
