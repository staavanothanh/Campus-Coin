import type { Locale } from './types.js';

export function formatVnd(value: number | string | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return locale === 'vi' ? 'Chưa có dữ liệu' : 'No data';
  return `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(BigInt(String(value)))} VND`;
}

export function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
}

export function currentMonthKey(now = new Date()): string {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit',
  }).formatToParts(now).filter(({ type }) => type === 'year' || type === 'month').map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}`;
}

export function currentDateLabel(locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full',
  }).format(new Date());
}

export function formatMonth(month: string, locale: Locale): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'UTC', year: 'numeric', month: 'long',
  }).format(new Date(Date.UTC(year ?? 2000, (monthNumber ?? 1) - 1, 1)));
}

export function parseAmountVnd(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
