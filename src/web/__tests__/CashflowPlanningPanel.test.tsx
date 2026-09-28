import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CashflowPlanningPanel } from '../components/CashflowPlanningPanel.js';
import type { Category } from '../types.js';

const { apiGetMock, apiPostMock, apiPatchMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPatch: apiPatchMock,
}));

afterEach(() => cleanup());

const categories: Category[] = [
  { id: '12', name: { vi: 'Nhà ở', en: 'Housing' }, appliesTo: 'payment', status: 'active', isDefault: true },
];

const forecast = {
  asOfDate: '2026-09-28',
  days: 30,
  endDate: '2026-10-27',
  walletStatus: 'initialized' as const,
  currentWalletBalanceVnd: 900000,
  plannedIncomeVnd: 1000000,
  plannedObligationsVnd: 500000,
  reservedObligationsVnd: 300000,
  unreservedObligationsVnd: 200000,
  projectedWalletBalanceVnd: 1600000,
  events: [{
    planId: '4',
    kind: 'obligation' as const,
    title: 'Tiền phòng',
    amountVnd: 500000,
    dueDate: '2026-10-03',
    reserveInForecast: true,
    reminderStatus: 'due_soon' as const,
    isDueWithin10Days: true,
  }],
  assumptions: [],
};

beforeEach(() => {
  apiGetMock.mockReset().mockImplementation(async (path: string) => {
    if (path === '/cashflow/plans') return [];
    if (path === '/cashflow/forecast?days=30') return forecast;
    if (path.startsWith('/cashflow/reflection?month=')) return null;
    throw new Error(`Unexpected GET: ${path}`);
  });
  apiPostMock.mockReset().mockResolvedValue({});
  apiPatchMock.mockReset().mockResolvedValue({});
});

