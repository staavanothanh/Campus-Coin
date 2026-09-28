import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AuthApp } from '../../app/App.js';

const { authApiMock, MockApiError } = vi.hoisted(() => {
  class TestApiError extends Error {
    status: number;
    code: string;
    retryAfterSeconds: number | undefined;

    constructor(
      status: number,
      code: string,
      message: string,
      retryAfterSeconds?: number,
    ) {
      super(message);
      this.status = status;
      this.code = code;
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }

  return { authApiMock: vi.fn(), MockApiError: TestApiError };
});

vi.mock('../../features/auth/auth.api.js', () => ({
  api: authApiMock,
  ApiError: MockApiError,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

beforeEach(() => {
  authApiMock.mockReset().mockImplementation((path: string) => {
    if (path === '/auth/providers') return Promise.resolve({ google: false });
    if (path === '/auth/login') {
      return Promise.resolve({
        user: { id: 'test-user', email: 'student@example.test', displayName: 'Student', locale: 'vi', role: 'user' },
        csrfToken: 'test-csrf-token',
      });
    }
    if (path === '/auth/forgot-password') return Promise.resolve({});
    return Promise.resolve({});
  });
});

describe('authentication form reliability', () => {
  it('keeps login working when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError');
    });
    const onAuthenticated = vi.fn();

    render(<AuthApp onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.test' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'correct-horse-battery' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(authApiMock).toHaveBeenCalledWith('/auth/login', {
      email: 'student@example.test',
      password: 'correct-horse-battery',
    });
  });

  it('keeps the show-password control outside the label and toggles it accessibly', async () => {
    render(<AuthApp onAuthenticated={() => {}} />);

    const passwordInput = screen.getByLabelText('Mật khẩu') as HTMLInputElement;
    const passwordLabel = screen.getByText('Mật khẩu', { selector: 'label' });
    const showButton = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(passwordLabel.contains(showButton)).toBe(false);
    expect(passwordInput.type).toBe('password');
    fireEvent.click(showButton);
    expect(passwordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeDefined();
  });

  it('moves keyboard focus to the new screen heading after changing auth page', async () => {
    render(<AuthApp onAuthenticated={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    const heading = await screen.findByRole('heading', { name: 'Quên mật khẩu' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('uses the server Retry-After value to disable OTP resend and show a countdown', async () => {
    vi.useFakeTimers();
    authApiMock.mockImplementation((path: string) => {
      if (path === '/auth/providers') return Promise.resolve({ google: false });
      if (path === '/auth/forgot-password') return Promise.resolve({});
      if (path === '/auth/resend-otp') return Promise.reject(new MockApiError(429, 'RATE_LIMITED', 'Wait', 3));
      return Promise.resolve({});
    });

    render(<AuthApp onAuthenticated={() => {}} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Gửi mã xác minh' }).closest('form')!);

    await act(async () => {
      await Promise.resolve();
    });
    const resendButton = screen.getByRole('button', { name: 'Gửi lại mã' });
    fireEvent.click(resendButton);

    await act(async () => {
      await Promise.resolve();
    });
    expect((resendButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('3 giây');
    expect(screen.getByText('Có thể gửi lại mã sau 3 giây.')).toBeDefined();
    expect(screen.getByText('Có thể gửi lại mã sau 3 giây.').getAttribute('aria-live')).toBe('off');

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Có thể gửi lại mã sau 2 giây.')).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect((resendButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Có thể gửi lại mã sau/)).toBeNull();
  });

  it.each([
    {
      flow: 'registration',
      openPageButton: 'Chưa có tài khoản? Đăng ký',
      sendPath: '/auth/register',
      expectedNotice: 'Mã xác minh đã được gửi đến email của bạn.',
    },
    {
      flow: 'password reset',
      openPageButton: 'Quên mật khẩu?',
      sendPath: '/auth/forgot-password',
      expectedNotice: 'Nếu email đã đăng ký, mã xác minh sẽ được gửi đến email.',
    },
  ])('does not invent an OTP resend cooldown after a successful $flow send', async ({
    openPageButton,
    sendPath,
    expectedNotice,
  }) => {
    render(<AuthApp onAuthenticated={() => {}} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: openPageButton }));
    fireEvent.submit(screen.getByRole('button', { name: 'Gửi mã xác minh' }).closest('form')!);

    await waitFor(() => expect(authApiMock).toHaveBeenCalledWith(sendPath, { email: 'student@example.test' }));
    await waitFor(() => expect(screen.getByText(expectedNotice)).toBeDefined());
    expect((screen.getByRole('button', { name: 'Gửi lại mã' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Có thể gửi lại mã sau/)).toBeNull();
  });
});
