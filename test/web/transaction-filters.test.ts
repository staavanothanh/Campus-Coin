import assert from 'node:assert/strict';
import test from 'node:test';
import type { Transaction } from '../../src/web/types.ts';
import { groupTransactions, isValidDateRange, transactionListPath } from '../../src/web/transaction-filters.ts';

function transaction(id: string, occurredAt: string): Transaction {
  return {
    id,
    type: 'income',
    amountVnd: 1000,
    categoryId: 'salary',
    occurredAt,
    description: null,
    role: 'adjustment',
    referenceId: null,
    createdAt: occurredAt,
  };
}

test('converts inclusive date filters to the API half-open HCMC interval', () => {
  const url = new URL(transactionListPath('payment', '2026-09-27', '2026-09-27'), 'http://localhost');
  assert.equal(url.searchParams.get('type'), 'payment');
  assert.equal(url.searchParams.get('from'), '2026-09-26T17:00:00.000Z');
  assert.equal(url.searchParams.get('to'), '2026-09-27T17:00:00.000Z');
});

test('rejects impossible or reversed date ranges', () => {
  assert.equal(isValidDateRange('2026-02-30', ''), false);
  assert.equal(isValidDateRange('2026-09-28', '2026-09-27'), false);
  assert.equal(isValidDateRange('', '2026-09-27'), true);
});

test('groups and sorts transactions by their Asia/Ho_Chi_Minh date', () => {
  const values = [
    transaction('late', '2026-09-27T17:00:00.000Z'),
    transaction('early', '2026-09-27T16:59:59.000Z'),
    transaction('mid', '2026-09-27T09:00:00.000Z'),
  ];
  const dayGroups = groupTransactions(values, 'day');
  assert.deepEqual(dayGroups.map(group => group.key), ['2026-09-28', '2026-09-27']);
  assert.deepEqual(dayGroups[1]?.transactions.map(item => item.id), ['early', 'mid']);
  assert.deepEqual(groupTransactions(values, 'month').map(group => group.key), ['2026-09']);
});
