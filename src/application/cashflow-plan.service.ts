import type { PoolConnection } from "mysql2/promise";
import type { Db } from "../infrastructure/db/pool.ts";
import { withConnection } from "../infrastructure/db/pool.ts";
import { withIdempotentMutation } from "./idempotency.ts";
import { findCategoryById } from "../infrastructure/persistence/category.repository.ts";
import {
  countCashflowPlans,
  findCashflowPlan,
  insertCashflowPlanStatusEvent,
  insertCashflowPlan,
  listCashflowPlanStatusEventsForMonth,
  listCashflowPlans,
  lockCashflowPlanOwner,
  updateCashflowPlanOptions as persistCashflowPlanOptions,
  type CashflowPlanRow,
} from "../infrastructure/persistence/cashflow-plan.repository.ts";
import { findWalletByUserId } from "../infrastructure/persistence/wallet.repository.ts";
import { monthCashflowActuals } from "../infrastructure/persistence/report.repository.ts";
import { insertAuditEvent } from "../infrastructure/persistence/audit.repository.ts";
import {
  addDateOnlyDays,
  addSafeVnd,
  dateOnlyFromUtcMs,
  eventsAfterSnapshotDate,
  isDateOnly,
  occurrencesBetween,
  planWasActiveOnDate,
  plannedDatesForMonth,
  simulateWhatIf,
  type CashflowOccurrence,
  type CashflowPlanFrequency,
  type CashflowPlanKind,
  type CashflowPlanSchedule,
} from "../domain/cashflow-plan.ts";
import { currentMonthKey, isMonthKey } from "../domain/period.ts";
import { isPositiveVnd } from "../domain/money.ts";
import { invalidInput, notFound, walletNotInitialized } from "../domain/errors.ts";

const MAX_PLAN_COUNT = 200;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const REMINDER_DAYS = 10;

export interface CreateCashflowPlanInput {
  userId: number;
  kind: CashflowPlanKind;
  title: string;
  amountVnd: number;
  categoryId: number | null;
  frequency: CashflowPlanFrequency;
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  idempotencyKey: string;
  requestHash: string;
}

export interface CashflowPlanView {
  id: string;
  kind: CashflowPlanKind;
  title: string;
  amountVnd: number;
  categoryId: string | null;
  frequency: CashflowPlanFrequency;
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  isActive: boolean;
  createdAt: string;
  disabledAt: string | null;
}

export interface CashflowOccurrenceView extends Omit<CashflowOccurrence, "planId" | "categoryId"> {
  planId: string;
  categoryId: string | null;
  reminderStatus: "date_passed" | "due_soon" | "upcoming";
  isDueWithin10Days: boolean;
}

export interface CashflowForecastView {
  asOfDate: string;
  days: number;
  endDate: string;
  walletStatus: "initialized" | "not_initialized";
  currentWalletBalanceVnd: number | null;
  plannedIncomeVnd: number;
  plannedObligationsVnd: number;
  reservedObligationsVnd: number;
  unreservedObligationsVnd: number;
  projectedWalletBalanceVnd: number | null;
  events: CashflowOccurrenceView[];
  assumptions: string[];
}

export interface CashflowReflectionView {
  month: string;
  periodStatus: "ended";
  income: CashflowReflectionPart;
  obligations: CashflowReflectionPart;
  noteCode: "unrecorded_does_not_mean_zero_activity";
}

export interface CashflowReflectionPart {
  plannedVnd: number | null;
  plannedOccurrenceCount: number;
  plannedStatus: "planned" | "unplanned";
  recordedVnd: number | null;
  recordedTransactionCount: number;
  recordedStatus: "recorded" | "unrecorded";
  recordedMinusPlannedVnd: number | null;
}

export interface WhatIfView {
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
  assumptions: string[];
}

export function forecastDays(value: unknown): number {
  if (value === undefined || value === null) return DEFAULT_DAYS;
  const days = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(days) || days < 1 || days > MAX_DAYS) {
    throw invalidInput(`days must be an integer between 1 and ${MAX_DAYS}`);
  }
  return days;
}

