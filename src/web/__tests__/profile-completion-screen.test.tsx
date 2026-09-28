import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfileCompletionScreen } from '../components/ProfileCompletionScreen.js';
import type { Session } from '../types.js';

const { apiGetMock, apiPatchMock, apiPostMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  apiGet: apiGetMock,
  apiPatch: apiPatchMock,
  apiPost: apiPostMock,
  ApiRequestError: class ApiRequestError extends Error {},
}));

const incompleteSession = {
  user: {
    id: '42',
    displayName: 'Student from Google',
    hasLocalPassword: false,
    requiresProfileCompletion: true,
    email: 'student@example.test',
    locale: 'vi' as const,
    role: 'user' as const,
  },
  csrfToken: 'csrf-test',
  googleLinked: true,
  walletInitialized: false,
} as Session;

const completedSession = {
  ...incompleteSession,
  user: { ...incompleteSession.user, displayName: 'Campus Student', hasLocalPassword: true, requiresProfileCompletion: false },
} as Session;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  apiGetMock.mockReset().mockResolvedValue(completedSession);
  apiPatchMock.mockReset().mockResolvedValue({});
  apiPostMock.mockReset().mockResolvedValue({});
});

describe('Google profile completion', () => {
  it('saves a missing account name and creates the local password before continuing', async () => {
    const onComplete = vi.fn();

    render(
      <ProfileCompletionScreen
        session={incompleteSession}
        locale="vi"
        onComplete={onComplete}
        onSignOut={vi.fn()}
      />,
    );

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Hoàn thiện tài khoản' }));

    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'Campus Student' } });
    fireEvent.change(screen.getByLabelText('Tạo mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    await waitFor(() => expect(apiPatchMock).toHaveBeenCalledWith(
      '/users/me/preferences',
      { displayName: 'Campus Student' },
      { 'X-CSRF-Token': 'csrf-test' },
    ));
    expect(apiPostMock).toHaveBeenCalledWith(
      '/auth/set-password',
      { newPassword: 'student-password-123' },
      { 'X-CSRF-Token': 'csrf-test' },
    );
    expect(apiGetMock).toHaveBeenCalledWith('/auth/session');
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(completedSession));
  });

  it('does not send profile changes when the name is still missing', async () => {
    const session = {
      ...incompleteSession,
      user: { ...incompleteSession.user, displayName: '' },
    } as Session;

    render(
      <ProfileCompletionScreen
        session={session}
        locale="vi"
        onComplete={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Tạo mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    expect(await screen.findByRole('alert')).toBeDefined();
    const nameField = screen.getByLabelText('Tên tài khoản');
    expect(nameField.getAttribute('aria-invalid')).toBe('true');
    expect(nameField.getAttribute('aria-describedby')).toBe('profile-completion-error');
    expect(document.activeElement).toBe(nameField);
    expect(apiPatchMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();

    fireEvent.change(nameField, { target: { value: 'Hiệp' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(nameField.getAttribute('aria-invalid')).toBe('false');
  });

  it('clears a server error when the user edits a profile field', async () => {
    apiPatchMock.mockRejectedValueOnce(new Error('offline'));
    render(
      <ProfileCompletionScreen
        session={incompleteSession}
        locale="vi"
        onComplete={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'Campus Student' } });
    fireEvent.change(screen.getByLabelText('Tạo mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    expect(await screen.findByRole('alert')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'Campus Student 2' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears the confirmation error when the original password is corrected', async () => {
    render(
      <ProfileCompletionScreen
        session={incompleteSession}
        locale="vi"
        onComplete={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'Campus Student' } });
    fireEvent.change(screen.getByLabelText('Tạo mật khẩu'), { target: { value: 'student-password-123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: 'student-password-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }));

    expect(await screen.findByRole('alert')).toBeDefined();
    const confirmation = screen.getByLabelText('Nhập lại mật khẩu');
    expect(confirmation.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(screen.getByLabelText('Tạo mật khẩu'), { target: { value: 'student-password-456' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(confirmation.getAttribute('aria-invalid')).toBe('false');
  });
});
