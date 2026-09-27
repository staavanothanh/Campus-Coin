import type { User } from '../features/auth/auth.api.js';

export type Locale = 'vi' | 'en';
export type Theme = 'light' | 'dark';
export type Screen = 'dashboard' | 'transactions' | 'savings' | 'reports' | 'admin' | 'settings' | 'help';
export type MoneyVndWire = number | string;

export type AuthenticatedSession = { user: User; csrfToken: string };
export type Session = AuthenticatedSession & { googleLinked: boolean | null };
export type Category = {
  id: string;
  name: { en: string; vi: string };
  appliesTo: 'income' | 'payment';
  status: 'active' | 'disabled' | 'retired';
  isDefault: boolean;
};
export type Transaction = {
  id: string;
  type: 'income' | 'payment';
  amountVnd: MoneyVndWire;
  categoryId: string;
  occurredAt: string;
  description?: string | null;
};
export type Dashboard = {
  wallet: { availableBalanceVnd: MoneyVndWire } | null;
  savings: { balanceVnd: MoneyVndWire } | null;
  currentMonth: { month: string; totalIncomeVnd: MoneyVndWire; totalPaymentVnd: MoneyVndWire } | null;
  recentTransactions: Transaction[];
};
export type Savings = { balanceVnd: MoneyVndWire; currency: 'VND'; updatedAt: string };
export type SavingsTransfer = { id: string; direction: 'deposit' | 'withdraw'; amountVnd: MoneyVndWire; note: string | null; createdAt: string };
export type MonthlyReport = {
  month: string;
  openingWalletBalanceVnd: number;
  totalIncomeVnd: number;
  totalPaymentVnd: number;
  closingWalletBalanceVnd: number;
  categoryBreakdown: Array<{ categoryId: string; amountVnd: number }>;
};
export type Budget = { categoryId: string; month: string; limitVnd: number; usedVnd: number; isOverrun: boolean };
export type Issue = { id: string; title: string; description: string; status: 'open' | 'in_triage' | 'resolved' | 'closed'; priority: 'P0' | 'P1' | 'P2'; createdAt: string };
export type AuditEvent = { id: string | number; action: string; outcome: string; createdAt: string };
export type PageMeta = { cursor: string | null; hasNext: boolean };
export type ApiErrorPayload = { code?: string; message?: string; details?: Array<{ field?: string; code: string; message: string }> };

export type Copy = {
  greeting: string; overview: string; thisMonth: string; balance: string; income: string; spending: string;
  savings: string; recent: string; dashboard: string; signInDescription: string; loading: string;
  unavailable: string; retry: string; noData: string; signOut: string; signOutFailed: string;
  addIncome: string; addPayment: string; addTransaction: string; amount: string; category: string; description: string;
  validationError: string; requestFailed: string; sessionExpired: string; forbidden: string;
  submit: string; submitPending: string; submitSuccess: string; primaryNavigation: string;
  personal: string; language: string; appearance: string; close: string; menu: string;
  initializeWallet: string; openingBalance: string; initializePending: string;
  initializeSuccess: string; categoryLoadFailed: string; noCategories: string; selectCategory: string; recentDescription: string; refreshFailed: string;
  suggestCategory: string; suggestingCategory: string; suggestionFailed: string; suggestionUnavailable: string;
  suggestionReady: string; suggestionUse: string; suggestionConfirm: string; retryTransaction: string;
  workspace: string; more: string; transactions: string; goals: string; reports: string; admin: string;
  settings: string; help: string; personalAccount: string; seeAll: string; searchTransactions: string;
  filteredNet: string; all: string; loadMoreTransactions: string; loadMore: string; deposit: string;
  withdraw: string; transferNote: string; savingsHistory: string; month: string; netSavings: string;
  categoryBreakdown: string; budget: string; budgetLimit: string; spent: string; progress: string;
  status: string; action: string; noWalletForSavings: string; budgetSaved: string; settingsSaved: string;
  displayName: string; role: string; userId: string; accountEmail: string; googleLinked: string;
  googleNotLinked: string; themeLight: string; themeDark: string; faqTitle: string; feedbackNotAvailable: string;
};
