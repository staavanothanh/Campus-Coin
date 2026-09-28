import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CategoryManagementPanel } from '../components/CategoryManagementPanel.js';

const { apiGetMock, apiPatchMock, apiPostMock, ApiRequestErrorMock } = vi.hoisted(() => {
  class ApiRequestErrorMock extends Error {
    status: number;
    apiError: { code: string; message: string };
    isConflict: boolean;

    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.apiError = { code, message };
      this.isConflict = status === 409;
    }
  }

  return {
    apiGetMock: vi.fn(),
    apiPatchMock: vi.fn(),
    apiPostMock: vi.fn(),
    ApiRequestErrorMock,
  };
});

vi.mock('../api-client.js', () => ({
  apiGet: apiGetMock,
  apiPatch: apiPatchMock,
  apiPost: apiPostMock,
  ApiRequestError: ApiRequestErrorMock,
}));

const defaultCategory = {
  id: '1',
  name: { en: 'Salary', vi: 'Lương' },
  appliesTo: 'income' as const,
  status: 'active' as const,
  isDefault: true,
};

const customCategory = {
  id: '21',
  name: { en: 'Rent', vi: 'Tiền nhà' },
  appliesTo: 'payment' as const,
  status: 'active' as const,
  isDefault: false,
};

beforeEach(() => {
  apiGetMock.mockReset().mockResolvedValue([defaultCategory, customCategory]);
  apiPatchMock.mockReset();
  apiPostMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CategoryManagementPanel', () => {
  it('creates an owner category with CSRF and retry-safe idempotency headers', async () => {
    const createdCategory = {
      id: '22',
      name: { en: 'Books', vi: 'Sách' },
      appliesTo: 'payment',
      status: 'active',
      isDefault: false,
    };
    apiPostMock.mockResolvedValue(createdCategory);

    render(<CategoryManagementPanel locale="vi" csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý' }));
    expect(await screen.findByText('Tiền nhà')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tạm ẩn Tiền nhà' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Bật lại' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Tên tiếng Việt'), { target: { value: 'Sách' } });
    fireEvent.change(screen.getByLabelText('Tên tiếng Anh'), { target: { value: 'Books' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo danh mục' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    const [path, body, headers] = apiPostMock.mock.calls[0] as [string, unknown, Record<string, string>];
    expect(path).toBe('/categories');
    expect(body).toEqual({ nameEn: 'Books', nameVi: 'Sách', appliesTo: 'payment' });
    expect(headers).toMatchObject({ 'X-CSRF-Token': 'csrf-test' });
    expect(headers['Idempotency-Key']).toEqual(expect.any(String));
    expect(await screen.findByText('Sách')).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('Đã tạo danh mục.');
  });

  it('reuses the idempotency key when the same category create is retried', async () => {
    apiPostMock
      .mockRejectedValueOnce(new ApiRequestErrorMock(503, 'SERVER_ERROR', 'temporary'))
      .mockResolvedValueOnce({ ...customCategory, id: '22', name: { en: 'Books', vi: 'Sách' } });

    render(<CategoryManagementPanel locale="vi" csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý' }));
    await screen.findByText('Tiền nhà');
    fireEvent.change(screen.getByLabelText('Tên tiếng Việt'), { target: { value: 'Sách' } });
    fireEvent.change(screen.getByLabelText('Tên tiếng Anh'), { target: { value: 'Books' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo danh mục' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    const firstKey = (apiPostMock.mock.calls[0]?.[2] as Record<string, string>)['Idempotency-Key'];

    const createButton = await screen.findByRole('button', { name: 'Tạo danh mục' }) as HTMLButtonElement;
    await waitFor(() => expect(createButton.disabled).toBe(false));
    fireEvent.click(createButton);
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    const secondKey = (apiPostMock.mock.calls[1]?.[2] as Record<string, string>)['Idempotency-Key'];

    expect(secondKey).toBe(firstKey);
    expect(await screen.findByText('Sách')).toBeDefined();
  });

  it('keeps defaults read-only and can hide then re-enable a personal category', async () => {
    apiPatchMock
      .mockResolvedValueOnce({ ...customCategory, status: 'disabled' })
      .mockResolvedValueOnce(customCategory);

    render(<CategoryManagementPanel locale="vi" csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý' }));
    await screen.findByText('Lương');

    fireEvent.click(screen.getByRole('button', { name: 'Tạm ẩn Tiền nhà' }));
    await screen.findByText('Đang ẩn');
    expect(apiPatchMock).toHaveBeenNthCalledWith(
      1,
      '/categories/21',
      { status: 'disabled' },
      { 'X-CSRF-Token': 'csrf-test' },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Bật lại Tiền nhà' }));
    await screen.findByText('Đang dùng');
    expect(apiPatchMock).toHaveBeenNthCalledWith(
      2,
      '/categories/21',
      { status: 'active' },
      { 'X-CSRF-Token': 'csrf-test' },
    );
  });

  it('shows a conflict message when the category name already exists', async () => {
    apiPostMock.mockRejectedValue(new ApiRequestErrorMock(409, 'CONFLICT', 'duplicate'));

    render(<CategoryManagementPanel locale="vi" csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý' }));
    await screen.findByText('Tiền nhà');
    fireEvent.change(screen.getByLabelText('Tên tiếng Việt'), { target: { value: 'Tiền nhà' } });
    fireEvent.change(screen.getByLabelText('Tên tiếng Anh'), { target: { value: 'Rent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo danh mục' }));

    expect(await screen.findByText('Danh mục này đã tồn tại. Hãy chọn tên khác.')).toBeDefined();
  });
});
