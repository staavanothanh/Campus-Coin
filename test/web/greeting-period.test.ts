import assert from 'node:assert/strict';
import test from 'node:test';
import { getVietnamGreetingPeriod } from '../../src/web/format.ts';

test('selects morning, noon, afternoon and evening in Vietnam time', () => {
  assert.equal(getVietnamGreetingPeriod(new Date('2026-09-27T00:00:00.000Z')), 'morning');
  assert.equal(getVietnamGreetingPeriod(new Date('2026-09-27T05:00:00.000Z')), 'noon');
  assert.equal(getVietnamGreetingPeriod(new Date('2026-09-27T07:00:00.000Z')), 'afternoon');
  assert.equal(getVietnamGreetingPeriod(new Date('2026-09-27T11:00:00.000Z')), 'evening');
});
