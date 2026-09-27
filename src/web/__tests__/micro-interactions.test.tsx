import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CategorySelect } from '../components/CategorySelect.js';
import { Modal } from '../components/Modal.js';
import { SavingsTransferForm } from '../components/SavingsTransferForm.js';
import { TransactionForm } from '../components/TransactionForm.js';
import { App } from '../App.js';
import { ReportsScreen } from '../screens/ReportsScreen.js';
import { TransactionsScreen } from '../screens/TransactionsScreen.js';
import { copy } from '../i18n.js';

const { apiGetMock, apiGetPagedMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiGetPagedMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  apiGet: apiGetMock,
  apiGetPaged: apiGetPagedMock,
  apiPost: apiPostMock,
  setUnauthorizedHandler: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {},
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
});

beforeEach(() => {
  apiGetMock.mockReset().mockResolvedValue([]);
  apiGetPagedMock.mockReset().mockResolvedValue({ data: [], meta: { cursor: null, hasNext: false } });
  apiPostMock.mockReset().mockResolvedValue({ budgetWarning: null });
});

describe('micro interactions', () => {
  it('focuses the requested modal control and restores page scrolling and focus', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    const { unmount } = render(
      <Modal isOpen onClose={() => {}} ariaLabel="Test dialog">
        <button>First action</button>
        <input data-testid="preferred-control" data-modal-autofocus />
      </Modal>,
    );

    expect(document.activeElement).toBe(screen.getByTestId('preferred-control'));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('retries category loading without asking the user to reload the page', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(
      <CategorySelect
        appliesTo="payment"
        value=""
        onChange={() => {}}
        locale="vi"
        label="Danh mục"
        placeholder="Chọn danh mục"
      />,
    );

    expect(await screen.findByText('Không tải được danh mục.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại danh mục' }));

    await waitFor(() => expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false));
    expect(apiGetMock).toHaveBeenCalledTimes(2);
  });

  it('shows a saved receipt before closing a successful transaction form', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    apiGetMock.mockResolvedValue([{
      id: '5',
      appliesTo: 'payment',
      status: 'active',
      name: { vi: 'Ăn uống', en: 'Food & Dining' },
    }]);
    render(
      <TransactionForm
        kind="payment"
        csrfToken="csrf-test"
        t={copy.vi}
        locale="vi"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const amount = screen.getByLabelText(/Số tiền/);
    await waitFor(() => expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false));
    const category = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(amount, { target: { value: '50000' } });
    fireEvent.change(category, { target: { value: category.options[1]?.value } });
    fireEvent.change(screen.getByLabelText(/Mô tả/), { target: { value: 'Ăn trưa' } });
    fireEvent.submit(amount.closest('form')!);

    expect(await screen.findByText(copy.vi.transactionSaved)).toBeDefined();
    expect(apiPostMock).toHaveBeenCalledOnce();
    expect(apiPostMock.mock.calls[0]?.[1]).toMatchObject({ type: 'payment', amountVnd: 50000 });
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: copy.vi.close }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps a savings transfer receipt open until the user closes it', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(
      <SavingsTransferForm
        direction="deposit"
        csrfToken="csrf-test"
        t={copy.vi}
        locale="vi"
        currentWalletVnd={100000}
        currentSavingsVnd={0}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const amount = screen.getByLabelText(/Số tiền/);
    fireEvent.change(amount, { target: { value: '20000' } });
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: 'Quỹ dự phòng' } });
    fireEvent.submit(amount.closest('form')!);

    expect(await screen.findByText('Đã lưu giao dịch tiết kiệm')).toBeDefined();
    expect(apiPostMock).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Quỹ dự phòng')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: copy.vi.close }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('distinguishes a failed report request from an empty month and offers retry', async () => {
    let reportRequests = 0;
    apiGetMock.mockImplementation((path: string) => {
      if (path.startsWith('/reports/monthly')) {
        reportRequests += 1;
        if (reportRequests === 1) return Promise.reject(new Error('offline'));
        return Promise.resolve({
          month: '2026-09',
          openingWalletBalanceVnd: 0,
          totalIncomeVnd: 0,
          totalPaymentVnd: 0,
          closingWalletBalanceVnd: 0,
          categoryBreakdown: [],
        });
      }
      return Promise.resolve([]);
    });

    render(<ReportsScreen csrfToken="csrf-test" t={copy.vi} locale="vi" />);

    expect((await screen.findByRole('alert')).textContent).toContain('offline');
    expect(screen.queryByText(copy.vi.noData)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }));

    expect(await screen.findByText(copy.vi.noData)).toBeDefined();
    expect(reportRequests).toBe(2);
  });

  it('does not show a zero transaction total when refreshing failed', async () => {
    const page = {
      data: [{
        id: 'tx-1',
        type: 'income',
        amountVnd: 20000,
        categoryId: '1',
        occurredAt: '2026-09-27T00:00:00.000Z',
        description: null,
        role: 'original',
        referenceId: null,
        createdAt: '2026-09-27T00:00:00.000Z',
      }],
      meta: { cursor: null, hasNext: true },
    };
    apiGetPagedMock.mockImplementation(() => {
      if (apiGetPagedMock.mock.calls.length > 1) return Promise.reject(new Error('offline'));
      return Promise.resolve(page);
    });

    const { container } = render(<TransactionsScreen t={copy.vi} locale="vi" />);
    await waitFor(() => expect(container.querySelector('.transactions-summary-chip strong')?.textContent).toBe('+20.000 VND'));

    fireEvent.click(screen.getByRole('button', { name: copy.vi.spending }));

    await waitFor(() => expect(container.querySelector('.transactions-summary-chip strong')?.textContent).toBe('Không khả dụng'));
    expect(screen.queryByText('+0 VND')).toBeNull();
  });

  it('keeps keyboard focus inside the mobile navigation drawer', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: { id: '7', displayName: 'Demo', email: 'demo@example.test', locale: 'vi', role: 'user' },
          csrfToken: 'csrf-test',
          googleLinked: false,
          walletInitialized: false,
        });
      }
      if (path === '/reports/dashboard') {
        return Promise.resolve({ wallet: null, savings: null, currentMonth: null, recentTransactions: [] });
      }
      return Promise.resolve([]);
    });

    const { container } = render(<App />);
    const menuTrigger = await screen.findByRole('button', { name: copy.vi.menu });
    fireEvent.click(menuTrigger);

    const dialog = await screen.findByRole('dialog');
    const first = dialog.querySelector<HTMLButtonElement>('.sidebar-close');
    const last = dialog.querySelector<HTMLButtonElement>('.signout-button');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(container.querySelector('main.main-content')?.hasAttribute('inert')).toBe(true);
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();

    last?.focus();
    fireEvent.keyDown(last!, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    menuTrigger.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(menuTrigger);
    expect(document.body.style.overflow).toBe('');

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });
});
