import assert from 'node:assert/strict';
import test from 'node:test';
import { isApplicableCategorySuggestion } from '../../src/web/jev-suggestion.ts';

const suggested = { status: 'suggested' as const, categoryId: '7', confidence: 0.92, reasonCode: null };

test('accepts a selectable JEV suggestion when no manual override exists', () => {
  assert.equal(isApplicableCategorySuggestion(suggested, false, ['4', '7']), true);
});

test('rejects JEV suggestions after manual override or when category is unavailable', () => {
  assert.equal(isApplicableCategorySuggestion(suggested, true, ['7']), false);
  assert.equal(isApplicableCategorySuggestion(suggested, false, ['4']), false);
});

test('does not apply fallback statuses', () => {
  assert.equal(isApplicableCategorySuggestion({ ...suggested, status: 'manual', categoryId: null }, false, ['7']), false);
});
