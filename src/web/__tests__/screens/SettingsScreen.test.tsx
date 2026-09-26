import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsScreen } from '../../screens/SettingsScreen.js';
import { copy } from '../../i18n.js';
import type { Session } from '../../types.js';

describe('SettingsScreen', () => {
  it('renders settings screen with numeric user id (as returned by MySQL)', () => {
    const mockSessionWithNumericId = {
      user: {
        id: 999003 as any, // MySQL integer ID
        displayName: 'Thiên Hoàng',
        email: 'thiennebanyeu@gmail.com',
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
        t={copy.vi}
        locale="vi"
      />
    );

    expect(screen.getByText('Thiên Hoàng')).toBeDefined();
    expect(screen.getByText('thiennebanyeu@gmail.com')).toBeDefined();
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
        t={copy.en}
        locale="en"
      />
    );

    expect(screen.getByText('Personal Account')).toBeDefined();
  });
});
