import type { Db } from "../db/pool.js";

export interface ReconciliationSnapshot {
  userId: number | string;
  initialBalanceVnd: number | string;
  availableBalanceVnd: number | string;
  savingsBalanceVnd: number | string | null;
  effectiveLedgerDeltaVnd: number | string;
  savingsWalletDeltaVnd: number | string;
  expectedSavingsBalanceVnd: number | string;
}

export async function loadReconciliationPage(
  db: Db,
  afterUserId: number,
  limit: number,
): Promise<ReconciliationSnapshot[]> {
  const [rows] = (await db.query(
    `SELECT
       w.user_id AS userId,
       w.initial_balance_vnd AS initialBalanceVnd,
       w.available_balance_vnd AS availableBalanceVnd,
       s.balance_vnd AS savingsBalanceVnd,
       COALESCE((
         SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount_vnd ELSE -t.amount_vnd END)
         FROM ledger_transactions AS t
         WHERE t.user_id = w.user_id
           AND t.role <> 'reversal'
           AND NOT EXISTS (
             SELECT 1 FROM ledger_transactions AS c
             WHERE c.user_id = t.user_id AND c.reference_id = t.id
           )
        ), 0) AS effectiveLedgerDeltaVnd,
       COALESCE((
         SELECT SUM(CASE WHEN st.direction = 'withdraw' THEN st.amount_vnd ELSE -st.amount_vnd END)
         FROM savings_transfers AS st
         WHERE st.user_id = w.user_id
        ), 0) AS savingsWalletDeltaVnd,
       COALESCE((
         SELECT SUM(CASE WHEN st.direction = 'deposit' THEN st.amount_vnd ELSE -st.amount_vnd END)
         FROM savings_transfers AS st
         WHERE st.user_id = w.user_id
        ), 0) AS expectedSavingsBalanceVnd
     FROM wallet_accounts AS w
     LEFT JOIN savings_accounts AS s ON s.user_id = w.user_id
     WHERE w.user_id > ?
     ORDER BY w.user_id ASC
     LIMIT ?`,
    [afterUserId, limit],
  )) as [ReconciliationSnapshot[], unknown];
  return rows;
}
