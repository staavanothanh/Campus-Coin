import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CategorySelect } from '../components/CategorySelect.js';
import { Modal } from '../components/Modal.js';
import { SavingsTransferForm } from '../components/SavingsTransferForm.js';
import { TransactionForm } from '../components/TransactionForm.js';
import { App } from '../App.js';
import { ReportsScreen } from '../screens/ReportsScreen.js';
import { TransactionsScreen } from '../screens/TransactionsScreen.js';
import { copy } from '../i18n.js';
import { todayInHcmc } from '../transaction-date.js';
import type { Session } from '../types.js';

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
  vi.useRealTimers();
  window.history.replaceState({}, document.title, '/');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
});

beforeEach(() => {
  apiGetMock.mockReset().mockResolvedValue([]);
  apiGetPagedMock.mockReset().mockResolvedValue({ data: [], meta: { cursor: null, hasNext: false } });
  apiPostMock.mockReset().mockResolvedValue({ budgetWarning: null });
});

describe('micro interactions', () => {
  it('announces the selected transaction type to assistive technology', () => {
    render(
      <TransactionForm
        kind="payment"
        csrfToken="csrf-test"
        t={copy.vi}
        locale="vi"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    const group = screen.getByRole('group', { name: 'Loại giao dịch' });
    const payment = screen.getByRole('button', { name: 'Khoản chi' });
    const income = screen.getByRole('button', { name: 'Khoản thu' });
    expect(group).toBeDefined();
    expect(payment.getAttribute('aria-pressed')).toBe('true');
    expect(income.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(income);
    expect(payment.getAttribute('aria-pressed')).toBe('false');
    expect(income.getAttribute('aria-pressed')).toBe('true');
  });

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
    await waitFor(() => expect((screen.getByRole('combobox', { name: /Danh mục/ }) as HTMLSelectElement).disabled).toBe(false));
    const category = screen.getByRole('combobox', { name: /Danh mục/ }) as HTMLSelectElement;
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

  it('explains in English when the current purchase interval matches the previous one', async () => {
    const currentDate = todayInHcmc();
    const shiftDate = (date: string, days: number) => {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
    };
    const lastPurchase = shiftDate(currentDate, -8);
    const previousPurchase = shiftDate(lastPurchase, -8);

    apiGetMock.mockImplementation((path: string) => {
      if (path === '/ledger/item-suggestions') {
        return Promise.resolve({
          items: [{
            itemName: 'Coffee',
            frequency: 3,
            lastAmountVnd: 50000,
            lastOccurredAt: `${lastPurchase}T00:00:00+07:00`,
            previousOccurredAt: `${previousPurchase}T00:00:00+07:00`,
          }],
        });
      }
      return Promise.resolve([]);
    });

    render(
      <TransactionForm
        kind="payment"
        csrfToken="csrf-test"
        t={copy.en}
        locale="en"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(copy.en.transactionDate), { target: { value: currentDate } });
    const itemInput = screen.getByLabelText(copy.en.itemName);
    fireEvent.focus(itemInput);
    fireEvent.change(itemInput, { target: { value: 'Coffee' } });

    expect(await screen.findByText(copy.en.itemHistoryIntervalSame)).toBeDefined();
    expect(screen.getByText(copy.en.itemHistoryCurrentInterval.replace('{days}', '8'))).toBeDefined();
    expect(screen.getByText(copy.en.itemHistoryPreviousInterval.replace('{days}', '8'))).toBeDefined();
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
    expect(reportRequests).toBe(3);
  });

  it('keeps transaction summary unavailable when refreshing failed', async () => {
    const page = {
      data: [{
        id: 'tx-1',
        type: 'income',
        amountVnd: 20000,
        categoryId: '1',
        occurredAt: '2026-09-27T00:00:00.000Z',
        description: null,
        itemName: null,
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

    const { container } = render(<TransactionsScreen t={copy.vi} locale="vi" csrfToken="csrf-test" />);
    await waitFor(() => expect(container.querySelector('.transactions-summary-chip strong')?.textContent).toBe('1'));

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

  it('shows sign-out failures while Google profile completion is required', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: {
            id: '7',
            displayName: 'Demo',
            hasLocalPassword: false,
            requiresProfileCompletion: true,
            email: 'demo@example.test',
            locale: 'vi',
            role: 'user',
          },
          csrfToken: 'csrf-test',
          googleLinked: true,
          walletInitialized: false,
        });
      }
      return Promise.resolve([]);
    });
    apiPostMock.mockRejectedValueOnce(new Error('offline'));

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Đăng xuất/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể đăng xuất. Vui lòng thử lại.');
  });

  it('waits for the session before showing a Google login success notice', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.history.replaceState({}, document.title, '/?auth=google_login');
    let resolveSession!: (session: Session) => void;
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return new Promise(resolve => { resolveSession = resolve; });
      }
      if (path === '/reports/dashboard') {
        return Promise.resolve({ wallet: null, savings: null, currentMonth: null, recentTransactions: [] });
      }
      return Promise.resolve([]);
    });

    render(<App />);

    expect(screen.queryByRole('status')).toBeNull();
    await act(async () => {
      resolveSession({
        user: {
          id: '7',
          displayName: 'Demo',
          hasLocalPassword: true,
          requiresProfileCompletion: false,
          email: 'demo@example.test',
          locale: 'vi',
          role: 'user',
        },
        csrfToken: 'csrf-test',
        googleLinked: false,
        walletInitialized: false,
      });
    });
    expect((await screen.findByRole('status')).textContent).toContain('Đăng nhập Google thành công.');
  });

  it('automatically dismisses an OAuth notice when React StrictMode replays effects', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    window.history.replaceState({}, document.title, '/?auth=google_linked');
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: { id: '7', displayName: 'Demo', email: 'demo@example.test', locale: 'vi', role: 'user' },
          csrfToken: 'csrf-test',
          googleLinked: true,
          walletInitialized: false,
        });
      }
      if (path === '/reports/dashboard') {
        return Promise.resolve({ wallet: null, savings: null, currentMonth: null, recentTransactions: [] });
      }
      return Promise.resolve([]);
    });

    render(<StrictMode><App /></StrictMode>);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('status').textContent).toContain('Đã kết nối Google thành công.');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
