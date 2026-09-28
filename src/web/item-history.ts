import type { FrequentPaymentItem } from './types.js';

const hcmcDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function hcmcCalendarDay(timestamp: string): number | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const parts = hcmcDateFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** HCMC calendar days between two instants; null means invalid or reversed dates. */
export function hcmcCalendarDayDifference(earlier: string, later: string): number | null {
  const earlierDay = hcmcCalendarDay(earlier);
  const laterDay = hcmcCalendarDay(later);
  if (earlierDay === null || laterDay === null || laterDay < earlierDay) return null;
  return laterDay - earlierDay;
}

/** Returns how much the current interval changed from the previous one. */
export function purchaseIntervalChange(previousDays: number | null, currentDays: number | null): number | null {
  if (previousDays === null || currentDays === null) return null;
  if (!Number.isSafeInteger(previousDays) || !Number.isSafeInteger(currentDays)) return null;
  if (previousDays < 0 || currentDays < 0) return null;
  return currentDays - previousDays;
}

export function findFrequentPaymentItem(
  itemName: string,
  items: FrequentPaymentItem[],
): FrequentPaymentItem | null {
  const normalizedName = itemName.trim().normalize('NFC').toLocaleLowerCase();
  if (!normalizedName) return null;
  return items.find((item) => item.itemName.trim().normalize('NFC').toLocaleLowerCase() === normalizedName) ?? null;
}
