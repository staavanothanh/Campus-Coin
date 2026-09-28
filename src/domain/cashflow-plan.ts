import { HCMC_UTC_OFFSET_MS } from "./period.ts";

export type CashflowPlanKind = "obligation" | "expected_income";
export type CashflowPlanFrequency = "once" | "monthly";

export interface CashflowPlanSchedule {
  id: number;
  kind: CashflowPlanKind;
  title: string;
  amountVnd: number;
  categoryId: number | null;
  frequency: CashflowPlanFrequency;
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  isActive: boolean;
  createdAtMs: number;
  disabledAtMs: number | null;
  statusEvents?: readonly CashflowPlanStatusEvent[];
}

export interface CashflowPlanStatusEvent {
  isActive: boolean;
  changedAtMs: number;
}

export interface CashflowOccurrence {
  planId: number;
  kind: CashflowPlanKind;
  title: string;
  amountVnd: number;
  categoryId: number | null;
  dueDate: string;
  reserveInForecast: boolean;
  isActive: boolean;
}

/** Events after the wallet snapshot can be applied without repeating today's recorded activity. */
export function eventsAfterSnapshotDate<T extends Pick<CashflowOccurrence, "dueDate">>(
  events: readonly T[],
  snapshotDate: string,
): T[] {
  if (!isDateOnly(snapshotDate)) throw new RangeError("invalid snapshot date");
  return events.filter((event) => event.dueDate > snapshotDate);
}

export interface WhatIfProjection {
  baselineEndVnd: number;
  scenarioEndVnd: number;
  baselineAtPaymentDateVnd: number;
  scenarioAtPaymentDateVnd: number;
  baselineLowestVnd: number;
  scenarioLowestVnd: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function dateOnlyFromUtcMs(utcMs: number): string {
  const local = new Date(utcMs + HCMC_UTC_OFFSET_MS);
  return formatDateOnly(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
}

export function addDateOnlyDays(value: string, days: number): string {
  if (!isDateOnly(value) || !Number.isSafeInteger(days)) throw new RangeError("invalid date range");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return formatDateOnly(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function monthKeyFromDateOnly(value: string): string {
  if (!isDateOnly(value)) throw new RangeError("invalid date");
  return value.slice(0, 7);
}

export function isDateInMonth(value: string, month: string): boolean {
  return isDateOnly(value) && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && value.startsWith(`${month}-`);
}

export function plannedDatesForMonth(
  plan: Pick<CashflowPlanSchedule, "frequency" | "startsOn" | "dueDay">,
  month: string,
): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !isDateOnly(plan.startsOn)) return [];
  if (plan.frequency === "once") return isDateInMonth(plan.startsOn, month) ? [plan.startsOn] : [];

  const [year, monthNumber] = month.split("-").map(Number);
  const [startYear, startMonth] = plan.startsOn.split("-").map(Number);
  const monthIndex = year! * 12 + monthNumber! - 1;
  const startMonthIndex = startYear! * 12 + startMonth! - 1;
  if (monthIndex < startMonthIndex) return [];
  const dueDay = plan.dueDay;
  if (dueDay === null || dueDay < 1 || dueDay > 31) return [];
  const dueDate = clampedDate(year!, monthNumber!, dueDay);
  return dueDate < plan.startsOn ? [] : [dueDate];
}

export function occurrencesBetween(
  plans: readonly CashflowPlanSchedule[],
  startDate: string,
  endDateInclusive: string,
): CashflowOccurrence[] {
  if (!isDateOnly(startDate) || !isDateOnly(endDateInclusive) || endDateInclusive < startDate) {
    throw new RangeError("invalid occurrence range");
  }
  const occurrences: CashflowOccurrence[] = [];
  const rangeStartMonth = monthKeyFromDateOnly(startDate);
  const rangeEndMonth = monthKeyFromDateOnly(endDateInclusive);
  for (const plan of plans) {
    if (!plan.isActive) continue;
    const planStartMonth = monthKeyFromDateOnly(plan.startsOn);
    const firstMonth = planStartMonth > rangeStartMonth ? planStartMonth : rangeStartMonth;
    let month = firstMonth;
    while (month <= rangeEndMonth) {
      for (const dueDate of plannedDatesForMonth(plan, month)) {
        if (dueDate >= startDate && dueDate <= endDateInclusive) {
          occurrences.push({
            planId: plan.id,
            kind: plan.kind,
            title: plan.title,
            amountVnd: plan.amountVnd,
            categoryId: plan.categoryId,
            dueDate,
            reserveInForecast: plan.reserveInForecast,
            isActive: plan.isActive,
          });
        }
      }
      month = nextMonth(month);
    }
  }
  return occurrences.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.planId - b.planId);
}

/** Read a plan's start-of-day status for a historical HCMC reflection date. */
export function planWasActiveOnDate(plan: CashflowPlanSchedule, date: string): boolean {
  if (!isDateOnly(date) || date < plan.startsOn || dateOnlyFromUtcMs(plan.createdAtMs) > date) return false;
  if (plan.statusEvents && plan.statusEvents.length > 0) {
    let isActive = true;
    for (const event of plan.statusEvents) {
      // For historical reflection, a status change on this day applies from the next HCMC day.
      if (dateOnlyFromUtcMs(event.changedAtMs) >= date) continue;
      isActive = event.isActive;
    }
    return isActive && plannedDatesForMonth(plan, monthKeyFromDateOnly(date)).includes(date);
  }
  if (plan.disabledAtMs !== null && dateOnlyFromUtcMs(plan.disabledAtMs) < date) return false;
  return plannedDatesForMonth(plan, monthKeyFromDateOnly(date)).includes(date);
}

export function addSafeVnd(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) throw new RangeError("cashflow total is outside the supported VND range");
  return total;
}

