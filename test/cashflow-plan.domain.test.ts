import { test } from "node:test";
import assert from "node:assert/strict";
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
  type CashflowPlanSchedule,
} from "../src/domain/cashflow-plan.ts";

function monthlyPlan(overrides: Partial<CashflowPlanSchedule> = {}): CashflowPlanSchedule {
  return {
    id: 1,
    kind: "obligation",
    title: "Tiền nhà",
    amountVnd: 5_000_000,
    categoryId: null,
    frequency: "monthly",
    startsOn: "2026-01-31",
    dueDay: 31,
    reserveInForecast: false,
    isActive: true,
    createdAtMs: Date.parse("2026-01-01T00:00:00.000Z"),
    disabledAtMs: null,
    ...overrides,
  };
}

test("date-only values reject impossible dates and add calendar days", () => {
  assert.equal(isDateOnly("2026-02-29"), false);
  assert.equal(isDateOnly("2026-02-28"), true);
  assert.equal(addDateOnlyDays("2026-12-31", 1), "2027-01-01");
  assert.equal(dateOnlyFromUtcMs(Date.parse("2026-09-27T17:00:00.000Z")), "2026-09-28");
});

test("monthly dates clamp 29–31 to the last day and retain the selected start month", () => {
  const plan = monthlyPlan();
  assert.deepEqual(plannedDatesForMonth(plan, "2026-01"), ["2026-01-31"]);
  assert.deepEqual(plannedDatesForMonth(plan, "2026-02"), ["2026-02-28"]);
  assert.deepEqual(plannedDatesForMonth(plan, "2026-04"), ["2026-04-30"]);
  assert.deepEqual(plannedDatesForMonth(plan, "2025-12"), []);
});

test("upcoming occurrences are sorted, bounded by dates, and ignore disabled plans", () => {
  const plans = [
    monthlyPlan({ id: 2, startsOn: "2026-09-28", dueDay: 28 }),
    monthlyPlan({ id: 1, startsOn: "2026-09-29", isActive: false }),
  ];
  const rows = occurrencesBetween(plans, "2026-09-28", "2026-10-28");
  assert.deepEqual(rows.map((row) => [row.planId, row.dueDate]), [
    [2, "2026-09-28"],
    [2, "2026-10-28"],
  ]);
});

test("old monthly plans only scan the selected forecast range", () => {
  const plan = monthlyPlan({ startsOn: "1000-01-01", dueDay: 1 });
  const events = occurrencesBetween([plan], "2026-09-28", "2026-10-27");

  assert.deepEqual(events.map(event => event.dueDate), ["2026-10-01"]);
});

test("the live wallet snapshot is not adjusted again for planned events due today", () => {
  const events = [
    { planId: 1, kind: "obligation" as const, title: "Rent today", amountVnd: 300_000, categoryId: null, dueDate: "2026-09-28", reserveInForecast: true, isActive: true },
    { planId: 2, kind: "expected_income" as const, title: "Income tomorrow", amountVnd: 200_000, categoryId: null, dueDate: "2026-09-29", reserveInForecast: false, isActive: true },
  ];

  assert.deepEqual(eventsAfterSnapshotDate(events, "2026-09-28").map(event => event.planId), [2]);
});

test("one-time plan reflection respects create and disable dates", () => {
  const plan = monthlyPlan({
    frequency: "once",
    startsOn: "2026-02-10",
    dueDay: null,
    createdAtMs: Date.parse("2026-02-11T00:00:00.000Z"),
  });
  assert.equal(planWasActiveOnDate(plan, "2026-02-10"), false);
  assert.equal(planWasActiveOnDate({ ...plan, createdAtMs: Date.parse("2026-02-01T00:00:00.000Z") }, "2026-02-10"), true);
  assert.equal(planWasActiveOnDate({ ...plan, createdAtMs: Date.parse("2026-02-01T00:00:00.000Z"), disabledAtMs: Date.parse("2026-02-09T00:00:00.000Z") }, "2026-02-10"), false);
});

test("monthly reflection respects each disable and reactivate period", () => {
  const plan = monthlyPlan({
    startsOn: "2026-01-15",
    dueDay: 15,
    statusEvents: [
      { isActive: true, changedAtMs: Date.parse("2026-01-01T00:00:00.000Z") },
      { isActive: false, changedAtMs: Date.parse("2026-03-01T00:00:00.000Z") },
      { isActive: true, changedAtMs: Date.parse("2026-05-20T00:00:00.000Z") },
    ],
  });

  assert.equal(planWasActiveOnDate(plan, "2026-02-15"), true);
  assert.equal(planWasActiveOnDate(plan, "2026-03-15"), false);
  assert.equal(planWasActiveOnDate(plan, "2026-04-15"), false);
  assert.equal(planWasActiveOnDate(plan, "2026-05-15"), false);
  assert.equal(planWasActiveOnDate(plan, "2026-06-15"), true);
});

test("historical reflection applies a due-day status change from the next HCMC day", () => {
  const plan = monthlyPlan({
    startsOn: "2026-01-15",
    dueDay: 15,
    statusEvents: [
      { isActive: true, changedAtMs: Date.parse("2026-01-01T00:00:00.000Z") },
      { isActive: false, changedAtMs: Date.parse("2026-03-15T03:00:00.000Z") },
      { isActive: true, changedAtMs: Date.parse("2026-04-15T03:00:00.000Z") },
    ],
  });

  assert.equal(planWasActiveOnDate(plan, "2026-03-15"), true);
  assert.equal(planWasActiveOnDate(plan, "2026-04-15"), false);
  assert.equal(planWasActiveOnDate(plan, "2026-05-15"), true);
});

test("cashflow addition fails closed outside the safe integer range", () => {
  assert.equal(addSafeVnd(100, -25), 75);
  assert.throws(() => addSafeVnd(Number.MAX_SAFE_INTEGER, 1), /outside the supported VND range/);
});

test("what-if follows the selected date, subtracts reserved items only, and tracks the low point", () => {
  const startDate = "2026-09-28";
  const events = [
    { planId: 1, kind: "obligation" as const, title: "Rent", amountVnd: 300_000, categoryId: null, dueDate: "2026-10-02", reserveInForecast: true, isActive: true },
    { planId: 2, kind: "obligation" as const, title: "Book", amountVnd: 100_000, categoryId: null, dueDate: "2026-10-04", reserveInForecast: false, isActive: true },
    { planId: 3, kind: "expected_income" as const, title: "Income", amountVnd: 200_000, categoryId: null, dueDate: "2026-10-06", reserveInForecast: false, isActive: true },
  ];
  const result = simulateWhatIf(1_000_000, startDate, 10, events, "2026-10-03", 850_000);
  assert.equal(result.baselineAtPaymentDateVnd, 700_000);
  assert.equal(result.scenarioAtPaymentDateVnd, -150_000);
  assert.equal(result.baselineEndVnd, 900_000);
  assert.equal(result.scenarioEndVnd, 50_000);
  assert.equal(result.scenarioLowestVnd, -150_000);
});
