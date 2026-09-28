import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsScreen } from '../../screens/SettingsScreen.js';
import { copy } from '../../i18n.js';
import type { Session } from '../../types.js';

const { apiGetMock, apiPatchMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../../api-client.js', () => ({
  apiGet: apiGetMock,
  apiPatch: apiPatchMock,
  apiPost: apiPostMock,
  ApiRequestError: class ApiRequestError extends Error {},
}));

beforeEach(() => {
  apiGetMock.mockReset().mockResolvedValue([]);
  apiPatchMock.mockReset().mockResolvedValue({});
  apiPostMock.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SettingsScreen', () => {
  it('renders settings screen with numeric user id (as returned by MySQL)', () => {
    const mockSessionWithNumericId = {
      user: {
        id: 999003 as any, // MySQL integer ID
        displayName: 'Test Student',
        email: 'student@example.com',
        locale: 'vi' as const,
        role: 'user' as const,
      },
      walletInitialized: false,
      csrfToken: 'csrf_test_token',
    } as unknown as Session;

    render(
      <SettingsScreen
        session={mockSessionWithNumericId}
        theme="light"
        onThemeChange={vi.fn()}
        onSessionUpdate={vi.fn()}
        onPasswordReset={vi.fn()}
        t={copy.vi}
        locale="vi"
      />
    );

    expect(screen.getByText('Test Student')).toBeDefined();
    expect(screen.getByText('student@example.com')).toBeDefined();
    expect(screen.getByText('999003')).toBeDefined();
  });

  it('renders safely when user fields are empty or missing', () => {
    const mockSessionMinimal = {
      user: {
        id: 123 as any,
        displayName: '',
        email: '',
        locale: 'en' as const,
        role: 'user' as const,
      },
      walletInitialized: false,
      csrfToken: 'csrf_test_token',
    } as unknown as Session;

    render(
      <SettingsScreen
        session={mockSessionMinimal}
        theme="dark"
        onThemeChange={vi.fn()}
        onSessionUpdate={vi.fn()}
        onPasswordReset={vi.fn()}
        t={copy.en}
        locale="en"
      />
    );

    expect(screen.getByText('Personal Account')).toBeDefined();
  });

  it('creates a category without submitting unsaved profile preferences', async () => {
    apiGetMock.mockResolvedValue([{
      id: '21',
      name: { en: 'Rent', vi: 'Tiền nhà' },
      appliesTo: 'payment',
      status: 'active',
      isDefault: false,
    }]);
    apiPostMock.mockResolvedValue({
      id: '22',
      name: { en: 'Books', vi: 'Sách' },
      appliesTo: 'payment',
      status: 'active',
      isDefault: false,
    });
    const session = {
      user: {
        id: 'user-42',
        displayName: 'Test Student',
        email: 'student@example.com',
        locale: 'vi' as const,
        role: 'user' as const,
      },
      walletInitialized: false,
      csrfToken: 'csrf_test_token',
    } as unknown as Session;

    render(
      <SettingsScreen
        session={session}
        theme="light"
        onThemeChange={vi.fn()}
        onSessionUpdate={vi.fn()}
        onPasswordReset={vi.fn()}
        t={copy.vi}
        locale="vi"
      />
    );

    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Tên chưa lưu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý' }));
    await screen.findByText('Tiền nhà');
    fireEvent.change(screen.getByLabelText('Tên tiếng Việt'), { target: { value: 'Sách' } });
    fireEvent.change(screen.getByLabelText('Tên tiếng Anh'), { target: { value: 'Books' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo danh mục' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledOnce());
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it('shows an error instead of a false success when clipboard access fails', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard blocked')) },
    });
    const session = {
      user: {
        id: 'user-42',
        displayName: 'Test Student',
        email: 'student@example.com',
        locale: 'vi' as const,
        role: 'user' as const,
      },
      walletInitialized: false,
      csrfToken: 'csrf_test_token',
    } as unknown as Session;

    try {
      render(
        <SettingsScreen
          session={session}
          theme="light"
          onThemeChange={vi.fn()}
          onSessionUpdate={vi.fn()}
          onPasswordReset={vi.fn()}
          t={copy.vi}
          locale="vi"
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sao chép mã định danh' }));
      expect(await screen.findByText('Không thể sao chép mã định danh trên trình duyệt này.')).toBeDefined();
      expect(screen.queryByText('Đã sao chép mã định danh.')).toBeNull();
    } finally {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('changes the email password only after sending and submitting the OTP', async () => {
    const session = {
      user: {
        id: 'user-42',
        displayName: 'Test Student',
        email: 'student@example.com',
        locale: 'vi' as const,
        role: 'user' as const,
      },
      walletInitialized: false,
      csrfToken: 'csrf_test_token',
    } as unknown as Session;
    const onPasswordReset = vi.fn();

    render(
      <SettingsScreen
        session={session}
        theme="light"
        onThemeChange={vi.fn()}
        onSessionUpdate={vi.fn()}
        onPasswordReset={onPasswordReset}
        t={copy.vi}
        locale="vi"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/auth/forgot-password',
      { email: 'student@example.com' },
    ));

    fireEvent.change(await screen.findByLabelText('Mã xác minh'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith(
      '/auth/reset-password',
      {
        email: 'student@example.com',
        otp: '123456',
        newPassword: 'new-password-123',
      },
    ));
    expect(onPasswordReset).toHaveBeenCalledOnce();
  });

  it('does not send the password reset request when confirmation does not match', async () => {
    const session = {
      user: {
        id: 'user-42',
        displayName: 'Test Student',
        email: 'student@example.com',
        locale: 'vi' as const,
        role: 'user' as const,
      },
      walletInitialized: false,
      csrfToken: 'csrf_test_token',
    } as unknown as Session;

    render(
      <SettingsScreen
        session={session}
        theme="light"
        onThemeChange={vi.fn()}
        onSessionUpdate={vi.fn()}
        onPasswordReset={vi.fn()}
        t={copy.vi}
        locale="vi"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã xác minh' }));
    await screen.findByLabelText('Mã xác minh');
    fireEvent.change(screen.getByLabelText('Mã xác minh'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'new-password-123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu mật khẩu mới' }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(apiPostMock.mock.calls.some(([path]) => path === '/auth/reset-password')).toBe(false);
  });
});
