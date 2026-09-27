import { describe, it, expect } from 'vitest';
import { formatVnd, formatDate, formatMonth, parseAmountVnd } from '../format.js';

describe('format utilities', () => {
  describe('formatVnd', () => {
    it('formats positive integers properly in vi locale', () => {
      expect(formatVnd(1000000, 'vi')).toBe('1.000.000 VND');
    });

    it('formats positive integers properly in en locale', () => {
      expect(formatVnd(1000000, 'en')).toBe('1,000,000 VND');
    });

    it('handles zero', () => {
      expect(formatVnd(0, 'vi')).toBe('0 VND');
    });

    it('handles undefined/null with fallbacks', () => {
      expect(formatVnd(undefined, 'vi')).toBe('Chưa có dữ liệu');
      expect(formatVnd(null, 'en')).toBe('No data');
    });
  });

  describe('formatDate', () => {
    it('formats ISO string to medium date + short time (HCMC TZ)', () => {
      // 2026-09-26T00:00:00Z in UTC is 07:00 in HCMC
      const isoString = '2026-09-26T00:00:00Z';
      const formatted = formatDate(isoString, 'en');
      expect(formatted).toMatch(/Sep 26, 2026/);
      expect(formatted).toMatch(/7:00/);
    });
  });

  describe('formatMonth', () => {
    it('formats YYYY-MM in en locale', () => {
      expect(formatMonth('2026-09', 'en')).toBe('September 2026');
    });

    it('formats YYYY-MM in vi locale', () => {
      expect(formatMonth('2026-09', 'vi')).toBe('tháng 9 năm 2026');
    });
  });

  describe('parseAmountVnd', () => {
    it('parses valid amounts with separators', () => {
      expect(parseAmountVnd('1,000,000')).toBe(1000000);
      expect(parseAmountVnd('1.000.000')).toBe(1000000);
      expect(parseAmountVnd(' 500 000 ')).toBe(500000);
      expect(parseAmountVnd('12345')).toBe(12345);
      expect(parseAmountVnd('100.50')).toBe(10050); // Dots are treated as thousands separators
    });

    it('returns null for invalid amounts', () => {
      expect(parseAmountVnd('abc')).toBeNull();
      expect(parseAmountVnd('-1000')).toBeNull();
      expect(parseAmountVnd('0')).toBeNull(); // no zero
    });
  });
});
