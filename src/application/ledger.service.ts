// Ledger service: immutable original + correction append-only, wallet atomic.
// Lock wallet FOR UPDATE; payment chỉ commit khi đủ tiền; không tạo row khi thiếu.

import type { Db } from "../infrastructure/db/pool.ts";
import type { PoolConnection } from "mysql2/promise";
import { withIdempotentMutation } from "./idempotency.ts";
import {
  findCategoryById,
} from "../infrastructure/persistence/category.repository.ts";
import {
  findCorrectionForTarget,
  findTransactionById,
  insertLedgerRow,
  listFrequentPaymentItems as queryFrequentPaymentItems,
  listTransactionsPage,
  type LedgerRow,
} from "../infrastructure/persistence/ledger.repository.ts";
import { findWalletByUserId, lockWalletForUpdate, updateWalletBalance } from "../infrastructure/persistence/wallet.repository.ts";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.ts";
import { findBudget } from "../infrastructure/persistence/budget.repository.ts";
import {
  ledgerMutationKeepsReportsInRange,
  paymentTotalForCategory,
} from "../infrastructure/persistence/report.repository.ts";
import {
  decodeCursor,
  encodeCursor,
  monthKeyOf,
  monthRangeUtc,
} from "../domain/period.ts";
import {
  isCorrectionRole,
  isNonNegativeVnd,
  isPositiveVnd,
  isTransactionType,
  walletDeltaForCorrection,
  walletDeltaForOriginal,
  type CorrectionRole,
  type TransactionType,
} from "../domain/money.ts";
import {
  categoryDisabled,
  categoryNotFound,
  categoryTypeMismatch,
  correctionNotAllowed,
  correctionTargetNotFound,
  insufficientWalletBalance,
  invalidInput,
  walletNotInitialized,
} from "../domain/errors.ts";
import { toTransaction, type TransactionView } from "./map.ts";

export interface BudgetWarningView {
  isOverrun: boolean;
  limitVnd: number;
  usedVnd: number;
}

export interface TransactionResult {
  transaction: TransactionView;
  budgetWarning: BudgetWarningView;
}

function parseIsoDateTime(value: string, fieldName = "occurredAt"): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|[+-]\d{2}:\d{2})$/.exec(value);
  if (match === null) throw invalidInput(`${fieldName} must be a valid ISO-8601 instant`);

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction, zone] = match;
  if (
    yearText === undefined || monthText === undefined || dayText === undefined ||
    hourText === undefined || minuteText === undefined || secondText === undefined || zone === undefined
  ) {
    throw invalidInput(`${fieldName} must be a valid ISO-8601 instant`);
  }
  if (fraction !== undefined && fraction.length > 3) {
    throw invalidInput(`${fieldName} supports at most three fractional digits`);
  }
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : ([4, 6, 9, 11].includes(month) ? 30 : 31);

  if (
    month < 1 || month > 12 || day < 1 || day > daysInMonth ||
    hour > 23 || minute > 59 || second > 59
  ) {
    throw invalidInput(`${fieldName} must be a valid ISO-8601 instant`);
  }

  if (zone.toUpperCase() !== "Z") {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      throw invalidInput(`${fieldName} must be a valid ISO-8601 instant`);
    }
  }

  const normalized = value.replace("t", "T").replace(/z$/, "Z");
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) throw invalidInput(`${fieldName} must be a valid ISO-8601 instant`);
  const minDateTimeUtcMs = Date.parse("1000-01-01T00:00:00.000Z");
  const maxDateTimeUtcMs = Date.parse("9999-12-31T23:59:59.499Z");
  if (ms < minDateTimeUtcMs || ms > maxDateTimeUtcMs) {
    throw invalidInput(`${fieldName} is outside the supported calendar range`);
  }
  return ms;
}

function parseOccurredAt(value: string): number {
  const ms = parseIsoDateTime(value);
  if (ms > Date.now()) throw invalidInput("occurredAt cannot be in the future");
  return ms;
}

