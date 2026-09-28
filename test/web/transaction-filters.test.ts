import assert from 'node:assert/strict';
import test from 'node:test';
import type { Transaction } from '../../src/web/types.ts';
import { calendarMonthRange, defaultTransactionDateRange, groupTransactions, isValidDateRange, summarizeTransactions, transactionListPath } from '../../src/web/transaction-filters.ts';

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

test('selects complete calendar months including leap years for historical transaction lookup', () => {
  assert.deepEqual(calendarMonthRange('2026-09'), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(calendarMonthRange('2024-02'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(calendarMonthRange('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  assert.equal(calendarMonthRange('2026-13'), null);
  assert.equal(calendarMonthRange('2026-9'), null);
});

test('keeps income, payment and net totals separate for the selected rows', () => {
  const values = [
    { ...transaction('income-1', '2026-09-27T09:00:00.000Z'), amountVnd: 1_000_000 },
    { ...transaction('income-2', '2026-09-27T10:00:00.000Z'), amountVnd: 300_000 },
    { ...transaction('payment-1', '2026-09-27T11:00:00.000Z'), type: 'payment' as const, amountVnd: 200_000 },
  ];
  assert.deepEqual(summarizeTransactions(values), { income: 1_300_000, payment: 200_000, net: 1_100_000 });
  assert.deepEqual(summarizeTransactions([]), { income: 0, payment: 0, net: 0 });
});

test('defaults to the full Asia/Ho_Chi_Minh month so earlier transactions remain visible', () => {
  const now = new Date('2026-08-31T17:30:00.000Z');
  assert.deepEqual(defaultTransactionDateRange(now), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(defaultTransactionDateRange(new Date('2024-02-10T05:00:00.000Z')), {
    from: '2024-02-01',
    to: '2024-02-29',
  });
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
