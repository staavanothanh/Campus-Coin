import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CANONICAL_CATEGORIES,
  CANONICAL_CATEGORY_COUNTS,
  semanticCategoryKey,
} from '../../src/domain/category-taxonomy.ts';

test('canonical taxonomy contains exactly four income and seven payment categories', () => {
  assert.equal(CANONICAL_CATEGORIES.length, 11);
  assert.deepEqual(
    CANONICAL_CATEGORIES.reduce((counts, category) => ({ ...counts, [category.type]: counts[category.type] + 1 }), { income: 0, payment: 0 }),
    CANONICAL_CATEGORY_COUNTS,
  );
});

test('semantic category matching rejects aliases that duplicate canonical meanings', () => {
  assert.equal(semanticCategoryKey('Lương làm thêm', 'income'), 'income_salary');
  assert.equal(semanticCategoryKey('Healthcare & Medical', 'payment'), null);
  assert.equal(semanticCategoryKey('Ăn uống', 'payment'), 'payment_food');
  assert.equal(semanticCategoryKey('Gym', 'payment'), null);
});
