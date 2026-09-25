// Budget service: limit payment theo (category, month HCMC); warning-only (ADR-0005).

import type { PoolConnection } from "mysql2/promise";
import type { Db } from "../infrastructure/db/pool.ts";
import { withConnection } from "../infrastructure/db/pool.ts";
import { withIdempotentMutation } from "./idempotency.ts";
import { findCategoryById } from "../infrastructure/persistence/category.repository.ts";
import { findBudget, listBudgetsByMonth, upsertBudget, type BudgetRow } from "../infrastructure/persistence/budget.repository.ts";
import { paymentTotalForCategory, paymentTotalsByCategory } from "../infrastructure/persistence/report.repository.ts";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.ts";
import { isMonthKey, monthRangeUtc } from "../domain/period.ts";
import { isNonNegativeVnd } from "../domain/money.ts";
import { categoryTypeMismatch, invalidInput, notFound } from "../domain/errors.ts";
import { toBudget, type BudgetView } from "./map.ts";

export interface UpsertBudgetInput {
  userId: number;
  categoryId: number;
  month: string;
  limitVnd: number;
  idempotencyKey: string;
  requestHash: string;
}

export async function upsertUserBudget(_db: Db, input: UpsertBudgetInput): Promise<BudgetView> {
  if (!isMonthKey(input.month)) throw invalidInput("month must be YYYY-MM");
  if (!isNonNegativeVnd(input.limitVnd)) throw invalidInput("limitVnd must be a non-negative integer VND");
  return withIdempotentMutation({
    userId: input.userId,
    scope: "budget.upsert",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    mutate: async (conn) => {
    const category = await findCategoryById(conn, input.userId, input.categoryId);
    if (category === null) throw notFound();
    if (category.appliesTo !== "payment") throw categoryTypeMismatch();
    await upsertBudget(conn, input.userId, input.categoryId, input.month, input.limitVnd);
    await insertAuditEvent(conn, {
      userId: input.userId,
      actorType: "user",
      actorUserId: input.userId,
      action: "budget.upsert",
      scope: "budget",
      targetId: input.categoryId,
      outcome: "success",
    });
    return readBudgetView(conn, input.userId, input.categoryId, input.month);
    },
  });
}

export async function listMonthBudgets(db: Db, userId: number, month: string): Promise<BudgetView[]> {
  if (!isMonthKey(month)) throw invalidInput("month must be YYYY-MM");
  return withConnection(async (conn) => {
    const budgets = await listBudgetsByMonth(conn, userId, month);
    return Promise.all(budgets.map((b) => budgetWithUsed(conn, userId, b, month)));
  });
}

export interface BudgetSummaryView {
  month: string;
  totalLimitVnd: number;
  totalUsedVnd: number;
  exceededCategoryCount: number;
}

export async function monthBudgetSummary(db: Db, userId: number, month: string): Promise<BudgetSummaryView> {
  if (!isMonthKey(month)) throw invalidInput("month must be YYYY-MM");
  return withConnection(async (conn) => {
    const budgets = await listBudgetsByMonth(conn, userId, month);
    const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc(month);
    const usedByCategory = await paymentTotalsByCategory(conn, userId, startUtcMs, endExclusiveUtcMs);
    let totalLimitVnd = 0;
    let totalUsedVnd = 0;
    let exceeded = 0;
    for (const b of budgets) {
      const usedVnd = usedByCategory.get(b.categoryId) ?? 0;
      totalLimitVnd += b.limitVnd;
      totalUsedVnd += usedVnd;
      if (usedVnd > b.limitVnd) exceeded += 1;
    }
    return { month, totalLimitVnd, totalUsedVnd, exceededCategoryCount: exceeded };
  });
}

async function budgetWithUsed(conn: PoolConnection, userId: number, budget: BudgetRow, month: string): Promise<BudgetView> {
  const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc(month);
  const usedVnd = await paymentTotalForCategory(conn, userId, budget.categoryId, startUtcMs, endExclusiveUtcMs);
  return toBudget({ categoryId: budget.categoryId, month, limitVnd: budget.limitVnd, usedVnd });
}

async function readBudgetView(conn: PoolConnection, userId: number, categoryId: number, month: string): Promise<BudgetView> {
  const budget = await findBudget(conn, userId, categoryId, month);
  if (budget === null) throw new Error("budget row missing after upsert");
  return budgetWithUsed(conn, userId, budget, month);
}
