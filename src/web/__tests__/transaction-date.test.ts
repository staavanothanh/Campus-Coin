import { describe, expect, it } from 'vitest';
import { hcmcDateToIsoInstant, todayInHcmc } from '../transaction-date.js';

describe('transaction date helpers', () => {
  it('uses the Ho Chi Minh calendar day around the UTC date boundary', () => {
    expect(todayInHcmc(new Date('2026-09-27T16:59:59.000Z'))).toBe('2026-09-27');
    expect(todayInHcmc(new Date('2026-09-27T17:00:00.000Z'))).toBe('2026-09-28');
  });

  it('converts a chosen Ho Chi Minh day to the start of that local day', () => {
    expect(hcmcDateToIsoInstant('2026-09-28')).toBe('2026-09-27T17:00:00.000Z');
  });

  it('rejects dates that are not real calendar days', () => {
    expect(hcmcDateToIsoInstant('2026-02-30')).toBeNull();
    expect(hcmcDateToIsoInstant('2026/09/28')).toBeNull();
  });
});