export async function createCashflowPlan(_db: Db, input: CreateCashflowPlanInput): Promise<CashflowPlanView> {
  const normalized = validateCreateInput(input);
  return withIdempotentMutation({
    userId: input.userId,
    scope: "cashflow.plan.create",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    lockBeforeClaim: async (conn) => {
      if (!(await lockCashflowPlanOwner(conn, input.userId))) throw notFound();
    },
    mutate: async (conn) => {
      if (await countCashflowPlans(conn, input.userId) >= MAX_PLAN_COUNT) {
        throw invalidInput(`A user can keep up to ${MAX_PLAN_COUNT} cashflow plans`);
      }
      await validatePlanCategory(conn, input.userId, normalized.kind, normalized.categoryId);
      const planId = await insertCashflowPlan(conn, input.userId, normalized);
      await insertCashflowPlanStatusEvent(conn, input.userId, planId, true);
      const row = await findCashflowPlan(conn, input.userId, planId);
      if (row === null) throw new Error("cashflow plan missing after insert");
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: "cashflow.plan.create",
        scope: "cashflow_plan",
        targetId: planId,
        outcome: "success",
      });
      return toCashflowPlanView(row);
    },
  });
}

export async function updateCashflowPlanOptions(
  _db: Db,
  input: {
    userId: number;
    planId: number;
    reserveInForecast?: boolean;
    isActive?: boolean;
    idempotencyKey: string;
    requestHash: string;
  },
): Promise<CashflowPlanView> {
  if (input.reserveInForecast === undefined && input.isActive === undefined) {
    throw invalidInput("At least one plan option must be supplied");
  }
  return withIdempotentMutation({
    userId: input.userId,
    scope: "cashflow.plan.update",
    idempotencyKey: input.idempotencyKey,
    requestHash: input.requestHash,
    lockBeforeClaim: async (conn) => {
      if (!(await lockCashflowPlanOwner(conn, input.userId))) throw notFound();
      const existing = await findCashflowPlan(conn, input.userId, input.planId);
      if (existing === null) throw notFound();
      if (existing.isActive && input.isActive === true) {
        throw invalidInput("This cashflow plan is already active");
      }
      if (!existing.isActive && input.isActive !== true) {
        throw invalidInput("A disabled cashflow plan can only be changed by reactivating it");
      }
      if (existing.kind === "expected_income" && input.reserveInForecast === true) {
        throw invalidInput("Expected income cannot reserve wallet balance");
      }
    },
    mutate: async (conn) => {
      const existing = await findCashflowPlan(conn, input.userId, input.planId);
      if (existing === null) throw notFound();
      await persistCashflowPlanOptions(conn, input.userId, input.planId, {
        ...(input.reserveInForecast === undefined ? {} : { reserveInForecast: input.reserveInForecast }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      });
      if (input.isActive !== undefined && input.isActive !== existing.isActive) {
        await insertCashflowPlanStatusEvent(conn, input.userId, input.planId, input.isActive);
      }
      const row = await findCashflowPlan(conn, input.userId, input.planId);
      if (row === null) throw notFound();
      await insertAuditEvent(conn, {
        userId: input.userId,
        actorType: "user",
        actorUserId: input.userId,
        action: input.isActive === false
          ? "cashflow.plan.disable"
          : input.isActive === true
            ? "cashflow.plan.enable"
            : "cashflow.plan.update",
        scope: "cashflow_plan",
        targetId: input.planId,
        outcome: "success",
      });
      return toCashflowPlanView(row);
    },
  });
}

export async function listOwnerCashflowPlans(db: Db, userId: number): Promise<CashflowPlanView[]> {
  return withConnection(async (conn) => {
    const rows = await listCashflowPlans(conn, userId, true);
    if (rows.length > MAX_PLAN_COUNT) throw new Error("cashflow plan list exceeded the supported limit");
    return rows.map(toCashflowPlanView);
  });
}

export async function cashflowUpcoming(
  db: Db,
  userId: number,
  days: number = DEFAULT_DAYS,
  nowMs = Date.now(),
): Promise<CashflowOccurrenceView[]> {
  const boundedDays = forecastDays(days);
  const today = dateOnlyFromUtcMs(nowMs);
  const endDate = addDateOnlyDays(today, boundedDays - 1);
  const reminderStart = addDateOnlyDays(today, -REMINDER_DAYS);
  return withConnection(async (conn) => {
    const rows = await listCashflowPlans(conn, userId, false);
    return toOccurrenceViews(rows, reminderStart, endDate, today);
  });
}

export async function cashflowForecast(
  db: Db,
  userId: number,
  days: number = DEFAULT_DAYS,
  nowMs = Date.now(),
): Promise<CashflowForecastView> {
  const boundedDays = forecastDays(days);
  const today = dateOnlyFromUtcMs(nowMs);
  const endDate = addDateOnlyDays(today, boundedDays - 1);
  return withConnection(async (conn) => {
    const [rows, wallet] = await Promise.all([
      listCashflowPlans(conn, userId, false),
      findWalletByUserId(conn, userId),
    ]);
    const plans = rows.map(row => toSchedule(row));
    const events = occurrencesBetween(plans, today, endDate);
    const totals = sumForecastEvents(eventsAfterSnapshotDate(events, today));
    const currentBalance = wallet?.initialized ? wallet.availableBalanceVnd : null;
    const projectedBalance = currentBalance === null
      ? null
      : addSafeVnd(addSafeVnd(currentBalance, totals.plannedIncomeVnd), -totals.reservedObligationsVnd);
    return {
      asOfDate: today,
      days: boundedDays,
      endDate,
      walletStatus: currentBalance === null ? "not_initialized" : "initialized",
      currentWalletBalanceVnd: currentBalance,
      plannedIncomeVnd: totals.plannedIncomeVnd,
      plannedObligationsVnd: totals.plannedObligationsVnd,
      reservedObligationsVnd: totals.reservedObligationsVnd,
      unreservedObligationsVnd: totals.unreservedObligationsVnd,
      projectedWalletBalanceVnd: projectedBalance,
      events: toOccurrenceViews(rows, today, endDate, today),
      assumptions: [
        "current_recorded_wallet_balance",
        "active_user_plans_only",
        "same_day_events_visible_but_not_counted",
        "declared_income_added_to_projection",
        "reserved_obligations_subtracted_only",
        "not_bank_balance_or_payment_authorization",
      ],
    };
  });
}

export async function cashflowWhatIf(
  db: Db,
  userId: number,
  input: { amountVnd: number; paymentDate: string; days?: number },
  nowMs = Date.now(),
): Promise<WhatIfView> {
  if (!isPositiveVnd(input.amountVnd)) throw invalidInput("amountVnd must be a positive integer VND");
  if (!isDateOnly(input.paymentDate)) throw invalidInput("paymentDate must be YYYY-MM-DD");
  const days = forecastDays(input.days);
  const today = dateOnlyFromUtcMs(nowMs);
  const endDate = addDateOnlyDays(today, days - 1);
  if (input.paymentDate < today || input.paymentDate > endDate) {
    throw invalidInput("paymentDate must be inside the selected forecast period");
  }
  const forecast = await cashflowForecast(db, userId, days, nowMs);
  if (forecast.currentWalletBalanceVnd === null || forecast.projectedWalletBalanceVnd === null) {
    throw walletNotInitialized();
  }
  const projection = simulateWhatIf(
    forecast.currentWalletBalanceVnd,
    today,
    days,
    eventsAfterSnapshotDate(forecast.events, today).map((event) => ({
      ...event,
      planId: Number(event.planId),
      categoryId: event.categoryId === null ? null : Number(event.categoryId),
    })),
    input.paymentDate,
    input.amountVnd,
  );
  return {
    asOfDate: today,
    days,
    paymentDate: input.paymentDate,
    hypotheticalPaymentVnd: input.amountVnd,
    baselineProjectedWalletBalanceVnd: projection.baselineEndVnd,
    scenarioProjectedWalletBalanceVnd: projection.scenarioEndVnd,
    baselineProjectedWalletBalanceOnPaymentDateVnd: projection.baselineAtPaymentDateVnd,
    scenarioProjectedWalletBalanceOnPaymentDateVnd: projection.scenarioAtPaymentDateVnd,
    baselineLowestProjectedWalletBalanceVnd: projection.baselineLowestVnd,
    scenarioLowestProjectedWalletBalanceVnd: projection.scenarioLowestVnd,
    assumptions: [
      ...forecast.assumptions,
      "hypothetical_payment_subtracted_once",
      "hypothetical_payment_not_recorded_or_authorized",
      "same_date_events_net_at_day_end",
    ],
  };
}

export async function cashflowMonthReflection(
  db: Db,
  userId: number,
  month: string,
  nowMs = Date.now(),
): Promise<CashflowReflectionView> {
  if (!isMonthKey(month)) throw invalidInput("month must be YYYY-MM");
  if (month >= currentMonthKey(nowMs)) throw invalidInput("Reflection is only available after the month has ended");
  return withConnection(async (conn) => {
    const [rows, actuals] = await Promise.all([
      listCashflowPlans(conn, userId, true),
      monthCashflowActuals(conn, userId, month),
    ]);
    if (rows.length > MAX_PLAN_COUNT) throw new Error("cashflow plan list exceeded the supported limit");
    const statusEvents = await listCashflowPlanStatusEventsForMonth(
      conn,
      userId,
      rows.map(row => row.id),
      month,
    );
    const eventsByPlan = new Map<number, { isActive: boolean; changedAtMs: number }[]>();
    for (const event of statusEvents) {
      const events = eventsByPlan.get(event.planId) ?? [];
      events.push({ isActive: event.isActive, changedAtMs: Date.parse(event.changedAt) });
      eventsByPlan.set(event.planId, events);
    }
    let plannedIncomeVnd = 0;
    let plannedIncomeOccurrenceCount = 0;
    let plannedPaymentVnd = 0;
    let plannedPaymentOccurrenceCount = 0;
    for (const row of rows) {
      const plan = toSchedule(row, eventsByPlan.get(row.id) ?? []);
      for (const date of plannedDatesForMonth(plan, month)) {
        if (!planWasActiveOnDate(plan, date)) continue;
        if (plan.kind === "expected_income") {
          plannedIncomeVnd = addSafeVnd(plannedIncomeVnd, plan.amountVnd);
          plannedIncomeOccurrenceCount += 1;
        } else {
          plannedPaymentVnd = addSafeVnd(plannedPaymentVnd, plan.amountVnd);
          plannedPaymentOccurrenceCount += 1;
        }
      }
    }
    const income = reflectionPart(
      plannedIncomeVnd,
      plannedIncomeOccurrenceCount,
      actuals.incomeVnd,
      actuals.incomeCount,
    );
    const obligations = reflectionPart(
      plannedPaymentVnd,
      plannedPaymentOccurrenceCount,
      actuals.paymentVnd,
      actuals.paymentCount,
    );
    return {
      month,
      periodStatus: "ended",
      income,
      obligations,
      noteCode: "unrecorded_does_not_mean_zero_activity",
    };
  });
}

function validateCreateInput(input: CreateCashflowPlanInput) {
  if (input.kind !== "obligation" && input.kind !== "expected_income") throw invalidInput("kind is invalid");
  if (input.frequency !== "once" && input.frequency !== "monthly") throw invalidInput("frequency is invalid");
  if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.trim().length > 120) {
    throw invalidInput("title must contain 1 to 120 characters");
  }
  if (!isPositiveVnd(input.amountVnd)) throw invalidInput("amountVnd must be a positive integer VND");
  if (!isDateOnly(input.startsOn)) throw invalidInput("startsOn must be a valid YYYY-MM-DD date");
  if (input.frequency === "once" && input.dueDay !== null) throw invalidInput("dueDay must be null for one-time plans");
  if (input.frequency === "monthly") {
    if (!Number.isSafeInteger(input.dueDay) || input.dueDay === null || input.dueDay < 1 || input.dueDay > 31) {
      throw invalidInput("dueDay must be between 1 and 31 for monthly plans");
    }
    if (!plannedDatesForMonth(input, input.startsOn.slice(0, 7)).includes(input.startsOn)) {
      throw invalidInput("startsOn must be the first due date, with day 29–31 clamped to month end");
    }
  }
  if (typeof input.reserveInForecast !== "boolean") throw invalidInput("reserveInForecast must be a boolean");
  if (input.kind === "expected_income" && (input.categoryId !== null || input.reserveInForecast)) {
    throw invalidInput("Expected income cannot use a payment category or reserve wallet balance");
  }
  if (input.categoryId !== null && (!Number.isSafeInteger(input.categoryId) || input.categoryId < 1)) {
    throw invalidInput("categoryId must be a positive integer");
  }
  return { ...input, title: input.title.trim() };
}

