import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TransactionForm } from '../components/TransactionForm.js';
import { copy } from '../i18n.js';

const { apiGetMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  ApiRequestError: class ApiRequestError extends Error {},
}));

const suggestions = {
  asOf: '2026-09-11T16:59:59.000Z',
  items: [{
    itemName: 'Cà phê',
    frequency: 3,
    lastAmountVnd: 25_000,
    lastOccurredAt: '2026-09-01T17:00:00.000Z',
    previousOccurredAt: '2026-08-31T17:00:00.000Z',
  }],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  apiGetMock.mockReset().mockImplementation((path: string) => {
    if (path === '/ledger/item-suggestions') return Promise.resolve(suggestions);
    return Promise.resolve([{
      id: '5',
      appliesTo: 'payment',
      status: 'active',
      name: { vi: 'Ăn uống', en: 'Food & Dining' },
    }]);
  });
  apiPostMock.mockReset().mockResolvedValue({ budgetWarning: null });
});

describe('product suggestions in payment form', () => {
  it('shows owner history comparisons and sends itemName separately from description', async () => {
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

    const itemName = await screen.findByLabelText(copy.vi.itemName) as HTMLInputElement;
    const category = screen.getByRole('combobox', { name: /Danh mục/ }) as HTMLSelectElement;
    await waitFor(() => expect(category.disabled).toBe(false));
    fireEvent.focus(itemName);
    const frequentItems = screen.getByRole('group', { name: 'Mặt hàng bạn mua thường xuyên' });
    expect(screen.getByRole('button', { name: 'Cà phê, 3 lần' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cà phê, 3 lần' }));
    expect(itemName.value).toBe('Cà phê');

    fireEvent.change(itemName, { target: { value: 'cà phê' } });
    fireEvent.change(screen.getByLabelText(/Số tiền/), { target: { value: '30000' } });
    fireEvent.change(screen.getByLabelText(copy.vi.transactionDate), { target: { value: '2026-09-11' } });
    fireEvent.change(category, { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Mô tả/), { target: { value: 'ít đá' } });

    expect(screen.getByText('Lần này cách lần mua trước 9 ngày.')).toBeDefined();
    expect(screen.getByText('Hai lần mua trước đó cách nhau 1 ngày.')).toBeDefined();
    expect(screen.getByText('Khoảng cách lần này dài hơn nhịp trước 8 ngày.')).toBeDefined();
    expect(screen.getByText('Lần này cao hơn 5.000 VND.')).toBeDefined();

    fireEvent.submit(itemName.closest('form')!);
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    expect(apiPostMock.mock.calls[0]?.[1]).toMatchObject({
      type: 'payment',
      occurredAt: '2026-09-10T17:00:00.000Z',
      itemName: 'cà phê',
      description: 'ít đá',
    });
    expect(frequentItems.querySelectorAll('button')).toHaveLength(1);
  });

  it('saves a backdated purchase on the chosen HCMC day without comparing it to a later purchase', async () => {
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

    const itemName = await screen.findByLabelText(copy.vi.itemName);
    const date = screen.getByLabelText(copy.vi.transactionDate);
    const amount = screen.getByLabelText(/Số tiền/);
    const category = screen.getByRole('combobox', { name: /Danh mục/ });
    await waitFor(() => expect((category as HTMLSelectElement).disabled).toBe(false));

    fireEvent.change(date, { target: { value: '2026-08-30' } });
    fireEvent.change(itemName, { target: { value: 'Cà phê' } });
    fireEvent.change(amount, { target: { value: '30000' } });
    fireEvent.change(category, { target: { value: '5' } });
    fireEvent.focus(itemName);

    expect(screen.queryByText(/Lần này cách lần mua trước/)).toBeNull();
    expect(screen.queryByText(/Lần này cao hơn/)).toBeNull();

    fireEvent.submit(itemName.closest('form')!);
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    expect(apiPostMock.mock.calls[0]?.[1]).toMatchObject({
      occurredAt: '2026-08-29T17:00:00.000Z',
      itemName: 'Cà phê',
    });
  });

  it('says when the current purchase interval is shorter than the previous one', async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/ledger/item-suggestions') {
        return Promise.resolve({
          ...suggestions,
          items: [{
            itemName: 'Cà phê',
            frequency: 3,
            lastAmountVnd: 25_000,
            lastOccurredAt: '2026-09-01T17:00:00.000Z',
            previousOccurredAt: '2026-08-17T17:00:00.000Z',
          }],
        });
      }
      return Promise.resolve([{
        id: '5',
        appliesTo: 'payment',
        status: 'active',
        name: { vi: 'Ăn uống', en: 'Food & Dining' },
      }]);
    });

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

    const itemName = await screen.findByLabelText(copy.vi.itemName);
    fireEvent.change(itemName, { target: { value: 'Cà phê' } });
    fireEvent.change(screen.getByLabelText(copy.vi.transactionDate), { target: { value: '2026-09-11' } });
    expect(await screen.findByText('Khoảng cách lần này ngắn hơn nhịp trước 6 ngày.')).toBeDefined();
  });

  it('shows no more than ten frequent item choices', async () => {
    const manyItems = Array.from({ length: 12 }, (_, index) => ({
      itemName: `Mặt hàng ${index + 1}`,
      frequency: 12 - index,
      lastAmountVnd: 1000,
      lastOccurredAt: '2026-09-01T17:00:00.000Z',
      previousOccurredAt: null,
    }));
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/ledger/item-suggestions') return { asOf: suggestions.asOf, items: manyItems };
      return [{ id: '5', appliesTo: 'payment', status: 'active', name: { vi: 'Ăn uống', en: 'Food & Dining' } }];
    });

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

    await screen.findByLabelText(copy.vi.itemName);
    const itemName = screen.getByLabelText(copy.vi.itemName);
    fireEvent.focus(itemName);
    const choices = screen.getByRole('group', { name: 'Mặt hàng bạn mua thường xuyên' });
    expect(choices.querySelectorAll('button')).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Mặt hàng 11, 2 lần' })).toBeNull();
  });

  it('keeps choices open while keyboard focus stays in the product field', async () => {
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

    const itemName = await screen.findByLabelText(copy.vi.itemName);
    const amount = screen.getByLabelText(/Số tiền/);
    fireEvent.focus(itemName);
    const group = screen.getByRole('group', { name: 'Mặt hàng bạn mua thường xuyên' });
    const choice = screen.getByRole('button', { name: 'Cà phê, 3 lần' });

    fireEvent.blur(itemName, { relatedTarget: choice });
    expect(screen.getByRole('group', { name: 'Mặt hàng bạn mua thường xuyên' })).toBe(group);

    fireEvent.focus(choice);
    fireEvent.blur(choice, { relatedTarget: amount });
    expect(screen.queryByRole('group', { name: 'Mặt hàng bạn mua thường xuyên' })).toBeNull();
  });

  it('explains how personal suggestions appear when the owner has no item history', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/ledger/item-suggestions') return { asOf: suggestions.asOf, items: [] };
      return [{ id: '5', appliesTo: 'payment', status: 'active', name: { vi: 'Ăn uống', en: 'Food & Dining' } }];
    });

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

    const itemName = await screen.findByLabelText(copy.vi.itemName);
    expect(screen.queryByText(copy.vi.itemSuggestionsEmpty)).toBeNull();
    fireEvent.focus(itemName);
    const emptyState = await screen.findByText(copy.vi.itemSuggestionsEmpty);
    expect(emptyState.textContent).toContain(copy.vi.itemSuggestionsEmpty);
    expect((itemName as HTMLInputElement).disabled).toBe(false);
  });

  it('keeps manual item entry available when suggestion loading fails', async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/ledger/item-suggestions') throw new Error('offline');
      return [{ id: '5', appliesTo: 'payment', status: 'active', name: { vi: 'Ăn uống', en: 'Food & Dining' } }];
    });

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

    const itemName = await screen.findByLabelText(copy.vi.itemName) as HTMLInputElement;
    expect(await screen.findByText(copy.vi.itemSuggestionsUnavailable)).toBeDefined();
    expect(itemName.disabled).toBe(false);
  });

  it('does not load product names in an income form', async () => {
    render(
      <TransactionForm
        kind="income"
        csrfToken="csrf-test"
        t={copy.vi}
        locale="vi"
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    );

    expect(screen.queryByLabelText(copy.vi.itemName)).toBeNull();
    expect(apiGetMock).not.toHaveBeenCalledWith('/ledger/item-suggestions');
  });

  it('requires explicit consent and keeps the JEV result as a user-reviewed category choice', async () => {
    apiPostMock.mockResolvedValueOnce({
      status: 'suggested',
      categoryId: '5',
      confidence: 0.92,
      reasonCode: null,
    });
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

    fireEvent.change(await screen.findByLabelText(copy.vi.itemName), { target: { value: 'cà phê' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý danh mục' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Hãy đồng ý gửi nội dung đã nhập');
    expect(apiPostMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý gửi tên sản phẩm/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Gợi ý danh mục' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    expect(apiPostMock).toHaveBeenCalledWith('/ai/category-suggestion', {
      transactionType: 'payment',
      description: 'cà phê',
      providerConsent: true,
    }, { 'X-CSRF-Token': 'csrf-test' });
    expect((screen.getByRole('combobox', { name: /Danh mục/ }) as HTMLSelectElement).value).toBe('5');
    expect(screen.getByRole('status').textContent).toContain('Hãy kiểm tra hoặc đổi trước khi lưu');
  });

  it('does not send a receipt image before the user gives consent', async () => {
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

    fireEvent.change(await screen.findByLabelText('Chụp hoặc chọn ảnh JPEG/PNG'), {
      target: { files: [new File(['png'], 'receipt.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đọc hóa đơn' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Hãy đồng ý gửi ảnh đã chọn');
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
