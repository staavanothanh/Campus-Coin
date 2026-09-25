import type { Locale } from './types.js';
/** Format integer VND amount with locale-appropriate thousands separator. */
export declare function formatVnd(value: number | undefined | null, locale: Locale): string;
/** Format ISO date-time string to Asia/Ho_Chi_Minh medium date + short time. */
export declare function formatDate(value: string, locale: Locale): string;
/** Format YYYY-MM month string to locale month+year label. */
export declare function formatMonth(month: string, locale: Locale): string;
/** Get current YYYY-MM month in Asia/Ho_Chi_Minh timezone. */
export declare function getCurrentMonth(): string;
/**
 * Parse user-input amount string to positive integer VND.
 * Strips thousand separators (dot, comma, space).
 * Returns null if invalid (not a positive integer).
 */
export declare function parseAmountVnd(input: string): number | null;