async function validatePlanCategory(
  conn: PoolConnection,
  userId: number,
  kind: CashflowPlanKind,
  categoryId: number | null,
): Promise<void> {
  if (categoryId === null) return;
  if (kind !== "obligation") throw invalidInput("Only obligations can use a category");
  const category = await findCategoryById(conn, userId, categoryId);
  if (category === null || category.appliesTo !== "payment" || category.status !== "active") throw notFound();
}

function toCashflowPlanView(row: CashflowPlanRow): CashflowPlanView {
  return {
    id: String(row.id),
    kind: row.kind,
    title: row.title,
    amountVnd: row.amountVnd,
    categoryId: row.categoryId === null ? null : String(row.categoryId),
    frequency: row.frequency,
    startsOn: row.startsOn,
    dueDay: row.dueDay,
    reserveInForecast: row.reserveInForecast,
    isActive: row.isActive,
    createdAt: row.createdAt,
    disabledAt: row.disabledAt,
  };
}

function toSchedule(
  row: CashflowPlanRow,
  statusEvents?: readonly { isActive: boolean; changedAtMs: number }[],
): CashflowPlanSchedule {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    amountVnd: row.amountVnd,
    categoryId: row.categoryId,
    frequency: row.frequency,
    startsOn: row.startsOn,
    dueDay: row.dueDay,
    reserveInForecast: row.reserveInForecast,
    isActive: row.isActive,
    createdAtMs: Date.parse(row.createdAt),
    disabledAtMs: row.disabledAt === null ? null : Date.parse(row.disabledAt),
    ...(statusEvents === undefined ? {} : { statusEvents }),
  };
}

