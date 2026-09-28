import { amountFromDb } from "./rows.ts";
import { isoFromDb } from "./rows.ts";
import { monthRangeUtc } from "../../domain/period.ts";
import type { CashflowPlanFrequency, CashflowPlanKind } from "../../domain/cashflow-plan.ts";

export interface CashflowPlanRow {
  id: number;
  userId: number;
  kind: CashflowPlanKind;
  title: string;
  amountVnd: number;
  categoryId: number | null;
  frequency: CashflowPlanFrequency;
  startsOn: string;
  dueDay: number | null;
  reserveInForecast: boolean;
  isActive: boolean;
  createdAt: string;
  disabledAt: string | null;
}

export interface CashflowPlanScalar {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export interface CashflowPlanStatusEventRow {
  planId: number;
  isActive: boolean;
  changedAt: string;
}

interface CashflowPlanDbRow {
  id: number | string;
  user_id: number | string;
  kind: CashflowPlanKind;
  title: string;
  amount_vnd: number | string;
  category_id: number | string | null;
  frequency: CashflowPlanFrequency;
  starts_on: string;
  due_day: number | string | null;
  reserve_in_forecast: number;
  is_active: number;
  created_at: Date | string | number;
  disabled_at: Date | string | number | null;
}

interface CashflowPlanStatusEventDbRow {
  id: number | string;
  plan_id: number | string;
  is_active: number;
  changed_at: Date | string | number;
}

const PLAN_COLUMNS = `id, user_id, kind, title, amount_vnd, category_id, frequency,
  CAST(starts_on AS CHAR) AS starts_on, due_day, reserve_in_forecast, is_active, created_at, disabled_at`;

function mapPlanRow(row: CashflowPlanDbRow): CashflowPlanRow {
  return {
    id: amountFromDb(row.id),
    userId: amountFromDb(row.user_id),
    kind: row.kind,
    title: row.title,
    amountVnd: amountFromDb(row.amount_vnd),
    categoryId: row.category_id === null ? null : amountFromDb(row.category_id),
    frequency: row.frequency,
    startsOn: row.starts_on,
    dueDay: row.due_day === null ? null : amountFromDb(row.due_day),
    reserveInForecast: row.reserve_in_forecast === 1,
    isActive: row.is_active === 1,
    createdAt: isoFromDb(row.created_at),
    disabledAt: row.disabled_at === null ? null : isoFromDb(row.disabled_at),
  };
}

export async function listCashflowPlans(
  db: CashflowPlanScalar,
  userId: number,
  includeDisabled = true,
): Promise<CashflowPlanRow[]> {
  const [rows] = (await db.query(
    `SELECT ${PLAN_COLUMNS} FROM cashflow_plans
     WHERE user_id = ? AND (? = 1 OR is_active = 1)
     ORDER BY is_active DESC, starts_on ASC, id ASC
     LIMIT 201`,
    [userId, includeDisabled ? 1 : 0],
  )) as [CashflowPlanDbRow[], unknown];
  return rows.map(mapPlanRow);
}

export async function findCashflowPlan(
  db: CashflowPlanScalar,
  userId: number,
  planId: number,
): Promise<CashflowPlanRow | null> {
  const [rows] = (await db.query(
    `SELECT ${PLAN_COLUMNS} FROM cashflow_plans WHERE user_id = ? AND id = ? LIMIT 1`,
    [userId, planId],
  )) as [CashflowPlanDbRow[], unknown];
  return rows[0] === undefined ? null : mapPlanRow(rows[0]);
}

export async function countCashflowPlans(db: CashflowPlanScalar, userId: number): Promise<number> {
  const [rows] = (await db.query(
    "SELECT COUNT(*) AS plan_count FROM cashflow_plans WHERE user_id = ?",
    [userId],
  )) as [{ plan_count: number | string }[], unknown];
  return amountFromDb(rows[0]?.plan_count ?? 0);
}

export async function insertCashflowPlanStatusEvent(
  db: CashflowPlanScalar,
  userId: number,
  planId: number,
  isActive: boolean,
): Promise<void> {
  await db.query(
    `INSERT INTO cashflow_plan_status_events (user_id, plan_id, is_active)
     VALUES (?, ?, ?)`,
    [userId, planId, isActive ? 1 : 0],
  );
}

export async function listCashflowPlanStatusEventsForMonth(
  db: CashflowPlanScalar,
  userId: number,
  planIds: readonly number[],
  month: string,
): Promise<CashflowPlanStatusEventRow[]> {
  if (planIds.length === 0) return [];
  const placeholders = planIds.map(() => "?").join(", ");
  const { startUtcMs, endExclusiveUtcMs } = monthRangeUtc(month);
  const start = new Date(startUtcMs);
  const end = new Date(endExclusiveUtcMs);
  const [rows] = (await db.query(
    `SELECT id, plan_id, is_active, changed_at FROM (
       SELECT id, plan_id, is_active, changed_at FROM (
         SELECT id, plan_id, is_active, changed_at,
           ROW_NUMBER() OVER (PARTITION BY plan_id ORDER BY changed_at DESC, id DESC) AS event_number
         FROM cashflow_plan_status_events
         WHERE user_id = ? AND plan_id IN (${placeholders}) AND changed_at < ?
       ) AS earlier_events
       WHERE event_number = 1
       UNION ALL
       SELECT id, plan_id, is_active, changed_at
       FROM cashflow_plan_status_events
       WHERE user_id = ? AND plan_id IN (${placeholders}) AND changed_at >= ? AND changed_at < ?
     ) AS relevant_events
     ORDER BY plan_id, changed_at, id`,
    [userId, ...planIds, start, userId, ...planIds, start, end],
  )) as [CashflowPlanStatusEventDbRow[], unknown];
  return rows.map(row => ({
    planId: amountFromDb(row.plan_id),
    isActive: row.is_active === 1,
    changedAt: isoFromDb(row.changed_at),
  }));
}

export async function lockCashflowPlanOwner(db: CashflowPlanScalar, userId: number): Promise<boolean> {
  const [rows] = (await db.query(
    "SELECT id FROM users WHERE id = ? FOR UPDATE",
    [userId],
  )) as [[{ id: number | string }], unknown];
  return rows.length === 1;
}

export async function insertCashflowPlan(
  db: CashflowPlanScalar,
  userId: number,
  input: {
    kind: CashflowPlanKind;
    title: string;
    amountVnd: number;
    categoryId: number | null;
    frequency: CashflowPlanFrequency;
    startsOn: string;
    dueDay: number | null;
    reserveInForecast: boolean;
  },
): Promise<number> {
  const [result] = (await db.query(
    `INSERT INTO cashflow_plans
       (user_id, kind, title, amount_vnd, category_id, frequency, starts_on, due_day, reserve_in_forecast)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.kind,
      input.title,
      input.amountVnd,
      input.categoryId,
      input.frequency,
      input.startsOn,
      input.dueDay,
      input.reserveInForecast ? 1 : 0,
    ],
  )) as [{ insertId: number | string }, unknown];
  return amountFromDb(result.insertId);
}

export async function updateCashflowPlanOptions(
  db: CashflowPlanScalar,
  userId: number,
  planId: number,
  changes: { reserveInForecast?: boolean; isActive?: boolean },
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (changes.reserveInForecast !== undefined) {
    sets.push("reserve_in_forecast = ?");
    params.push(changes.reserveInForecast ? 1 : 0);
  }
  if (changes.isActive !== undefined) {
    if (changes.isActive) {
      sets.push("is_active = 1", "disabled_at = NULL");
    } else {
      sets.push("is_active = 0", "disabled_at = CURRENT_TIMESTAMP(3)");
    }
  }
  if (sets.length === 0) return false;
  const [result] = (await db.query(
    `UPDATE cashflow_plans SET ${sets.join(", ")}
     WHERE user_id = ? AND id = ?`,
    [...params, userId, planId],
  )) as [{ affectedRows: number }, unknown];
  return result.affectedRows === 1;
}
