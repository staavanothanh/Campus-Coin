import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CashflowAtAGlance } from '../components/CashflowAtAGlance.js';

const { apiGetMock, apiPatchMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock('../api-client.js', () => ({ apiGet: apiGetMock, apiPatch: apiPatchMock }));

afterEach(() => cleanup());

beforeEach(() => {
  apiGetMock.mockReset().mockResolvedValue({
    asOfDate: '2026-09-28',
    endDate: '2026-10-27',
    projectedWalletBalanceVnd: 1200000,
    events: [{
      planId: '15',
      kind: 'obligation',
      title: 'Tiền nhà',
      amountVnd: 500000,
      dueDate: '2026-10-03',
      reserveInForecast: false,
      isDueWithin10Days: true,
    }],
  });
  apiPatchMock.mockReset().mockResolvedValue({});
});

describe('CashflowAtAGlance', () => {
  it('shows due-soon bills and lets the owner include a bill in the forecast only', async () => {
    render(<CashflowAtAGlance csrfToken="csrf-test" locale="vi" balanceVersion={100} onViewPlans={vi.fn()} />);

    expect(await screen.findByText('Tiền nhà')).toBeDefined();
    expect(screen.getByText(/Còn tối đa 10 ngày/)).toBeDefined();
    expect(screen.getByRole('note').textContent).toMatch(/tránh tính hai lần/);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Tính trước' }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledWith(
      '/cashflow/plans/15',
      { reserveInForecast: true },
      expect.objectContaining({
        'X-CSRF-Token': 'csrf-test',
        'Idempotency-Key': expect.any(String),
      }),
    ));
  });

  it('refreshes the estimate after wallet balance changes', async () => {
    const { rerender } = render(
      <CashflowAtAGlance csrfToken="csrf-test" locale="vi" balanceVersion={100} onViewPlans={vi.fn()} />,
    );
    await screen.findByText('1.200.000 VND');
    apiGetMock.mockResolvedValueOnce({
      asOfDate: '2026-09-28',
      endDate: '2026-10-27',
      projectedWalletBalanceVnd: 1450000,
      events: [],
    });

    rerender(<CashflowAtAGlance csrfToken="csrf-test" locale="vi" balanceVersion={350} onViewPlans={vi.fn()} />);

    expect(await screen.findByText('1.450.000 VND')).toBeDefined();
    expect(apiGetMock).toHaveBeenCalledTimes(2);
  });
});