/** Calculate day-end forecast balances; it never reads or changes persistence. */
export function simulateWhatIf(
  currentBalanceVnd: number,
  startDate: string,
  days: number,
  events: readonly CashflowOccurrence[],
  paymentDate: string,
  paymentAmountVnd: number,
): WhatIfProjection {
  if (!Number.isSafeInteger(currentBalanceVnd) || !isDateOnly(startDate) || !isDateOnly(paymentDate)) {
    throw new RangeError("invalid what-if input");
  }
  if (!Number.isSafeInteger(days) || days < 1 || days > 365 || !Number.isSafeInteger(paymentAmountVnd) || paymentAmountVnd < 1) {
    throw new RangeError("invalid what-if range or amount");
  }
  const endDate = addDateOnlyDays(startDate, days - 1);
  if (paymentDate < startDate || paymentDate > endDate) throw new RangeError("payment date is outside the forecast");
  let baseline = currentBalanceVnd;
  let scenario = currentBalanceVnd;
  let baselineLowest = currentBalanceVnd;
  let scenarioLowest = currentBalanceVnd;
  let baselineAtPaymentDate: number | null = null;
  let scenarioAtPaymentDate: number | null = null;

  for (let day = 0; day < days; day += 1) {
    const date = addDateOnlyDays(startDate, day);
    let dayDelta = 0;
    for (const event of events) {
      if (event.dueDate !== date) continue;
      if (event.kind === "expected_income") dayDelta = addSafeVnd(dayDelta, event.amountVnd);
      else if (event.reserveInForecast) dayDelta = addSafeVnd(dayDelta, -event.amountVnd);
    }
    baseline = addSafeVnd(baseline, dayDelta);
    scenario = addSafeVnd(scenario, dayDelta);
    if (date === paymentDate) scenario = addSafeVnd(scenario, -paymentAmountVnd);
    baselineLowest = Math.min(baselineLowest, baseline);
    scenarioLowest = Math.min(scenarioLowest, scenario);
    if (date === paymentDate) {
      baselineAtPaymentDate = baseline;
      scenarioAtPaymentDate = scenario;
    }
  }
  if (baselineAtPaymentDate === null || scenarioAtPaymentDate === null) {
    throw new RangeError("payment date is outside the forecast");
  }
  return {
    baselineEndVnd: baseline,
    scenarioEndVnd: scenario,
    baselineAtPaymentDateVnd: baselineAtPaymentDate,
    scenarioAtPaymentDateVnd: scenarioAtPaymentDate,
    baselineLowestVnd: baselineLowest,
    scenarioLowestVnd: scenarioLowest,
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function clampedDate(year: number, month: number, dueDay: number): string {
  return formatDateOnly(year, month, Math.min(dueDay, daysInMonth(year, month)));
}

function nextMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month!, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