/** Budget warning / used cho một payment category trong tháng HCMC — đọc sau insert. */
export async function computeBudgetWarning(
  conn: PoolConnection,
  userId: number,
  categoryId: number,
  occurredAtMs: number,
): Promise<BudgetWarningView> {
  const month = monthKeyOf(occurredAtMs);
  const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc(month);
  const [budget, paymentTotal] = await Promise.all([
    findBudget(conn, userId, categoryId, month),
    paymentTotalForCategory(conn, userId, categoryId, startUtcMs, endExclusiveUtcMs),
  ]);
  if (budget === null) {
    return { isOverrun: false, limitVnd: 0, usedVnd: paymentTotal };
  }
  return { isOverrun: paymentTotal > budget.limitVnd, limitVnd: budget.limitVnd, usedVnd: paymentTotal };
}

async function ensureLedgerReportRange(
  conn: PoolConnection,
  userId: number,
  occurredAtMs: number,
  incomeDelta: number,
  paymentDelta: number,
): Promise<void> {
  const month = monthKeyOf(occurredAtMs);
  const { startUtcMs } = monthRangeUtc(month);
  if (!(await ledgerMutationKeepsReportsInRange(conn, userId, startUtcMs, month, incomeDelta, paymentDelta))) {
    throw invalidInput("monthly totals or report balances are outside the supported range");
  }
}

async function lockWalletWithCheck(conn: PoolConnection, userId: number): Promise<{ balance: number }> {
  const wallet = await lockWalletForUpdate(conn, userId);
  if (wallet === null) throw walletNotInitialized();
  return { balance: wallet.availableBalanceVnd };
}

async function reconcileWalletProjection(
  conn: PoolConnection,
  userId: number,
  previousBalance: number,
  expectedBalance: number,
): Promise<void> {
  const wallet = await findWalletByUserId(conn, userId);
  if (wallet === null) throw new Error("wallet missing after ledger insert");
  if (wallet.availableBalanceVnd === expectedBalance) return;
  if (wallet.availableBalanceVnd !== previousBalance) {
    throw new Error("wallet projection mismatch after ledger insert");
  }
  await updateWalletBalance(conn, userId, expectedBalance);
}

async function validateCategoryForType(
  conn: PoolConnection,
  userId: number,
  categoryId: number,
  type: TransactionType,
): Promise<void> {
  const category = await findCategoryById(conn, userId, categoryId);
  if (category === null) throw categoryNotFound();
  if (category.appliesTo !== type) throw categoryTypeMismatch();
  if (category.status !== "active") throw categoryDisabled();
}

export interface CreateTransactionInput {
  userId: number;
  type: TransactionType;
  amountVnd: number;
  categoryId: number;
  occurredAt: string;
  description: string | null;
  itemName?: string | null;
  idempotencyKey: string;
  requestHash: string;
}

