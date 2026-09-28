import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiRequestError } from '../api-client.js';
import { App } from '../App.js';

const { apiGetMock, apiPatchMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  apiGet: apiGetMock,
  apiPatch: apiPatchMock,
  apiPost: apiPostMock,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    apiError: { code: string; message: string } | null;

    constructor(status: number, apiError: { code: string; message: string } | null) {
      super(apiError?.message ?? `HTTP_${status}`);
      this.status = status;
      this.apiError = apiError;
    }

    get isUnauthorized() {
      return this.status === 401;
    }
  },
  setUnauthorizedHandler: vi.fn(),
}));

const user = {
  id: '42',
  displayName: 'Student',
  hasLocalPassword: true,
  requiresProfileCompletion: false,
  email: 'student@example.test',
  locale: 'vi' as const,
  role: 'user' as const,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  apiGetMock.mockReset().mockImplementation((path: string) => {
    if (path === '/auth/session') {
      return Promise.resolve({ user, csrfToken: 'csrf-test', googleLinked: false, walletInitialized: false });
    }
    if (path === '/reports/dashboard') {
      return Promise.resolve({ wallet: null, savings: null, currentMonth: null, recentTransactions: [] });
    }
    if (path === '/categories') return Promise.resolve([]);
    return Promise.resolve({});
  });
  apiPatchMock.mockReset().mockImplementation((_path: string, body: { locale?: string }) => Promise.resolve({
    ...user,
    locale: body.locale ?? 'vi',
  }));
  apiPostMock.mockReset().mockResolvedValue({});
});

describe('language preference stays in sync', () => {
  it('shows a clear dashboard error and keeps a single main landmark', async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({ user, csrfToken: 'csrf-test', googleLinked: false, walletInitialized: false });
      }
      if (path === '/reports/dashboard') return Promise.reject(new Error('HTTP_502'));
      return Promise.resolve([]);
    });

    render(<App />);

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('Dữ liệu chưa khả dụng');
    expect(error.textContent).toContain('Dữ liệu tạm thời chưa sẵn sàng. Vui lòng thử lại sau.');
    expect(error.textContent).not.toContain('HTTP_502');
    expect(error.closest('section.state-screen--embedded')).not.toBeNull();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('does not show the server busy response verbatim on the dashboard', async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: { ...user, locale: 'en' },
          csrfToken: 'csrf-test',
          googleLinked: false,
          walletInitialized: false,
        });
      }
      if (path === '/reports/dashboard') {
        return Promise.reject(new ApiRequestError(500, {
          code: 'INTERNAL_ERROR',
          message: 'Hệ thống đang bận, vui lòng thử lại',
        }));
      }
      return Promise.resolve([]);
    });

    render(<App />);

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('Your data is temporarily unavailable. Please try again shortly.');
    expect(error.textContent).not.toContain('Hệ thống đang bận');
  });

  it('shows a localized database-unavailable message without exposing API detail', async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: { ...user, locale: 'en' },
          csrfToken: 'csrf-test',
          googleLinked: false,
          walletInitialized: false,
        });
      }
      if (path === '/reports/dashboard') {
        const error = new ApiRequestError(503, {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database schema chưa sẵn sàng',
        });
        return Promise.reject(error);
      }
      return Promise.resolve([]);
    });

    render(<App />);

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('Data is unavailable');
    expect(error.textContent).toContain('Your data is temporarily unavailable. Please try again shortly.');
    expect(error.textContent).not.toContain('Database schema chưa sẵn sàng');
  });

  it('shows the Google success notice in the saved session language', async () => {
    window.history.replaceState({}, document.title, '/?auth=google_login');
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: { ...user, locale: 'en' },
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

    render(<App />);

    expect((await screen.findByRole('status')).textContent).toContain('Google sign-in successful.');
    expect(screen.queryByText('Đăng nhập Google thành công.')).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('does not report a successful Google login when the session is missing', async () => {
    window.history.replaceState({}, document.title, '/?auth=google_login');
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.reject(Object.assign(new Error('unauthorized'), { status: 401 }));
      }
      return Promise.resolve([]);
    });

    render(<App />);

    expect(await screen.findByText('Không thể hoàn tất Google. Vui lòng thử lại.')).toBeDefined();
    expect(screen.queryByText('Đăng nhập Google thành công.')).toBeNull();
  });

  it('announces a failed Google connection as an error, then returns later notices to status', async () => {
    window.history.replaceState({}, document.title, '/?auth=google_linked');
    apiGetMock.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          user: { ...user, locale: 'en' },
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

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toContain('Google sign-in could not be completed. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Mute success notifications' }));
    expect((await screen.findByRole('status')).textContent).toContain('Notifications muted');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('persists the header language choice and opens settings with that choice selected', async () => {
    render(<App />);

    const languageButton = await screen.findByRole('button', { name: 'Ngôn ngữ' });
    fireEvent.click(languageButton);

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledWith(
      '/users/me/preferences',
      { locale: 'en' },
      { 'X-CSRF-Token': 'csrf-test' },
    ));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Language' }).textContent).toBe('EN'));

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByText('Display Language')).toBeDefined();
    const selectedLanguage = document.querySelector('.lang-option-card.is-selected strong');
    expect(selectedLanguage?.textContent).toBe('English');
  });

  it('updates the header after saving a language change from Settings', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cài đặt' }));
    fireEvent.click(await screen.findByRole('button', { name: /English/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledWith(
      '/users/me/preferences',
      { displayName: 'Student', locale: 'en' },
      { 'X-CSRF-Token': 'csrf-test' },
    ));
    const headerLanguageButton = await screen.findByRole('button', { name: 'Language' });
    expect(headerLanguageButton.textContent).toBe('EN');
  });
});
