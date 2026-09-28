import assert from 'node:assert/strict';
import test from 'node:test';
import { currentVietnamDate, isBirthDateAllowed, isIsoCalendarDate, isProfileGender } from '../../src/domain/user-profile.ts';

test('validates calendar dates and rejects impossible dates', () => {
  assert.equal(isIsoCalendarDate('2004-02-29'), true);
  assert.equal(isIsoCalendarDate('2003-02-29'), false);
  assert.equal(isIsoCalendarDate('2004-2-09'), false);
});

test('compares date of birth with the Vietnam calendar date', () => {
  const now = new Date('2026-09-28T17:00:00.000Z');
  assert.equal(currentVietnamDate(now), '2026-09-29');
  assert.equal(isBirthDateAllowed('2026-09-29', now), true);
  assert.equal(isBirthDateAllowed('2026-09-30', now), false);
  assert.equal(isBirthDateAllowed(null, now), false);
});

test('allows only the supported optional gender values', () => {
  assert.equal(isProfileGender('prefer_not_to_say'), true);
  assert.equal(isProfileGender('unknown'), false);
});
