/**
 * Client-side types derived from the OpenAPI contract.
 * Canonical source: docs/contracts/openapi.yaml
 *
 * Amount fields are integer VND (not float, not string).
 * Date-time fields are ISO 8601 strings.
 */

export type Locale = 'vi' | 'en';
export type Theme = 'light' | 'dark';
export type TransactionType = 'income' | 'payment';
export type UserRole = 'user' | 'admin' | 'security';
export type CorrectionRole = 'reversal' | 'adjustment' | 'replacement';
export type CategoryStatus = 'active' | 'disabled' | 'retired';
export type TransferDirection = 'deposit' | 'withdraw';
export type IssueStatus = 'open' | 'in_triage' | 'resolved' | 'closed';
export type IssuePriority = 'P0' | 'P1' | 'P2';
export type Screen = 'dashboard' | 'transactions' | 'savings' | 'reports' | 'admin' | 'settings' | 'help';

// --- Domain entities ---

export interface User {
  id: string;
  displayName: string;
  email: string;
  locale: Locale;
  role: UserRole;
}

export interface Session {
  user: User;
  walletInitialized: boolean;
  csrfToken: string;
}

export interface Wallet {
  walletId: string;
  initialized: boolean;
  initialBalanceVnd: number;
  availableBalanceVnd: number;
  currency: 'VND';
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountVnd: number;
  categoryId: string;
  occurredAt: string;
  description: string | null;
  role: CorrectionRole;
  referenceId: string | null;
  createdAt: string;
}

export interface BudgetWarning {
  isOverrun: boolean;
  limitVnd: number;
  usedVnd: number;
}

export interface TransactionWithWarning {
  transaction: Transaction;
  budgetWarning?: BudgetWarning;
}

export interface Category {
  id: string;
  name: { en: string; vi: string };
  appliesTo: TransactionType;
  status: CategoryStatus;
  isDefault: boolean;
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

export interface CategoryTotal {
  categoryId: string;
  amountVnd: number;
}

export interface MonthlyReport {
  month: string;
  openingWalletBalanceVnd: number;
  totalIncomeVnd: number;
  totalPaymentVnd: number;
  closingWalletBalanceVnd: number;
  categoryBreakdown: CategoryTotal[];
}

export interface Savings {
  balanceVnd: number;
  currency: 'VND';
  updatedAt: string;
}

export interface SavingsTransfer {
  id: string;
  direction: TransferDirection;
  amountVnd: number;
  note: string | null;
  createdAt: string;
}

export interface Dashboard {
  wallet: Wallet;
  savings: Savings;
  currentMonth: MonthlyReport;
  recentTransactions: Transaction[];
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  outcome: string;
  createdAt: string;
}

// --- Pagination ---

export interface PageMeta {
  cursor: string | null;
  hasNext: boolean;
}

// --- API error ---

export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

// --- Request types ---

export interface CreateTransactionRequest {
  type: TransactionType;
  amountVnd: number;
  categoryId: string;
  occurredAt: string;
  description?: string;
  confirmedCategorySuggestion?: boolean;
}

export interface CreateSavingsTransferRequest {
  direction: TransferDirection;
  amountVnd: number;
  note?: string;
}

export interface WalletBaselineRequest {
  initialBalanceVnd: number;
}

export interface UpdatePreferencesRequest {
  displayName?: string;
  locale?: Locale;
}

export interface UpsertBudgetRequest {
  month: string;
  limitVnd: number;
}

export interface CreateIssueRequest {
  title: string;
  description: string;
  category: 'financial_dispute' | 'bug' | 'other';
  relatedTransactionId?: string;
}

export interface UpdateIssueRequest {
  status?: IssueStatus;
  priority?: IssuePriority;
}

export interface CategorySuggestion {
  status: 'suggested' | 'manual' | 'disabled' | 'unavailable';
  categoryId: string | null;
  confidence: number | null;
  reasonCode: string | null;
}
