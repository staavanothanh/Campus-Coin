import type { Locale } from './types.js';

/** Format integer VND amount with locale-appropriate thousands separator. */
export function formatVnd(value: number | undefined | null, locale: Locale): string {
  if (value === undefined || value === null) {
    return locale === 'vi' ? 'Chưa có dữ liệu' : 'No data';
  }
  const formatted = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(value);
  return `${formatted} VND`;
}

/** Format ISO date-time string to Asia/Ho_Chi_Minh medium date + short time. */
export function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** Format YYYY-MM month string to locale month+year label. */
export function formatMonth(month: string, locale: Locale): string {
  const parts = month.split('-');
  const year = parts[0];
  const m = parts[1];
  if (!year || !m) return month;
  const date = new Date(Number(year), Number(m) - 1, 1);
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'long',
  }).format(date);
}

/** Get current YYYY-MM month in Asia/Ho_Chi_Minh timezone. */
export function getCurrentMonth(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  });
  // en-CA formats as YYYY-MM-DD; take YYYY-MM
  return formatter.format(now).slice(0, 7);
}

/** Get current month formatted as MM/YYYY in Asia/Ho_Chi_Minh timezone. */
export function getCurrentMonthFormatted(): string {
  const parts = getCurrentMonth().split('-');
  return `${parts[1]}/${parts[0]}`;
}

/** Get current date formatted in Asia/Ho_Chi_Minh timezone. */
export function getCurrentDateFormatted(locale: Locale): string {
  const now = new Date();
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
}

/**
 * Parse user-input amount string to positive integer VND.
 * Strips thousand separators (dot, comma, space).
 * Returns null if invalid (not a positive integer).
 */
export function parseAmountVnd(input: string): number | null {
  const trimmed = input.trim().replace(/[.,\s]/g, '');
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER) return null;
  return value;
}