export async function createTransaction(
  db: Db,
  input: CreateTransactionInput,
): Promise<TransactionResult> {
  if (!isTransactionType(input.type)) throw invalidInput("type must be income|payment");
  if (!isPositiveVnd(input.amountVnd)) throw invalidInput("amountVnd must be a positive integer VND");
  if (input.description !== null && input.description.length > 500) {
    throw invalidInput("description too long (max 500)");
  }
  const itemName = input.itemName?.trim() || null;
  if (itemName !== null && (input.type !== "payment" || itemName.length > 120)) {
    throw invalidInput("itemName is only allowed for payments and must be at most 120 characters");
  }
  const occurredAtMs = parseOccurredAt(input.occurredAt);
  return withIdempotentMutation({
    userId: input.userId,
    scope: "ledger.create",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      const { balance } = await lockWalletWithCheck(conn, input.userId);
      await validateCategoryForType(conn, input.userId, input.categoryId, input.type);
      if (input.type === "payment" && balance < input.amountVnd) throw insufficientWalletBalance();
      const delta = walletDeltaForOriginal(input.type, input.amountVnd);
      const newBalance = balance + delta;
      if (!isNonNegativeVnd(newBalance)) {
        throw invalidInput("resulting wallet balance is outside the supported range");
      }
      await ensureLedgerReportRange(
        conn,
        input.userId,
        occurredAtMs,
        input.type === "income" ? input.amountVnd : 0,
        input.type === "payment" ? input.amountVnd : 0,
      );
      const ledgerId = await insertLedgerRow(conn, {
        userId: input.userId,
        type: input.type,
        amountVnd: input.amountVnd,
        categoryId: input.categoryId,
        occurredAt: new Date(occurredAtMs),
        role: "original",
        referenceId: null,
        description: input.description,
        itemName,
        reason: null,
        idempotencyId,
      });
      await reconcileWalletProjection(conn, input.userId, balance, newBalance);
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "ledger.create",
        scope: "ledger",
        targetId: ledgerId,
        outcome: "success",
      });
      const row = await findTransactionById(conn, input.userId, ledgerId);
      if (row === null) throw new Error("ledger row missing after insert");
      const budgetWarning = await computeBudgetWarning(conn, input.userId, input.categoryId, occurredAtMs);
      return { transaction: toTransaction(row), budgetWarning };
    },
  });
}

export async function getTransaction(db: Db, userId: number, transactionId: number): Promise<TransactionView | null> {
  const row = await findTransactionById(db, userId, transactionId);
  return row === null ? null : toTransaction(row);
}

export interface ListTransactionsQuery {
  cursor?: string;
  limit: number;
  type?: TransactionType;
  categoryId?: number;
  from?: string;
  to?: string;
}

export interface FrequentPaymentItemView {
  itemName: string;
  frequency: number;
  lastAmountVnd: number;
  lastOccurredAt: string;
  previousOccurredAt: string | null;
}

/** Trả tối đa 10 mặt hàng payment thường gặp của owner hiện tại. */
export async function listFrequentPaymentItems(
  db: Db,
  userId: number,
): Promise<{ asOf: string; items: FrequentPaymentItemView[] }> {
  const items = await queryFrequentPaymentItems(db, userId, 10);
  return { asOf: new Date().toISOString(), items };
}

export async function listTransactions(
  db: Db,
  userId: number,
  query: ListTransactionsQuery,
): Promise<{ data: TransactionView[]; meta: { cursor: string | null; hasNext: boolean } }> {
  let cursorId: number | null = null;
  if (query.cursor !== undefined) {
    try {
      cursorId = decodeCursor(query.cursor);
    } catch {
      throw invalidInput("invalid cursor");
    }
  }
  if (query.type !== undefined && !isTransactionType(query.type)) {
    throw invalidInput("invalid type filter");
  }
  let fromUtcMs: number | undefined;
  let toExclusiveUtcMs: number | undefined;
  if (query.from !== undefined) fromUtcMs = parseIsoDateTime(query.from, "from");
  if (query.to !== undefined) toExclusiveUtcMs = parseIsoDateTime(query.to, "to");
  const repoQuery: {
    cursorId: number | null;
    limit: number;
    type?: TransactionType;
    categoryId?: number;
    fromUtcMs?: number;
    toExclusiveUtcMs?: number;
  } = { cursorId, limit: query.limit };
  if (query.type !== undefined) repoQuery.type = query.type;
  if (query.categoryId !== undefined) repoQuery.categoryId = query.categoryId;
  if (fromUtcMs !== undefined) repoQuery.fromUtcMs = fromUtcMs;
  if (toExclusiveUtcMs !== undefined) repoQuery.toExclusiveUtcMs = toExclusiveUtcMs;
  const page = await listTransactionsPage(db, userId, repoQuery);
  const last = page.rows[page.rows.length - 1];
  return {
    data: page.rows.map(toTransaction),
    meta: { cursor: page.hasNext && last !== undefined ? encodeCursor(last.id) : null, hasNext: page.hasNext },
  };
}

