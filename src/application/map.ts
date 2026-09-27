// Map domain row → contract shape (docs/contracts/openapi.yaml).
// Id/amount ra wire dạng string cho id, number cho VND theo contract.

import type { CategoryRow } from "../infrastructure/persistence/category.repository.ts";
import type { LedgerRow } from "../infrastructure/persistence/ledger.repository.ts";
import type { SavingsRow } from "../infrastructure/persistence/savings.repository.ts";
import type { WalletRow } from "../infrastructure/persistence/wallet.repository.ts";

export interface TransactionView {
  id: string;
  type: "income" | "payment";
  amountVnd: number;
  categoryId: string;
  occurredAt: string;
  description: string | null;
  role: "original" | "reversal" | "adjustment" | "replacement";
  referenceId: string | null;
  createdAt: string;
}

export function toTransaction(row: LedgerRow): TransactionView {
  return {
    id: String(row.id),
    type: row.type,
    amountVnd: row.amountVnd,
    categoryId: String(row.categoryId),
    occurredAt: row.occurredAt,
    description: row.description,
    role: row.role,
    referenceId: row.referenceId === null ? null : String(row.referenceId),
    createdAt: row.createdAt,
  };
}

export interface WalletView {
  walletId: string;
  initialized: boolean;
  initialBalanceVnd: number;
  availableBalanceVnd: number;
  currency: "VND";
  updatedAt: string;
}

export function toWallet(row: WalletRow): WalletView {
  return {
    walletId: String(row.id),
    initialized: row.initialized,
    initialBalanceVnd: row.initialBalanceVnd,
    availableBalanceVnd: row.availableBalanceVnd,
    currency: "VND",
    updatedAt: row.updatedAt,
  };
}

export interface SavingsView {
  balanceVnd: number;
  currency: "VND";
  updatedAt: string;
}

export function toSavings(row: SavingsRow): SavingsView {
  return { balanceVnd: row.balanceVnd, currency: "VND", updatedAt: row.updatedAt };
}

export interface CategoryView {
  id: string;
  name: { en: string; vi: string };
  appliesTo: "income" | "payment";
  status: "active" | "disabled" | "retired";
  isDefault: boolean;
}

export function toCategory(row: CategoryRow): CategoryView {
  return {
    id: String(row.id),
    name: { en: row.nameEn, vi: row.nameVi },
    appliesTo: row.appliesTo,
    status: row.status,
    isDefault: row.isDefault,
  };
}

export interface BudgetView {
  categoryId: string;
  month: string;
  limitVnd: number;
  usedVnd: number;
  isOverrun: boolean;
}

export function toBudget(input: { categoryId: number; month: string; limitVnd: number; usedVnd: number }): BudgetView {
  return {
    categoryId: String(input.categoryId),
    month: input.month,
    limitVnd: input.limitVnd,
    usedVnd: input.usedVnd,
    isOverrun: input.usedVnd > input.limitVnd,
  };
}