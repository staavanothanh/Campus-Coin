import type { Transaction } from './types.js';
import type { Locale } from './types.js';
import { formatMonth } from './format.js';

export type TransactionGrouping = 'day' | 'month';
export type TransactionTypeFilter = 'all' | 'income' | 'payment';

const HCMC_OFFSET = '+07:00';

export interface CalendarMonthRange {
  from: string;
  to: string;
}

export interface TransactionTotals {
  income: number;
  payment: number;
  net: number;
}

/** Return the inclusive first and last dates for a YYYY-MM calendar month. */
export function calendarMonthRange(month: string): CalendarMonthRange | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (year < 1 || year > 9999) return null;

  const lastDay = monthNumber === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : ([4, 6, 9, 11].includes(monthNumber) ? 30 : 31);
  return {
    from: `${match[1]}-${match[2]}-01`,
    to: `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function summarizeTransactions(transactions: readonly Transaction[]): TransactionTotals {
  let income = 0;
  let payment = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amountVnd;
    else payment += transaction.amountVnd;
  }
  return { income, payment, net: income - payment };
}

export function isValidDateRange(from: string, to: string): boolean {
  const validDate = (value: string) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  };
  return validDate(from) && validDate(to) && (!from || !to || from <= to);
}

export function transactionListPath(
  type: TransactionTypeFilter,
  from: string,
  to: string,
): string {
  const params = new URLSearchParams({ limit: '20' });
  if (type !== 'all') params.set('type', type);
  if (from) params.set('from', vietnamDayStart(from));
  if (to) params.set('to', vietnamDayStart(nextCalendarDay(to)));
  return `/ledger/transactions?${params.toString()}`;
}

function vietnamDayStart(date: string): string {
  return new Date(`${date}T00:00:00.000${HCMC_OFFSET}`).toISOString();
}

function nextCalendarDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1)).toISOString().slice(0, 10);
}

export interface TransactionGroup {
  key: string;
  transactions: Transaction[];
}

export function groupTransactions(
  transactions: readonly Transaction[],
  grouping: TransactionGrouping,
): TransactionGroup[] {
  const sorted = [...transactions].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
  const groups = new Map<string, Transaction[]>();
  for (const transaction of sorted) {
    const key = hcmPeriodKey(transaction.occurredAt, grouping);
    const current = groups.get(key);
    if (current) current.push(transaction);
    else groups.set(key, [transaction]);
  }
  return Array.from(groups, ([key, groupedTransactions]) => ({ key, transactions: groupedTransactions }));
}

function hcmPeriodKey(instant: string, grouping: TransactionGrouping): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    ...(grouping === 'day' ? { day: '2-digit' } : {}),
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  if (!year || !month || (grouping === 'day' && !day)) return instant;
  return grouping === 'day' ? `${year}-${month}-${day}` : `${year}-${month}`;
}

export function formatTransactionGroupLabel(key: string, grouping: TransactionGrouping, locale: Locale): string {
  if (grouping === 'month') return formatMonth(key, locale);
  const startOfDay = new Date(`${key}T00:00:00.000${HCMC_OFFSET}`);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
  }).format(startOfDay);
}