export interface CreateCorrectionInput {
  userId: number;
  targetId: number;
  role: CorrectionRole;
  reason: string;
  newAmountVnd: number | null;
  newCategoryId: number | null;
  idempotencyKey: string;
  requestHash: string;
}

export async function createCorrection(db: Db, input: CreateCorrectionInput): Promise<TransactionResult> {
  if (!isCorrectionRole(input.role)) throw invalidInput("correctionRole must be reversal|adjustment|replacement");
  if (input.reason.length === 0 || input.reason.length > 1000) {
    throw invalidInput("reason required (max 1000)");
  }
  if (input.role !== "reversal") {
    if (input.newAmountVnd === null || !isPositiveVnd(input.newAmountVnd)) {
      throw invalidInput("newAmountVnd required for adjustment/replacement");
    }
  }
  return withIdempotentMutation({
    userId: input.userId,
    scope: "ledger.correction",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      // Khóa target để serial hóa correction đồng thời trên cùng một row.
      const target = await findTransactionById(conn, input.userId, input.targetId, true);
      if (target === null) throw correctionTargetNotFound();
      if (target.role !== "original") throw correctionNotAllowed("only original transactions can be corrected");
      const existing = await findCorrectionForTarget(conn, input.userId, input.targetId);
      if (existing !== null) throw correctionNotAllowed("target already corrected");

      let newAmountVnd: number;
      if (input.role === "reversal") {
        newAmountVnd = target.amountVnd;
      } else {
        // Đã validate ở đầu hàm: adjustment/replacement bắt buộc có newAmountVnd.
        if (input.newAmountVnd === null || !isPositiveVnd(input.newAmountVnd)) {
          throw invalidInput("newAmountVnd required for adjustment/replacement");
        }
        newAmountVnd = input.newAmountVnd;
      }
      const newCategoryId =
        input.role === "replacement" && input.newCategoryId !== null
          ? input.newCategoryId
          : target.categoryId;
      await validateCategoryForType(conn, input.userId, newCategoryId, target.type);

      const { balance } = await lockWalletWithCheck(conn, input.userId);
      const delta = walletDeltaForCorrection(target.type, input.role, newAmountVnd, target.amountVnd);
      const newBalance = balance + delta;
      if (newBalance < 0) throw insufficientWalletBalance();
      if (!isNonNegativeVnd(newBalance)) {
        throw invalidInput("resulting wallet balance is outside the supported range");
      }
      const correctionAmountDelta = (input.role === "reversal" ? 0 : newAmountVnd) - target.amountVnd;
      await ensureLedgerReportRange(
        conn,
        input.userId,
        Date.parse(target.occurredAt),
        target.type === "income" ? correctionAmountDelta : 0,
        target.type === "payment" ? correctionAmountDelta : 0,
      );

      // Correction ghi vào cùng kỳ của target (occurred_at = target's) — default pending Team Leader
      // (API-REVIEW: correction timestamp/report semantics chưa chốt; không tự đổi kỳ).
      const correctionId = await insertLedgerRow(conn, {
        userId: input.userId,
        type: target.type,
        amountVnd: newAmountVnd,
        categoryId: newCategoryId,
        occurredAt: new Date(Date.parse(target.occurredAt)),
        role: input.role,
        referenceId: input.targetId,
        description: null,
        itemName: null,
        reason: input.reason,
        idempotencyId,
      });
      await reconcileWalletProjection(conn, input.userId, balance, newBalance);
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "ledger.correction",
        scope: "ledger",
        targetId: correctionId,
        outcome: "success",
        reason: input.reason,
      });
      const row = await findTransactionById(conn, input.userId, correctionId);
      if (row === null) throw new Error("correction row missing after insert");
      const budgetWarning = await computeBudgetWarning(conn, input.userId, newCategoryId, Date.parse(target.occurredAt));
      return { transaction: toTransaction(row), budgetWarning };
    },
  });
}
