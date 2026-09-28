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

export interface CashflowPlan {
  id: string;
  kind: 'obligation' | 'expected_income';
  title: string;
  amountVnd: number;
  categoryId: string | null;
  frequency: 'once' | 'monthly';
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  isActive: boolean;
  createdAt: string;
  disabledAt: string | null;
}

export interface CashflowOccurrence {
  planId: string;
  kind: 'obligation' | 'expected_income';
  title: string;
  amountVnd: number;
  categoryId: string | null;
  dueDate: string;
  reserveInForecast: boolean;
  isActive: boolean;
  reminderStatus: 'date_passed' | 'due_soon' | 'upcoming';
  isDueWithin10Days: boolean;
}

export interface CashflowForecast {
  asOfDate: string;
  days: number;
  endDate: string;
  walletStatus: 'initialized' | 'not_initialized';
  currentWalletBalanceVnd: number | null;
  plannedIncomeVnd: number;
  plannedObligationsVnd: number;
  reservedObligationsVnd: number;
  unreservedObligationsVnd: number;
  projectedWalletBalanceVnd: number | null;
  events: CashflowOccurrence[];
  assumptions: CashflowAssumptionCode[];
}

export interface CashflowReflectionPart {
  plannedVnd: number | null;
  plannedOccurrenceCount: number;
  plannedStatus: 'planned' | 'unplanned';
  recordedVnd: number | null;
  recordedTransactionCount: number;
  recordedStatus: 'recorded' | 'unrecorded';
  recordedMinusPlannedVnd: number | null;
}

export interface CashflowReflection {
  month: string;
  periodStatus: 'ended';
  income: CashflowReflectionPart;
  obligations: CashflowReflectionPart;
  noteCode: 'unrecorded_does_not_mean_zero_activity';
}

export type CashflowAssumptionCode =
  | 'current_recorded_wallet_balance'
  | 'active_user_plans_only'
  | 'same_day_events_visible_but_not_counted'
  | 'declared_income_added_to_projection'
  | 'reserved_obligations_subtracted_only'
  | 'not_bank_balance_or_payment_authorization'
  | 'hypothetical_payment_subtracted_once'
  | 'hypothetical_payment_not_recorded_or_authorized'
  | 'same_date_events_net_at_day_end';

export interface CashflowWhatIf {
  asOfDate: string;
  days: number;
  paymentDate: string;
  hypotheticalPaymentVnd: number;
  baselineProjectedWalletBalanceVnd: number;
  scenarioProjectedWalletBalanceVnd: number;
  baselineProjectedWalletBalanceOnPaymentDateVnd: number;
  scenarioProjectedWalletBalanceOnPaymentDateVnd: number;
  baselineLowestProjectedWalletBalanceVnd: number;
  scenarioLowestProjectedWalletBalanceVnd: number;
  assumptions: CashflowAssumptionCode[];
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

  getCashflowPlans() {
    return api<CashflowPlan[]>('/cashflow/plans');
  },

  createCashflowPlan(input: {
    kind: CashflowPlan['kind'];
    title: string;
    amountVnd: number;
    categoryId: string | null;
    frequency: CashflowPlan['frequency'];
    startsOn: string;
    dueDay: number | null;
    reserveInForecast: boolean;
  }, key: string) {
    return api<CashflowPlan>('/cashflow/plans', input, 'POST', idempotencyHeaders(key));
  },

  updateCashflowPlan(id: string, input: { reserveInForecast?: boolean; isActive?: boolean }, key: string) {
    return api<CashflowPlan>(`/cashflow/plans/${encodeURIComponent(id)}`, input, 'PATCH', idempotencyHeaders(key));
  },

  getCashflowUpcoming(days = 30) {
    return api<CashflowOccurrence[]>(`/cashflow/upcoming?days=${encodeURIComponent(String(days))}`);
  },

  getCashflowForecast(days = 30) {
    return api<CashflowForecast>(`/cashflow/forecast?days=${encodeURIComponent(String(days))}`);
  },

  cashflowWhatIf(input: { amountVnd: number; paymentDate: string; days?: number }) {
    return api<CashflowWhatIf>('/cashflow/what-if', input, 'POST');
  },

  getCashflowReflection(month: string) {
    return api<CashflowReflection>(`/cashflow/reflection?month=${encodeURIComponent(month)}`);
  },
};