describe('CashflowPlanningPanel', () => {
  it('lets the user extend the planning horizon and uses the same period for what-if', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/cashflow/plans') return [];
      if (path === '/cashflow/forecast?days=30') return forecast;
      if (path === '/cashflow/forecast?days=180') {
        return { ...forecast, days: 180, endDate: '2027-03-27' };
      }
      if (path.startsWith('/cashflow/reflection?month=')) return null;
      throw new Error(`Unexpected GET: ${path}`);
    });
    apiPostMock.mockResolvedValue({
      paymentDate: '2026-09-28',
      hypotheticalPaymentVnd: 100000,
      baselineProjectedWalletBalanceVnd: 1600000,
      scenarioProjectedWalletBalanceVnd: 1500000,
      baselineProjectedWalletBalanceOnPaymentDateVnd: 900000,
      scenarioProjectedWalletBalanceOnPaymentDateVnd: 800000,
      baselineLowestProjectedWalletBalanceVnd: 900000,
      scenarioLowestProjectedWalletBalanceVnd: 800000,
    });

    render(<CashflowPlanningPanel csrfToken="csrf-test" locale="vi" categories={categories} />);
    const period = await screen.findByLabelText('Khoảng xem dự báo');
    fireEvent.change(period, { target: { value: '180' } });

    expect(await screen.findByText('Số dư dự kiến cuối 180 ngày')).toBeDefined();
    expect(apiGetMock).toHaveBeenCalledWith('/cashflow/forecast?days=180');
    fireEvent.change(screen.getByLabelText('Số tiền (VND)'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem thử' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/cashflow/what-if',
      { amountVnd: 100000, paymentDate: '2026-09-28', days: 180 },
      { 'X-CSRF-Token': 'csrf-test' },
    ));
  });

  it('shows due-soon reminders and creates an optional recurring plan without changing a transaction', async () => {
    render(<CashflowPlanningPanel csrfToken="csrf-test" locale="vi" categories={categories} />);

    expect(await screen.findByText('Tiền phòng')).toBeDefined();
    expect(screen.getByText('Sắp đến hạn')).toBeDefined();
    expect(screen.getByRole('note').textContent).toMatch(/không cộng\/trừ vào dự báo/);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm kế hoạch' }));
    fireEvent.change(screen.getByLabelText('Tên khoản'), { target: { value: 'Tiền điện' } });
    fireEvent.change(screen.getAllByLabelText('Số tiền (VND)')[0]!, { target: { value: '120000' } });
    fireEvent.change(screen.getByLabelText('Ngày đến hạn đầu tiên'), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText('Lặp lại'), { target: { value: 'monthly' } });
    fireEvent.click(screen.getByLabelText('Tính trước khoản này trong số dư dự báo'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kế hoạch' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/cashflow/plans',
      {
        kind: 'obligation',
        title: 'Tiền điện',
        amountVnd: 120000,
        categoryId: null,
        frequency: 'monthly',
        startsOn: '2026-10-05',
        dueDay: 5,
        reserveInForecast: true,
      },
      expect.objectContaining({
        'X-CSRF-Token': 'csrf-test',
        'Idempotency-Key': expect.any(String),
      }),
    ));
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('runs a what-if preview through the API and describes it as hypothetical', async () => {
    apiPostMock.mockResolvedValue({
      paymentDate: '2026-09-28',
      hypotheticalPaymentVnd: 100000,
      baselineProjectedWalletBalanceVnd: 1600000,
      scenarioProjectedWalletBalanceVnd: 1500000,
      baselineProjectedWalletBalanceOnPaymentDateVnd: 900000,
      scenarioProjectedWalletBalanceOnPaymentDateVnd: 800000,
      baselineLowestProjectedWalletBalanceVnd: 900000,
      scenarioLowestProjectedWalletBalanceVnd: 800000,
    });

    render(<CashflowPlanningPanel csrfToken="csrf-test" locale="vi" categories={categories} />);
    await screen.findByText('Tiền phòng');
    fireEvent.change(screen.getByLabelText('Số tiền (VND)'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem thử' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/cashflow/what-if',
      { amountVnd: 100000, paymentDate: '2026-09-28', days: 30 },
      { 'X-CSRF-Token': 'csrf-test' },
    ));
    expect(await screen.findByText(/Kết quả không lưu giao dịch/)).toBeDefined();
    expect((await screen.findByText('1.500.000 VND')).textContent).toBe('1.500.000 VND');
  });

  it('asks before disabling a plan and lets the user turn it back on', async () => {
    const plans = [{
      id: '4',
      kind: 'obligation' as const,
      title: 'Tiền phòng',
      amountVnd: 500000,
      categoryId: '12',
      frequency: 'monthly' as const,
      startsOn: '2026-09-03',
      dueDay: 3,
      reserveInForecast: true,
      isActive: true,
    }];
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/cashflow/plans') return plans;
      if (path === '/cashflow/forecast?days=30') return { ...forecast, events: [] };
      if (path.startsWith('/cashflow/reflection?month=')) return null;
      throw new Error(`Unexpected GET: ${path}`);
    });
    apiPatchMock.mockImplementation(async (_path: string, body: { isActive?: boolean }) => {
      plans[0]!.isActive = body.isActive ?? plans[0]!.isActive;
      return {};
    });

    render(<CashflowPlanningPanel csrfToken="csrf-test" locale="vi" categories={categories} />);
    await screen.findAllByText('Tiền phòng');

    fireEvent.click(screen.getByRole('button', { name: 'Tắt nhắc' }));
    expect(screen.getByText('Tắt “Tiền phòng” khỏi nhắc nhở và dự báo?')).toBeDefined();
    expect(apiPatchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Giữ lại' }));
    expect(apiPatchMock).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tắt nhắc' })).toBe(document.activeElement));
    fireEvent.click(screen.getByRole('button', { name: 'Tắt nhắc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tắt' }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledWith(
      '/cashflow/plans/4',
      { isActive: false },
      expect.objectContaining({ 'X-CSRF-Token': 'csrf-test', 'Idempotency-Key': expect.any(String) }),
    ));
    await waitFor(() => expect(screen.queryByText('Tiền phòng')).toBeNull());
    expect(await screen.findByText(/Đã tắt nhắc và dự báo/)).toBeDefined();

    fireEvent.click(screen.getByLabelText('Hiện kế hoạch đã tắt'));
    await screen.findByText('Tiền phòng');
    fireEvent.click(screen.getByRole('button', { name: 'Bật lại' }));
    await waitFor(() => expect(apiPatchMock).toHaveBeenLastCalledWith(
      '/cashflow/plans/4',
      { isActive: true },
      expect.objectContaining({ 'X-CSRF-Token': 'csrf-test', 'Idempotency-Key': expect.any(String) }),
    ));
    expect(await screen.findByText('Đã bật lại “Tiền phòng”.')).toBeDefined();
  });
});
