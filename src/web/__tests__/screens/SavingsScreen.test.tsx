import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SavingsScreen } from '../../screens/SavingsScreen.js';
import { copy } from '../../i18n.js';

const { apiGetMock, reloadMock, loadMoreMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  reloadMock: vi.fn(),
  loadMoreMock: vi.fn(),
}));

vi.mock('../../api-client.js', () => ({ apiGet: apiGetMock }));
vi.mock('../../hooks/use-pagination.js', () => ({
  usePagination: () => ({
    data: [],
    loading: false,
    error: null,
    hasMore: false,
    loadMore: loadMoreMock,
    reload: reloadMock,
  }),
}));

afterEach(() => cleanup());

beforeEach(() => {
  apiGetMock.mockReset();
  apiGetMock.mockImplementation(async (path: string) => {
    if (path === '/wallet') {
      return {
        walletId: 'wallet-test',
        initialized: true,
        initialBalanceVnd: 100000,
        availableBalanceVnd: 100000,
        currency: 'VND',
        updatedAt: '2026-09-28T00:00:00.000Z',
      };
    }
    if (path === '/savings') {
      return { balanceVnd: 0, currency: 'VND', updatedAt: '2026-09-28T00:00:00.000Z' };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  reloadMock.mockReset();
  loadMoreMock.mockReset();
});

describe('SavingsScreen guidance', () => {
  it.each([
    {
      locale: 'vi' as const,
      title: 'Tích lũy theo kế hoạch của bạn',
      guidance: 'Bạn tự chọn số tiền chuyển từ ví vào quỹ tiết kiệm. Khi cần, bạn có thể chuyển khoản đó trở lại ví.',
      amountChoice: 'Bạn chủ động chọn số tiền',
      unsupportedClaims: ['10% đến 20%', 'Không phụ phí', 'Rút tức thì'],
    },
    {
      locale: 'en' as const,
      title: 'Save at your own pace',
      guidance: 'Choose how much to move from your wallet into savings. Move that amount back to your wallet when needed.',
      amountChoice: 'You choose the amount',
      unsupportedClaims: ['10% to 20%', 'Zero fees', 'Instant withdraw'],
    },
  ])('shows simple, non-prescriptive and verified guidance in $locale', ({ locale, title, guidance, amountChoice, unsupportedClaims }) => {
    render(
      <SavingsScreen
        csrfToken="csrf-test"
        t={copy[locale]}
        locale={locale}
      />
    );

    expect(screen.getByText(title)).toBeDefined();
    expect(screen.getByText(guidance)).toBeDefined();
    expect(screen.getByText(`✓ ${amountChoice}`)).toBeDefined();

    for (const claim of unsupportedClaims) {
      expect(screen.queryByText(new RegExp(claim, 'i'))).toBeNull();
    }
  });
});
