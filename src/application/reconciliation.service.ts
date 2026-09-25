import type { Db } from "../infrastructure/db/pool.js";
import { loadReconciliationPage, type ReconciliationSnapshot } from "../infrastructure/persistence/reconciliation.repository.js";

const RECONCILIATION_PAGE_SIZE = 250;

export interface ReconciliationResult {
  checkedUsers: number;
  walletMismatches: number;
  savingsMismatches: number;
  isConsistent: boolean;
}

export async function reconcileFinancialProjections(db: Db): Promise<ReconciliationResult> {
  let afterUserId = 0;
  let checkedUsers = 0;
  let walletMismatches = 0;
  let savingsMismatches = 0;

  while (true) {
    const rows = await loadReconciliationPage(db, afterUserId, RECONCILIATION_PAGE_SIZE + 1);
    const hasNext = rows.length > RECONCILIATION_PAGE_SIZE;
    const page = hasNext ? rows.slice(0, RECONCILIATION_PAGE_SIZE) : rows;
    for (const row of page) {
      const userId = exactInteger(row.userId);
      const expectedWallet =
        exactInteger(row.initialBalanceVnd) +
        exactInteger(row.effectiveLedgerDeltaVnd) +
        exactInteger(row.savingsWalletDeltaVnd);
      if (exactInteger(row.availableBalanceVnd) !== expectedWallet) walletMismatches += 1;

      const expectedSavings = exactInteger(row.expectedSavingsBalanceVnd);
      if (row.savingsBalanceVnd === null || exactInteger(row.savingsBalanceVnd) !== expectedSavings) {
        savingsMismatches += 1;
      }
      checkedUsers += 1;
      if (userId > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("database returned an unsafe user identifier during reconciliation");
      }
      afterUserId = Number(userId);
    }
    if (!hasNext) break;
  }

  return {
    checkedUsers,
    walletMismatches,
    savingsMismatches,
    isConsistent: walletMismatches === 0 && savingsMismatches === 0,
  };
}

function exactInteger(value: number | string): bigint {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("database returned an unsafe numeric reconciliation value");
    return BigInt(value);
  }
  // Chỉ log lại wire value khi nó là string số (không PII); MySQL SUM trên UNSIGNED
  // có thể trả DECIMAL dạng "20000.0000" tùy ngữ cảnh query.
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`database returned a non-numeric reconciliation value: ${value}`);
  const [whole, frac] = value.split(".");
  if (frac !== undefined && !/^0+$/.test(frac)) {
    throw new Error(`database returned a non-integer reconciliation value: ${value}`);
  }
  return BigInt(whole!);
}