function toOccurrenceViews(
  rows: readonly CashflowPlanRow[],
  startDate: string,
  endDate: string,
  today: string,
): CashflowOccurrenceView[] {
  const events = occurrencesBetween(rows.map(row => toSchedule(row)), startDate, endDate);
  const reminderEnd = addDateOnlyDays(today, REMINDER_DAYS);
  return events.map((event) => ({
    ...event,
    planId: String(event.planId),
    categoryId: event.categoryId === null ? null : String(event.categoryId),
    reminderStatus: event.dueDate < today ? "date_passed" : event.dueDate <= reminderEnd ? "due_soon" : "upcoming",
    isDueWithin10Days: event.dueDate >= today && event.dueDate <= reminderEnd,
  }));
}

function sumForecastEvents(events: readonly CashflowOccurrence[]) {
  let plannedIncomeVnd = 0;
  let plannedObligationsVnd = 0;
  let reservedObligationsVnd = 0;
  let unreservedObligationsVnd = 0;
  for (const event of events) {
    if (event.kind === "expected_income") {
      plannedIncomeVnd = addSafeVnd(plannedIncomeVnd, event.amountVnd);
      continue;
    }
    plannedObligationsVnd = addSafeVnd(plannedObligationsVnd, event.amountVnd);
    if (event.reserveInForecast) reservedObligationsVnd = addSafeVnd(reservedObligationsVnd, event.amountVnd);
    else unreservedObligationsVnd = addSafeVnd(unreservedObligationsVnd, event.amountVnd);
  }
  return { plannedIncomeVnd, plannedObligationsVnd, reservedObligationsVnd, unreservedObligationsVnd };
}

function reflectionPart(
  plannedVnd: number,
  plannedOccurrenceCount: number,
  recordedVnd: number,
  recordedTransactionCount: number,
): CashflowReflectionPart {
  const hasPlan = plannedOccurrenceCount > 0;
  const hasRecords = recordedTransactionCount > 0;
  const difference = hasPlan && hasRecords ? recordedVnd - plannedVnd : null;
  if (difference !== null && !Number.isSafeInteger(difference)) throw new RangeError("cashflow reflection difference is outside the supported range");
  return {
    plannedVnd: hasPlan ? plannedVnd : null,
    plannedOccurrenceCount,
    plannedStatus: hasPlan ? "planned" : "unplanned",
    recordedVnd: hasRecords ? recordedVnd : null,
    recordedTransactionCount,
    recordedStatus: hasRecords ? "recorded" : "unrecorded",
    recordedMinusPlannedVnd: difference,
  };
}
