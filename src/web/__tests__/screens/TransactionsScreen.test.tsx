import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { copy } from '../../i18n.js';
import { TransactionsScreen } from '../../screens/TransactionsScreen.js';
import type { Category, Transaction } from '../../types.js';

const { apiGetMock, apiGetPagedMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiGetPagedMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../../api-client.js', () => ({
  apiGet: apiGetMock,
  apiGetPaged: apiGetPagedMock,
  apiPost: apiPostMock,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    apiError: { code: string; message: string } | null;

    constructor(status: number, apiError: { code: string; message: string } | null) {
      super(apiError?.message ?? `HTTP_${status}`);
      this.status = status;
      this.apiError = apiError;
    }
  },
}));

const transaction: Transaction = {
  id: '41',
  type: 'payment',
  amountVnd: 90_000,
  categoryId: '5',
  occurredAt: '2026-09-28T00:00:00.000Z',
  description: 'Mua đồ ăn',
  itemName: 'Bữa trưa',
  role: 'original',
  referenceId: null,
  createdAt: '2026-09-28T01:00:00.000Z',
};

const categories: Category[] = [
  { id: '5', name: { en: 'Food', vi: 'Ăn uống' }, appliesTo: 'payment', status: 'active', isDefault: true },
  { id: '6', name: { en: 'Transport', vi: 'Di chuyển' }, appliesTo: 'payment', status: 'active', isDefault: true },
  { id: '7', name: { en: 'Disabled', vi: 'Đã tắt' }, appliesTo: 'payment', status: 'disabled', isDefault: false },
];

function renderTransactions(row: Transaction = transaction) {
  apiGetMock.mockImplementation((path: string) => path === '/categories' ? Promise.resolve(categories) : Promise.resolve([]));
  apiGetPagedMock.mockResolvedValue({ data: [row], meta: { cursor: null, hasNext: false } });
  return render(<TransactionsScreen t={copy.vi} locale="vi" csrfToken="csrf-test" />);
}

describe('transaction corrections', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetPagedMock.mockReset();
    apiPostMock.mockReset().mockResolvedValue({});
  });

  it('posts a replacement with CSRF, idempotency, amount, category, and reason', async () => {
    renderTransactions();
    fireEvent.click(await screen.findByRole('button', { name: 'Đính chính giao dịch 41' }));

    fireEvent.change(screen.getByRole('combobox', { name: 'Cách đính chính' }), { target: { value: 'replacement' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Số tiền đúng (VND)' }), { target: { value: '120000' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Danh mục mới (tùy chọn)' }), { target: { value: '6' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Lý do' }), { target: { value: 'Chọn nhầm danh mục và nhập thiếu tiền' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đính chính' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    const [path, body, headers] = apiPostMock.mock.calls[0] as [string, Record<string, unknown>, Record<string, string>];
    expect(path).toBe('/ledger/transactions/41/corrections');
    expect(body).toEqual({
      correctionRole: 'replacement',
      reason: 'Chọn nhầm danh mục và nhập thiếu tiền',
      newAmountVnd: 120_000,
      newCategoryId: '6',
    });
    expect(headers['X-CSRF-Token']).toBe('csrf-test');
    expect(headers['Idempotency-Key']).toBeTruthy();
    expect((await screen.findByRole('status')).textContent).toContain('Đã ghi đính chính');
  });

  it('does not allow creating a correction from a correction row', async () => {
    renderTransactions({ ...transaction, id: '42', role: 'reversal', referenceId: '41' });

    expect(await screen.findByText('Đã ghi')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Đính chính giao dịch 42' })).toBeNull();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('shows corrections as history amounts without treating them as another income or payment', async () => {
    const reversal: Transaction = {
      ...transaction,
      id: '42',
      role: 'reversal',
      referenceId: '41',
      createdAt: '2026-09-28T02:00:00.000Z',
    };
    apiGetMock.mockImplementation((path: string) => path === '/categories' ? Promise.resolve(categories) : Promise.resolve([]));
    apiGetPagedMock.mockResolvedValue({ data: [reversal, transaction], meta: { cursor: null, hasNext: false } });

    const { container } = render(<TransactionsScreen t={copy.vi} locale="vi" csrfToken="csrf-test" />);

    expect(await screen.findByText('Số tiền được đảo')).toBeDefined();
    expect(container.querySelector('.transactions-summary-chip strong')?.textContent).toBe('2');
    const correctionRow = screen.getAllByText('Số tiền được đảo')[0]?.closest('tr');
    expect(correctionRow).not.toBeNull();
    expect(within(correctionRow as HTMLElement).getByText('90.000 VND')).toBeDefined();
    expect(within(correctionRow as HTMLElement).queryByText('+90.000 VND')).toBeNull();
    expect(within(correctionRow as HTMLElement).queryByText('-90.000 VND')).toBeNull();
  });

  it('keeps the modal cancel action side-effect free', async () => {
    renderTransactions();
    fireEvent.click(await screen.findByRole('button', { name: 'Đính chính giao dịch 41' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Đính chính giao dịch' })).toBeNull());
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
