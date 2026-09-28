import type { Locale } from './types.js';

export type GreetingPeriod = 'morning' | 'noon' | 'afternoon' | 'evening';

/** Select a greeting using the product's business timezone, independent of the browser timezone. */
export function getVietnamGreetingPeriod(now: Date = new Date()): GreetingPeriod {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now));
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

export function getCurrentVietnamDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  return year && month && day ? `${year}-${month}-${day}` : '';
}

/** Get the final calendar date of the current month in Asia/Ho_Chi_Minh. */
export function getCurrentVietnamMonthEnd(now: Date = new Date()): string {
  const today = getCurrentVietnamDate(now);
  const [year, month] = today.split('-').map(Number);
  if (!year || !month) return '';

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Format a user-editable VND value without adding the currency suffix. */
export function formatAmountInputVnd(value: string, locale: Locale): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits);
  return Number.isSafeInteger(amount)
    ? new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(amount)
    : digits;
}

export function formatAmountInputVndWithCaret(
  value: string,
  selectionStart: number | null,
  locale: Locale,
): { rawValue: string; caretPosition: number } {
  const safeSelectionStart = selectionStart ?? value.length;
  const rawValue = value.replace(/\D/g, '');
  const digitsBeforeCaret = value.slice(0, safeSelectionStart).replace(/\D/g, '').length;
  const formattedValue = formatAmountInputVnd(rawValue, locale);
  if (digitsBeforeCaret === 0) return { rawValue, caretPosition: 0 };

  let seenDigits = 0;
  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index] ?? '')) seenDigits += 1;
    if (seenDigits >= digitsBeforeCaret) return { rawValue, caretPosition: index + 1 };
  }

  return { rawValue, caretPosition: formattedValue.length };
}

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
  const date = new Date(Date.UTC(Number(year), Number(m) - 1, 15, 12));
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'long',
  }).format(date);
}

/** Get current YYYY-MM month in Asia/Ho_Chi_Minh timezone. */
export function getCurrentMonth(now: Date = new Date()): string {
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
