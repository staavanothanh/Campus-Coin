import test from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentMonth } from '../../src/web/format.ts';

test('current month is calculated in Asia/Ho_Chi_Minh around UTC month boundaries', () => {
  assert.equal(getCurrentMonth(new Date('2026-08-31T17:30:00.000Z')), '2026-09');
  assert.equal(getCurrentMonth(new Date('2026-09-30T16:30:00.000Z')), '2026-09');
  assert.equal(getCurrentMonth(new Date('2026-09-30T17:00:00.000Z')), '2026-10');
});
