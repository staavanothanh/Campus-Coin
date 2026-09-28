import { describe, expect, it } from 'vitest';
import { findFrequentPaymentItem, hcmcCalendarDayDifference, purchaseIntervalChange } from '../item-history.js';

describe('payment item history helpers', () => {
  it('counts HCMC calendar days across UTC midnight and local midnight correctly', () => {
    expect(hcmcCalendarDayDifference('2026-09-01T16:59:59.000Z', '2026-09-01T17:00:00.000Z')).toBe(1);
    expect(hcmcCalendarDayDifference('2026-09-01T18:00:00.000Z', '2026-09-02T03:00:00.000Z')).toBe(0);
  });

  it('omits invalid or future-to-past comparisons instead of showing negative days', () => {
    expect(hcmcCalendarDayDifference('not-a-date', '2026-09-02T03:00:00.000Z')).toBeNull();
    expect(hcmcCalendarDayDifference('2026-09-02T03:00:00.000Z', '2026-09-01T03:00:00.000Z')).toBeNull();
  });

  it('describes a shorter, longer, or unchanged purchase interval without judging spending', () => {
    expect(purchaseIntervalChange(15, 10)).toBe(-5);
    expect(purchaseIntervalChange(10, 15)).toBe(5);
    expect(purchaseIntervalChange(10, 10)).toBe(0);
    expect(purchaseIntervalChange(null, 10)).toBeNull();
    expect(purchaseIntervalChange(-1, 10)).toBeNull();
  });

  it('matches a typed name to a suggestion without changing the saved item name', () => {
    const item = {
      itemName: 'Cà phê',
      frequency: 4,
      lastAmountVnd: 25_000,
      lastOccurredAt: '2026-09-01T03:00:00.000Z',
      previousOccurredAt: '2026-08-29T03:00:00.000Z',
    };
    expect(findFrequentPaymentItem('  cà phê ', [item])).toEqual(item);
    expect(findFrequentPaymentItem('bánh mì', [item])).toBeNull();
  });
});
