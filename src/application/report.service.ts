// Report deterministic theo tháng HCMC từ ledger immutable (không projection riêng).
// closing = opening + income − payment trong kỳ; savings không nằm trong report này.

import type { Db } from "../infrastructure/db/pool.ts";
import { withConnection } from "../infrastructure/db/pool.ts";
import { findWalletByUserId } from "../infrastructure/persistence/wallet.repository.ts";
import { findSavingsByUserId } from "../infrastructure/persistence/savings.repository.ts";
import {
  monthTotals,
  paymentTotalsByCategory,
  recentLedgerRows,
  walletDeltaBefore,
} from "../infrastructure/persistence/report.repository.ts";
import { monthRangeUtc, currentMonthKey, isMonthKey } from "../domain/period.ts";
import { addSafeIntegers, subtractSafeIntegers } from "../domain/money.ts";
import { invalidInput, walletNotInitialized } from "../domain/errors.ts";
import { toSavings, toTransaction, toWallet, type SavingsView, type TransactionView, type WalletView } from "./map.ts";

export interface CategoryTotalView {
  categoryId: string;
  amountVnd: number;
}

export interface MonthlyReportView {
  month: string;
  openingWalletBalanceVnd: number;
  totalIncomeVnd: number;
  totalPaymentVnd: number;
  closingWalletBalanceVnd: number;
  categoryBreakdown: CategoryTotalView[];
}

export async function monthlyReport(db: Db, userId: number, month: string): Promise<MonthlyReportView> {
  if (!isMonthKey(month)) throw invalidInput("month must be YYYY-MM");
  const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc(month);
  return withConnection(async (conn) => {
    const wallet = await findWalletByUserId(conn, userId);
    if (wallet === null) throw walletNotInitialized();
    const deltaBefore = await walletDeltaBefore(conn, userId, startUtcMs);
    const opening = addSafeIntegers(wallet.initialBalanceVnd, deltaBefore);
    const totals = await monthTotals(conn, userId, startUtcMs, endExclusiveUtcMs);
    const closing = subtractSafeIntegers(addSafeIntegers(opening, totals.incomeTotalVnd), totals.paymentTotalVnd);
    const breakdown = await paymentTotalsByCategory(conn, userId, startUtcMs, endExclusiveUtcMs);
    return {
      month,
      openingWalletBalanceVnd: opening,
      totalIncomeVnd: totals.incomeTotalVnd,
      totalPaymentVnd: totals.paymentTotalVnd,
      closingWalletBalanceVnd: closing,
      categoryBreakdown: [...breakdown.entries()].map(([categoryId, amountVnd]) => ({
        categoryId: String(categoryId),
        amountVnd,
      })),
    };
  });
}

export interface DashboardView {
  wallet: WalletView | null;
  savings: SavingsView | null;
  currentMonth: MonthlyReportView | null;
  recentTransactions: TransactionView[];
}

export async function dashboard(db: Db, userId: number): Promise<DashboardView> {
  const month = currentMonthKey();
  const [wallet, savings] = await Promise.all([
    findWalletByUserId(db, userId),
    findSavingsByUserId(db, userId),
  ]);
  const currentMonth = wallet === null ? null : await monthlyReport(db, userId, month);
  const recent = await recentLedgerRows(db, userId, 5);
  return {
    wallet: wallet === null ? null : toWallet(wallet),
    savings: savings === null ? null : toSavings(savings),
    currentMonth,
    recentTransactions: recent.map(toTransaction),
  };
}
