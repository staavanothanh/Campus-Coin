import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCategoryName } from '../../src/web/category-names.js';
import type { Category } from '../../src/web/types.js';

const customCategory: Category = {
  id: '42',
  name: { en: 'Books', vi: 'Sách' },
  appliesTo: 'payment',
  status: 'active',
  isDefault: false,
};

test('formats canonical seeded categories in the active locale', () => {
  assert.equal(formatCategoryName('1', [], 'en'), 'Salary');
  assert.equal(formatCategoryName('1', [], 'vi'), 'Lương');
  assert.equal(formatCategoryName('4', [], 'vi'), 'Khác');
  assert.equal(formatCategoryName('11', [], 'vi'), 'Khác');
});

test('prefers the server category name for custom categories', () => {
  assert.equal(formatCategoryName('42', [customCategory], 'en'), 'Books');
  assert.equal(formatCategoryName('42', [customCategory], 'vi'), 'Sách');
});

test('falls back to the available server name or ID when a localized name is absent', () => {
  const partialCategory: Category = { ...customCategory, name: { en: 'Books', vi: '' } };
  assert.equal(formatCategoryName('42', [partialCategory], 'vi'), 'Books');
  assert.equal(formatCategoryName('999', [], 'vi'), '999');
});
