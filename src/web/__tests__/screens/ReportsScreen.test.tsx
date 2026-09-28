import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ReportsScreen } from '../../screens/ReportsScreen.js';
import { copy } from '../../i18n.js';
import { formatMonth, getCurrentMonth } from '../../format.js';
import type { Category, MonthlyReport } from '../../types.js';

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }));

vi.mock('../../api-client.js', () => ({ apiGet: apiGetMock }));

afterEach(() => cleanup());

beforeEach(() => apiGetMock.mockReset());

function getPreviousMonth(month: string): string {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  return monthNumber === 1
    ? `${year - 1}-12`
    : `${year}-${String(monthNumber - 1).padStart(2, '0')}`;
}

const categories: Category[] = [
  { id: 'food', name: { vi: 'Ăn uống', en: 'Food' }, appliesTo: 'payment', status: 'active', isDefault: true },
  { id: 'books', name: { vi: 'Sách học', en: 'Books' }, appliesTo: 'payment', status: 'active', isDefault: true },
  { id: 'transport', name: { vi: 'Đi lại', en: 'Transport' }, appliesTo: 'payment', status: 'active', isDefault: true },
];

function makeReport(month: string, categoryBreakdown: MonthlyReport['categoryBreakdown']): MonthlyReport {
  return {
    month,
    openingWalletBalanceVnd: 0,
    totalIncomeVnd: 0,
    totalPaymentVnd: categoryBreakdown.reduce((sum, category) => sum + category.amountVnd, 0),
    closingWalletBalanceVnd: 0,
    categoryBreakdown,
  };
}

describe('ReportsScreen category month comparison', () => {
  it('compares the selected and previous month with signed VND deltas, including a zero previous amount', async () => {
    const currentMonth = getCurrentMonth();
    const previousMonth = getPreviousMonth(currentMonth);
    apiGetMock.mockImplementation(async (path: string) => {
      if (typeof path !== 'string') return [];
      if (path === '/categories') return categories;
      if (path.startsWith('/budgets?')) return [];
      if (path === `/reports/monthly?month=${currentMonth}`) {
        return makeReport(currentMonth, [{ categoryId: 'food', amountVnd: 70000 }]);
      }
      if (path === `/reports/monthly?month=${previousMonth}`) {
        return makeReport(previousMonth, [
          { categoryId: 'books', amountVnd: 10000 },
          { categoryId: 'transport', amountVnd: 20000 },
        ]);
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<ReportsScreen csrfToken="csrf-test" t={copy.vi} locale="vi" />);

    const currentLabel = formatMonth(currentMonth, 'vi');
    const previousLabel = formatMonth(previousMonth, 'vi');
    const table = await screen.findByRole('table', {
      name: `Chi tiêu theo danh mục: ${currentLabel} so với ${previousLabel}`,
    });

    expect(apiGetMock).toHaveBeenCalledWith(`/reports/monthly?month=${previousMonth}`);
    expect(within(table).getByRole('columnheader', { name: currentLabel })).toBeDefined();
    expect(within(table).getByRole('columnheader', { name: previousLabel })).toBeDefined();

    const foodRow = within(table).getByRole('row', { name: /Ăn uống/ });
    expect(within(foodRow).getByText('70.000 VND')).toBeDefined();
    expect(within(foodRow).getByText('Chưa ghi nhận')).toBeDefined();
    expect(within(foodRow).getByText('+70.000 VND')).toBeDefined();

    const booksRow = within(table).getByRole('row', { name: /Sách học/ });
    expect(within(booksRow).getByText('−10.000 VND')).toBeDefined();
    expect(table.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('keeps the selected-month report visible when the previous-month request fails', async () => {
    const currentMonth = getCurrentMonth();
    const previousMonth = getPreviousMonth(currentMonth);
    apiGetMock.mockImplementation(async (path: string) => {
      if (typeof path !== 'string') return [];
      if (path === '/categories') return categories;
      if (path.startsWith('/budgets?')) return [];
      if (path === `/reports/monthly?month=${currentMonth}`) {
        return {
          ...makeReport(currentMonth, [{ categoryId: 'food', amountVnd: 50000 }]),
          totalIncomeVnd: 125000,
        };
      }
      if (path === `/reports/monthly?month=${previousMonth}`) throw new Error('offline');
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<ReportsScreen csrfToken="csrf-test" t={copy.vi} locale="vi" />);

    expect(await screen.findByRole('heading', { name: 'Tương quan Thu - Chi' })).toBeDefined();
    expect(await screen.findByText(
      `Chưa thể tải dữ liệu ${formatMonth(previousMonth, 'vi')}. Báo cáo ${formatMonth(currentMonth, 'vi')} vẫn dùng được.`,
    )).toBeDefined();
    expect(screen.getAllByText('+125.000 VND').length).toBeGreaterThan(0);
  });
});
