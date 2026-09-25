// Ledger service: immutable original + correction append-only, wallet atomic.
// Lock wallet FOR UPDATE; payment chỉ commit khi đủ tiền; không tạo row khi thiếu.

import type { Db } from "../infrastructure/db/pool.js";
import type { PoolConnection } from "mysql2/promise";
import { withIdempotentMutation } from "./idempotency.js";
import {
  findCategoryById,
} from "../infrastructure/persistence/category.repository.js";
import {
  findCorrectionForTarget,
  findTransactionById,
  insertLedgerRow,
  listTransactionsPage,
  type LedgerRow,
} from "../infrastructure/persistence/ledger.repository.js";
import { lockWalletForUpdate } from "../infrastructure/persistence/wallet.repository.js";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.js";
import { findBudget } from "../infrastructure/persistence/budget.repository.js";
import { paymentTotalForCategory } from "../infrastructure/persistence/report.repository.js";
import {
  decodeCursor,
  encodeCursor,
  isPageLimit,
  monthKeyOf,
  monthRangeUtc,
} from "../domain/period.js";
import {
  addSafeIntegers,
  isCorrectionRole,
  isPositiveVnd,
  isTransactionType,
  walletDeltaForCorrection,
  walletDeltaForOriginal,
  type CorrectionRole,
  type TransactionType,
} from "../domain/money.js";
import { readCursorSigningKey } from "../infrastructure/db/env.js";
import {
  categoryDisabled,
  categoryNotFound,
  categoryTypeMismatch,
  correctionNotAllowed,
  correctionTargetNotFound,
  insufficientWalletBalance,
  invalidInput,
  walletNotInitialized,
} from "../domain/errors.js";
import { toTransaction, type TransactionView } from "./map.js";

export interface BudgetWarningView {
  isOverrun: boolean;
  limitVnd: number;
  usedVnd: number;
}

export interface TransactionResult {
  transaction: TransactionView;
  budgetWarning: BudgetWarningView;
}

function parseOccurredAt(value: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw invalidInput("occurredAt must be a valid ISO-8601 instant");
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

async function lockWalletWithCheck(conn: PoolConnection, userId: number): Promise<{ balance: number }> {
  const wallet = await lockWalletForUpdate(conn, userId);
  if (wallet === null) throw walletNotInitialized();
  return { balance: wallet.availableBalanceVnd };
}

async function assertWalletProjection(conn: PoolConnection, userId: number, expectedBalance: number): Promise<void> {
  const wallet = await lockWalletForUpdate(conn, userId);
  if (wallet === null || wallet.availableBalanceVnd !== expectedBalance) {
    throw new Error("wallet projection trigger did not apply the ledger delta");
  }
}

async function validateCategoryForType(
  conn: PoolConnection,
  userId: number,
  categoryId: number,
  type: TransactionType,
): Promise<void> {
  const category = await findCategoryById(conn, userId, categoryId, true);
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
  const occurredAtMs = parseOccurredAt(input.occurredAt);
  return withIdempotentMutation({
    db,
    userId: input.userId,
    scope: "ledger.create",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      const { balance } = await lockWalletWithCheck(conn, input.userId);
      await validateCategoryForType(conn, input.userId, input.categoryId, input.type);
      if (input.type === "payment" && balance < input.amountVnd) throw insufficientWalletBalance();
      const delta = walletDeltaForOriginal(input.type, input.amountVnd);
      const newBalance = addSafeIntegers(balance, delta);
      const ledgerId = await insertLedgerRow(conn, {
        userId: input.userId,
        type: input.type,
        amountVnd: input.amountVnd,
        categoryId: input.categoryId,
        occurredAt: new Date(occurredAtMs),
        role: "original",
        referenceId: null,
        description: input.description,
        reason: null,
        idempotencyId,
      });
      await assertWalletProjection(conn, input.userId, newBalance);
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

export async function listTransactions(
  db: Db,
  userId: number,
  query: ListTransactionsQuery,
): Promise<{ data: TransactionView[]; meta: { cursor: string | null; hasNext: boolean } }> {
  let cursorId: number | null = null;
  if (!isPageLimit(query.limit)) throw invalidInput("limit must be an integer from 1 to 100");
  if (query.cursor !== undefined) {
    const signingKey = readCursorSigningKey();
    try {
      cursorId = decodeCursor(query.cursor, signingKey);
    } catch {
      throw invalidInput("invalid cursor");
    }
  }
  if (query.type !== undefined && !isTransactionType(query.type)) {
    throw invalidInput("invalid type filter");
  }
  let fromUtcMs: number | undefined;
  let toExclusiveUtcMs: number | undefined;
  if (query.from !== undefined) fromUtcMs = parseOccurredAt(query.from);
  if (query.to !== undefined) toExclusiveUtcMs = parseOccurredAt(query.to);
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
    meta: {
      cursor: page.hasNext && last !== undefined ? encodeCursor(last.id, readCursorSigningKey()) : null,
      hasNext: page.hasNext,
    },
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
    db,
    userId: input.userId,
    scope: "ledger.correction",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn, idempotencyId) => {
      // Mutations lock wallet first; then target/category to keep one global order.
      const { balance } = await lockWalletWithCheck(conn, input.userId);
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

      const delta = walletDeltaForCorrection(target.type, input.role, newAmountVnd, target.amountVnd);
      const newBalance = addSafeIntegers(balance, delta);
      if (newBalance < 0) throw insufficientWalletBalance();

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
        reason: input.reason,
        idempotencyId,
      });
      await assertWalletProjection(conn, input.userId, newBalance);
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
