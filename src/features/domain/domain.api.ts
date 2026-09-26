import { api, requestPage } from '../auth/auth.api';

export type TransactionType = 'income' | 'payment';

export interface Wallet {
  walletId: string;
  initialized: boolean;
  initialBalanceVnd: number;
  availableBalanceVnd: number;
  currency: 'VND';
  updatedAt: string;
}

export interface Category {
  id: string;
  name: { en: string; vi: string };
  appliesTo: TransactionType;
  status: 'active' | 'disabled' | 'retired';
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountVnd: number;
  categoryId: string;
  occurredAt: string;
  description: string | null;
  role: 'original' | 'reversal' | 'adjustment' | 'replacement';
  referenceId: string | null;
  createdAt: string;
}

export interface MonthlyReport {
  month: string;
  openingWalletBalanceVnd: number;
  totalIncomeVnd: number;
  totalPaymentVnd: number;
  closingWalletBalanceVnd: number;
  categoryBreakdown: Array<{ categoryId: string; amountVnd: number }>;
}

export interface Savings {
  balanceVnd: number;
  currency: 'VND';
  updatedAt: string;
}

export interface Dashboard {
  wallet: Wallet | null;
  savings: Savings | null;
  currentMonth: MonthlyReport | null;
  recentTransactions: Transaction[];
}

export interface Budget {
  categoryId: string;
  month: string;
  limitVnd: number;
  usedVnd: number;
  isOverrun: boolean;
}

export interface BudgetSummary {
  month: string;
  totalLimitVnd: number;
  totalUsedVnd: number;
  exceededCategoryCount: number;
}

export interface SavingsTransfer {
  id: string;
  direction: 'deposit' | 'withdraw';
  amountVnd: number;
  note: string | null;
  createdAt: string;
}

function idempotencyHeaders(key: string) {
  return { 'Idempotency-Key': key };
}

export const domainApi = {
  getDashboard() {
    return api<Dashboard>('/reports/dashboard');
  },

  getCategories() {
    return api<Category[]>('/categories');
  },

  initializeWallet(initialBalanceVnd: number, key: string) {
    return api<Wallet>('/wallet/baseline', { initialBalanceVnd }, 'POST', idempotencyHeaders(key));
  },

  createSavingsTransfer(input: { direction: 'deposit' | 'withdraw'; amountVnd: number; note: string }, key: string) {
    return api<SavingsTransfer>('/savings/transfers', input, 'POST', idempotencyHeaders(key));
  },

  createTransaction(input: {
    type: TransactionType;
    amountVnd: number;
    categoryId: string;
    occurredAt: string;
    description: string;
  }, key: string) {
    return api<{ transaction: Transaction; budgetWarning: { isOverrun: boolean; limitVnd: number; usedVnd: number } }>(
      '/ledger/transactions',
      input,
      'POST',
      idempotencyHeaders(key),
    );
  },

  getTransactions(cursor?: string) {
    const search = new URLSearchParams({ limit: '20' });
    if (cursor) search.set('cursor', cursor);
    return requestPage<Transaction>(`/ledger/transactions?${search.toString()}`);
  },

  getMonthlyReport(month: string) {
    const search = new URLSearchParams({ month });
    return api<MonthlyReport>(`/reports/monthly?${search.toString()}`);
  },

  getBudgets(month: string) {
    const search = new URLSearchParams({ month });
    return api<Budget[]>(`/budgets?${search.toString()}`);
  },

  getBudgetSummary(month: string) {
    const search = new URLSearchParams({ month });
    return api<BudgetSummary>(`/budgets/summary?${search.toString()}`);
  },

  upsertBudget(categoryId: string, month: string, limitVnd: number, key: string) {
    return api<Budget>(`/budgets/${encodeURIComponent(categoryId)}`, { month, limitVnd }, 'PUT', idempotencyHeaders(key));
  },
};
